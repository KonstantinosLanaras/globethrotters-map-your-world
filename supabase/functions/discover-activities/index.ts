import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { CATALOG_TAXONOMY, categoryKeys, subcategoryKeys, taxonomyPrompt, contentKinds, isCanonicalActivity, isCurrentActivityCache } from "../_shared/catalogTaxonomy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeName, country } = await req.json();
    if (!placeName || !country) {
      return new Response(JSON.stringify({ error: "placeName and country required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache
    const { data: cached } = await supabase
      .from("destination_activities")
      .select("activities, updated_at")
      .eq("place_name", placeName)
      .eq("country", country)
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 7 * 24 * 60 * 60 * 1000 && isCurrentActivityCache(cached.activities)) {
        return new Response(JSON.stringify({ activities: cached.activities, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a travel research assistant. Suggest well-documented places and activities for a destination. Never invent ratings, review counts, awards, availability, prices, or sponsorship. The result is an unverified suggestion list and must not be presented as verified user-generated data. Return structured data using the suggest_activities tool.`,
          },
          {
            role: "user",
            content: `Generate 18-25 real, specific places and recurring experiences in ${placeName}, ${country}.
Use only these category/subcategory pairs:
${taxonomyPrompt}

Choose a destination-appropriate mix; do not invent experiences to fill a quota.
Editorial experiences belong to their interest category. For example, Sunset at Vraxakia in Athens is nature / sunsets_views / timed_experience with recommended_time="sunset". Food walks belong to food / food_experiences. Do not add scenic, transport, hidden_gem or editorial as top-level categories.
Use content_kind=place for physical venues and landmarks; area_experience, route_experience or timed_experience for activities. Keep recommended_time blank when irrelevant. Named hikes remain Nature / hikes_trails and require separate route/access validation before catalogue publication. These suggestions are unverified; this endpoint does not publish to catalog_items.
Do not include dated events, festivals or scheduled performances. Permanent live-music venues are allowed. Lakes do not imply swimming suitability. Make names specific. Do not invent ratings, review counts, coordinates, prices, opening status or booking availability.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_activities",
              description: "Return structured activity suggestions for a destination",
              parameters: {
                type: "object",
                properties: {
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Specific place or activity name" },
                        category: {
                          type: "string",
                          enum: categoryKeys,
                        },
                        subcategory: { type: "string", enum: subcategoryKeys, description: "Must belong to the selected category" },
                        content_kind: { type: "string", enum: contentKinds },
                        recommended_time: { type: "string", description: "Recurring timing cue such as sunset, or empty string" },
                        description: { type: "string", description: "1-2 sentence description" },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "moderate", "challenging", "none"],
                        },
                        duration: { type: "string", description: "Estimated duration e.g. '2 hours'" },
                      },
                      required: ["name", "category", "subcategory", "content_kind", "recommended_time", "description", "difficulty", "duration"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["activities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_activities" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    if (!Array.isArray(parsed.activities) || parsed.activities.length === 0 || !parsed.activities.every(isCanonicalActivity)) {
      throw new Error("AI response contains missing or invalid category/subcategory pairs");
    }
    const activities = parsed.activities.map((activity: Record<string, unknown>) => ({
      ...activity, taxonomy_version: CATALOG_TAXONOMY.version,
    }));

    // Cache the result
    const { error: cacheError } = await supabase
      .from("destination_activities")
      .upsert(
        { place_name: placeName, country, activities, updated_at: new Date().toISOString() },
        { onConflict: "place_name,country" }
      );

    if (cacheError) throw new Error("Could not store classified activity suggestions");

    return new Response(JSON.stringify({ activities, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discover-activities error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
