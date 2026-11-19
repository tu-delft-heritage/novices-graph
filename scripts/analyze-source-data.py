"""Extract supplied source counts without altering the application dataset.

Run with a Python environment containing openpyxl and lxml, plus pdftotext.
Original workbooks, PDF, SVG, blanks, and reported totals remain intact.
"""

from collections import defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

from lxml import etree
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed"
OUT.mkdir(exist_ok=True)
FACULTIES = ["ABE", "AE", "AS", "CEG", "EEMCS", "IDE", "ME", "TPM"]
ALIASES = {"BK": "ABE", "LR": "AE", "TNW": "AS", "CITG": "CEG", "EWI": "EEMCS", "IO": "IDE", "3ME": "ME", "TBM": "TPM", "TUD": "TUD"}


def write_csv(name, rows, columns=None):
    columns = columns or list(rows[0])
    with (OUT / name).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, columns)
        writer.writeheader()
        writer.writerows(rows)


def number(value):
    if value is None:
        return None
    assert isinstance(value, (int, float)) and value >= 0 and int(value) == value, value
    return int(value)


def sum_present(values):
    recorded = [v for v in values if v is not None]
    return sum(recorded) if recorded else None


def record(year, faculty, label, male, female, source, sheet, cells, level="faculty", phase="all", total=None, definition="", status="recorded"):
    male, female = number(male), number(female)
    derived = male + female if male is not None and female is not None else None
    return dict(year=year, faculty=faculty, source_label=label, level=level, phase=phase,
                male=male, female=female, total=derived, female_share=female / derived if derived else None,
                reported_total=number(total), definition=definition, status=status,
                source_file=source, source_sheet=sheet, source_cells=cells)


sources = []
books = {}
for filename in ["1905-2001.xlsx", "2002-2011.xlsx", "2012-2018.xlsx"]:
    path = ROOT / "data" / filename
    books[filename] = openpyxl.load_workbook(path, data_only=True)
    sources.append(dict(file=f"data/{filename}", sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                        sheets=[dict(name=s.title, rows=s.max_row, columns=s.max_column, state=s.sheet_state) for s in books[filename]]))

historical, historical_totals, mapping = [], [], []
sheet = books["1905-2001.xlsx"]["Data"]
for row in list(range(3, 26)) + [27]:
    label = sheet.cell(row, 1).value
    faculty = sheet.cell(row, 2).value or ""
    if row != 27:
        mapping.append(dict(source_label=label, faculty=faculty, basis="source mapping" if faculty else "unmapped", source_cells=f"A{row}:B{row}"))
    for col in range(3, 197, 2):
        year = int(str(sheet.cell(1, col).value)[:4])
        m, f = sheet.cell(row, col), sheet.cell(row, col + 1)
        item = record(year, faculty, label, m.value, f.value, "1905-2001.xlsx", "Data", f"{m.coordinate}:{f.coordinate}",
                      level="institution" if row == 27 else "programme", phase="historical", definition="historical_first_year",
                      status="blank" if m.value is None and f.value is None else "recorded")
        item["academic_year"] = sheet.cell(1, col).value
        (historical_totals if row == 27 else historical).append(item)


def faculty_blocks(book_name, sheet_name, phase="all"):
    sheet = books[book_name][sheet_name]
    result = []
    for row in range(1, sheet.max_row + 1):
        label = str(sheet.cell(row, 2).value or "").strip()
        if label.upper() not in ALIASES:
            continue
        years = [(c.column, int(str(c.value).replace("*", ""))) for c in sheet[row]
                 if c.value is not None and re.fullmatch(r"20\d\d\*?", str(c.value))]
        if not years:
            continue
        labels = {str(sheet.cell(r, 2).value).lower(): r for r in range(row + 1, min(row + 8, sheet.max_row + 1))}
        mr, fr = labels["man"], labels["vrouw"]
        tr = next(r for k, r in labels.items() if k.startswith("totaal"))
        for col, year in years:
            m, f, total = sheet.cell(mr, col), sheet.cell(fr, col), sheet.cell(tr, col)
            result.append(record(year, ALIASES[label.upper()], label, m.value, f.value, book_name, sheet_name,
                                 f"{m.coordinate},{f.coordinate},{total.coordinate}",
                                 level="institution" if label == "TUD" else "faculty", phase=phase, total=total.value,
                                 definition="institution_first_year_1_dec" if book_name == "2002-2011.xlsx" else "legacy_influx_2012_2018",
                                 status="blank" if m.value is None and f.value is None else "recorded"))
    return result


