import { describe, expect, it } from "vitest";
import { cityScores, rankCities } from "@/data/cityScores";

describe("destination metric ranking", () => {
  it("ranks the supplied live score set instead of only bundled fallbacks", () => {
    const liveScores = cityScores.slice(0, 2).map((city) => ({ ...city }));
    liveScores[0].food = 1;
    liveScores[1].food = 5;

    const ranked = rankCities({ preferences: ["food"] }, liveScores);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].cityName).toBe(liveScores[1].cityName);
  });
});
