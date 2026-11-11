import unittest
from editorial_fallback import add_editorial_fallback


class FallbackTests(unittest.TestCase):
    def rows(self):
        return [{"city_slug":"island", "city_name":"Island", "country":"Test", "category":"culture", "rank":str(i),
                 "display_name":f"Existing {i}", "match_status":"editorial_only"} for i in range(1,6)]

    def policy(self, target):
        return {"island":{"target_experiences":target,"baseline_editorial_count":5,"reserve":[
            {"name":f"Village afternoon {i}","category":"culture","content_kind":"area_experience",
             "description":"Explore the village centre at your own pace.","area_name":f"Village {i}","subtype":"neighbourhood afternoon"} for i in range(8)]}}

    def test_total_editorial_never_exceeds_double(self):
        rows, report=add_editorial_fallback(self.rows(),self.policy(100))
        self.assertEqual(len(rows),10)
        self.assertEqual(report[0]["added"],5)
        self.assertEqual(report[0]["remaining_gap"],90)

    def test_stop_at_target_and_idempotent(self):
        rows,_=add_editorial_fallback(self.rows(),self.policy(7))
        self.assertEqual(len(rows),7)
        again,report=add_editorial_fallback(rows,self.policy(7))
        self.assertEqual(len(again),7)
        self.assertEqual(report[0]["added"],0)

    def test_not_needed_at_target(self):
        rows,report=add_editorial_fallback(self.rows(),self.policy(5))
        self.assertEqual(len(rows),5)
        self.assertEqual(report[0]["added"],0)
