import { describe, expect, it } from "vitest";
import {
  findCatalogMatch,
  normalizePlaceName,
  placeNameSimilarity,
} from "../../supabase/functions/_shared/catalogMatching";

describe("Google-to-catalogue matching", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizePlaceName("Museo Nacional del Prado"))
      .toBe("museo nacional del prado");
    expect(normalizePlaceName("Café Central – Wien"))
      .toBe("cafe central wien");
  });

  it("matches the same nearby place without confusing a distant namesake", () => {
    const match = findCatalogMatch(
      { displayName: "Rijksmuseum", latitude: 52.36, longitude: 4.8852 },
      [
        { id: "near", name: "Rijksmuseum", latitude: 52.359998, longitude: 4.885219 },
        { id: "far", name: "Rijksmuseum", latitude: 52.5, longitude: 4.9 },
      ],
    );

    expect(match?.item.id).toBe("near");
    expect(match?.score).toBeGreaterThan(0.95);
  });

  it("rejects a nearby place with an unrelated name", () => {
    const match = findCatalogMatch(
      { displayName: "Museum of Modern Art", latitude: 40.7614, longitude: -73.9776 },
      [{ id: "other", name: "Joe's Pizza", latitude: 40.76141, longitude: -73.97761 }],
    );

    expect(match).toBeNull();
    expect(placeNameSimilarity("Museum of Modern Art", "Joe's Pizza")).toBe(0);
  });
});
