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

    // Check cache first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from("destination_activities")
      .select("activities, updated_at")
      .eq("place_name", placeName)
      .eq("country", country)
      .maybeSingle();

    // Return cache if less than 7 days old
    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 7 * 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ activities: cached.activities, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate with AI
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
            content: `You are a travel expert. Generate activities for a destination. Return structured data using the suggest_activities tool.`,
          },
          {
            role: "user",
            content: `Generate 8-12 famous activities and things to do in ${placeName}, ${country}. Include a mix of food spots, nature/hiking, cultural sites, scenic views, transport experiences, and hidden gems. For each activity include a name, category, short description (1-2 sentences), and difficulty level if applicable.`,
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
                        name: { type: "string", description: "Activity name" },
                        category: {
                          type: "string",
                          enum: ["food", "hiking", "nature", "culture", "scenic", "transport", "hidden_gem"],
                          description: "Activity category",
                        },
                        description: { type: "string", description: "1-2 sentence description" },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "moderate", "challenging", "none"],
                          description: "Difficulty level, use none for non-physical activities",
                        },
                        duration: { type: "string", description: "Estimated duration e.g. '2 hours', 'half day'" },
                      },
                      required: ["name", "category", "description", "difficulty", "duration"],
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
