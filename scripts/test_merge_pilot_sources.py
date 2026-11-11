import unittest
from datetime import date

from merge_pilot_sources import merge_rows


def overture_row(name, kind="route_experience", strategy="osm_route_then_official"):
    return {
        "city_slug": "madeira-pt",
        "category": "nature",
        "rank": "1",
        "display_name": name,
        "content_kind": kind,
        "match_strategy": strategy,
        "match_status": "editorial_only" if kind != "place" else "auto_match",
        "overture_id": "ov-1" if kind == "place" else "",
        "risk_flags": "",
        "latitude": "",
        "longitude": "",
    }


def osm_row(name, status="auto_match", access="", ref="PR 1"):
    return {
        "destination_slug": "madeira-pt",
        "category": "nature",
        "rank": "1",
        "display_name": name,
        "osm_match_status": status,
        "osm_id": "2235102",
        "osm_type": "relation",
        "matched_name": name,
        "match_score": "1.0",
        "latitude": "32.75",
        "longitude": "-16.95",
        "route_ref": ref,
        "access": access,
        "risk_flags": "official_verification_required",
        "osm_tags": "{}",
        "route_identity_confirmed": "True",
    }


class MergePilotSourcesTests(unittest.TestCase):
    def setUp(self):
        self.suggestions = {
            "official_status_checks": {
                "checked_at": "2026-09-30",
                "source_url": "https://example.test/official-trails",
                "reservation_required": True,
                "reservation_url": "https://example.test/tickets",
                "routes": {"PR 1": {"status": "open_with_conditions", "conditions": "one-way"}},
            }
        }

    def test_open_official_route_becomes_osm_match(self):
        rows = merge_rows(
            self.suggestions,
            [overture_row("PR 1 - Vereda do Areeiro")],
            [osm_row("PR 1 - Vereda do Areeiro")],
            today=date(2026,9,30),
        )
        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertEqual(rows[0]["matched_source"], "osm")
        self.assertEqual(rows[0]["official_status"], "open_with_conditions")
        self.assertIn("official_conditions_apply", rows[0]["risk_flags"])
        self.assertEqual(rows[0]["latitude"], "")
        self.assertEqual(rows[0]["geometry_status"],"route_card_without_pin")

    def test_stale_route_status_stays_in_review(self):
        row=merge_rows(self.suggestions,[overture_row("PR 1")],[osm_row("PR 1")],today=date(2026,11,11))[0]
        self.assertEqual(row["match_status"],"review")
        self.assertIn("official_route_status_stale",row["risk_flags"])

    def test_venue_closure_is_not_erased_by_osm_merge(self):
        row=overture_row("Museum",kind="place",strategy="overture_place")
        row.update(official_status="closed",official_status_checked_at="2026-11-11")
        result=merge_rows({},[row],[])[0]
        self.assertEqual(result["official_status"],"closed")

    def test_restricted_route_stays_in_review(self):
        rows = merge_rows(
            self.suggestions,
            [overture_row("PR 1 - Vereda do Areeiro")],
            [osm_row("PR 1 - Vereda do Areeiro", access="no")],
        )
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertIn("osm_confirmation_pending", rows[0]["risk_flags"])

    def test_exact_overture_geographic_feature_is_not_downgraded_by_osm_near_tie(self):
        rows = merge_rows(
            {},
            [overture_row("Beach", kind="place", strategy="overture_and_osm_feature")],
            [osm_row("Beach", status="review", ref="")],
        )
        self.assertEqual(rows[0]["match_status"], "auto_match")
        self.assertEqual(rows[0]["matched_source"], "overture")

    def test_unmatched_overture_geographic_feature_still_needs_osm_confirmation(self):
        row = overture_row("Beach", kind="place", strategy="overture_and_osm_feature")
        row["match_status"] = "unmatched"
        row["overture_id"] = ""
        rows = merge_rows({}, [row], [osm_row("Beach", status="review", ref="")])
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertEqual(rows[0]["matched_source"], "")

    def test_restricted_geographic_feature_is_held_for_review(self):
        rows = merge_rows(
            {},
            [overture_row("Nature park", kind="place", strategy="overture_and_osm_feature")],
            [osm_row("Nature park", status="auto_match", access="private", ref="")],
        )
        self.assertEqual(rows[0]["match_status"], "review")
        self.assertEqual(rows[0]["matched_source"], "")
        self.assertIn("access_restricted", rows[0]["risk_flags"])


if __name__ == "__main__":
    unittest.main()
