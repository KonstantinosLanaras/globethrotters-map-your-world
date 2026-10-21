# Europe rollout candidate migration

This repository's seed contains 50 European cities. The candidate builder also
includes Madeira as an additional destination, for 51 discovery areas total.
It uses named OpenStreetMap features and preserves OSM element IDs and grouped
representations. The existing conservative matching helpers remain available
for comparing OSM records with Overture identities.

## Generate and run

1. Run `lovable_catalog_setup.sql` if the catalogue schema and 50-city seed are
   not already installed.
2. Run `lovable_seed_madeira.sql` once. It is idempotent and verifies the row.
3. From a Python 3 environment with network access, run:

   ```sh
   python3 scripts/build_europe_rollout_batches.py
   ```

   It queries Overpass and writes SQL files under
   `generated_sql/europe_rollout/`, with at most 20 records per batch and a
   `report.json`. Every city batch contains an existence guard and a per-batch
   verification query. The script is read-only with respect to Supabase.
4. In Lovable's SQL editor, run the generated `.sql` files in filename order.
   Keep the generated report alongside the import for traceability.
5. Run `lovable_europe_rollout_verification.sql` to inspect city, publishable,
   hidden-candidate, category and duplicate counts for the full roster.

## Publication status

The generated rows are `quality_tier='coverage'`, which keeps them out of the
public experience catalogue. They are discovered candidates, not approved
experiences. An editor must verify location, distinctness, category, description
and source match before promoting a record to `editorial` or `popular`. This
workflow does not claim that the target counts have been reached. OSM data is
licensed under ODbL; retain attribution to OpenStreetMap contributors.

Target values guide candidate collection only: 40 for the general rollout
baseline, Barcelona 115, Milan 105 and Madeira 80. Category mix is a discovery
preference, not a fixed quota. Counts returned by Overpass vary by coverage and
must be checked against current database records before importing.
