"""Named walking/hiking route qualification, independent of batch coverage.

Seven-day status freshness is a conservative MVP publication policy, not a
guarantee of trail safety. No representative route centre is a trailhead.
"""
import json
import math
from datetime import date, datetime, timezone
from urllib.parse import urlparse

MAX_STATUS_AGE_DAYS = 7


def truth(value):
    return value is True or str(value).casefold() == "true"


def named_hike(row):
    subtype=str(row.get("llm_subtype") or row.get("subtype") or "").casefold()
    strategy=row.get("match_strategy") or row.get("source_route")
    return (row.get("content_kind")=="route_experience" and
            ("hiking" in subtype or "hike" in subtype or truth(row.get("route_identity_required"))
             or strategy=="osm_route_then_official"))


def valid_url(value):
    parsed=urlparse(str(value or ""))
    return parsed.scheme in {"http","https"} and bool(parsed.netloc)


def valid_route_geometry(value):
    if not value:return False
    try:
        geometry=json.loads(value) if isinstance(value,str) else value
        kind=geometry.get("type")
        lines=[geometry["coordinates"]] if kind=="LineString" else geometry["coordinates"] if kind=="MultiLineString" else []
        return bool(lines) and all(len(line)>=2 and all(
            len(point)>=2 and all(math.isfinite(float(v)) for v in point[:2])
            and -180<=float(point[0])<=180 and -90<=float(point[1])<=90 for point in line
        ) for line in lines)
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError):
        return False


def route_hold_reasons(row, today=None):
    if not named_hike(row):return []
    today=today or datetime.now(timezone.utc).date()
    reasons=[]
    source=row.get("matched_source") or ("osm" if row.get("osm_id") else "")
    identifier=str(row.get("matched_source_id") or row.get("osm_id") or "")
    if source!="osm" or not identifier or not (identifier.startswith("osm:relation:") or row.get("osm_type")=="relation"):
        reasons.append("route_source_identity_required")
    if not truth(row.get("route_identity_confirmed")):
        reasons.append("route_identity_review_required")
    if identifier==row.get("rejected_source_id") or (row.get("osm_id") and str(row.get("osm_id"))==str(row.get("rejected_osm_id") or "")):
        reasons.append("route_identity_previously_rejected")
    if row.get("osm_access") in {"no","private"} or "access_restricted" in str(row.get("risk_flags") or ""):
        reasons.append("route_access_restricted")
    if str(row.get("official_status") or "").casefold() not in {"open","open_with_conditions"}:
        reasons.append("official_route_status_required")
    if not valid_url(row.get("official_source_url")):
        reasons.append("official_route_evidence_required")
    try:
        checked=date.fromisoformat(str(row.get("official_status_checked_at") or "")[:10])
        age=(today-checked).days
        if not 0<=age<=MAX_STATUS_AGE_DAYS:reasons.append("official_route_status_stale")
    except ValueError:
        reasons.append("official_route_status_date_required")
    return reasons
