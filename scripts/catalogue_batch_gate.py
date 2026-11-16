"""Coverage and human-supervision policy for catalogue import packages."""
import hashlib
import json
import math

MATCHED = {"auto_match", "manual_match"}


def batch_fingerprint(rows, targets):
    relevant_targets = {slug: targets[slug] for slug in sorted({r["city_slug"] for r in rows}) if slug in targets}
    payload = {"targets": relevant_targets, "rows": sorted(rows, key=lambda r: (r["city_slug"], r["category"], r["display_name"]))}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def valid_match(row):
    if row.get("match_status") not in MATCHED:
        return False
    if row.get("llm_identity_decision") == "wrong_feature" and row.get("human_decision") != "Accept match":
        return False
    if row.get("geometry_status") == "source_geometry_contradicted":
        return False
    identifier = row.get("matched_source_id") or row.get("overture_id")
    if not identifier or identifier == row.get("rejected_overture_id"):
        return False
    from route_quality import named_hike, route_hold_reasons
    if named_hike(row):
        # Confirmed route cards need no fabricated pin to qualify. Status/source
        # checks apply even if a caller bypasses the exporter helper.
        return not route_hold_reasons(row)
    try:
        lat, lon = float(row["latitude"]), float(row["longitude"])
        return math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180
    except (ValueError, TypeError, KeyError):
        return False


def evaluate_batch(rows, policy, ledger, batch_id):
    targets = policy["initial_targets"]
    threshold = float(policy.get("minimum_match_fraction", 0.60))
    if not 0 < threshold <= 1:
        raise ValueError("Match threshold must be in (0, 1]")
    fingerprint = batch_fingerprint(rows, targets)
    completed = set(ledger.get("human_reviewed_batch_ids", []))
    approval = ledger.get("approvals", {}).get(batch_id, {})
    human_approved = approval.get("approved") is True and approval.get("fingerprint") == fingerprint
    supervised = len(completed) < int(policy.get("supervised_batches", 10))
    approval_mode = policy.get("approval_mode", "supervised")
    if approval_mode not in {"supervised", "threshold"}:
        raise ValueError(f"Unknown approval mode: {approval_mode}")
    signoff = ledger.get("threshold_import_authorization", {})
    threshold_authorized = (approval_mode == "threshold" and signoff.get("approved") is True
                            and signoff.get("minimum_match_fraction") == threshold)
    # A changed user policy needs explicit sign-off, not merely an auto flag.
    auto_enabled = ledger.get("automatic_import_enabled") is True and (
        threshold_authorized or (approval_mode == "supervised" and not supervised))
    if approval_mode == "threshold":
        supervised = not threshold_authorized
    destinations = []
    for slug in sorted({r["city_slug"] for r in rows}):
        target = targets.get(slug)
        if target is not None and (not isinstance(target, int) or isinstance(target, bool) or target < 1):
            raise ValueError(f"Invalid original target for {slug}")
        identities = {(r.get("matched_source") or "overture", r.get("matched_source_id") or r.get("overture_id"))
                      for r in rows if r["city_slug"] == slug and valid_match(r)}
        count = len(identities)
        required = math.ceil(target * threshold) if target else None
        passed = required is not None and count >= required
        destinations.append({"city_slug": slug, "initial_target": target, "accepted_unique_matches": count,
                             "required_matches": required, "match_fraction": count / target if target else None,
                             "coverage_passed": passed, "import_authorized": passed and (human_approved or auto_enabled),
                             "next_action": "set_original_target" if target is None else "repeat_candidate_and_llm_review" if not passed
                             else "import_approved_package" if human_approved or auto_enabled else "await_user_approval"})
    return {"batch_id": batch_id, "fingerprint": fingerprint, "minimum_match_fraction": threshold,
            "human_reviewed_batches": len(completed), "supervised_phase": supervised,
            "human_approval_valid": human_approved, "automatic_import_enabled": auto_enabled,
            "approval_mode": approval_mode, "threshold_policy_authorized": threshold_authorized,
            "automation_scope": "import_authorization_not_live_execution",
            "editorial_counts_toward_match_threshold": False, "destinations": destinations}
