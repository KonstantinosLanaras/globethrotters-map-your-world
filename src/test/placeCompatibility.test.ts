import { describe, expect, it } from "vitest";
import { isMissingCatalogItemColumn } from "@/lib/databaseErrors";

describe("catalogue save compatibility", () => {
  it("recognizes Postgres and PostgREST missing-column errors", () => {
    expect(isMissingCatalogItemColumn({ code: "42703", message: "column does not exist" })).toBe(true);
    expect(isMissingCatalogItemColumn({ code: "PGRST204", message: "schema cache" })).toBe(true);
    expect(isMissingCatalogItemColumn({ message: "Could not find catalog_item_id" })).toBe(true);
  });

  it("does not hide unrelated database failures", () => {
    expect(isMissingCatalogItemColumn({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingCatalogItemColumn(null)).toBe(false);
  });
});
