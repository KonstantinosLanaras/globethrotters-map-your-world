export type MatchablePlace = {
  latitude: number;
  longitude: number;
};

export type MatchableCatalogItem = MatchablePlace & {
  id: string;
  name: string;
};

export const normalizePlaceName = (value: string) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const placeNameSimilarity = (left: string, right: string) => {
  const normalizedLeft = normalizePlaceName(left);
  const normalizedRight = normalizePlaceName(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 0.88;

  const leftTokens = new Set(normalizedLeft.split(" "));
  const rightTokens = new Set(normalizedRight.split(" "));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
};

export const placeDistanceMeters = (left: MatchablePlace, right: MatchablePlace) => {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const startLatitude = radians(left.latitude);
  const endLatitude = radians(right.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const findCatalogMatch = <T extends MatchableCatalogItem>(
  candidate: MatchablePlace & { displayName: string },
  items: T[],
) => {
  const ranked = items.map((item) => {
    const nameScore = placeNameSimilarity(candidate.displayName, item.name);
    const distance = placeDistanceMeters(candidate, item);
    const distanceScore = Math.max(0, 1 - distance / 750);
    return { item, nameScore, distance, score: nameScore * 0.75 + distanceScore * 0.25 };
  }).sort((left, right) => right.score - left.score);

  const best = ranked[0];
  if (!best) return null;
  const credible = (best.nameScore >= 0.6 && best.distance <= 750)
    || (best.nameScore >= 0.35 && best.distance <= 120);
  if (!credible || best.score < 0.58) return null;
  return { item: best.item, score: Math.round(best.score * 1000) / 1000 };
};
