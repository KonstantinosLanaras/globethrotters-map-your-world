export type DatabaseError = { code?: string; message?: string } | null;

export const isMissingCatalogItemColumn = (error: DatabaseError) =>
  Boolean(error && (
    error.code === "42703"
    || error.code === "PGRST204"
    || error.message?.toLocaleLowerCase().includes("catalog_item_id")
  ));