old_faculty = faculty_blocks("2012-2018.xlsx", "Instroom MV Ba+Ma+SK per fac")
middle_faculty = faculty_blocks("2002-2011.xlsx", "Instroom MV Ba+Ma+SK per fac")
phase_totals = []
for sheet_name, phase in [("Instroom MV Bachelor", "bachelor"), ("Instroom MV Master", "master"), ("Instroom MV Schakelklas", "bridging")]:
    phase_totals.extend(faculty_blocks("2002-2011.xlsx", sheet_name, phase))

# The second workbook contains cached external cells, not the original linked
# workbook. Follow only the references used by visible faculty counts; never
# refresh an external workbook or assume its empty programme caches contain data.
ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
with zipfile.ZipFile(ROOT / "data/2012-2018.xlsx") as archive:
    external = etree.fromstring(archive.read("xl/externalLinks/externalLink1.xml"))
names = [n.attrib["val"] for n in external.findall(".//s:sheetName", ns)]
cached = {}
for tab in external.findall(".//s:sheetData", ns):
    name = names[int(tab.attrib["sheetId"])]
    cached[name] = {c.attrib["r"]: float(c.find("s:v", ns).text)
                    for c in tab.findall(".//s:cell", ns)
                    if c.find("s:v", ns) is not None and c.attrib.get("t", "n") == "n"}
formula_sheet = openpyxl.load_workbook(ROOT / "data/2012-2018.xlsx", data_only=False).active
cached_phase = []
for faculty_row in old_faculty:
    if faculty_row["faculty"] == "TUD":
        continue
    by_phase = defaultdict(dict)
    for sex, cell in zip(["male", "female"], faculty_row["source_cells"].split(",")[:2]):
        formula = formula_sheet[cell].value
        references = re.findall(r"'\[1\](Instroom MV (?:Bachelor|Master|Schakelklas))'!([A-Z]+\d+)", formula)
        assert len(references) == 3, (cell, formula)
        for tab, address in references:
            phase = {"Bachelor": "bachelor", "Master": "master", "Schakelklas": "bridging"}[tab.split()[-1]]
            by_phase[phase][sex] = number(cached[tab][address])
            by_phase[phase][sex + "_cell"] = f"{cell} -> externalLink1.xml/{tab}!{address}"
        assert sum(by_phase[p][sex] for p in by_phase) == faculty_row[sex], (faculty_row, sex)
    for phase, values in by_phase.items():
        cached_phase.append(record(faculty_row["year"], faculty_row["faculty"], faculty_row["source_label"],
                                   values["male"], values["female"], "2012-2018.xlsx", "externalLink1.xml cached values",
                                   values["male_cell"] + "; " + values["female_cell"], phase=phase,
                                   definition="legacy_influx_2012_2018", status="external_cache_verified_against_visible_sum"))
assert len(cached_phase) == 168
phase_totals.extend(cached_phase)
for r in phase_totals:
    r["aggregation_note"] = ("Master already includes bridging; do not add bridging again."
                             if r["year"] <= 2009 and r["phase"] in ["master", "bridging"]
                             else "Preserve source study phase.")

