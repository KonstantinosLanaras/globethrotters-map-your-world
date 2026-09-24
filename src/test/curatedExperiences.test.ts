import { describe, expect, it } from "vitest";
import { getCuratedExperiences } from "@/data/curatedExperiences";

describe("curated experience catalog", () => {
  it("returns editorial defaults for an MVP city", () => {
    const paris = getCuratedExperiences("Paris", "France");

    expect(paris).toHaveLength(10);
    expect(paris.every((item) => item.source === "curated")).toBe(true);
    expect(paris.map((item) => item.popularity_score)).toEqual(
      [...paris.map((item) => item.popularity_score)].sort((a, b) => b - a),
    );
  });

  it("matches city and country without case sensitivity", () => {
    expect(getCuratedExperiences("lisbon", "PORTUGAL")).toHaveLength(10);
  });

  it("does not leak entries from another destination", () => {
    const athens = getCuratedExperiences("Athens", "Greece");

    expect(athens.every((item) => item.city === "Athens")).toBe(true);
    expect(athens.some((item) => item.name === "Sagrada Família")).toBe(false);
  });
});
