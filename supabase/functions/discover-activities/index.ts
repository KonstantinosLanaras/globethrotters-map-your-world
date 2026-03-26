import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      if (age < 7 * 24 * 60 * 60 * 1000) {
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
            content: `You are a travel expert and local guide. Generate a comprehensive list of real, specific places and activities for a destination. Include well-known spots AND hidden gems. Each entry should feel like a real Google Maps listing with realistic ratings and review counts. Return structured data using the suggest_activities tool.`,
          },
          {
            role: "user",
            content: `Generate 18-25 real, specific activities and places to visit in ${placeName}, ${country}. Include a rich mix across ALL categories:
- Food (5-6): specific restaurants, street food spots, markets, cafes
- Culture (3-4): museums, historic sites, temples, galleries
- Nature (3-4): parks, gardens, viewpoints, beaches
- Hiking (2-3): trails, walks, treks
- Scenic (2-3): viewpoints, photo spots, architectural landmarks
- Hidden Gem (2-3): local-only spots, off-the-beaten-path places
- Transport (1-2): unique local transport experiences

For each, include a realistic Google-style rating (3.8-4.9) and review count (50-2000). Make names specific and real.`,
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
                          enum: ["food", "hiking", "nature", "culture", "scenic", "transport", "hidden_gem"],
                        },
                        description: { type: "string", description: "1-2 sentence description" },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "moderate", "challenging", "none"],
                        },
                        duration: { type: "string", description: "Estimated duration e.g. '2 hours'" },
                        rating: { type: "number", description: "Realistic rating 3.8-4.9" },
                        review_count: { type: "integer", description: "Realistic review count 50-2000" },
                      },
                      required: ["name", "category", "description", "difficulty", "duration", "rating", "review_count"],
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
    const activities = parsed.activities || [];

    // Cache the result
    await supabase
      .from("destination_activities")
      .upsert(
        { place_name: placeName, country, activities, updated_at: new Date().toISOString() },
        { onConflict: "place_name,country" }
      );

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