programmes, programme_subtotals = [], []
for sheet_name, phase in [("Instroom MV per opl (Bachelor)", "bachelor"), ("Instroom MV per opl (Master)", "master"), ("Instroom MV per opl (Schakel)", "bridging")]:
    sheet = books["2002-2011.xlsx"][sheet_name]
    faculty, years = None, []
    for row in range(1, sheet.max_row + 1):
        label = str(sheet.cell(row, 2).value or "").strip()
        if label.upper() in ALIASES:
            faculty = ALIASES[label.upper()]
            years = [(c.column, int(str(c.value).strip().rstrip(" *"))) for c in sheet[row]
                     if c.value is not None and re.fullmatch(r"20\d\d\s*\*?", str(c.value))]
            continue
        if not (re.match(r"^[BM]-", label) or label.lower().startswith("totaal")):
            continue
        for col, year in years:
            m, f = sheet.cell(row, col), sheet.cell(row, col + 2)
            total = sheet.cell(row, 9).value if phase != "bridging" else None
            item = record(year, faculty, label, m.value, f.value, "2002-2011.xlsx", sheet_name,
                          f"{m.coordinate},{f.coordinate}", level="programme" if re.match(r"^[BM]-", label) else "subtotal",
                          phase=phase, total=total, definition="programme_entry_legacy",
                          status="blank" if m.value is None and f.value is None else "recorded")
            # Keep raw empty cells. A one-sex record can be interpreted as zero for
            # the other sex only when the displayed percentage is exactly 100%.
            item["male_raw"], item["female_raw"] = item["male"], item["female"]
            if item["male"] is None and item["female"] is not None and sheet.cell(row, col + 3).value == 1:
                item["male"], item["status"] = 0, "zero_inferred_from_100_percent"
            if item["female"] is None and item["male"] is not None and sheet.cell(row, col + 1).value == 1:
                item["female"], item["status"] = 0, "zero_inferred_from_100_percent"
            if item["male"] is not None and item["female"] is not None:
                item["total"] = item["male"] + item["female"]
                item["female_share"] = item["female"] / item["total"] if item["total"] else None
            (programmes if item["level"] == "programme" else programme_subtotals).append(item)

# Read all count cells independently from both renderings of the latest table.
pdf = ROOT / "data/2012-2026/Influx studenten.pdf"
svg = ROOT / "data/2012-2026/Influx studenten.svg"
text = subprocess.check_output(["pdftotext", "-layout", str(pdf), "-"], text=True)
matches = re.findall(r"\b(ABE|AE|AS|CEG|EEMCS|IDE|ME|TPM)\s+((?:[\d.]+[ \t]+){14}[\d.]+)[ \t]*$", text, re.M)
assert len(matches) == 16, f"Expected 16 PDF table rows, got {len(matches)}"
pdf_counts = {}
for i, (faculty, values) in enumerate(matches):
    assert faculty == FACULTIES[i % 8]
    for year, value in zip(range(2012, 2027), values.split()):
        pdf_counts[(year, faculty, "female" if i < 8 else "male")] = int(value.replace(".", ""))

nodes = etree.parse(str(svg)).xpath("//*[local-name()='text']")
svg_counts = []
for node in nodes:
    value = "".join(node.itertext()).strip()
    y = float(node.attrib.get("y", 0))
    if re.fullmatch(r"[\d.]+", value) and y in [12, 27, 43, 58, 74, 89, 105, 120, 136, 151, 167, 182, 198, 213, 229, 244]:
        svg_counts.append((float(node.attrib["x"]), y, int(value.replace(".", ""))))
assert len(svg_counts) == 240, len(svg_counts)
ys = sorted(set(y for x, y, v in svg_counts))
svg_by_key = {}
for row, y in enumerate(ys):
    cells = sorted((x, v) for x, cy, v in svg_counts if cy == y)
    assert len(cells) == 15
    for year, (x, value) in zip(range(2012, 2027), cells):
        svg_by_key[(year, FACULTIES[row % 8], "female" if row < 8 else "male")] = value
