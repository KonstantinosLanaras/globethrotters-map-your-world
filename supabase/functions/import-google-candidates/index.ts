import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Category = "food" | "culture" | "nature" | "nightlife";

type GoogleCandidate = {
  googlePlaceId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  primaryType: string | null;
  googleTypes: string[];
  rating: number;
  reviewCount: number;
};

type SelectedCandidate = GoogleCandidate & {
  citySlug: string;
  category: Category;
  selectionRank: number;
  source: "Google Maps";
};

const SEARCH_CONFIG: Record<Category, { query: string; includedType?: string }> = {
  food: { query: "restaurants", includedType: "restaurant" },
  culture: { query: "museums", includedType: "museum" },
  nature: { query: "parks gardens hiking trails beaches and nature" },
  nightlife: { query: "nightclubs", includedType: "night_club" },
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);

  const expectedSecret = Deno.env.get("CATALOG_IMPORT_SECRET");
  if (!expectedSecret || request.headers.get("x-catalog-import-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!googleKey || !supabaseUrl || !serviceKey) {
    return json({ error: "Server import secrets are not configured" }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const citySlugs = Array.isArray(body.citySlugs) ? body.citySlugs.filter((value: unknown) => typeof value === "string") : [];
  // Food and culture are the cost-controlled default. Other categories can be
  // requested explicitly, but are better populated from open datasets first.
  const categories = (Array.isArray(body.categories) ? body.categories : ["food", "culture"])
    .filter((value: unknown): value is Category => typeof value === "string" && value in SEARCH_CONFIG);
  const maxPages = Math.min(3, Math.max(1, Number(body.maxPages) || 3));
  const minRating = Math.min(5, Math.max(0, Number(body.minRating) || 4));

  if (citySlugs.length === 0 || citySlugs.length > 5) {
    return json({ error: "Provide between one and five citySlugs per batch" }, 400);
  }
  if (categories.length === 0) return json({ error: "No valid categories provided" }, 400);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: cities, error: cityError } = await supabase
    .from("catalog_cities")
    .select("id,slug,name,country,country_code,latitude,longitude,search_radius_km")
    .in("slug", citySlugs)
    .eq("is_active", true);
  if (cityError) return json({ error: cityError.message }, 500);
  if (!cities || cities.length !== citySlugs.length) return json({ error: "One or more city slugs were not found" }, 400);

  const { data: run, error: runError } = await supabase
    .from("catalog_import_runs")
    .insert({ provider: "google", status: "running" })
    .select("id")
    .single();
  if (runError || !run) return json({ error: runError?.message || "Could not start import" }, 500);

  let requestCount = 0;
  let candidateCount = 0;
  const selectedCandidates: SelectedCandidate[] = [];

  try {
    for (const city of cities) {
      const latDelta = city.search_radius_km / 111;
      const lngDelta = city.search_radius_km / (111 * Math.max(0.2, Math.cos(city.latitude * Math.PI / 180)));

      for (const category of categories) {
        const config = SEARCH_CONFIG[category];
        let pageToken: string | undefined;
        const categoryCandidates: GoogleCandidate[] = [];

        for (let page = 0; page < maxPages; page += 1) {
          const searchBody: Record<string, unknown> = {
            textQuery: `${config.query} in ${city.name}, ${city.country}`,
            minRating,
            pageSize: 20,
            languageCode: "en",
            regionCode: city.country_code,
            locationRestriction: {
              rectangle: {
                low: { latitude: city.latitude - latDelta, longitude: city.longitude - lngDelta },
                high: { latitude: city.latitude + latDelta, longitude: city.longitude + lngDelta },
              },
            },
          };
          if (config.includedType) {
            searchBody.includedType = config.includedType;
            searchBody.strictTypeFiltering = true;
          }
          if (pageToken) searchBody.pageToken = pageToken;

          const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": googleKey,
              "X-Goog-FieldMask": FIELD_MASK,
            },
            body: JSON.stringify(searchBody),
          });
          requestCount += 1;
          if (!response.ok) throw new Error(`Google search failed (${response.status}): ${await response.text()}`);

          const result = await response.json();
          const candidates: GoogleCandidate[] = (result.places || [])
            .filter((place: Record<string, unknown>) => place.id && place.displayName && place.location)
            .map((place: {
              id: string;
              displayName: { text: string };
              location: { latitude: number; longitude: number };
              primaryType?: string;
              types?: string[];
              rating?: number;
              userRatingCount?: number;
            }) => ({
              googlePlaceId: place.id,
              displayName: place.displayName.text,
              latitude: place.location.latitude,
              longitude: place.location.longitude,
              primaryType: place.primaryType || null,
              googleTypes: place.types || [],
              rating: place.rating || 0,
              reviewCount: place.userRatingCount || 0,
            }));

          categoryCandidates.push(...candidates);
          candidateCount += candidates.length;

          pageToken = result.nextPageToken;
          if (!pageToken) break;
        }

        const uniqueCandidates = [...new Map(
          categoryCandidates.map((candidate) => [candidate.googlePlaceId, candidate]),
        ).values()];
        const selected = uniqueCandidates
          .filter((candidate) => candidate.reviewCount > 1000)
          .sort((left, right) => right.rating - left.rating
            || right.reviewCount - left.reviewCount
            || left.displayName.localeCompare(right.displayName))
          .slice(0, 10)
          .map((candidate, index): SelectedCandidate => ({
            ...candidate,
            citySlug: city.slug,
            category,
            selectionRank: index + 1,
            source: "Google Maps",
          }));

        if (selected.length > 0) {
          const storedIds = selected.map((candidate) => ({
            import_run_id: run.id,
            city_id: city.id,
            search_category: category,
            google_place_id: candidate.googlePlaceId,
            selection_rank: candidate.selectionRank,
          }));
          const { error: insertError } = await supabase.from("google_place_candidate_ids").upsert(storedIds, {
            onConflict: "import_run_id,city_id,search_category,google_place_id",
          });
          if (insertError) throw insertError;
          selectedCandidates.push(...selected);
        }
      }
    }

    await supabase.from("catalog_import_runs").update({
      status: "completed",
      request_count: requestCount,
      candidate_count: candidateCount,
      selected_count: selectedCandidates.length,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return json({
      importRunId: run.id,
      requestsUsed: requestCount,
      candidatesImported: candidateCount,
      candidatesSelected: selectedCandidates.length,
      // Returned for immediate admin review only. Do not persist these fields;
      // the database stores only the Google Place IDs above.
      selected: selectedCandidates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    await supabase.from("catalog_import_runs").update({
      status: "failed",
      request_count: requestCount,
      candidate_count: candidateCount,
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return json({ error: message, importRunId: run.id, requestsUsed: requestCount }, 500);
  }
});
