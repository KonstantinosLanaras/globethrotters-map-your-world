import { useQuery } from "@tanstack/react-query";
import { cityScores, type CityScore } from "@/data/cityScores";
import { supabase } from "@/integrations/supabase/client";

type MetricName = "budget" | "safety" | "food" | "culture" | "nature" | "nightlife"
  | "adventure" | "transport" | "family" | "solo" | "couple" | "climate" | "crowds";

type MetricRow = {
  city_slug: string;
  city_name: string;
  country: string;
  metric: MetricName;
  value: number;
  band: string | null;
  month: number | null;
  source_kind: string;
  source_name: string;
  confidence: number;
};

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
const toFivePointScore = (value: number) => Math.round((Number(value) / 20) * 10) / 10;

const mergeMetrics = (rows: MetricRow[]): CityScore[] => {
  const byDestination = new Map<string, MetricRow[]>();
  for (const row of rows) {
    const key = `${row.city_name.toLocaleLowerCase()}::${row.country.toLocaleLowerCase()}`;
    const current = byDestination.get(key) || [];
    current.push(row);
    byDestination.set(key, current);
  }

  return cityScores.map((fallback) => {
    const key = `${fallback.cityName.toLocaleLowerCase()}::${fallback.country.toLocaleLowerCase()}`;
    const metrics = byDestination.get(key);
    if (!metrics?.length) return fallback;

    const merged: CityScore = { ...fallback, metricSources: { ...(fallback.metricSources || {}) } };
    for (const row of metrics) {
      if (row.month !== null) continue;
      if (row.metric === "budget" && ["low", "medium", "high"].includes(row.band || "")) {
        merged.budget = row.band as CityScore["budget"];
      } else if (row.metric === "safety" && ["very_safe", "generally_safe", "be_cautious"].includes(row.band || "")) {
        merged.safety = row.band as CityScore["safety"];
      } else if (row.metric === "family") {
        merged.familyFriendly = toFivePointScore(row.value);
      } else if (row.metric === "solo") {
        merged.soloFriendly = toFivePointScore(row.value);
      } else if (row.metric === "couple") {
        merged.coupleFriendly = toFivePointScore(row.value);
      } else if (["food", "culture", "nature", "nightlife", "adventure", "transport"].includes(row.metric)) {
        merged[row.metric as "food" | "culture" | "nature" | "nightlife" | "adventure" | "transport"] = toFivePointScore(row.value);
      }
      merged.metricSources![row.metric] = {
        kind: row.source_kind,
        name: row.source_name,
        confidence: Number(row.confidence),
      };
    }
    return merged;
  });
};

export const useDestinationScores = () => useQuery({
  queryKey: ["destination-scores"],
  staleTime: 1000 * 60 * 60,
  queryFn: async () => {
    if (isDemoMode) return cityScores;
    const { data, error } = await supabase
      .from("city_metric_current")
      .select("city_slug,city_name,country,metric,value,band,month,source_kind,source_name,confidence");
    // Keep Explore usable before the optional metrics migration is applied.
    if (error) {
      console.warn("Destination metrics unavailable; using bundled estimates", error.message);
      return cityScores;
    }
    return mergeMetrics((data || []) as MetricRow[]);
  },
});

