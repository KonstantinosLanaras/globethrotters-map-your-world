"""Bounded top-up from authored editorial reserves, never synthesized place data."""
from copy import deepcopy

ACCEPTED = {"auto_match", "manual_match", "editorial_only"}


def add_editorial_fallback(rows, policies):
    result = deepcopy(rows)
    report = []
    for slug, policy in policies.items():
        current = [row for row in result if row["city_slug"] == slug]
        if not current:
            continue
        baseline = int(policy["baseline_editorial_count"])
        target = int(policy["target_experiences"])
        cap = baseline * 2
        editorial_count = sum(row["match_status"] == "editorial_only" for row in current)
        accepted = sum(row["match_status"] in ACCEPTED for row in current)
        needed = max(0, min(target - accepted, cap - editorial_count))
        names = {row["display_name"].casefold().strip() for row in current}
        added = 0
        for reserve in policy.get("reserve", []):
            if added >= needed:
                break
            if reserve["name"].casefold().strip() in names:
                continue
            if reserve["content_kind"] not in {"area_experience", "route_experience", "timed_experience"}:
                raise ValueError("Editorial reserve must not contain business/place identities")
            if not reserve.get("description") or not reserve.get("area_name"):
                raise ValueError("Editorial reserve needs useful description and area")
            row = {key: "" for key in current[0]}
            row.update({"city_slug": slug, "city_name": current[0]["city_name"],
                        "country": current[0]["country"], "category": reserve["category"],
                        "display_name": reserve["name"], "llm_name": reserve["name"],
                        "content_kind": reserve["content_kind"], "llm_subtype": reserve["subtype"],
                        "llm_subcategory": reserve.get("subcategory") or "",
                        "experience_description": reserve["description"], "area_name": reserve["area_name"],
                        "match_status": "editorial_only", "geometry_status": "needs_geometry",
                        "geometry_type": "area", "proposed": "True", "target_audience": "general",
                        "editorial_fallback": "True", "rank": str(1 + max((int(r.get("rank") or 0) for r in result if r["city_slug"] == slug and r["category"] == reserve["category"]), default=0))})
            result.append(row)
            names.add(reserve["name"].casefold().strip())
            added += 1
        report.append({"city_slug": slug, "target": target, "accepted_before": accepted,
                       "editorial_cap": cap, "added": added,
                       "remaining_gap": max(0, target - accepted - added)})
    return result, report
