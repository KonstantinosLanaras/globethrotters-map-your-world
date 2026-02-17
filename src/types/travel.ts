export interface Pin {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: "visited" | "wishlist";
  tags: string[];
  rating: number;
  notes: string;
  photos: string[];
  dateVisited?: string;
}

export interface CuratedList {
  id: string;
  title: string;
  description: string;
  pinCount: number;
  emoji: string;
}

export interface TravelStats {
  countriesVisited: number;
  continentsExplored: number;
  totalPins: number;
  visitedCount: number;
  wishlistCount: number;
  level: string;
  nextLevel: string;
  progress: number;
  badges: string[];
}
