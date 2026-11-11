"""Read user review cells without editing the uploaded workbook. Match by stable key."""
import argparse
import csv
import json
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_feedback(path):
    decisions = []
    with zipfile.ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        for member in archive.namelist():
            if not member.startswith("xl/worksheets/sheet") or not member.endswith(".xml"):
                continue
            for node in ET.fromstring(archive.read(member)).findall(".//m:sheetData/m:row", NS):
                if int(node.get("r")) < 7:
                    continue
                cells = {}
                for cell in node:
                    value = cell.find("m:v", NS)
                    inline = cell.find("m:is", NS)
                    text = value.text if value is not None else "".join(inline.itertext()) if inline is not None else ""
                    if cell.get("t") == "s":
                        text = strings[int(text)]
                    cells["".join(c for c in cell.get("r", "") if c.isalpha())] = text or ""
                if not cells.get("D") or not cells.get("P"):
                    continue
                decision = cells["D"].strip()
                if decision not in {"Accept match", "Keep unmatched", "Keep review", "Editorial", "Exclude"}:
                    raise ValueError(f"Unknown user decision: {decision}")
                decisions.append({"stable_key": cells["P"], "decision": decision, "notes": cells.get("E", ""),
                                  "record_id": cells.get("O", ""), "source_row": int(node.get("r")),
                                  "corrected_latitude": cells.get("L", ""), "corrected_longitude": cells.get("M", ""),
                                  "alternative_source": cells.get("N", "")})
    if len({d["stable_key"] for d in decisions}) != len(decisions):
        raise ValueError("Duplicate user decisions for a stable key")
    return decisions


def key(row):
    return f"{row['city_slug']}:{row['category']}:{row['llm_name']}"


def apply_human_feedback(rows, feedback):
    indexed = {key(row): dict(row) for row in rows}
    for decision in feedback:
        row = indexed[decision["stable_key"]]
        # Source row IDs are exact user-reviewed identities, not a fuzzy join.
        if row.get("candidate_overture_id", "") != decision["record_id"]:
            raise ValueError(f"Changed candidate: {decision['stable_key']}")
        row["human_decision"] = decision["decision"]
        row["human_notes"] = decision["notes"]
        row["human_source_row"] = decision["source_row"]
        if decision["decision"] == "Accept match":
            row["match_status"] = "manual_match"
            row["overture_id"] = decision["record_id"]
            row["review_authority"] = "user"
        elif decision["decision"] == "Keep unmatched":
            row["match_status"] = "unmatched"
            row["overture_id"] = ""
            row["rejected_overture_id"] = decision["record_id"]
        elif decision["decision"] == "Keep review":
            row["match_status"] = "review"
        elif decision["decision"] == "Editorial":
            row["match_status"] = "editorial_only"
            row["content_kind"] = "area_experience"
            row["overture_id"] = ""
        else:
            row["match_status"] = "excluded"
        lat, lon = decision["corrected_latitude"], decision["corrected_longitude"]
        if bool(lat) != bool(lon):
            raise ValueError("Coordinate corrections need both latitude and longitude")
        if lat:
            row["latitude"], row["longitude"] = float(lat), float(lon)
            row["geometry_status"] = "user_corrected"
    return list(indexed.values())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", type=Path, required=True)
    parser.add_argument("--matches", type=Path, action="append", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    feedback = read_feedback(args.workbook)
    rows = []
    for path in args.matches:
        with path.open(newline="", encoding="utf-8") as handle:
            rows.extend(csv.DictReader(handle))
    result = apply_human_feedback(rows, feedback)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "human_feedback.json").write_text(json.dumps(feedback, ensure_ascii=False, indent=2)+"\n")
    columns = list(dict.fromkeys(field for row in result for field in row))
    with (args.output_dir / "human_reviewed_matches.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(result)
    print(f"Applied {len(feedback)} explicit user decisions to {len(rows)} records")


if __name__ == "__main__":
    main()
