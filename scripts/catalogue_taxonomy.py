"""Canonical browse groups; keep detailed source subtype and content_kind intact.

Legacy labels are mapped only when their meaning is clear. Unknowns remain
unclassified; a broad parent category is never evidence for a specific group.
"""
import json
import re
import unicodedata
from pathlib import Path

VERSION = "2026-11-11-v1"
DATA_PATH = Path(__file__).parent / "data" / "catalogue_taxonomy.json"


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(c for c in value if not unicodedata.combining(c))
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def taxonomy():
    return json.loads(DATA_PATH.read_text())


def validate_subcategory(category, key):
    groups = taxonomy()["categories"].get(category, {}).get("subcategories", {})
    if key not in groups:
        raise ValueError(f"Invalid subcategory {key!r} for category {category!r}")
    return key


def classify(row):
    category = row.get("canonical_category") or row.get("category")
    category = "nature" if category == "hiking" else category
    detail = row.get("llm_subtype") or row.get("subtype") or row.get("subcategory") or ""
    label = normalize(detail)
    # A timed sunset is recurring; a calendar event is not a permanent entry.
    if re.search(r"\b(event|festival|christmas market|seasonal party)\b", label):
        return None, "temporal_event_outside_catalogue_taxonomy"
    explicit = row.get("subcategory_key") or row.get("llm_subcategory")
    if explicit:
        return validate_subcategory(category, explicit), "explicit_canonical_subcategory"
    groups = taxonomy()["categories"].get(category, {}).get("subcategories", {})
    for key, group in groups.items():
        if label in {normalize(key), normalize(group["label"]), *map(normalize, group["aliases"])}:
            return key, "mapped_detailed_subtype"
    if category == "food":
        if re.search(r"\b(market|food hall|food court)\b", label):
            return "food_markets", "food_market_subtype"
        if re.search(r"\b(cafe|coffee|bakery|pastry|patisserie|ice cream|gelato)\b", label):
            return "cafes_bakeries", "cafe_bakery_subtype"
        if re.search(r"\b(street food|fast food|sandwich shop|snack bar|takeaway)\b", label):
            return "street_food", "quick_food_subtype"
        if re.search(r"\b(restaurant|pizzeria|tapas|fine dining|mountain hut)\b", label):
            return "restaurants", "restaurant_subtype"
        if re.search(r"\b(experience|food route|food walking|food afternoon|food evening|winery|tasting|cooking)\b", label):
            return "food_experiences", "food_activity_subtype"
    elif category == "nature":
        if re.search(r"\b(sunset|sunrise|viewpoint|observation deck)\b", label):
            return "sunsets_views", "scenic_subtype"
        if re.search(r"\b(beach|lake|natural pool|swimming spot)\b", label):
            return "beaches_lakes", "water_destination_subtype"
        if re.search(r"\b(park|garden|forest|woodland)\b", label):
            return "parks_gardens", "park_garden_subtype"
        if re.search(r"\b(cycling|running|driving|marine|water activity|adventure)\b", label):
            return None, "activity_not_represented_by_agreed_groups"
        if re.search(r"\b(hiking|hike|walking route|walk|mountain circuit)\b", label):
            return "hikes_trails", "walking_hiking_subtype"
        if re.search(r"\b(natural feature|nature reserve|cave|gorge|waterfall|rock|geological|massif|plateau|valley|meadow|landscape|mountain pass)\b", label):
            return "natural_sites", "natural_feature_subtype"
    elif category == "culture":
        if re.search(r"\b(museum|gallery|galleries|planetarium|aquarium|exhibition|contemporary art|art and culture centre)\b", label):
            return "museums_galleries", "museum_art_subtype"
        if re.search(r"\b(walking route|walk|neighbourhood|village|town|design route|area experience)\b", label):
            return "neighbourhoods_walks", "cultural_area_route_subtype"
        if re.search(r"\b(historic|historical|cathedral|church|basilica|monastery|castle|fortress|palace|monument|archaeological site|vernacular architecture|modern architecture|working heritage|architecture and viewpoint|park and architecture)\b", label):
            return "historic_sites", "heritage_architecture_subtype"
    elif category == "nightlife":
        if re.search(r"\b(rooftop)\b", label):
            return "rooftops", "rooftop_venue_subtype"
        if re.search(r"\b(nightclub|dance club|electronic music club|open air club)\b", label) or label == "club":
            return "clubs", "club_subtype"
        if re.search(r"\b(music|jazz|fado|concert|performance|cabaret)\b", label):
            return "live_music", "music_venue_subtype"
        if re.search(r"\b(bar|pub)\b", label):
            return "bars", "bar_subtype"
        if re.search(r"\b(area|district|neighbourhood|town evening|village evening|waterfront evening|coastal evening|apres ski area)\b", label):
            return "nightlife_areas", "evening_area_subtype"
    return None, "insufficient_specific_subtype"


def validate_plan_taxonomy(plan):
    """New versioned plans must provide a valid group for every suggestion."""
    if plan.get("taxonomy_version") != VERSION:
        raise ValueError(f"New plans must declare taxonomy_version={VERSION!r}")
    for category, items in plan["categories"].items():
        if category not in taxonomy()["categories"]:
            raise ValueError(f"Unsupported interest category {category!r}")
        for item in items:
            if not isinstance(item, dict):
                raise ValueError("New suggestions must be objects with explicit subcategory")
            validate_subcategory(category, item.get("subcategory"))
            _, reason = classify({"category": category, "subtype": item.get("subtype"),
                                  "subcategory_key": item["subcategory"]})
            if reason == "temporal_event_outside_catalogue_taxonomy":
                raise ValueError("Scheduled events are excluded from the permanent catalogue")
    return True
