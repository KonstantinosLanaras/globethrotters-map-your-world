import type { Suggestion } from "@/hooks/useSuggestions";

type Destination = Omit<Suggestion, "reason" | "match_score"> & {
  summary: string;
};

const destinations: Destination[] = [
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, tags: ["culture", "food", "art", "city walks"], summary: "A dense mix of art, neighbourhood walks and food culture." },
  { name: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393, tags: ["food", "viewpoints", "history", "local"], summary: "Historic neighbourhoods, viewpoints and an easygoing food scene." },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, tags: ["history", "food", "culture", "city walks"], summary: "Ancient sites, street life and distinctive regional food." },
  { name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275, tags: ["history", "food", "viewpoints", "culture"], summary: "Classical history combined with lively neighbourhoods and hilltop views." },
  { name: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686, tags: ["architecture", "food", "beach", "nightlife"], summary: "Architecture, markets, urban beaches and energetic evenings." },
  { name: "London", country: "United Kingdom", lat: 51.5072, lng: -0.1276, tags: ["museums", "food", "parks", "culture"], summary: "World-class museums, varied food and large green spaces." },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export const rankDestinationSuggestions = (
  interests: string[],
  personality: string,
  excluded: string[],
): Suggestion[] => {
  const preferenceWords = [...interests, personality]
    .flatMap((value) => normalize(value).split(/\W+/))
    .filter(Boolean);
  const excludedNames = new Set(excluded.map(normalize));

  return destinations
    .filter((destination) => !excludedNames.has(normalize(destination.name)))
    .map((destination) => {
      const matches = destination.tags.filter((tag) =>
        preferenceWords.some((word) => normalize(tag).includes(word) || word.includes(normalize(tag))),
      );
      const matchScore = Math.min(96, 68 + matches.length * 7);
      const matchText = matches.length > 0 ? ` Matches your interest in ${matches.join(" and ")}.` : " A strong all-round MVP pick.";

      return {
        name: destination.name,
        country: destination.country,
        lat: destination.lat,
        lng: destination.lng,
        tags: destination.tags,
        reason: `${destination.summary}${matchText}`,
        match_score: matchScore,
      };
    })
    .sort((a, b) => b.match_score - a.match_score || a.name.localeCompare(b.name));
};
