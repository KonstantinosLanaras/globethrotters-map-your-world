import type { Activity } from "@/hooks/useActivities";

export type CuratedExperience = Activity & {
  id: string;
  source: "curated";
  city: string;
  country: string;
  lat: number;
  lng: number;
  popularity_score: number;
  tags: string[];
};

const entries: CuratedExperience[] = [
  { id: "paris-louvre", city: "Paris", country: "France", lat: 48.8606, lng: 2.3376, name: "Louvre Museum", category: "culture", description: "Plan a focused visit around one collection instead of trying to see the entire museum.", difficulty: "easy", duration: "2–3 hours", source: "curated", popularity_score: 100, tags: ["museum", "art", "iconic"] },
  { id: "paris-montmartre", city: "Paris", country: "France", lat: 48.8867, lng: 2.3431, name: "Montmartre morning walk", category: "culture", description: "Walk the quieter streets around the hill early, before continuing to Sacré-Cœur.", difficulty: "moderate", duration: "2 hours", source: "curated", popularity_score: 94, tags: ["walk", "viewpoint", "neighbourhood"] },
  { id: "paris-canal", city: "Paris", country: "France", lat: 48.8722, lng: 2.3652, name: "Canal Saint-Martin", category: "nature", description: "A relaxed canal-side route for cafés, independent shops and an evening picnic.", difficulty: "easy", duration: "1–2 hours", source: "curated", popularity_score: 82, tags: ["local", "walk", "food"] },
  { id: "lisbon-belem", city: "Lisbon", country: "Portugal", lat: 38.6979, lng: -9.2065, name: "Belém riverfront and Jerónimos", category: "culture", description: "Combine the monastery area, riverside monuments and a traditional pastel de nata stop.", difficulty: "easy", duration: "Half day", source: "curated", popularity_score: 98, tags: ["history", "architecture", "food"] },
  { id: "lisbon-alfama", city: "Lisbon", country: "Portugal", lat: 38.7139, lng: -9.1302, name: "Alfama and Graça viewpoints", category: "culture", description: "A hilly route through historic lanes linking several of Lisbon’s best viewpoints.", difficulty: "moderate", duration: "2–3 hours", source: "curated", popularity_score: 96, tags: ["walk", "viewpoint", "historic"] },
  { id: "lisbon-lx", city: "Lisbon", country: "Portugal", lat: 38.7037, lng: -9.1782, name: "LX Factory", category: "food", description: "A former industrial complex with restaurants, small shops and creative spaces.", difficulty: "easy", duration: "1–2 hours", source: "curated", popularity_score: 80, tags: ["food", "design", "shopping"] },
  { id: "rome-colosseum", city: "Rome", country: "Italy", lat: 41.8902, lng: 12.4922, name: "Colosseum and Roman Forum", category: "culture", description: "Reserve a timed entry and allow enough time for the Forum and Palatine Hill.", difficulty: "moderate", duration: "3 hours", source: "curated", popularity_score: 100, tags: ["history", "architecture", "iconic"] },
  { id: "rome-trastevere", city: "Rome", country: "Italy", lat: 41.8897, lng: 12.4708, name: "Trastevere evening walk", category: "food", description: "Explore side streets and traditional Roman food away from the busiest squares.", difficulty: "easy", duration: "2–3 hours", source: "curated", popularity_score: 91, tags: ["food", "walk", "nightlife"] },
  { id: "rome-appian", city: "Rome", country: "Italy", lat: 41.8429, lng: 12.5288, name: "Appian Way by bicycle", category: "hiking", description: "Cycle a preserved Roman road and nearby aqueduct landscapes outside the centre.", difficulty: "moderate", duration: "Half day", source: "curated", popularity_score: 83, tags: ["cycling", "history", "outdoors"] },
  { id: "athens-acropolis", city: "Athens", country: "Greece", lat: 37.9715, lng: 23.7267, name: "Acropolis and Acropolis Museum", category: "culture", description: "Visit the archaeological site early, then connect the ruins to their history in the museum.", difficulty: "moderate", duration: "3–4 hours", source: "curated", popularity_score: 100, tags: ["history", "museum", "iconic"] },
  { id: "athens-plaka", city: "Athens", country: "Greece", lat: 37.9724, lng: 23.7297, name: "Plaka and Anafiotika walk", category: "culture", description: "A compact old-town walk through lanes inspired by Cycladic island architecture.", difficulty: "moderate", duration: "1–2 hours", source: "curated", popularity_score: 90, tags: ["walk", "architecture", "local"] },
  { id: "athens-lycabettus", city: "Athens", country: "Greece", lat: 37.9817, lng: 23.7430, name: "Lycabettus Hill sunset", category: "hiking", description: "Climb or take the funicular for a wide city view; arrive ahead of sunset.", difficulty: "moderate", duration: "1–2 hours", source: "curated", popularity_score: 86, tags: ["viewpoint", "sunset", "outdoors"] },
  { id: "barcelona-sagrada", city: "Barcelona", country: "Spain", lat: 41.4036, lng: 2.1744, name: "Sagrada Família", category: "culture", description: "Book a timed interior visit to understand Gaudí’s light, structure and symbolism.", difficulty: "easy", duration: "1–2 hours", source: "curated", popularity_score: 100, tags: ["architecture", "art", "iconic"] },
  { id: "barcelona-gracia", city: "Barcelona", country: "Spain", lat: 41.4030, lng: 2.1567, name: "Gràcia neighbourhood walk", category: "culture", description: "Explore small plazas, local shops and a calmer side of Barcelona above the old centre.", difficulty: "easy", duration: "2 hours", source: "curated", popularity_score: 84, tags: ["local", "walk", "food"] },
  { id: "barcelona-montjuic", city: "Barcelona", country: "Spain", lat: 41.3636, lng: 2.1585, name: "Montjuïc gardens and museums", category: "nature", description: "Link hillside gardens, viewpoints and a museum visit in one flexible half-day route.", difficulty: "moderate", duration: "Half day", source: "curated", popularity_score: 88, tags: ["gardens", "museum", "viewpoint"] },
  { id: "london-british", city: "London", country: "United Kingdom", lat: 51.5194, lng: -0.1270, name: "British Museum", category: "culture", description: "Choose a small number of galleries and reserve a free entry time during busy periods.", difficulty: "easy", duration: "2–3 hours", source: "curated", popularity_score: 98, tags: ["museum", "history", "free"] },
  { id: "london-borough", city: "London", country: "United Kingdom", lat: 51.5055, lng: -0.0910, name: "Borough Market and South Bank", category: "food", description: "Combine a market lunch with a Thames-side walk toward Tate Modern.", difficulty: "easy", duration: "2–3 hours", source: "curated", popularity_score: 94, tags: ["food", "market", "walk"] },
  { id: "london-hampstead", city: "London", country: "United Kingdom", lat: 51.5608, lng: -0.1647, name: "Hampstead Heath and village", category: "nature", description: "A green escape with skyline views, swimming ponds and historic village streets.", difficulty: "moderate", duration: "Half day", source: "curated", popularity_score: 82, tags: ["park", "viewpoint", "local"] },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export const getCuratedExperiences = (city: string, country: string): CuratedExperience[] =>
  entries
    .filter((entry) => normalize(entry.city) === normalize(city) && normalize(entry.country) === normalize(country))
    .sort((a, b) => b.popularity_score - a.popularity_score);

export const curatedExperiences = entries;
