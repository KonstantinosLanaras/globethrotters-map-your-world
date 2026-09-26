import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "google/gemini-3-flash-preview";
const METHOD_VERSION = "llm-editorial-v1";
const SOURCE_NAME = "Globethrotters AI editorial estimate";
const SUBJECTIVE_METRICS = ["food", "culture", "nature", "nightlife"] as const;

type SubjectiveMetric = typeof SUBJECTIVE_METRICS[number];
type BudgetBand = "low" | "medium" | "high";

type EditorialScore = {
  citySlug: string;
  budgetBand: BudgetBand;
  affordability: number;
  food: number;
  culture: number;
  nature: number;
  nightlife: number;
  confidence: number;
  note: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const bounded = (value: unknown, maximum = 100) =>
  Math.min(maximum, Math.max(0, Number(value) || 0));

serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);

  const expectedSecret = Deno.env.get("CITY_METRICS_IMPORT_SECRET");
  if (!expectedSecret || request.headers.get("x-city-metrics-import-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!lovableKey || !supabaseUrl || !serviceKey) {
    return json({ error: "Required server secrets are not configured" }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const citySlugs = Array.isArray(body.citySlugs)
    ? [...new Set(body.citySlugs.filter((value: unknown) => typeof value === "string"))]
    : [];
  if (citySlugs.length < 1 || citySlugs.length > 10) {
    return json({ error: "Provide between one and ten unique citySlugs" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: cities, error: cityError } = await supabase
    .from("catalog_cities")
    .select("id,slug,name,country")
    .in("slug", citySlugs)
    .eq("is_active", true);
  if (cityError) return json({ error: cityError.message }, 500);
  if (!cities || cities.length !== citySlugs.length) {
    return json({ error: "One or more city slugs were not found" }, 400);
  }

  const cityPrompt = cities
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .map((city) => `- ${city.slug}: ${city.name}, ${city.country}`)
    .join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You create conservative editorial estimates for travel discovery. These are model judgments, not community ratings and not live research. Use a consistent Europe-wide scale. Never claim that a publication, award, survey or dataset supports a score unless it is supplied in the prompt. Return only the requested structured tool call.`,
        },
        {
          role: "user",
          content: `Score every listed destination on the same 0-100 scale.

Food: breadth, distinctiveness and depth of the food scene—not restaurant count alone.
Culture: museums, heritage, architecture, performing arts and active cultural life.
Nature: meaningful access to parks, water, landscapes and outdoor activities from the destination.
Nightlife: breadth and quality of evening options across bars, music and clubs—not only party tourism.
Affordability: 100 is unusually affordable for a visitor; 0 is exceptionally expensive. Also return low/medium/high where low means low-cost and high means expensive.

Anchors: 90+ exceptional internationally; 75 strong; 60 good; 45 limited; below 30 weak. Avoid false precision and popularity bias. Confidence must be at most 0.70 because this is an LLM estimate without live source retrieval. Give one short uncertainty note per city.

Destinations:
${cityPrompt}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "store_editorial_scores",
          description: "Return one editorial score set for every supplied city",
          parameters: {
            type: "object",
            properties: {
              cities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    citySlug: { type: "string", enum: citySlugs },
                    budgetBand: { type: "string", enum: ["low", "medium", "high"] },
                    affordability: { type: "integer", minimum: 0, maximum: 100 },
                    food: { type: "integer", minimum: 0, maximum: 100 },
                    culture: { type: "integer", minimum: 0, maximum: 100 },
                    nature: { type: "integer", minimum: 0, maximum: 100 },
                    nightlife: { type: "integer", minimum: 0, maximum: 100 },
                    confidence: { type: "number", minimum: 0, maximum: 0.7 },
                    note: { type: "string", maxLength: 240 },
                  },
                  required: ["citySlug", "budgetBand", "affordability", "food", "culture", "nature", "nightlife", "confidence", "note"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cities"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "store_editorial_scores" } },
    }),
  });

  if (!response.ok) {
    return json({ error: `AI gateway failed (${response.status})`, detail: await response.text() }, response.status);
  }
  const aiData = await response.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return json({ error: "The model returned no structured score data" }, 502);

  const parsed = JSON.parse(toolCall.function.arguments) as { cities?: EditorialScore[] };
  const scores = parsed.cities || [];
  const bySlug = new Map(scores.map((score) => [score.citySlug, score]));
  const missing = citySlugs.filter((slug) => !bySlug.has(slug));
  if (missing.length > 0 || bySlug.size !== citySlugs.length) {
    return json({ error: "The model did not return exactly one result per city", missing }, 502);
  }

  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + 180);
  const rows: Record<string, unknown>[] = [];
  for (const city of cities) {
    const score = bySlug.get(city.slug)!;
    const confidence = bounded(score.confidence, 0.7);
    const common = {
      city_id: city.id,
      source_kind: "llm_editorial",
      source_name: SOURCE_NAME,
      methodology_version: METHOD_VERSION,
      model_name: MODEL,
      confidence,
      evidence: {
        note: String(score.note || "").slice(0, 240),
        basis: "Model prior knowledge; no live source retrieval",
      },
      effective_at: new Date().toISOString().slice(0, 10),
      valid_until: validUntil.toISOString().slice(0, 10),
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    rows.push({ ...common, metric: "budget", value: bounded(score.affordability), band: score.budgetBand });
    for (const metric of SUBJECTIVE_METRICS) {
      rows.push({ ...common, metric, value: bounded(score[metric]) });
    }
  }

  const { error: upsertError } = await supabase.from("city_metrics").upsert(rows, {
    onConflict: "city_id,metric,source_kind,source_name,month_key,methodology_version",
  });
  if (upsertError) return json({ error: upsertError.message }, 500);

  return json({
    citiesScored: cities.length,
    metricsStored: rows.length,
    methodologyVersion: METHOD_VERSION,
    model: MODEL,
    scores,
  });
});
