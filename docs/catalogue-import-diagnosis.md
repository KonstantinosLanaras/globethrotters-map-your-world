# Catalogue import diagnosis and next steps

## Why the public count can be much lower than the prepared/imported count

`lovable_catalog_setup.sql` creates the normalized catalogue. `scripts/import_overture.py`
upserts Overture records by stable GERS/source ID and writes them as `coverage`.
`lovable_hide_unreviewed_coverage.sql` deliberately excludes `coverage` from
the public SELECT policy and recommendation function. Only `popular`,
`editorial`, and `community` records are publicly eligible. Therefore a query
that counts public/recommendation rows will not count prepared Overture
coverage candidates.

`lovable_launch_cities_completion.sql` adds only a small editorial completion
set for Barcelona (two food, two culture, two nightlife, and three nature
records in that file). That file is not an expansion toward the agreed target
of 115. The catalogue schema itself also has no `madeira-pt` seed row in the
checked-in `lovable_catalog_setup.sql`, so an importer joining on that slug
cannot persist Madeira records until the city is seeded.

These repository findings explain a likely mismatch, but they do not reveal
which SQL files were run in the live Supabase project or the live database
counts. Run `lovable_catalog_depth_verification.sql` in the connected project
to distinguish missing city rows, hidden coverage, and publishable records.

## Matching workflow

Use `scripts/match_catalog_candidates.py` to normalize multilingual names, group OSM
geometry representations, and match candidates to Overture identities. The
matching order is:

1. Exact Overture source identity, if present.
2. Exact normalized primary/alternate name, compatible broad feature family,
   and geographic distance.
3. A near tie across distinct Overture IDs is marked ambiguous for human review.
4. No candidate is automatically selected based on proximity alone.

The CLI accepts JSON with `osm` and `overture` arrays, writes a review JSON
including source IDs and alternatives, and never writes to Supabase itself:

```sh
PYTHONPATH=scripts python scripts/match_catalog_candidates.py \
  --input candidates.json --output match-review.json
```

Keep all `ambiguous` and `unmatched` candidates out of public catalogue rows.
The helper's unit tests can be run with:

```sh
PYTHONPATH=scripts python -m unittest scripts/test_catalog_match.py -v
```

## Current beachhead rollout

The active scope is the 42-destination beachhead and its ten pilots: Milan,
Barcelona, the Balearic Islands, Madeira, Iceland, the Dolomites, Japan,
Thailand, Patagonia and Morocco. This supersedes the earlier 50-European-city
rollout as the current catalogue strategy. See
`docs/beachhead-market-rollout.md` for the sequence and source roles.

Milan's experience-selection and matching workflow remains the baseline. The
next implementation is strategy-first: create Madeira's 25–35 traveller
destination strategy and candidate pool, then perform a read-only comparison
against appropriate sources. The source comparison must not drive desirability
or automatically publish matching records. Use
`docs/madeira-strategy-first-pilot.md` and the Overpass query under `queries/`.

Only after editorial review should approved records be imported in small,
idempotent batches. Counts use
`quality_tier IN ('popular', 'editorial', 'community')`; raw `coverage` is not a
publishable experience. No live database write or publication is performed by
these repository changes.

No live database write or publication is performed by these repository-only
changes.
