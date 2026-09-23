import { describe, expect, it } from "vitest";
import { rankDestinationSuggestions } from "@/data/destinationSuggestions";

describe("rules-based destination suggestions", () => {
  it("boosts destinations matching stated interests", () => {
    const suggestions = rankDestinationSuggestions(["art", "food"], "cultural", []);

    expect(suggestions[0].name).toBe("Paris");
    expect(suggestions[0].match_score).toBeGreaterThan(68);
  });

  it("excludes visited and wishlist destinations", () => {
    const suggestions = rankDestinationSuggestions(["history"], "explorer", ["Rome", "Athens"]);

    expect(suggestions.map((item) => item.name)).not.toContain("Rome");
    expect(suggestions.map((item) => item.name)).not.toContain("Athens");
  });
});
