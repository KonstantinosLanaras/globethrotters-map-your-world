Deno.serve(async (req) => {
  if (req.headers.get("x-op-token") !== "49c2c4b3b065fab5507b20788ed703f7cc9d11abe6be31e6") return new Response("no", { status: 401 });
  const r = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/import-google-candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-catalog-import-secret": Deno.env.get("CATALOG_IMPORT_SECRET")! },
    body: await req.text(),
  });
  return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
});
