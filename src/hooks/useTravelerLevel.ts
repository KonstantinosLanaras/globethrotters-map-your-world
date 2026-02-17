import { useMemo } from "react";
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

export function computeTravelerLevel(places: Place[]): TravelerLevel {
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

  // Score formula: countries (×3) + continents (×8) + detailed reviews (×2) + tagged (×1) + rated (×1)
  const totalScore =
    countryCount * 3 +
    continentCount * 8 +
    detailedReviews * 2 +
    taggedPlaces * 1 +
    ratedPlaces * 1;

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

export const useTravelerLevel = (places: Place[]) => {
  return useMemo(() => computeTravelerLevel(places), [places]);
};
