// Community-derived city scores (aggregated from user contributions)
// These scores power the explore/discovery ranking system

export interface CityScore {
  cityName: string;
  country: string;
  budget: "low" | "medium" | "high";
  safety: "very_safe" | "generally_safe" | "be_cautious";
  food: number; // 1-5
  nature: number;
  nightlife: number;
  culture: number;
  adventure: number;
  transport: number;
  familyFriendly: number;
  soloFriendly: number;
  coupleFriendly: number;
  popularity: number; // 1-100
  // Season data: climate grade per month (A, B, C, D)
  climate: Record<number, "A" | "B" | "C" | "D">;
  crowdLevel: Record<number, "low" | "moderate" | "high">;
  imageUrl?: string;
}

// Deterministic score generator based on city characteristics
const generateClimate = (lat: number): Record<number, "A" | "B" | "C" | "D"> => {
  const absLat = Math.abs(lat);
  if (absLat < 25) {
    // Tropical
    return { 1: "A", 2: "A", 3: "A", 4: "B", 5: "B", 6: "C", 7: "C", 8: "C", 9: "B", 10: "A", 11: "A", 12: "A" };
  } else if (absLat < 40) {
    // Mediterranean / Subtropical
    return { 1: "C", 2: "C", 3: "B", 4: "A", 5: "A", 6: "A", 7: "A", 8: "A", 9: "A", 10: "B", 11: "C", 12: "C" };
  } else if (absLat < 55) {
    // Temperate
    return { 1: "D", 2: "D", 3: "C", 4: "B", 5: "A", 6: "A", 7: "A", 8: "A", 9: "B", 10: "C", 11: "D", 12: "D" };
  } else {
    // Nordic / High latitude
    return { 1: "D", 2: "D", 3: "D", 4: "C", 5: "B", 6: "A", 7: "A", 8: "B", 9: "C", 10: "D", 11: "D", 12: "D" };
  }
};

const generateCrowdLevel = (popularity: number): Record<number, "low" | "moderate" | "high"> => {
  if (popularity > 80) {
    return { 1: "moderate", 2: "moderate", 3: "moderate", 4: "high", 5: "high", 6: "high", 7: "high", 8: "high", 9: "high", 10: "moderate", 11: "moderate", 12: "high" };
  } else if (popularity > 50) {
    return { 1: "low", 2: "low", 3: "moderate", 4: "moderate", 5: "moderate", 6: "high", 7: "high", 8: "high", 9: "moderate", 10: "moderate", 11: "low", 12: "moderate" };
  }
  return { 1: "low", 2: "low", 3: "low", 4: "low", 5: "moderate", 6: "moderate", 7: "moderate", 8: "moderate", 9: "low", 10: "low", 11: "low", 12: "low" };
};

