import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  `${process.cwd()}/supabase/migrations/20260926190000_seed_editorial_city_metrics.sql`,
  "utf8",
);
const catalogSeed = readFileSync(
  `${process.cwd()}/supabase/migrations/20260921183500_catalog_seed.sql`,
  "utf8",
);

describe("one-time editorial city metrics seed", () => {
  it("contains exactly one score set for all 50 catalogue cities", () => {
    const scoreRows = [...migration.matchAll(/^\s*\('([^']+)',\s*'(low|medium|high)',/gm)];
    const citySlugs = scoreRows.map((match) => match[1]);
    const catalogueSlugs = [...catalogSeed.matchAll(/^\s*\('([^']+)',\s*'[^']+',\s*'[^']+',\s*'[A-Z]{2}',/gm)]
      .map((match) => match[1]);

    expect(scoreRows).toHaveLength(50);
    expect(new Set(citySlugs).size).toBe(50);
    expect(citySlugs.sort()).toEqual(catalogueSlugs.sort());
  });

  it("stores five metrics with explicit one-time AI provenance", () => {
    expect(migration).toContain("('budget'::text");
    expect(migration).toContain("('food'::text");
    expect(migration).toContain("('culture'::text");
    expect(migration).toContain("('nature'::text");
    expect(migration).toContain("('nightlife'::text");
    expect(migration).toContain("Globethrotters one-time AI editorial estimate");
    expect(migration).toContain("One-time model editorial judgment; no live source retrieval");
  });
});
