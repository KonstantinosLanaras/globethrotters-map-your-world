import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Place } from "./usePlaces";

export interface TravelerLevel {
  title: string;
  subtitle: string;
  tier: number;        // 0-based index
  progress: number;    // 0-100 within current tier
  totalScore: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

const LEVELS = [
  { title: "Wanderer",         subtitle: "Every journey begins with a single pin", minScore: 0 },
  { title: "Explorer",         subtitle: "Curiosity is your compass",              minScore: 15 },
  { title: "Pathfinder",       subtitle: "Charting routes less traveled",           minScore: 40 },
  { title: "Cultural Curator", subtitle: "Depth over distance",                    minScore: 75 },
  { title: "Global Insider",   subtitle: "The world is your atlas",                minScore: 120 },
  { title: "Sage Voyager",     subtitle: "Wisdom earned through miles and moments", minScore: 200 },
] as const;

const CONTINENT_MAP: Record<string, string> = {
  // Simplified mapping — country name → continent
  "Japan": "Asia", "China": "Asia", "India": "Asia", "Thailand": "Asia", "Vietnam": "Asia",
  "South Korea": "Asia", "Indonesia": "Asia", "Malaysia": "Asia", "Philippines": "Asia",
  "Cambodia": "Asia", "Myanmar": "Asia", "Nepal": "Asia", "Sri Lanka": "Asia", "Taiwan": "Asia",
  "Singapore": "Asia", "Laos": "Asia", "Mongolia": "Asia", "Bangladesh": "Asia",
  "France": "Europe", "Italy": "Europe", "Spain": "Europe", "Germany": "Europe",
  "United Kingdom": "Europe", "Portugal": "Europe", "Netherlands": "Europe", "Greece": "Europe",
  "Switzerland": "Europe", "Austria": "Europe", "Belgium": "Europe", "Czech Republic": "Europe",
  "Sweden": "Europe", "Norway": "Europe", "Denmark": "Europe", "Finland": "Europe",
  "Ireland": "Europe", "Poland": "Europe", "Hungary": "Europe", "Croatia": "Europe",
  "Romania": "Europe", "Turkey": "Europe", "Iceland": "Europe", "Scotland": "Europe",
  "United States": "North America", "Canada": "North America", "Mexico": "North America",
  "Costa Rica": "North America", "Cuba": "North America", "Jamaica": "North America",
  "Panama": "North America", "Guatemala": "North America", "Dominican Republic": "North America",
  "Brazil": "South America", "Argentina": "South America", "Peru": "South America",
  "Colombia": "South America", "Chile": "South America", "Ecuador": "South America",
  "Bolivia": "South America", "Uruguay": "South America",
  "Morocco": "Africa", "South Africa": "Africa", "Egypt": "Africa", "Kenya": "Africa",
  "Tanzania": "Africa", "Ethiopia": "Africa", "Ghana": "Africa", "Nigeria": "Africa",
  "Namibia": "Africa", "Rwanda": "Africa", "Uganda": "Africa", "Senegal": "Africa",
  "Australia": "Oceania", "New Zealand": "Oceania", "Fiji": "Oceania",
  "UAE": "Asia", "Jordan": "Asia", "Israel": "Asia", "Oman": "Asia", "Lebanon": "Asia",
  "Saudi Arabia": "Asia",
};

function getContinent(country: string): string {
  return CONTINENT_MAP[country] || "Other";
}

export function computeTravelerLevel(places: Place[], contributionScore: number = 0): TravelerLevel {
  const visited = places.filter((p) => p.type === "visited");
  const countries = new Set(visited.map((p) => p.country));
  const continents = new Set(visited.map((p) => getContinent(p.country)));

  const countryCount = countries.size;
  const continentCount = continents.size;
  const detailedReviews = visited.filter(
    (p) => p.notes && p.notes.length > 50
  ).length;
  const taggedPlaces = visited.filter(
    (p) => p.tags && p.tags.length >= 3
  ).length;
  const ratedPlaces = visited.filter((p) => p.rating && p.rating > 0).length;

  // Score formula: countries (×3) + continents (×8) + detailed reviews (×2) + tagged (×1) + rated (×1) + contributions (×1)
  const totalScore =
    countryCount * 3 +
    continentCount * 8 +
    detailedReviews * 2 +
    taggedPlaces * 1 +
    ratedPlaces * 1 +
    contributionScore;

  // Find current tier
  let tier = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalScore >= LEVELS[i].minScore) {
      tier = i;
      break;
    }
  }

  // Progress within tier
  const currentMin = LEVELS[tier].minScore;
  const nextMin = tier < LEVELS.length - 1 ? LEVELS[tier + 1].minScore : LEVELS[tier].minScore + 50;
  const progress = Math.min(100, Math.round(((totalScore - currentMin) / (nextMin - currentMin)) * 100));

  // Achievements — meaningful, not superficial
  const achievements: Achievement[] = [
    {
      id: "first_steps",
      title: "First Steps",
      description: "Pin your first visited place",
      icon: "🥾",
      earned: visited.length >= 1,
    },
    {
      id: "storyteller",
      title: "Storyteller",
      description: "Write detailed notes for 5 places",
      icon: "📖",
      earned: detailedReviews >= 5,
    },
    {
      id: "continental",
      title: "Continental",
      description: "Explore 3 different continents",
      icon: "🌍",
      earned: continentCount >= 3,
    },
    {
      id: "world_citizen",
      title: "World Citizen",
      description: "Visit 10 countries",
      icon: "🌐",
      earned: countryCount >= 10,
    },
    {
      id: "cultural_depth",
      title: "Cultural Depth",
      description: "Tag 10 places with 3+ cultural tags",
      icon: "🏛️",
      earned: taggedPlaces >= 10,
    },
    {
      id: "discerning_eye",
      title: "Discerning Eye",
      description: "Rate 15 places you've experienced",
      icon: "✨",
      earned: ratedPlaces >= 15,
    },
    {
      id: "hemisphere_hop",
      title: "Hemisphere Hop",
      description: "Visit places on 4 continents",
      icon: "🧭",
      earned: continentCount >= 4,
    },
    {
      id: "atlas_maker",
      title: "Atlas Maker",
      description: "Curate 25 visited places",
      icon: "🗺️",
      earned: visited.length >= 25,
    },
    // Contribution achievements — validation-based, not creation-based
    {
      id: "contributor",
      title: "Trusted Voice",
      description: "Have contributions validated by 3+ travelers",
      icon: "✍️",
      earned: contributionScore >= 6,
    },
    {
      id: "local_guide",
      title: "Community Guide",
      description: "Help 10 travelers with your experiences",
      icon: "🧭",
      earned: contributionScore >= 20,
    },
    {
      id: "top_explorer",
      title: "Top Contributor",
      description: "Reach 40 validated impact points",
      icon: "🏆",
      earned: contributionScore >= 40,
    },
  ];

  return {
    title: LEVELS[tier].title,
    subtitle: LEVELS[tier].subtitle,
    tier,
    progress,
    totalScore,
    achievements,
  };
}

// Validation-based contribution score — only counts community-validated impact
export const useContributionScore = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["contribution-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("saves_count, review_count, rating_avg, helpful_count")
        .eq("user_id", userId!);
      if (error) throw error;
      if (!data || data.length === 0) return 0;

      // Validation-based: no instant rewards for creating content
      // Points only from community interaction
      let score = 0;
      for (const exp of data) {
        let expScore = 0;
        expScore += (exp.saves_count || 0) * 2;      // saves = strong signal
        expScore += (exp.helpful_count || 0) * 3;     // explicit helpful marks
        expScore += (exp.review_count || 0) * 4;      // reviews = strongest
        // High rating bonus
        if ((exp.rating_avg || 0) >= 4.0 && (exp.review_count || 0) >= 2) {
          expScore += 5;
        }
        // Diminishing returns cap per experience
        score += Math.min(expScore, 50);
      }
      return score;
    },
  });
};

export const useTravelerLevel = (places: Place[]) => {
  return useMemo(() => computeTravelerLevel(places), [places]);
};