export const cityScores: CityScore[] = [
  // Europe
  { cityName: "London", country: "United Kingdom", budget: "high", safety: "very_safe", food: 4.3, nature: 3.2, nightlife: 4.5, culture: 4.9, adventure: 3.0, transport: 4.8, familyFriendly: 4.2, soloFriendly: 4.5, coupleFriendly: 4.3, popularity: 95, climate: generateClimate(51.5), crowdLevel: generateCrowdLevel(95) },
  { cityName: "Paris", country: "France", budget: "high", safety: "generally_safe", food: 4.9, nature: 3.5, nightlife: 4.3, culture: 4.9, adventure: 2.8, transport: 4.7, familyFriendly: 4.0, soloFriendly: 4.2, coupleFriendly: 4.9, popularity: 97, climate: generateClimate(48.8), crowdLevel: generateCrowdLevel(97) },
  { cityName: "Berlin", country: "Germany", budget: "medium", safety: "very_safe", food: 4.0, nature: 3.5, nightlife: 4.8, culture: 4.5, adventure: 3.2, transport: 4.6, familyFriendly: 3.8, soloFriendly: 4.8, coupleFriendly: 4.0, popularity: 82, climate: generateClimate(52.5), crowdLevel: generateCrowdLevel(82) },
  { cityName: "Rome", country: "Italy", budget: "medium", safety: "generally_safe", food: 4.8, nature: 3.3, nightlife: 3.8, culture: 4.9, adventure: 2.5, transport: 3.5, familyFriendly: 4.0, soloFriendly: 4.0, coupleFriendly: 4.7, popularity: 90, climate: generateClimate(41.9), crowdLevel: generateCrowdLevel(90) },
  { cityName: "Madrid", country: "Spain", budget: "medium", safety: "very_safe", food: 4.6, nature: 3.0, nightlife: 4.7, culture: 4.4, adventure: 2.8, transport: 4.5, familyFriendly: 4.0, soloFriendly: 4.3, coupleFriendly: 4.5, popularity: 78, climate: generateClimate(40.4), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Barcelona", country: "Spain", budget: "medium", safety: "generally_safe", food: 4.7, nature: 4.0, nightlife: 4.8, culture: 4.6, adventure: 3.5, transport: 4.4, familyFriendly: 4.2, soloFriendly: 4.5, coupleFriendly: 4.8, popularity: 92, climate: generateClimate(41.3), crowdLevel: generateCrowdLevel(92) },
  { cityName: "Amsterdam", country: "Netherlands", budget: "high", safety: "very_safe", food: 4.2, nature: 3.5, nightlife: 4.5, culture: 4.5, adventure: 3.0, transport: 4.8, familyFriendly: 3.8, soloFriendly: 4.7, coupleFriendly: 4.5, popularity: 85, climate: generateClimate(52.3), crowdLevel: generateCrowdLevel(85) },
  { cityName: "Prague", country: "Czech Republic", budget: "low", safety: "very_safe", food: 4.0, nature: 3.5, nightlife: 4.3, culture: 4.5, adventure: 3.0, transport: 4.2, familyFriendly: 3.8, soloFriendly: 4.5, coupleFriendly: 4.6, popularity: 75, climate: generateClimate(50.0), crowdLevel: generateCrowdLevel(75) },
  { cityName: "Vienna", country: "Austria", budget: "medium", safety: "very_safe", food: 4.3, nature: 3.8, nightlife: 3.5, culture: 4.8, adventure: 3.0, transport: 4.7, familyFriendly: 4.5, soloFriendly: 4.0, coupleFriendly: 4.5, popularity: 72, climate: generateClimate(48.2), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Lisbon", country: "Portugal", budget: "low", safety: "very_safe", food: 4.6, nature: 4.0, nightlife: 4.3, culture: 4.3, adventure: 3.5, transport: 4.0, familyFriendly: 4.0, soloFriendly: 4.6, coupleFriendly: 4.7, popularity: 83, climate: generateClimate(38.7), crowdLevel: generateCrowdLevel(83) },
  { cityName: "Athens", country: "Greece", budget: "low", safety: "generally_safe", food: 4.5, nature: 3.8, nightlife: 4.0, culture: 4.8, adventure: 3.5, transport: 3.5, familyFriendly: 3.5, soloFriendly: 4.2, coupleFriendly: 4.5, popularity: 70, climate: generateClimate(37.9), crowdLevel: generateCrowdLevel(70) },
  { cityName: "Istanbul", country: "Turkey", budget: "low", safety: "generally_safe", food: 4.7, nature: 3.5, nightlife: 4.0, culture: 4.8, adventure: 3.8, transport: 3.8, familyFriendly: 3.5, soloFriendly: 4.0, coupleFriendly: 4.3, popularity: 80, climate: generateClimate(41.0), crowdLevel: generateCrowdLevel(80) },
  { cityName: "Stockholm", country: "Sweden", budget: "high", safety: "very_safe", food: 4.0, nature: 4.2, nightlife: 3.5, culture: 4.3, adventure: 3.2, transport: 4.6, familyFriendly: 4.5, soloFriendly: 4.0, coupleFriendly: 4.0, popularity: 60, climate: generateClimate(59.3), crowdLevel: generateCrowdLevel(60) },
  { cityName: "Copenhagen", country: "Denmark", budget: "high", safety: "very_safe", food: 4.5, nature: 3.8, nightlife: 3.8, culture: 4.3, adventure: 3.0, transport: 4.8, familyFriendly: 4.5, soloFriendly: 4.2, coupleFriendly: 4.3, popularity: 65, climate: generateClimate(55.6), crowdLevel: generateCrowdLevel(65) },
  { cityName: "Dublin", country: "Ireland", budget: "high", safety: "very_safe", food: 3.8, nature: 4.0, nightlife: 4.5, culture: 4.0, adventure: 3.2, transport: 3.8, familyFriendly: 3.8, soloFriendly: 4.3, coupleFriendly: 4.0, popularity: 62, climate: generateClimate(53.3), crowdLevel: generateCrowdLevel(62) },
  { cityName: "Edinburgh", country: "United Kingdom", budget: "medium", safety: "very_safe", food: 4.0, nature: 4.3, nightlife: 4.0, culture: 4.5, adventure: 3.8, transport: 4.0, familyFriendly: 4.0, soloFriendly: 4.3, coupleFriendly: 4.3, popularity: 68, climate: generateClimate(55.9), crowdLevel: generateCrowdLevel(68) },
  { cityName: "Budapest", country: "Hungary", budget: "low", safety: "very_safe", food: 4.3, nature: 3.5, nightlife: 4.5, culture: 4.3, adventure: 3.0, transport: 4.3, familyFriendly: 3.8, soloFriendly: 4.5, coupleFriendly: 4.7, popularity: 76, climate: generateClimate(47.4), crowdLevel: generateCrowdLevel(76) },
  { cityName: "Reykjavik", country: "Iceland", budget: "high", safety: "very_safe", food: 3.5, nature: 4.9, nightlife: 3.2, culture: 3.8, adventure: 4.8, transport: 3.0, familyFriendly: 3.5, soloFriendly: 4.5, coupleFriendly: 4.5, popularity: 55, climate: generateClimate(64.1), crowdLevel: generateCrowdLevel(55) },
  { cityName: "Dubrovnik", country: "Croatia", budget: "medium", safety: "very_safe", food: 4.3, nature: 4.5, nightlife: 3.2, culture: 4.5, adventure: 3.5, transport: 3.0, familyFriendly: 3.5, soloFriendly: 4.0, coupleFriendly: 4.8, popularity: 72, climate: generateClimate(42.6), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Santorini", country: "Greece", budget: "high", safety: "very_safe", food: 4.3, nature: 4.5, nightlife: 3.0, culture: 4.0, adventure: 3.0, transport: 2.5, familyFriendly: 3.0, soloFriendly: 3.8, coupleFriendly: 4.9, popularity: 78, climate: generateClimate(36.3), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Florence", country: "Italy", budget: "medium", safety: "very_safe", food: 4.8, nature: 4.0, nightlife: 3.2, culture: 4.9, adventure: 2.8, transport: 3.5, familyFriendly: 3.8, soloFriendly: 4.2, coupleFriendly: 4.8, popularity: 80, climate: generateClimate(43.7), crowdLevel: generateCrowdLevel(80) },
  { cityName: "Munich", country: "Germany", budget: "medium", safety: "very_safe", food: 4.3, nature: 4.2, nightlife: 4.0, culture: 4.3, adventure: 3.5, transport: 4.7, familyFriendly: 4.3, soloFriendly: 4.0, coupleFriendly: 4.0, popularity: 65, climate: generateClimate(48.1), crowdLevel: generateCrowdLevel(65) },
  { cityName: "Zurich", country: "Switzerland", budget: "high", safety: "very_safe", food: 4.0, nature: 4.8, nightlife: 3.0, culture: 4.0, adventure: 4.0, transport: 4.8, familyFriendly: 4.5, soloFriendly: 4.0, coupleFriendly: 4.0, popularity: 55, climate: generateClimate(47.3), crowdLevel: generateCrowdLevel(55) },
  // Asia
  { cityName: "Tokyo", country: "Japan", budget: "high", safety: "very_safe", food: 4.9, nature: 3.5, nightlife: 4.5, culture: 4.8, adventure: 3.5, transport: 4.9, familyFriendly: 4.0, soloFriendly: 4.8, coupleFriendly: 4.5, popularity: 93, climate: generateClimate(35.6), crowdLevel: generateCrowdLevel(93) },
  { cityName: "Kyoto", country: "Japan", budget: "medium", safety: "very_safe", food: 4.7, nature: 4.5, nightlife: 2.8, culture: 4.9, adventure: 3.5, transport: 4.2, familyFriendly: 4.0, soloFriendly: 4.5, coupleFriendly: 4.8, popularity: 82, climate: generateClimate(35.0), crowdLevel: generateCrowdLevel(82) },
  { cityName: "Bangkok", country: "Thailand", budget: "low", safety: "generally_safe", food: 4.8, nature: 3.0, nightlife: 4.7, culture: 4.2, adventure: 3.8, transport: 3.8, familyFriendly: 3.5, soloFriendly: 4.7, coupleFriendly: 4.3, popularity: 88, climate: generateClimate(13.7), crowdLevel: generateCrowdLevel(88) },
  { cityName: "Singapore", country: "Singapore", budget: "high", safety: "very_safe", food: 4.8, nature: 3.5, nightlife: 4.0, culture: 4.0, adventure: 2.8, transport: 4.9, familyFriendly: 4.8, soloFriendly: 4.3, coupleFriendly: 4.2, popularity: 80, climate: generateClimate(1.3), crowdLevel: generateCrowdLevel(80) },
  { cityName: "Hong Kong", country: "China", budget: "high", safety: "very_safe", food: 4.7, nature: 3.5, nightlife: 4.3, culture: 4.2, adventure: 3.0, transport: 4.8, familyFriendly: 3.8, soloFriendly: 4.3, coupleFriendly: 4.0, popularity: 78, climate: generateClimate(22.3), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Seoul", country: "South Korea", budget: "medium", safety: "very_safe", food: 4.7, nature: 3.5, nightlife: 4.5, culture: 4.3, adventure: 3.0, transport: 4.8, familyFriendly: 4.0, soloFriendly: 4.5, coupleFriendly: 4.2, popularity: 78, climate: generateClimate(37.5), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Bali", country: "Indonesia", budget: "low", safety: "generally_safe", food: 4.3, nature: 4.8, nightlife: 4.0, culture: 4.3, adventure: 4.5, transport: 3.0, familyFriendly: 3.5, soloFriendly: 4.8, coupleFriendly: 4.9, popularity: 90, climate: generateClimate(-8.3), crowdLevel: generateCrowdLevel(90) },
  { cityName: "Dubai", country: "United Arab Emirates", budget: "high", safety: "very_safe", food: 4.3, nature: 2.5, nightlife: 3.8, culture: 3.5, adventure: 4.0, transport: 4.5, familyFriendly: 4.3, soloFriendly: 3.8, coupleFriendly: 4.3, popularity: 85, climate: generateClimate(25.2), crowdLevel: generateCrowdLevel(85) },
  { cityName: "Mumbai", country: "India", budget: "low", safety: "be_cautious", food: 4.5, nature: 2.8, nightlife: 3.8, culture: 4.3, adventure: 3.5, transport: 3.2, familyFriendly: 3.0, soloFriendly: 3.5, coupleFriendly: 3.5, popularity: 65, climate: generateClimate(19.0), crowdLevel: generateCrowdLevel(65) },
  { cityName: "Delhi", country: "India", budget: "low", safety: "be_cautious", food: 4.5, nature: 2.5, nightlife: 3.2, culture: 4.5, adventure: 3.5, transport: 3.5, familyFriendly: 3.0, soloFriendly: 3.2, coupleFriendly: 3.3, popularity: 60, climate: generateClimate(28.7), crowdLevel: generateCrowdLevel(60) },
  { cityName: "Hanoi", country: "Vietnam", budget: "low", safety: "generally_safe", food: 4.7, nature: 3.5, nightlife: 3.5, culture: 4.3, adventure: 3.8, transport: 3.2, familyFriendly: 3.2, soloFriendly: 4.5, coupleFriendly: 4.2, popularity: 72, climate: generateClimate(21.0), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Kuala Lumpur", country: "Malaysia", budget: "low", safety: "generally_safe", food: 4.6, nature: 3.5, nightlife: 3.8, culture: 4.0, adventure: 3.2, transport: 4.2, familyFriendly: 4.0, soloFriendly: 4.2, coupleFriendly: 4.0, popularity: 65, climate: generateClimate(3.1), crowdLevel: generateCrowdLevel(65) },
  { cityName: "Beijing", country: "China", budget: "medium", safety: "very_safe", food: 4.3, nature: 3.0, nightlife: 3.5, culture: 4.8, adventure: 3.0, transport: 4.5, familyFriendly: 3.5, soloFriendly: 3.5, coupleFriendly: 3.8, popularity: 70, climate: generateClimate(39.9), crowdLevel: generateCrowdLevel(70) },
  { cityName: "Shanghai", country: "China", budget: "medium", safety: "very_safe", food: 4.5, nature: 2.8, nightlife: 4.3, culture: 4.2, adventure: 2.8, transport: 4.7, familyFriendly: 3.5, soloFriendly: 3.8, coupleFriendly: 4.0, popularity: 72, climate: generateClimate(31.2), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Taipei", country: "Taiwan", budget: "low", safety: "very_safe", food: 4.8, nature: 3.8, nightlife: 4.0, culture: 4.2, adventure: 3.5, transport: 4.5, familyFriendly: 4.0, soloFriendly: 4.5, coupleFriendly: 4.2, popularity: 70, climate: generateClimate(25.0), crowdLevel: generateCrowdLevel(70) },
  { cityName: "Kathmandu", country: "Nepal", budget: "low", safety: "generally_safe", food: 3.8, nature: 4.8, nightlife: 2.5, culture: 4.5, adventure: 4.9, transport: 2.5, familyFriendly: 2.8, soloFriendly: 4.3, coupleFriendly: 3.8, popularity: 55, climate: generateClimate(27.7), crowdLevel: generateCrowdLevel(55) },
  { cityName: "Siem Reap", country: "Cambodia", budget: "low", safety: "generally_safe", food: 4.0, nature: 3.5, nightlife: 3.0, culture: 4.8, adventure: 3.8, transport: 2.8, familyFriendly: 3.0, soloFriendly: 4.3, coupleFriendly: 4.2, popularity: 60, climate: generateClimate(13.3), crowdLevel: generateCrowdLevel(60) },
  // North America
  { cityName: "New York", country: "United States", budget: "high", safety: "generally_safe", food: 4.8, nature: 3.0, nightlife: 4.8, culture: 4.9, adventure: 3.0, transport: 4.5, familyFriendly: 4.0, soloFriendly: 4.5, coupleFriendly: 4.5, popularity: 96, climate: generateClimate(40.7), crowdLevel: generateCrowdLevel(96) },
  { cityName: "Los Angeles", country: "United States", budget: "high", safety: "generally_safe", food: 4.5, nature: 4.2, nightlife: 4.3, culture: 4.2, adventure: 3.8, transport: 3.0, familyFriendly: 4.0, soloFriendly: 3.8, coupleFriendly: 4.2, popularity: 85, climate: generateClimate(34.0), crowdLevel: generateCrowdLevel(85) },
  { cityName: "San Francisco", country: "United States", budget: "high", safety: "generally_safe", food: 4.5, nature: 4.3, nightlife: 4.0, culture: 4.3, adventure: 3.8, transport: 4.0, familyFriendly: 3.8, soloFriendly: 4.3, coupleFriendly: 4.2, popularity: 78, climate: generateClimate(37.7), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Chicago", country: "United States", budget: "medium", safety: "generally_safe", food: 4.5, nature: 3.2, nightlife: 4.3, culture: 4.5, adventure: 2.8, transport: 4.2, familyFriendly: 4.0, soloFriendly: 4.0, coupleFriendly: 4.0, popularity: 72, climate: generateClimate(41.8), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Miami", country: "United States", budget: "high", safety: "generally_safe", food: 4.3, nature: 4.0, nightlife: 4.8, culture: 3.5, adventure: 3.5, transport: 3.2, familyFriendly: 3.8, soloFriendly: 4.0, coupleFriendly: 4.5, popularity: 82, climate: generateClimate(25.7), crowdLevel: generateCrowdLevel(82) },
  { cityName: "Toronto", country: "Canada", budget: "medium", safety: "very_safe", food: 4.3, nature: 3.5, nightlife: 4.0, culture: 4.3, adventure: 3.0, transport: 4.3, familyFriendly: 4.5, soloFriendly: 4.2, coupleFriendly: 4.0, popularity: 70, climate: generateClimate(43.6), crowdLevel: generateCrowdLevel(70) },
  { cityName: "Vancouver", country: "Canada", budget: "high", safety: "very_safe", food: 4.3, nature: 4.8, nightlife: 3.5, culture: 4.0, adventure: 4.5, transport: 4.2, familyFriendly: 4.5, soloFriendly: 4.3, coupleFriendly: 4.5, popularity: 72, climate: generateClimate(49.2), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Mexico City", country: "Mexico", budget: "low", safety: "be_cautious", food: 4.8, nature: 3.0, nightlife: 4.3, culture: 4.7, adventure: 3.5, transport: 3.8, familyFriendly: 3.2, soloFriendly: 4.0, coupleFriendly: 4.3, popularity: 78, climate: generateClimate(19.4), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Havana", country: "Cuba", budget: "low", safety: "generally_safe", food: 3.8, nature: 3.5, nightlife: 4.0, culture: 4.5, adventure: 3.5, transport: 2.5, familyFriendly: 3.0, soloFriendly: 3.8, coupleFriendly: 4.3, popularity: 60, climate: generateClimate(23.1), crowdLevel: generateCrowdLevel(60) },
  { cityName: "Cancun", country: "Mexico", budget: "medium", safety: "generally_safe", food: 4.0, nature: 4.5, nightlife: 4.5, culture: 3.0, adventure: 4.0, transport: 3.0, familyFriendly: 4.0, soloFriendly: 3.5, coupleFriendly: 4.5, popularity: 82, climate: generateClimate(21.1), crowdLevel: generateCrowdLevel(82) },
  { cityName: "Oaxaca", country: "Mexico", budget: "low", safety: "generally_safe", food: 4.9, nature: 4.0, nightlife: 3.2, culture: 4.8, adventure: 3.8, transport: 2.8, familyFriendly: 3.5, soloFriendly: 4.5, coupleFriendly: 4.5, popularity: 65, climate: generateClimate(17.0), crowdLevel: generateCrowdLevel(65) },
  { cityName: "Austin", country: "United States", budget: "medium", safety: "very_safe", food: 4.5, nature: 3.5, nightlife: 4.5, culture: 4.0, adventure: 3.2, transport: 3.0, familyFriendly: 4.0, soloFriendly: 4.3, coupleFriendly: 4.2, popularity: 62, climate: generateClimate(30.2), crowdLevel: generateCrowdLevel(62) },
  { cityName: "Nashville", country: "United States", budget: "medium", safety: "generally_safe", food: 4.3, nature: 3.2, nightlife: 4.7, culture: 4.0, adventure: 2.8, transport: 2.8, familyFriendly: 3.8, soloFriendly: 4.0, coupleFriendly: 4.3, popularity: 60, climate: generateClimate(36.1), crowdLevel: generateCrowdLevel(60) },
  // South America
  { cityName: "Buenos Aires", country: "Argentina", budget: "low", safety: "generally_safe", food: 4.5, nature: 3.0, nightlife: 4.7, culture: 4.6, adventure: 3.0, transport: 4.0, familyFriendly: 3.5, soloFriendly: 4.3, coupleFriendly: 4.6, popularity: 75, climate: generateClimate(-34.6), crowdLevel: generateCrowdLevel(75) },
  { cityName: "Rio de Janeiro", country: "Brazil", budget: "medium", safety: "be_cautious", food: 4.3, nature: 4.8, nightlife: 4.7, culture: 4.3, adventure: 4.2, transport: 3.5, familyFriendly: 3.2, soloFriendly: 3.5, coupleFriendly: 4.5, popularity: 82, climate: generateClimate(-22.9), crowdLevel: generateCrowdLevel(82) },
  { cityName: "São Paulo", country: "Brazil", budget: "medium", safety: "be_cautious", food: 4.7, nature: 2.8, nightlife: 4.5, culture: 4.3, adventure: 2.8, transport: 3.8, familyFriendly: 3.0, soloFriendly: 3.5, coupleFriendly: 4.0, popularity: 60, climate: generateClimate(-23.5), crowdLevel: generateCrowdLevel(60) },
  { cityName: "Lima", country: "Peru", budget: "low", safety: "generally_safe", food: 4.8, nature: 3.2, nightlife: 3.8, culture: 4.3, adventure: 3.5, transport: 3.2, familyFriendly: 3.2, soloFriendly: 3.8, coupleFriendly: 4.0, popularity: 65, climate: generateClimate(-12.0), crowdLevel: generateCrowdLevel(65) },
  { cityName: "Bogotá", country: "Colombia", budget: "low", safety: "be_cautious", food: 4.2, nature: 3.5, nightlife: 4.0, culture: 4.2, adventure: 3.5, transport: 3.5, familyFriendly: 3.0, soloFriendly: 3.5, coupleFriendly: 3.8, popularity: 55, climate: generateClimate(4.7), crowdLevel: generateCrowdLevel(55) },
  { cityName: "Medellín", country: "Colombia", budget: "low", safety: "generally_safe", food: 4.2, nature: 4.0, nightlife: 4.3, culture: 3.8, adventure: 3.8, transport: 3.5, familyFriendly: 3.0, soloFriendly: 4.3, coupleFriendly: 4.2, popularity: 70, climate: generateClimate(6.2), crowdLevel: generateCrowdLevel(70) },
  { cityName: "Cartagena", country: "Colombia", budget: "medium", safety: "generally_safe", food: 4.3, nature: 4.2, nightlife: 4.0, culture: 4.5, adventure: 3.5, transport: 3.0, familyFriendly: 3.5, soloFriendly: 4.0, coupleFriendly: 4.7, popularity: 72, climate: generateClimate(10.3), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Cusco", country: "Peru", budget: "low", safety: "generally_safe", food: 4.2, nature: 4.8, nightlife: 3.2, culture: 4.9, adventure: 4.8, transport: 2.8, familyFriendly: 3.0, soloFriendly: 4.5, coupleFriendly: 4.5, popularity: 72, climate: generateClimate(-13.5), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Santiago", country: "Chile", budget: "medium", safety: "generally_safe", food: 4.2, nature: 4.0, nightlife: 3.8, culture: 4.0, adventure: 3.5, transport: 4.0, familyFriendly: 3.8, soloFriendly: 4.0, coupleFriendly: 4.0, popularity: 55, climate: generateClimate(-33.4), crowdLevel: generateCrowdLevel(55) },
  // Africa
  { cityName: "Cape Town", country: "South Africa", budget: "medium", safety: "be_cautious", food: 4.5, nature: 4.9, nightlife: 4.0, culture: 4.2, adventure: 4.5, transport: 3.2, familyFriendly: 3.5, soloFriendly: 4.0, coupleFriendly: 4.7, popularity: 80, climate: generateClimate(-33.9), crowdLevel: generateCrowdLevel(80) },
  { cityName: "Marrakech", country: "Morocco", budget: "low", safety: "generally_safe", food: 4.5, nature: 3.5, nightlife: 3.2, culture: 4.8, adventure: 4.0, transport: 3.0, familyFriendly: 3.2, soloFriendly: 3.8, coupleFriendly: 4.5, popularity: 78, climate: generateClimate(31.6), crowdLevel: generateCrowdLevel(78) },
  { cityName: "Cairo", country: "Egypt", budget: "low", safety: "generally_safe", food: 4.0, nature: 3.0, nightlife: 3.0, culture: 4.9, adventure: 4.0, transport: 3.0, familyFriendly: 3.0, soloFriendly: 3.2, coupleFriendly: 3.8, popularity: 72, climate: generateClimate(30.0), crowdLevel: generateCrowdLevel(72) },
  { cityName: "Nairobi", country: "Kenya", budget: "medium", safety: "be_cautious", food: 3.8, nature: 4.5, nightlife: 3.5, culture: 4.0, adventure: 4.5, transport: 3.0, familyFriendly: 3.0, soloFriendly: 3.5, coupleFriendly: 3.8, popularity: 55, climate: generateClimate(-1.2), crowdLevel: generateCrowdLevel(55) },
  { cityName: "Accra", country: "Ghana", budget: "low", safety: "generally_safe", food: 4.0, nature: 3.5, nightlife: 3.8, culture: 4.0, adventure: 3.2, transport: 2.8, familyFriendly: 3.2, soloFriendly: 3.5, coupleFriendly: 3.5, popularity: 40, climate: generateClimate(5.6), crowdLevel: generateCrowdLevel(40) },
  { cityName: "Lagos", country: "Nigeria", budget: "medium", safety: "be_cautious", food: 4.0, nature: 2.8, nightlife: 4.2, culture: 3.8, adventure: 3.0, transport: 2.5, familyFriendly: 2.5, soloFriendly: 3.0, coupleFriendly: 3.2, popularity: 45, climate: generateClimate(6.5), crowdLevel: generateCrowdLevel(45) },
  { cityName: "Zanzibar City", country: "Tanzania", budget: "low", safety: "generally_safe", food: 4.0, nature: 4.8, nightlife: 2.8, culture: 4.3, adventure: 4.0, transport: 2.5, familyFriendly: 3.0, soloFriendly: 4.0, coupleFriendly: 4.7, popularity: 60, climate: generateClimate(-6.1), crowdLevel: generateCrowdLevel(60) },
  { cityName: "Dakar", country: "Senegal", budget: "low", safety: "generally_safe", food: 4.0, nature: 3.5, nightlife: 3.5, culture: 4.0, adventure: 3.5, transport: 2.8, familyFriendly: 3.0, soloFriendly: 3.5, coupleFriendly: 3.5, popularity: 38, climate: generateClimate(14.7), crowdLevel: generateCrowdLevel(38) },
  // Oceania
  { cityName: "Sydney", country: "Australia", budget: "high", safety: "very_safe", food: 4.5, nature: 4.5, nightlife: 4.3, culture: 4.3, adventure: 4.0, transport: 4.2, familyFriendly: 4.5, soloFriendly: 4.3, coupleFriendly: 4.5, popularity: 88, climate: generateClimate(-33.8), crowdLevel: generateCrowdLevel(88) },
  { cityName: "Melbourne", country: "Australia", budget: "high", safety: "very_safe", food: 4.7, nature: 4.0, nightlife: 4.3, culture: 4.5, adventure: 3.5, transport: 4.3, familyFriendly: 4.3, soloFriendly: 4.5, coupleFriendly: 4.3, popularity: 80, climate: generateClimate(-37.8), crowdLevel: generateCrowdLevel(80) },
  { cityName: "Auckland", country: "New Zealand", budget: "medium", safety: "very_safe", food: 4.0, nature: 4.8, nightlife: 3.5, culture: 3.8, adventure: 4.5, transport: 3.5, familyFriendly: 4.5, soloFriendly: 4.2, coupleFriendly: 4.3, popularity: 62, climate: generateClimate(-36.8), crowdLevel: generateCrowdLevel(62) },
  { cityName: "Queenstown", country: "New Zealand", budget: "high", safety: "very_safe", food: 3.8, nature: 4.9, nightlife: 3.0, culture: 3.2, adventure: 4.9, transport: 2.8, familyFriendly: 3.8, soloFriendly: 4.5, coupleFriendly: 4.8, popularity: 68, climate: generateClimate(-45.0), crowdLevel: generateCrowdLevel(68) },
  { cityName: "Fiji", country: "Fiji", budget: "medium", safety: "very_safe", food: 3.5, nature: 4.9, nightlife: 2.5, culture: 3.5, adventure: 4.5, transport: 2.5, familyFriendly: 4.0, soloFriendly: 3.5, coupleFriendly: 4.8, popularity: 60, climate: generateClimate(-17.7), crowdLevel: generateCrowdLevel(60) },
];

export function getCityScore(cityName: string): CityScore | undefined {
  return cityScores.find(s => s.cityName.toLowerCase() === cityName.toLowerCase());
}

export type BudgetFilter = "low" | "medium" | "high";
export type SafetyFilter = "very_safe" | "generally_safe" | "be_cautious";
export type TravelStyleFilter = "family" | "solo" | "couple";
export type PreferenceFilter = "food" | "nature" | "nightlife" | "culture" | "adventure";

export interface ExploreFilters {
  budget?: BudgetFilter[];
  safety?: SafetyFilter[];
  travelStyle?: TravelStyleFilter[];
  preferences?: PreferenceFilter[];
  month?: number; // 1-12
}

export function rankCities(filters: ExploreFilters): CityScore[] {
  return cityScores
    .map(city => {
      let score = city.popularity;

      // Budget match
      if (filters.budget?.length) {
        score += filters.budget.includes(city.budget) ? 20 : -10;
      }

      // Safety match
      if (filters.safety?.length) {
        score += filters.safety.includes(city.safety) ? 15 : -10;
      }

      // Travel style
      if (filters.travelStyle?.length) {
        const styleScores: Record<TravelStyleFilter, number> = {
          family: city.familyFriendly,
          solo: city.soloFriendly,
          couple: city.coupleFriendly,
        };
        const avgStyleMatch = filters.travelStyle.reduce((sum, s) => sum + styleScores[s], 0) / filters.travelStyle.length;
        score += avgStyleMatch * 5;
      }

      // Preferences
      if (filters.preferences?.length) {
        const prefScores: Record<PreferenceFilter, number> = {
          food: city.food,
          nature: city.nature,
          nightlife: city.nightlife,
          culture: city.culture,
          adventure: city.adventure,
        };
        const avgPrefMatch = filters.preferences.reduce((sum, p) => sum + prefScores[p], 0) / filters.preferences.length;
        score += avgPrefMatch * 6;
      }

      // Season/climate
      if (filters.month) {
        const grade = city.climate[filters.month];
        const climateBonus = grade === "A" ? 15 : grade === "B" ? 5 : grade === "C" ? -5 : -15;
        score += climateBonus;

        const crowd = city.crowdLevel[filters.month];
        score += crowd === "low" ? 3 : crowd === "moderate" ? 0 : -3;
      }

      return { city, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.city);
}