assert svg_by_key == pdf_counts, "PDF and SVG disagree"
recent = [record(year, faculty, faculty, pdf_counts[(year, faculty, "male")], pdf_counts[(year, faculty, "female")],
                 "2012-2026/Influx studenten.pdf", "Page 1", f"{year}; Female/Male {faculty}",
                 definition="first_time_faculty_influx", status="current_snapshot_2026-11-01" if year == 2026 else "recorded")
          for year in range(2012, 2027) for faculty in FACULTIES]
for path in [pdf, svg]:
    sources.append(dict(file=str(path.relative_to(ROOT)), sha256=hashlib.sha256(path.read_bytes()).hexdigest()))

recent_lookup = {(r["year"], r["faculty"]): r for r in recent}
comparison = []
for old in old_faculty:
    if old["faculty"] == "TUD":
        continue
    latest = recent_lookup[(old["year"], old["faculty"])]
    for metric in ["male", "female", "total"]:
        baseline, value = old[metric], latest[metric]
        delta = value - baseline
        comparison.append(dict(year=old["year"], faculty=old["faculty"], metric=metric,
                               old_value=baseline, latest_value=value, delta=delta,
                               relative_change=delta / baseline if baseline else None,
                               review_flag=abs(delta) >= 20 and abs(delta / baseline) >= 0.10 if baseline else value != 0,
                               old_cells=old["source_cells"], latest_cells=latest["source_cells"]))

annual = []
for year in range(2012, 2027):
    rows = [r for r in recent if r["year"] == year]
    m, f = sum(r["male"] for r in rows), sum(r["female"] for r in rows)
    old_total = next((r for r in old_faculty if r["year"] == year and r["faculty"] == "TUD"), None)
    annual.append(dict(year=year, male=m, female=f, total=m+f, female_share=f/(m+f),
                       old_faculty_sum_male=old_total["male"] if old_total else None,
                       old_faculty_sum_female=old_total["female"] if old_total else None,
                       old_faculty_sum_total=old_total["total"] if old_total else None,
                       total_difference=m+f-old_total["total"] if old_total else None,
                       total_relative_change=(m+f-old_total["total"])/old_total["total"] if old_total else None,
                       definition="sum_of_faculty_influx_not_deduplicated_institution_total"))

checks = []
for rows, period in [(historical,"1905-2001"), (middle_faculty,"2002-2011"), (old_faculty,"2012-2018")]:
    for year in sorted(set(r["year"] for r in rows)):
        detail = [r for r in rows if r["year"] == year and r["level"] != "institution"]
        totals = historical_totals if period == "1905-2001" else rows
        total = next(r for r in totals if r["year"] == year and (r["level"] == "institution"))
        for sex in ["male", "female"]:
            observed = sum_present([r[sex] for r in detail])
            checks.append(dict(period=period, year=year, metric=sex, detail_sum=observed,
                               recorded_total=total[sex], difference=observed-total[sex] if observed is not None and total[sex] is not None else None,
                               blank_detail_cells=sum(r[sex] is None for r in detail)))

assert not [r for r in checks if r["difference"] not in [None, 0]]
assert all(r["total"] == r["reported_total"] for r in middle_faculty + old_faculty)
for phase in ["bachelor", "master", "bridging"]:
    detail = [r for r in programmes if r["year"] == 2011 and r["phase"] == phase]
    total = next(r for r in phase_totals if r["year"] == 2011 and r["phase"] == phase and r["faculty"] == "TUD")
    assert all(sum(r[sex] or 0 for r in detail) == total[sex] for sex in ["male", "female"])

def slug(label):
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


MASTER_COLUMNS = ["year", "source_label", "level", "phase", "male", "female", "total", "female_share",
                  "row_type", "faculty_code", "academic_year", "reported_total", "status", "definition",
                  "source_file", "source_sheet", "source_cells", "entity_id"]
