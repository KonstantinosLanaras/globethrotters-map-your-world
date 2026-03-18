import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's experiences with engagement data
    const { data: experiences } = await supabase
      .from("experiences")
      .select("id, saves_count, review_count, helpful_count, rating_avg, engagement_score")
      .eq("user_id", user_id);

    if (!experiences || experiences.length === 0) {
      // No contributions yet
      await supabase
        .from("profiles")
        .update({ validated_score: 0, contribution_count: 0, travelers_helped: 0 })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ validated_score: 0, contribution_count: 0, travelers_helped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count unique users who saved/helped (travelers helped)
    const expIds = experiences.map((e) => e.id);

    const { count: saveCount } = await supabase
      .from("experience_saves")
      .select("user_id", { count: "exact", head: true })
      .in("experience_id", expIds);

    const { count: helpfulCount } = await supabase
      .from("helpful_marks")
      .select("user_id", { count: "exact", head: true })
      .in("experience_id", expIds);

    const { count: reviewCount } = await supabase
      .from("experience_reviews")
      .select("user_id", { count: "exact", head: true })
      .in("experience_id", expIds);

    // Validation-based scoring:
    // - Each save from another user: +2 points
    // - Each helpful mark: +3 points
    // - Each review received: +4 points
    // - Bonus for high average rating (>4.0): +5 per qualifying experience
    // - Anti-farming: diminishing returns after 50 validated points per experience
    let validatedScore = 0;

    for (const exp of experiences) {
      let expScore = 0;
      expScore += (exp.saves_count || 0) * 2;
      expScore += (exp.helpful_count || 0) * 3;
      expScore += (exp.review_count || 0) * 4;

      // High rating bonus
      if ((exp.rating_avg || 0) >= 4.0 && (exp.review_count || 0) >= 2) {
        expScore += 5;
      }

      // Diminishing returns cap per experience
      expScore = Math.min(expScore, 50);

      validatedScore += expScore;
    }

    const travelersHelped = (saveCount || 0) + (helpfulCount || 0);
    const contributionCount = experiences.length;

    // Update profile
    await supabase
      .from("profiles")
      .update({
        validated_score: validatedScore,
        contribution_count: contributionCount,
        travelers_helped: travelersHelped,
        trust_score: Math.min(100, Math.round(validatedScore * 0.5 + contributionCount * 2)),
      })
      .eq("user_id", user_id);

    // Log impact entries for new validations (deduplication via impact_type + experience_id)
    // This is handled by the trigger system, not here

    return new Response(
      JSON.stringify({
        validated_score: validatedScore,
        contribution_count: contributionCount,
        travelers_helped: travelersHelped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
