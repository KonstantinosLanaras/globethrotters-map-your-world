import postgres from "npm:postgres@3.4.4";
import { SQL } from "./migration.ts";
const TOKEN = "7f38a2593db6d43c41e281aa1085d6b82837d5385d1fb9c3";
Deno.serve(async (req) => {
  if (req.headers.get("x-op-token") !== TOKEN) return new Response("no", { status: 401 });
  const { action, body } = await req.json();
  if (action === "migrate") {
    const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1 });
    try {
      await sql.begin(async (tx) => { await tx.unsafe(SQL); });
      const rows = await sql`select c.slug, i.canonical_category, count(*)::int n from catalog_items i join catalog_cities c on c.id=i.city_id where i.is_active and c.slug in ('amsterdam-nl','berlin-de','dublin-ie','istanbul-tr','madrid-es','milan-it','prague-cz','vienna-at') group by 1,2 order by 1,2`;
      return Response.json({ ok: true, rows });
    } catch (e) { return Response.json({ ok: false, error: String(e) }, { status: 500 }); }
    finally { await sql.end(); }
  }
  if (action === "pilot") {
    const r = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/import-google-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-catalog-import-secret": Deno.env.get("CATALOG_IMPORT_SECRET")! },
      body: JSON.stringify(body),
    });
    return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
  }
  return new Response("bad", { status: 400 });
});
