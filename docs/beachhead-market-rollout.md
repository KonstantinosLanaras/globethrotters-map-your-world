# Beachhead market catalogue rollout

## Current scope and status

The current plan is the **42-destination beachhead**, with ten pilots: Milan,
Barcelona, the Balearic Islands, Madeira, Iceland, the Dolomites, Japan,
Thailand, Patagonia and Morocco. This supersedes the earlier 50-European-city
rollout as the active catalogue plan. These destinations include islands,
regions and multi-stop areas, not just cities.

Milan's existing catalogue and matching workflow are the baseline. The Lovable
preview has shown the Milan locations; the reported working set is 152
publishable records with 8 uncertain matches in review. Preserve those records
and human decisions. Live database counts still need to be confirmed by the
project owner in Lovable.

The next editorial validation pilots are Barcelona and Madeira. Madeira is the
route/geography benchmark; do not produce generic OSM category quotas or import
raw candidate coverage as if it were an editorial guide.

## Repeatable destination funnel

For each destination, run these stages in order:

1. **Destination strategy:** explain why independent European travellers aged
   about 25–35 visit, normal trip shape and budget, traveller modes, subregions,
   seasonality, destination character and how Globetrotters adds value beyond a
   map search. Decide a flexible allocation across experiences, not four fixed
   category quotas.
2. **Editorial candidates:** use the strategy to generate distinctive,
   desirable recommendations, including places, routes, areas and timed
   experiences. Record scores for audience fit, essentiality, local
   distinctiveness, activity quality, value/accessibility, social potential
   and existence confidence. Do not invent coordinates, provider IDs,
   addresses, ratings or source checks.
3. **Normalize and deduplicate:** use Python to normalize names and aliases,
   classify content kind, detect duplicates and preserve the editorial
   candidate even when no provider match exists.
4. **Read-only source confirmation:** query appropriate sources and attach
   match decisions without changing the editorial candidate. Prefer exact
   stable IDs; otherwise compare aliases, coordinates, locality hierarchy and
   feature type. Close distinct attractions remain distinct; ties stay in
   review.
5. **Quality gate:** check anchor coverage, experience diversity, locality,
   duplicate clusters, accessibility/safety facts and source/provenance. Review
   all ambiguous and unmatched candidates; do not silently discard them.
6. **Import:** create small, idempotent SQL batches (about 20 rows), preserve
   existing catalogue IDs and quality tiers, and import only editor-approved
   records. Unreviewed discoveries stay private.

## Madeira strategy-first pilot

Use `docs/madeira-strategy-first-pilot.md` for the destination brief, generation
prompt, source responsibilities and report design. The approximately 180-item
LLM output is a candidate pool, not an import target. First generate and save
the strategy and candidates, then perform the read-only source comparison. Do
not import until the comparison and editorial review are complete.

Use `queries/madeira_overpass_routes_features.overpassql` in Overpass Turbo to
inspect named route relations, viewpoints, beaches, nature reserves and
attractions. Export the results as source evidence; keep full route geometry
and OSM IDs for trail candidates. Overpass/OSM coverage does not establish
quality, popularity or current trail status.

## Source roles and adoption potential

| Source | Use in the pilot | Potential / constraint |
|---|---|---|
| Overture Maps | Read-only identity and coordinates for conventional places; inspect names, alternate names, taxonomy, source and operating-status fields | High for point places; its Places theme represents points and is not a complete hiking-route source. Explorer: https://explore.overturemaps.org/ |
| OpenStreetMap / Overpass | Route relations, route geometry, viewpoints, beaches, natural features, access/surface and `sac_scale` when mapped | Very high for outdoor geometry; completeness and current status vary. Attribute OSM and respect ODbL. |
| GeoNames | Locality names, aliases, feature types and geographic hierarchy | High for destination/locality resolution; not an experience-selection source. |
| Wikidata | Stable IDs, labels, coordinates, official website and administrative relationships for major anchors | Useful factual enrichment; not a popularity or current-operations source. Query service: https://query.wikidata.org/ |
| Visit Madeira / IFCN | Official trail identity, access conditions, fees/reservations and current status | Essential for trail safety/freshness. Store source URL and check time; status can change. Official trail list: https://visitmadeira.com/en/what-to-do/nature-seekers/notice-to-walkers-and-list-of-walks/ |
| Outdooractive | Compare professionally structured route/POI content, geometry and details | High potential for outdoor coverage; Data API requires an API key and project key. Confirm storage/display rights, geography and commercial terms before integration: https://developers.outdooractive.com/API-Reference/Data-API.html |
| Viator | Match selected recommendations to current bookable tours, activities and availability | High commercial potential as a separate provider layer. Do not merge products, price/availability or provider copy into permanent places: https://docs.viator.com/partner-api/ |
| Protected Planet | Research-only check for protected-area identity | Do not use in commercial production without permission; current API says it is not available for commercial use: https://api.protectedplanet.net/ |
| Wikivoyage | Editorial research for missed ideas and itinerary context | Reference only unless a CC BY-SA compliant content workflow is deliberately adopted; do not copy descriptions. |

The comparison report should show candidate counts and matched, ambiguous,
unmatched, not-checked and not-applicable counts by source and content kind. It
should separately identify useful editorial candidates with no database match.
Database coverage is not the publication metric.

## Nearby recommendations compatibility

Keep the future opt-in “Near me” feature compatible with these content kinds.
Only reviewed public records with a real verified anchor or route geometry can
appear. Routes need a real start/line geometry; areas need a deliberate anchor
or polygon. Do not use fake city-centre coordinates for unmatched or
review-queue records. Location is requested only after user action, and current
coordinates need not be stored.
