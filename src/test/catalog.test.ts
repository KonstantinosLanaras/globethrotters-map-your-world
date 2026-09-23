import { describe, expect, it } from "vitest";
import { curatedExperiences } from "@/data/curatedExperiences";

const categories = new Set(["food", "culture", "nature", "hiking", "nightlife"]);

describe("catalogue seed", () => {
  it("uses the canonical category vocabulary", () => {
    for (const item of curatedExperiences) expect(categories.has(item.category)).toBe(true);
  });

  it("has valid, distinct map coordinates", () => {
    const coordinatePairs = new Set<string>();
    for (const item of curatedExperiences) {
      expect(item.lat).toBeGreaterThanOrEqual(-90);
      expect(item.lat).toBeLessThanOrEqual(90);
      expect(item.lng).toBeGreaterThanOrEqual(-180);
      expect(item.lng).toBeLessThanOrEqual(180);
      coordinatePairs.add(`${item.lat},${item.lng}`);
    }
    expect(coordinatePairs.size).toBe(curatedExperiences.length);
  });

  it("retains an honest source and quality tier", () => {
    for (const item of curatedExperiences) {
      expect(item.source).toBe("curated");
      expect(item.popularity_score).toBeGreaterThan(0);
    }
  });
});
