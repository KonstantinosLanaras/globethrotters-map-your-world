import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, place_id } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI for spam analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a content moderation system for a travel journal app. Analyze text for:
1. Spam (promotional links, ads, repetitive content)
2. Low quality (very short, meaningless, copy-pasted)
3. Inappropriate content (offensive language, hate speech)
4. Fake/misleading (obviously fabricated travel experiences)

Respond ONLY with valid JSON: {"is_spam": boolean, "confidence": number 0-1, "flag_type": "auto_spam"|"low_quality"|"suspicious"|null, "reason": string|null}`
          },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "{}";

    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      analysis = { is_spam: false, confidence: 0, flag_type: null, reason: null };
    }

    // If flagged, store in spam_flags
    if (analysis.is_spam && analysis.confidence > 0.6 && place_id) {
      await supabase.from("spam_flags").insert({
        place_id,
        user_id: user.id,
        flag_type: analysis.flag_type || "auto_spam",
        confidence: analysis.confidence,
        details: { reason: analysis.reason },
      });
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
