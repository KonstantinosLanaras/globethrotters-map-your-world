# Catalogue batch rulebook — MVP policy, 6 November 2026

## 11 November addition — canonical browse subcategories

New destination plans require taxonomy_version=2026-11-11-v1 and an explicit valid subcategory on every suggestion. Preserve detailed subtype and content_kind for source routing. Publication writes subcategory_key; unknown or unsupported groupings stay in classification review. Editorial outings use their existing interest category. Calendar events are excluded. The existing match threshold, route-source/access gates, review history and capped editorial reserve remain unchanged. See docs/catalogue-subcategories.md for migration order and the guarded existing-record classification plan.


## 11 November addition — hikes are destination-aware, not optional by accident

Every new publication batch now requires its source-ready suggestions file with an outdoor_plan (core/complementary/not_applicable, explicit named-hike floor and rationale). Choose relevance and count for the destination, not population. The three already prepared historic packages stay frozen. Their source data/live imports have not been rewritten by this change.

`scripts/process_reviewed_catalogue_batch.py --suggestions ... --osm-json ...` runs the source-routing stage before exporting. Cached data is default; public pilot network retrieval requires explicit --fetch-osm. New destinations require bounded regions; no worldwide Overpass scan. `scripts/prepare_destination_sources.py` can run this stage separately for model review. Ordinary hiking-route subtypes now route through OSM rather than slipping into generic editorial publication. Named pedestrian routes can explicitly opt into the same requirement.

OSM identity qualification checks pedestrian route type, route reference, geographic scope and alternatives. Exact model-reviewed source identities/previous rejections are preserved. A representative centre is not a trailhead: confirmed routes can be non-spatial cards; source MultiLineString segments, if available, are preserved without invented joins. This does not yet draw the route in the frontend or provide turn-by-turn navigation.

`scripts/route_quality.py` applies checks both in export and in the distinct-match gate. Named hikes need a confirmed OSM route relation plus official open/open_with_conditions status, evidence URL and checked date. MVP pre-publication freshness is seven days, configurable in that module; this is not a safety guarantee or live closure monitoring. Restricted, stale or unresolved hikes stay queued even when the unchanged overall 60% gate passes. Editorial padding does not promote them. No automatic post-publication refresh/scheduler or live database connection has been established.

Audit11 November: the ten existing Madeira hiking identities still match the cached OSM routes. They are held from NEW publication because official checks date30 September; the cache has no full trail geometry. Five existing Dolomites hiking proposals are correctly routed to OSM now but remain queued because no bounded OSM extract/current official status was supplied. This local audit neither changes existing live records nor claims present-day trail openings. Current regression suite:138 tests.

## Latest user decision

At **60% of the original destination target in distinct accepted place matches**, stop additional matching for that MVP batch. Import accepted algorithm/model-reviewed matches and the capped editorial experiences. Store pending/unmatched records in public.catalog_review_queue for later review. No further individual approval is required under the user's explicit policy sign-off. This supersedes the earlier first-ten-batches supervision rule; historical approvals and user decisions remain intact.

## Selection and quality checks

1. LLM proposes worthwhile experiences for the beachhead. Python retrieves multiple source candidates from the uncapped destination slice; high-confidence automatic matches persist.
2. Model review accepts high-confidence alternate identities as manual matches. Ambiguous candidates stay review; no credible identity stays unmatched. Keep user notes and rejected IDs.
3. Wrong/rejected identities, contradictory pins, invalid coordinates and missing required official route verification remain excluded. The threshold does not relax those checks.
4. Ratio = distinct accepted source identities / original target, assessed separately per destination. Duplicate source IDs, editorial experiences, review and unmatched records do not increase it. Required count is ceil(target × 0.60). Do not shrink targets to make a package pass.
5. Below 60%, do not publish that destination's accepted places yet. Continue bounded matching/source review. Once it passes, no more refinement is required for this MVP batch.
6. Editorial reserve remains capped at twice the baseline. Do not invent coordinates or force a venue identity. Keep Food/Culture/Nature/Nightlife categories; content_kind distinguishes area, route and timed experiences.

## Authorization versus live execution

scripts/data/catalogue_import_policy.json sets approval_mode=threshold. scripts/data/catalogue_batch_governance.json records explicit sign-off at 60%; the auto flag alone is insufficient. A changed threshold needs new sign-off. Historic exact approvals remain tied to their fingerprints; review history is not fabricated to satisfy the old ten-batch rule.

The automatic flag means qualifying import packages are authorized. **It does not mean a live database connection, scheduler or deployment has been established.** None is configured in this chat. This is a downstream publication pipeline, not a ChatGPT reminder or a new paid AI generation service.

scripts/process_reviewed_catalogue_batch.py exports reviewed inputs, evaluates the gate and builds an atomic package. Default: prepare only. --apply additionally requires a privately configured CATALOGUE_DATABASE_URL and scripts/requirements-catalogue-apply.txt. It checks the generated SQL checksum and runs item/queue assertions inside one database transaction. It never prints credentials. An approved backend/job can invoke it after the existing model-review step. It does not generate new suggestions or run another matching pass.

Missing access must not be bypassed with temporary privileged helpers. Use the SQL-editor handoff or configure the permitted execution environment; never claim a prepared package is already imported.

## Database guarantees

Upsert destination records, accepted items and unresolved queue entries in one transaction. Verify active/public package item identities and every retained queue row before COMMIT. Failed retention rolls back both parts. Preserve existing IDs, saved references, noncoverage quality tiers and human review notes/decisions. No deletes.

Machine-resolve queue entries only against accepted identities in the current import, not arbitrary historic catalogue rows. Source IDs owned by an unrelated destination stop import. A below-threshold queue-only destination stays inactive if newly created; existing active destinations are not deactivated.

scripts/build_catalogue_import_bundle.py produces read-only preflight, full transaction and verification SQL. Country/type metadata is supplied by destination definitions, not hardcoded to Spain/island. Future destinations need original targets and their own definitions before publication.

## Current batches

- Lisbon, cities-pilot-003 (7 November):134/180 distinct accepted places (74.4%) +20 capped editorial =154 ready records;14 review +22 unmatched =36 retained queue entries. Authorized by the signed threshold policy, prepared only, not applied. Source2026-10-21.0. Do not repeat matching merely to reach the full target.
- Mallorca/Ibiza: imported according to the user's successful SQL verification report; not independently queried here.
- Menorca/Formentera, islands-pilot-002: user now authorizes import. Menorca 55/70 accepted matches (78.6%) +8 editorial =63; Formentera 34/50 (68%) +8 editorial =42. Retain 11 and12 unresolved records respectively. No additional matching is needed. Live application stays unconfirmed until executed/verified.
- Central backlog: outputs/catalogue_review_backlog.csv, accumulating stable keys, user notes and decision history. Server counterpart: public.catalog_review_queue. Generating queue SQL is not yet database storage.

General safeguards added7 November: do not collapse candidate pins more than250m apart solely on shared name/address/domain evidence; retain them for identity/geometry review. Preserve official closure status, checked date/source URL and multiple candidate alternatives through export to the database review queue. Cached existence is not evidence of current opening or an exact visitor entrance. Derive package source-release labels from payload metadata rather than a fixed old release.

## Stop conditions

Missing original target/geography metadata; under-threshold destination; wrong/rejected identity; contradictory geometry; missing official route verification; unsigned/mismatched authorization; unrelated source ownership; failed item/queue assertions; absent database access or external permission. Report the blocker; never silently weaken the checks.
