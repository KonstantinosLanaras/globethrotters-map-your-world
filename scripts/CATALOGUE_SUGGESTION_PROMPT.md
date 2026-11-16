# Source-ready experience suggestions

Use for new destination batches. The LLM selects experiences; Python retrieves candidate source identities. Existing accepted matches persist. Only explicit source contradictions or review decisions override an accepted record.

For every suggested experience supply a canonical display name, local-language name and known aliases, intended feature type, category/purpose, content_kind, destination, and expected municipality/neighbourhood when known. Include exact address only when reliable. Do not invent coordinates, an address, an alternate name or a municipality to make matching easier. Leave unknown values blank.

Distinguish a town from a beach or resort sharing its name. For a beach near a town, supply the beach's actual name and municipality; do not use the hotel as its alias. For nightlife inside a hotel/restaurant, identify the intended venue and known parent-venue alias; food, restaurant, bar, hotel and nightlife may overlap in purpose but are not automatic proof of the same identity. A boutique sharing the brand is not automatically the performance venue.

For walks, district evenings or village afternoons use area_experience/route_experience with a useful description and area label. Do not force a business identity or claim exact geometry. Respect the configured editorial cap and existing experiences to avoid duplicating the same outing.

## Destination-aware outdoor selection (11 November 2026)

Every NEW destination plan must include `outdoor_plan` before selection: `hiking_relevance` (`core`, `complementary`, `not_applicable`), a destination-specific `minimum_named_hikes`, and a rationale. Choose the number for the actual travel offering, geography, season and catalogue depth, not population or an identical four-category template. A mountain/island outdoors destination must include worthwhile named hikes; a city-centre batch may explain why hiking is not applicable. The minimum is a floor, not a cap or a request to invent obscure trails. Preserve the original total target; additional editorial walks do not substitute for named hikes or count toward the 60% place-match threshold.

Named hiking routes use Nature + `content_kind=route_experience` + `subtype=hiking route` (or classified hiking route), a reliable route reference when known, local names/aliases, intended region and official route/access source URL. Any named pedestrian trail using a generic walking subtype must explicitly set `route_identity_required=true`. Supply explicit destination_bounds for new source regions. A normal hiking subtype is always sent to OSM even without the word classified; it cannot opt out by setting an editorial source_route. Do not use a peak, café, town, viewpoint or trailhead as if it were the route itself.

Run `prepare_destination_sources.py` on the reviewed Overture inputs with the bounded cached OSM extract (or explicitly request a small pilot refresh). OSM route relations provide identity and any available source segments; the official authority/operator provides access evidence. A confirmed, currently qualified route can be a card without an exact point. Keep source segments as separate lines, never invent joins or treat a bounds centre as a trailhead. Missing geometry is not a reason to invent a coordinate. Missing/ambiguous identity, restricted access or absent/stale official status remains in review, not an editorial-only bypass. Broad informal neighbourhood/coastal outings remain editorial and must not imply verified trail navigation.

The user-signed global 60% threshold is unchanged. It never overrides an individual route's checks. Cached route identities do not prove live opening; never synthesize an official status or refresh its checked_at date without actually consulting the source.

Example shape (values illustrative, not a source record):

```json
{
  "name": "Canonical beach or venue name",
  "aliases": ["Documented local-language variant"],
  "subtype": "beach",
  "content_kind": "place",
  "category": "nature",
  "expected_locality": "Known municipality",
  "area_name": "Known coastal area"
}
```

For current matcher JSON, put expected_locality into `location_hints[category][name].locality` rather than leaving it only in a prose prompt. Check all plausible source candidates, including alias names, source taxonomy paths, coordinates and locality. Export shortlist alternatives and retain rejected IDs. A high lexical score never legitimizes a known bad coordinate. Near ties may be duplicate records or separate branches; establish which before accepting one representative. Never merge physically separate branches solely because they share a name.

## Required browse subcategories (11 November 2026)

Every NEW destination JSON declares `taxonomy_version: "2026-11-11-v1"`. Every suggestion object includes `subcategory` using one key below, plus `subtype` describing the actual feature (e.g. beach, classified hiking route, cocktail bar). Keep the specific subtype: source matching and named-hike checks use it.

| Category | Allowed subcategory key → label |
| --- | --- |
| food | restaurants → Restaurants; street_food → Street food; cafes_bakeries → Cafés & bakeries; food_markets → Food markets; food_experiences → Food experiences |
| nature | hikes_trails → Hikes & trails; parks_gardens → Parks & gardens; beaches_lakes → Beaches & lakes; sunsets_views → Sunsets & views; natural_sites → Natural sites |
| culture | museums_galleries → Museums & galleries; historic_sites → Historic sites; neighbourhoods_walks → Neighbourhoods & walks |
| nightlife | bars → Bars; clubs → Clubs; live_music → Live music; rooftops → Rooftops; nightlife_areas → Nightlife areas |

Choose the main traveller activity, not the provider/business classification. Editorial experiences use the same four interest categories and explicit groups: sunset at Vraxakia is Nature / sunsets_views / timed_experience with recommended_time=sunset. Editorial is a format/origin, never a fifth interest category. A named hiking route is Nature / hikes_trails / route_experience with a specific hiking subtype; retain all existing OSM/official-source requirements.

Do not generate scheduled festivals, concerts or other calendar events for the permanent catalogue. Permanent live-music venues remain eligible under Nightlife / live_music. A recurring sunset is eligible. A lake does not imply swimming access or safety. Do not force an activity into a mismatched group merely to complete a quota: identify any taxonomy gap for review.
