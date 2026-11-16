# Catalogue subcategories: implementation and rollout

11 November 2026. Code and SQL prepared; no production database write or deployment performed.

## Behaviour

Future LLM suggestion objects must include a valid category/subcategory pair. The four top-level categories remain food, nature, culture and nightlife. The canonical list lives in scripts/data/catalogue_taxonomy.json; the TypeScript shared module contains the same checked definitions.

The source-ready prompt, matcher, source planner, editorial reserve path, exporter and app's discover-activities function preserve the grouping. New destination publication plans must declare taxonomy_version=2026-11-11-v1 and explicit subcategory keys. Unknown/invalid pairs are rejected or held for classification review rather than published under guessed groups. Old activity caches lacking the new schema version are refreshed on the next normal discovery request. New valid suggestions are stored in destination_activities.activities JSON with subcategory, content_kind and taxonomy_version. Discovery suggestions remain unverified and are never automatically inserted into catalog_items.

For catalogue publication the existing subcategory field keeps the detailed feature type, such as classified hiking route. The new nullable subcategory_key stores its browse group, such as hikes_trails. A composite foreign key enforces that a group belongs to its parent category. Exact provider-type aliases can fill the group on future inserts; broad unknown labels remain NULL. The existing content_kind, area_name, recommended_time and geometry fields already support editorial activities and non-spatial cards. Do not add a fifth editorial interest category or require fake business matches/pins. Existing route-source, access, review, threshold and editorial-cap checks stay in force.

Shows & events is excluded. Permanent music venues remain under Nightlife; recurring sunset experiences remain under Nature / Sunsets & views. No scheduled-event category was added.

## Existing records

A read-only paginated query retrieved 882 publicly visible catalogue records. The prepared plan classifies 837 and retains 45 in classification_review.csv. It also normalizes all 10 legacy Hiking parent categories to Nature; one of those cycling entries remains ungrouped. 838 existing rows therefore receive a group and/or parent-category update. Other category corrections put two gardens under Nature, a dining outing under Food and a stargazing outing under Nature.

Of the 837 classifications, 714 originally mapped from specific stored subtypes. Model review resolved 123 further records using existing names/descriptions and selected-place identities. The model decisions do not re-verify venue existence, present opening status, coordinates, access or swimming suitability. Original notes, rejected-candidate history and geometry remain unchanged. Review CSV includes ambiguous beach clubs, cultural markets, temporary-event suggestions and activities not covered by the agreed groups. These existing records are not deleted or deactivated.

The snapshot is limited by the public catalogue read policy. Admin preflight must check total/coverage/inactive row counts; additional non-public rows require a new snapshot/plan rather than a claim that they were classified here. The pending view shows every NULL group permitted by the caller's row policy.

The snapshot-specific apply SQL and full classification plan are delivered separately in the subcategory update ZIP. They are generated data, not committed migration history. The repository includes the generator, fixed taxonomy, model decisions, manifest and remaining-review CSV. To regenerate against a refreshed owner-authorized export, run `python3 scripts/plan_catalogue_subcategories.py --snapshot path/to/catalogue_rows.json --output-dir database/subcategories_20261111`.

## Apply in order

1. Run database/subcategories_20261111/00_read_only_preflight.sql in the correct project's SQL Editor.
2. Apply supabase/migrations/20261111210000_catalog_subcategory_groups.sql (identical standalone copy: database/subcategories_20261111/00_add_subcategory_schema.sql).
3. Run the full database/subcategories_20261111/01_classify_existing_items.sql transaction. It locks catalogue writes briefly and refuses a stale/changed snapshot. An error rolls back the batch. Do not remove the checks; regenerate the plan if necessary.
4. Run 02_verify_classification.sql. The expected initial audit count is 838 and classified snapshot count is 837. Broader existing database classifications may make global counts larger.
5. Deploy the updated Edge Function and frontend after the schema exists. The frontend reads subcategory_key and displays the matching human label; detail stays stored independently. Run a normal destination discovery request and confirm that its cached JSON has valid pairs. No paid AI call was made during this change.

GitHub changes alone do not execute SQL or deploy a Lovable-managed backend. There is no configured private database write connection in this workspace. Existing frozen import packages must not be regenerated or reapplied as part of this classification change.

An audit records the previous category/group for each changed item. 03_rollback_classification.sql restores this change set only and refuses to overwrite subsequent group edits. It keeps all catalogue IDs, source IDs, saved/visited and trip references. No unrelated record fields are rewritten.

## Validation

Run PYTHONPATH=scripts python3 -m unittest discover -s scripts -p 'test_*.py'. TypeScript taxonomy tests use node --experimental-strip-types --test scripts/test_catalogue_taxonomy_typescript.mjs. The migration/backfill was also executed locally with PostgreSQL-compatible PGlite against the full 882-row snapshot: schema rerun, 838 audited writes, 837 groups, zero Hiking parents, idempotent application, stale-snapshot rejection, invalid parent/group rejection and conflict-safe rollback all passed. This is local validation, not evidence of live application.