historical_categories = {"Alle lessen", "Enkele lessen", "IJker"}

def master_row(r):
    item = dict(r)
    institution = r["level"] == "institution"
    historical = r["source_file"] == "1905-2001.xlsx"
    item["row_type"] = "reported_total" if institution else "detail"
    item["faculty_code"] = r["faculty"] if not historical and not institution else ""
    item["academic_year"] = r.get("academic_year", "")
    item["entity_id"] = ("institution:TUD" if institution else
                         "historical:" + slug(r["source_label"]) if historical else "faculty:" + r["faculty"])
    if historical and r["source_label"] in historical_categories:
        item["level"] = "historical_category"
    return {c: item.get(c) for c in MASTER_COLUMNS}


masters = {"1905-2001": sorted([master_row(r) for r in historical + historical_totals],
                             key=lambda r: (r["year"], r["row_type"] != "detail", r["source_label"])),
           "2002-2011": sorted([master_row(r) for r in middle_faculty],
                             key=lambda r: (r["year"], r["row_type"] != "detail", r["source_label"])),
           "2012-2026": []}
for year in range(2012, 2027):
    rows = [r for r in recent if r["year"] == year]
    masters["2012-2026"].extend(master_row(r) for r in rows)
    total = master_row(record(year, "", "Sum of faculty influx", sum(r["male"] for r in rows), sum(r["female"] for r in rows),
                              "2012-2026/Influx studenten.pdf", "Page 1", f"{year}; sum of eight faculty rows",
                              level="faculty_sum", definition="sum_of_faculty_influx_not_deduplicated_institution_total",
                              status="current_snapshot_2026-11-01" if year == 2026 else "derived"))
    total.update(row_type="derived_total", entity_id="faculty_sum:all")
    masters["2012-2026"].append(total)

# Grouping is metadata only: it does not recast historical rows as faculties.
evidence = {
    "lst": "https://pub.math.leidenuniv.nl/~stevenhagenp/Visitatierapport2007.pdf",
    "lst_current": "https://www.tudelft.nl/en/student/faculties/as-student-portal/organisation/board-of-studies-applied-sciences/",
    "mkt": "https://www.dcsc.tudelft.nl/~bdeschutter/edu/AfstudeergidsEt_2001_2002.pdf",
    "mkt_ewi": "https://delta.tudelft.nl/article/ik-wil-niet-alleen-maar-hoge-cijfers-halen",
    "landmeter": "https://www.nationaalarchief.nl/onderzoeken/archief/3.12.08.01/download/pdf",
    "geodesy": "https://delta.tudelft.nl/article/tu-stopt-opleidingen-geodesie",
    "geomatics": "https://publicaties.nvao.net/524026d7cb1c2_rapport%20TUD%20wo-ma%20Geomatics.pdf",
}
entity_mapping = []
for m in mapping:
    label = m["source_label"]
    observed = [r["year"] for r in historical if r["source_label"] == label and r["status"] != "blank"]
    item = dict(entity_id="historical:" + slug(label), source_label=label, entity_level="historical_category" if label in historical_categories else "programme",
                source_faculty=m["faculty"], optional_faculty_group=m["faculty"], relationship="source_current_faculty_mapping" if m["faculty"] else "unmapped",
                partners_or_successors="", observed_from=min(observed) if observed else None, observed_to=max(observed) if observed else None,
                basis="1905-2001.xlsx Data!" + m["source_cells"], evidence_url="", verified_on="",
                notes="Optional modern grouping from supplied source; not historical faculty ownership. Other affiliations not independently audited.")
    if label == "Life Science & Technology":
        item.update(optional_faculty_group="AS", relationship="joint_programme_delft_host", partners_or_successors="Leiden University / Leiden Institute of Chemistry",
                    evidence_url=evidence["lst"] + " | " + evidence["lst_current"], verified_on="2026-11-18",
                    notes="2007 assessment p.87 links LST to LIC and TNW, with a 1999 start. AS is the Delft grouping; Leiden partnership retained, no allocation of counts between institutions.")
    elif label == "Media & Kennistechnologie":
        item.update(optional_faculty_group="EEMCS", relationship="faculty_predecessor", partners_or_successors="ITS; Electrical Engineering and Computer Science programmes",
                    evidence_url=evidence["mkt"] + " | " + evidence["mkt_ewi"], verified_on="2026-11-18",
                    notes="2001-2002 ITS guide identifies Media en Kennistechnologie jointly with Technische Informatica; 2006 TU report places the programme at EWI. No evidence found here of another faculty co-host.")
    elif label in ["Civiel-Landmeter", "Geodetisch Ingenieur"]:
        item.update(optional_faculty_group="CEG", relationship="historical_lineage_optional_group", partners_or_successors="Geodesy; OTB; AE; ABE (Geomatics from September 2011)",
                    evidence_url=evidence["landmeter"] + " | " + evidence["geodesy"] + " | " + evidence["geomatics"], verified_on="2026-11-18",
                    notes="Archive 1280/1282 supports civil-engineering/geodesy lineage. Geodesy later had its own faculty, joined CiTG in the mid-1990s, and research split after 2002. CEG is an optional grouping, not exclusive modern ownership; do not split counts across successors.")
    elif label in historical_categories:
        item.update(relationship="separate_historical_category", notes="Keep distinct and unassigned. Included in the source annual totals.")
    entity_mapping.append(item)

