# Madeira strategy-first catalogue pilot

## Decision order

1. Build the editorial strategy and destination-specific candidate pool first.
2. Run a read-only source audit to confirm identities, geometry, place hierarchy,
   access and bookable-product links.
3. Review matches and unresolved facts editorially.
4. Only then prepare small, idempotent Supabase import batches. Discovery data is
   never published automatically.

The database is evidence for identity and structure; it does not decide which
experiences make the guide. The approximately 180 recommendations are a
discovery pool, not a promise to publish 180 entries or a category quota.

## Destination strategy brief

Madeira suits independent travellers, couples and friend groups seeking active
days, dramatic landscapes, relaxed food and a few social evenings. A 5–9 night
trip can support multiple island regions and weather-flexible alternatives.
Guidance should distinguish the island's regions, travel time and elevation,
not treat every attraction as a Funchal day trip. Include Porto Santo only as a
clearly labelled separate-island option with transport context.

Planning dimensions for the editorial pass:

- **Core trip shape:** 5–9 nights; a Funchal base works for some plans, while
  west, north and east coast stays can reduce driving for region-focused trips.
- **Traveller modes:** solo, couple and friend group; note when a car, guide,
  boat or advance booking changes feasibility.
- **Value:** include low-cost self-guided options as well as paid tours; do not
  equate a higher price with a better recommendation.
- **Season and time:** include weather-sensitive alternatives, sunrise/sunset
  timing, swimming conditions and current trail-access checks where relevant.
- **Local differentiation:** give useful combinations, route context, timing and
  neighbourhood or region character that a generic map pin does not provide.
- **Content mix:** begin with routes/levadas and mountain walks, viewpoints and
  peaks, coast/natural pools, towns and local areas, food/drink, cultural
  landmarks/gardens, sea activities and a smaller social/nightlife layer. Adjust
  the balance after the candidate pool and source coverage are reviewed.

## LLM generation prompt

Use this as the first content-generation pass. It deliberately requests no
coordinates and forbids fabricated verification.

> You are the destination editor for Globetrotters, a travel discovery guide for
> independent European travellers aged roughly 25–35. Create an approximately
> 180-item **Madeira recommendation candidate pool** for solo travellers,
> couples and groups of friends. First reason about why this audience visits,
> typical trip length and value, island regions, transport, seasonality, and the
> guide's added value beyond a map search. Use a flexible, Madeira-specific mix
> spanning worthwhile hiking routes and levadas, peaks, viewpoints, coast and
> natural pools, towns/areas, local food and drink, culture/gardens, sea
> activities, and a smaller nightlife/social layer. Include iconic essentials,
> local atmosphere, active experiences, reasonable-value ideas and practical
> afternoon/evening combinations. Do not fill a category quota.
>
> Return JSON with a strategy summary and a list of distinct candidates. Every
> candidate must include: `candidate_id`, `name`, `destination_scope` (`Madeira`), `content_kind` (`place`,
> `route`, `area`, or `timed_experience`), proposed top-level category and
> subcategory, concise useful editorial description, audience-fit score,
> essentiality, local distinctiveness, value, social potential (each 0–5 with a
> one-line rationale), suitable traveller types, budget level, typical duration,
> best season/time, expected locality/region, and confidence that the named
> entity/experience genuinely exists (0–1 with rationale). Add `source_checks`
> as an empty array and set `verification_status` to `unverified_candidate`.
> Add `entity_components` for named physical anchors that make up a broader
> recommendation (for example, a sunrise outing can refer to its named summit
> and trail relation). The parent recommendation may have no coordinates; that
> must not prevent matching its named components to source records. Coordinates
> and geometry returned by a confirmed source match are enrichment and should
> be kept with the match provenance, not fabricated onto the LLM candidate.
>
> Coordinates, provider IDs, route geometry, current access, prices, ratings,
> opening hours and source claims must be null/unknown until independently
> verified. Never invent a location or claim that a source was checked.
>
> Avoid duplicate recommendations under alternate spellings. Treat two
> variants as separate only when their route, endpoints, duration, access or
> traveller experience materially differs. Keep a route, its trailhead and a
> guided tour as related but separate content kinds. Flag safety or access facts
> that need current official verification. Do not present bookable products as
> permanent places.

## Read-only source comparison

Keep the LLM candidate file immutable during source matching. Each source
adapter should append a match result rather than rewrite the editorial
candidate. Match in this order:

1. Exact stable source identifier, if present.
2. Exact/alternate-name agreement plus compatible entity type and plausible
   coordinates.
3. Candidate geographic hierarchy (island, municipality/locality, nearby
   settlement) to expose cross-municipality or wrong-island matches.
4. Near-tied identities remain ambiguous for human review. Proximity alone
   never confirms a match.

Record per-source status as `matched`, `ambiguous`, `unmatched`, `not_checked`,
or `not_applicable`, with source ID, match method, distance, checked date and a
short rationale. The pilot report should show, overall and by content kind:

- Overture identity and point coverage for conventional places;
- OSM named feature and route-relation coverage, route geometry, tags, distance
  calculated from geometry, endpoints, access/surface, and `sac_scale` where
  supplied;
- GeoNames locality/hierarchy resolution and alternate names;
- Wikidata stable identities, coordinates, official website and administrative
  location for major anchors;
- official trail identity and **current** access/status verification;
- Outdooractive route/POI coverage only if a project/API agreement allows the
  required storage, display, geometry and description use;
- Viator bookable-product matches in a separate product layer, not merged with
  permanent places;
- useful unmatched editorial recommendations and the reason no source match is
  expected.

The report must distinguish database coverage from editorial approval. An
unmatched but credible neighbourhood walk can remain a curated recommendation;
an OSM match alone does not make a candidate publishable.

For normalized source exports, the read-only comparator is
`scripts/compare_madeira_sources.py`. Its input has `candidates` and `sources`
arrays; source rows use `id`, `name`, `alt_names`, `latitude`, `longitude`,
`feature_type`, `locality` and `url`. A source may also be supplied as an object
with an explicit `scope` and `records` array, for example a Madeira-bounded
Overpass export. A unique exact name within that declared destination scope can
match without candidate coordinates; returned coordinates/geometry become
traceable enrichment. Name-only matches without locality or an explicit source
scope stay ambiguous. Named `entity_components` are compared separately from
the parent experience. Run it with:

```sh
PYTHONPATH=scripts python scripts/compare_madeira_sources.py \
  --input data/madeira/source-audit-input.json \
  --output data/madeira/source-audit-report.json
```

The comparison report is separate from the editorial candidate file. Missing
source exports report as `not_checked`; they are never treated as a successful
match. This command reads local snapshots only and makes no network or database
calls.

## Data and licensing boundary

Overture places are point representations and expose structured names,
taxonomy, geometry and source information; they are a stronger fit for
conventional place identity than complete hiking-route geometry. OSM route
relations can carry ordered path members and route/access/surface/difficulty
tags, but coverage and tag completeness vary. GeoNames and Wikidata enrich
names, identities and hierarchy rather than select experiences. Outdooractive
and Viator require separate commercial/API and content-use review. Official
Madeira sources are needed for current trail status and access; store a checked
date and link rather than treating status as permanent.

Do not copy provider descriptions, photos, ratings, availability or prices into
the permanent catalogue unless the applicable licence/API terms permit that
storage and display. Keep source data, derived editorial text and bookable
products in distinct fields/layers with attribution and retention rules.