for code in FACULTIES:
    labels = sorted({r["source_label"] for r in middle_faculty + old_faculty + recent if r["faculty"] == code})
    for label in labels:
        entity_mapping.append(dict(entity_id="faculty:" + code, source_label=label, entity_level="faculty", source_faculty=label,
                                   optional_faculty_group=code, relationship="faculty_label_alias", partners_or_successors="",
                                   observed_from=min(r["year"] for r in middle_faculty + old_faculty + recent if r["source_label"] == label),
                                   observed_to=max(r["year"] for r in middle_faculty + old_faculty + recent if r["source_label"] == label),
                                   basis="Supplied faculty tables", evidence_url="", verified_on="",
                                   notes="Stable display grouping for Dutch/English faculty acronyms. It is not a chronology of faculty organisation."))
for label in sorted({r["source_label"] for r in programmes}):
    rows = [r for r in programmes if r["source_label"] == label]
    faculties = sorted({r["faculty"] for r in rows})
    item = dict(entity_id="programme:" + label.lower(), source_label=label, entity_level="programme",
                source_faculty=" | ".join(faculties), optional_faculty_group=" | ".join(faculties), relationship="source_administrative_group",
                partners_or_successors="", observed_from=min(r["year"] for r in rows), observed_to=max(r["year"] for r in rows),
                basis="2002-2011.xlsx programme sheet faculty blocks", evidence_url="", verified_on="",
                notes="Programme code retained; source block does not establish exclusive ownership. No unverified merger with earlier programme names. Filter study phase separately.")
    if label == "M-GM":
        item.update(relationship="source_group_differs_from_documented_move", partners_or_successors="ABE from September 2011",
                    evidence_url=evidence["geomatics"], verified_on="2026-11-18",
                    notes="Source still lists M-GM under LR/AE in 2011. Accreditation report documents move to Architecture in September 2011. Source counts and grouping retained pending interface grouping policy.")
    if label in ["B-LST", "M-LST"]:
        item.update(partners_or_successors="Leiden University (joint BSc; separate Delft and Leiden MSc programmes)", evidence_url=evidence["lst"] + " | " + evidence["lst_current"], verified_on="2026-11-18")
    entity_mapping.append(item)
for r in programmes:
    r["entity_id"] = "programme:" + r["source_label"].lower()

coverage = [
    dict(dataset="Master 1905-2001", years="1905-2001", grain="Programme / historical category", rows=len(masters["1905-2001"]), note="23 source categories and one reported total per year. Blank cells retained; 1944 detail is entirely blank, reported total is 0."),
    dict(dataset="Master 2002-2011", years="2002-2011", grain="Faculty", rows=len(masters["2002-2011"]), note="Eight faculty blocks and one reported institution total per year. Programme history is incomplete; do not mix partial detail into master totals."),
    dict(dataset="Master 2012-2026", years="2012-2026", grain="Faculty", rows=len(masters["2012-2026"]), note="PDF/SVG authoritative; eight faculties plus derived faculty sum per year. All 240 male/female count cells agree. 2026 snapshot 1 November; report 10 November 2026 v1.0."),
    dict(dataset="Programme detail bachelor", years="2011 only", grain="Programme", rows=16, note="No individual bachelor counts for 2002-2010 in supplied workbook."),
    dict(dataset="Programme detail master", years="2011 only", grain="Programme", rows=49, note="49 source programme rows, including blank/inactive rows. No individual master counts for 2002-2010."),
    dict(dataset="Programme detail bridging", years="2006-2011", grain="Programme", rows=198, note="33 source programme codes per year; blank rows remain blank. Bridging entrants already included in master phase totals through 2009."),
    dict(dataset="Phase detail 2012-2018", years="2012-2018", grain="Faculty / study phase", rows=168, note="Recovered from external-link cache referenced by visible formulas; sums verified. This is not individual programme detail; programme caches are empty."),
    dict(dataset="Programme detail 2012-2018", years="None supplied", grain="Unavailable", rows=0, note="Only faculty aggregates and cached faculty-phase counts exist in supplied workbook. Need original dashboard/programme export for individual tracks."),
]

all_totals = [r for group in masters.values() for r in group if r["row_type"] != "detail"]
assert len(all_totals) == 122 and len({r["year"] for r in all_totals}) == 122
for group in masters.values():
    assert len({(r["year"], r["entity_id"]) for r in group}) == len(group)
    for r in group:
        assert list(r) == MASTER_COLUMNS
        assert r["total"] is None or r["male"] + r["female"] == r["total"]

payload = dict(sources=sources, historical=historical, historical_totals=historical_totals, historical_mapping=mapping,
               middle_faculty=middle_faculty, old_faculty=old_faculty, phase_totals=phase_totals,
               programmes=programmes, programme_subtotals=programme_subtotals, recent=recent, annual=annual,
               comparison=comparison, checks=checks, masters=masters, entity_mapping=entity_mapping, coverage=coverage)
(OUT / "source-analysis.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
for name, rows in [("recent-faculty-counts.csv", recent), ("recent-annual-totals.csv", annual),
                   ("programme-counts-2006-2011.csv", programmes), ("faculty-counts-check-2012-2018.csv", old_faculty),
                   ("overlap-comparison-2012-2018.csv", comparison), ("source-total-checks.csv", checks),
                   ("faculty-phase-counts-2002-2018.csv", phase_totals), ("entity-mapping.csv", entity_mapping),
                   ("data-coverage.csv", coverage)]:
    write_csv(name, rows)
for period, rows in masters.items():
    write_csv(f"master-{period}.csv", rows, MASTER_COLUMNS)

print(json.dumps(dict(pdf_svg_count_cells_agree=len(pdf_counts), recent_rows=len(recent), programme_rows=len(programmes),
                      programme_coverage={phase: sorted(set(r["year"] for r in programmes if r["phase"] == phase)) for phase in ["bachelor","master","bridging"]},
                      annual_totals=annual,
                      largest_overlap_changes=sorted(comparison, key=lambda r: abs(r["relative_change"] or 0), reverse=True)[:15],
                      source_sum_mismatches=[r for r in checks if r["difference"] not in [None,0]]), indent=2))
