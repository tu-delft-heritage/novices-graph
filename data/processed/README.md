# Student influx source analysis

Prepared 18 November 2026. This directory contains the data preparation now used by the explorer. Original source files and legacy JSON references remain unchanged.

The three masters share the same columns while retaining the source's level of detail. Historical programmes are not retrospectively turned into modern faculties. For 2012 onward, the supplied PDF/SVG pair is authoritative, as requested.

## Deliverables and coverage

The Excel workbook is `outputs/source-data-2026-11-18/student-influx-masters.xlsx` relative to the repository root. It contains the three masters, recent annual totals, programme detail, faculty-phase detail, mapping, overlap comparison, coverage and methodology. Totals, percentages and comparison differences are formulas; source counts remain numeric inputs.

| CSV | Content |
| --- | --- |
| `master-1905-2001.csv` | 2,328 rows: 23 original categories and one reported annual total for each of 97 years |
| `master-2002-2011.csv` | 90 rows: eight original faculty groups and one reported institution total for each year |
| `master-2012-2026.csv` | 135 rows: eight faculty groups and a derived sum for each year; PDF/SVG values |
| `recent-faculty-counts.csv` | The 120 recent faculty-year observations, without total rows |
| `recent-annual-totals.csv` | Fifteen annual faculty sums, with older controls and differences for 2012–2018 |
| `programme-counts-2006-2011.csv` | 263 programme-year-phase rows, including blank rows: 16 bachelor and 49 master rows for **2011 only**, plus 33 bridging programme codes for 2006–2011 |
| `faculty-phase-counts-2002-2018.csv` | 438 rows: bachelor/master/bridging faculty and institution aggregates for 2002–2011, plus 168 faculty-phase records recovered from the 2012–2018 external-link cache |
| `faculty-counts-check-2012-2018.csv` | The older comparison workbook's 63 faculty/total rows |
| `entity-mapping.csv` | Stable entity IDs, faculty acronym aliases, optional grouping and relationship evidence |
| `overlap-comparison-2012-2018.csv` | All 168 comparisons: 56 faculty-years × male/female/total |
| `source-total-checks.csv` | Reconciliation of original detail with original annual male/female totals |
| `data-coverage.csv` | Explicit availability and limitations |
| `source-analysis.json` | Reproducible extraction payload, including source checksums and source-cell provenance |

The 2012–2018 workbook **does not contain individual programme counts**. It has one visible faculty sheet. Its external-link cache contains faculty counts by bachelor, master and bridging phase, but its programme caches are empty. Recovering those missing programme counts requires the original programme-level export, likely from the referenced `A2. Dashboard instroom naar geslacht 2018.xlsx`. No external workbook was refreshed or accessed.

## Master schema

All three master CSVs have these columns in the same order. Excel displays spaces in place of underscores in the column headings.

| Column | Meaning |
| --- | --- |
| `year` | Start year printed in the source |
| `source_label` | Original programme/category/faculty label; the new recent sum is labelled explicitly |
| `level` | `programme`, `historical_category`, `faculty`, `institution`, or `faculty_sum` |
| `phase` | `historical` or `all` in masters; bachelor/master/bridging in detail tables |
| `male`, `female` | Non-negative integer counts; empty means missing, not zero |
| `total` | Male + female when both are present; otherwise empty |
| `female_share` | Female / total as a fraction; empty for missing counts or total zero |
| `row_type` | `detail`, `reported_total` or `derived_total` |
| `faculty_code` | Normalized acronym for faculty-level records; deliberately empty for historical programme rows |
| `academic_year` | Original historical label such as `1905/06`; not invented for later sources |
| `reported_total` | A separate combined total where the source supplies one; preserved for auditing |
| `status` | Recorded, blank, derived or current snapshot |
| `definition` | Source-specific counting definition; these definitions are not interchangeable |
| `source_file`, `source_sheet`, `source_cells` | Traceable source location |
| `entity_id` | Stable key for a source entity, used with year and study phase |

**Do not sum detail and total rows together.** Use `row_type=detail` for disaggregated plots and select the total row for annual totals. Recent totals are the **sum of faculty influx**, not a verified count of unique individuals across the university. A person entering more than one faculty may be counted in multiple faculty rows.

## Overlap comparison

All 240 sex-specific count cells agree between the PDF and SVG. The following table compares the sum of the eight faculties with the same sum in the older workbook:

| Year | Older workbook | Latest PDF/SVG | Difference | Relative difference |
| --- | ---: | ---: | ---: | ---: |
| 2012 | 3,611 | 3,919 | +308 | +8.5% |
| 2013 | 3,949 | 4,365 | +416 | +10.5% |
| 2014 | 4,245 | 4,806 | +561 | +13.2% |
| 2015 | 4,709 | 5,346 | +637 | +13.5% |
| 2016 | 5,030 | 5,295 | +265 | +5.3% |
| 2017 | 5,519 | 5,784 | +265 | +4.8% |
| 2018 | 5,931 | 6,217 | +286 | +4.8% |

The review flag is a transparent screening rule: absolute difference ≥20 students **and** absolute relative change ≥10%, or a nonzero latest value against a zero baseline. It flags 54 metric rows in 23 of 56 faculty-years. Male, female and total are correlated comparisons, not 168 independent tests. This is not a statistical error test and does not change source priority.

Examples worth investigating if a precise reconciliation is required:

| Faculty/year/metric | Older | Latest | Difference |
| --- | ---: | ---: | ---: |
| AS, 2015, female | 159 | 235 | +76 (+47.8%) |
| AS, 2015, total | 578 | 758 | +180 (+31.1%) |
| TPM, 2015, total | 252 | 361 | +109 (+43.3%) |
| TPM, 2014, total | 252 | 335 | +83 (+32.9%) |
| EEMCS, 2015, female | 117 | 157 | +40 (+34.2%) |
| TPM, 2016, female | 163 | 132 | −31 (−19.0%) |

These differences are too large to describe collectively as small rounding differences. Definitions, observation dates and retrospective revisions can matter, but the supplied files do not explain each discrepancy. The newer counts are retained as instructed.

The latest report counts first-time entrants at a faculty in bachelor, bridging or master, with only external influx for master. It uses year-end or most-current observations. The report is version 1.0 of 10 November 2026, snapshot 1 November 2026: **2026 is a current snapshot, not a confirmed final year**. Its faculty sum is 6,899 (4,638 male; 2,261 female).

The older 2012–2018 workbook notes that the TU Delft tuition-payment criterion was removed from 1 September 2016. The 2002–2011 workbook describes fixed OSIRIS first-year groups at institution/faculty/programme level and a 1 December observation. Avoid treating the joined series as methodologically uniform.

## Historical and programme safeguards

- All original annual sums with recorded detail reconcile to the supplied male/female totals. In 1944, all 23 category rows are blank while the recorded annual totals are zero; detail reconciliation is therefore unavailable, not a measured all-zero programme year.
- `Alle lessen`, `Enkele lessen` and `IJker` remain separate historical categories and contribute to the original totals. For example, 1905 has 247 male and 22 female students in the full source; dropping these three categories leaves 221 male and 9 female students.
- The programme detail preserves `male_raw` and `female_raw`. In 99 rows one missing sex count can be interpreted as zero because the other sex has a count and a displayed share of exactly 100%; these rows have `zero_inferred_from_100_percent` status. Sixty-one entirely blank rows remain blank even if the source SUM formula displays zero.
- Programme percentages are recalculated from counts. Original subtotal percentage cells are not used as weighted cohort percentages.
- In 2002–2009, the Master phase sheet already includes bridging students. Standalone bridging phase cells are blank, with formula totals of zero. Do not add the recovered 2006–2009 bridging programme counts to the Master phase again.
- The three programme-phase sums for 2011 reconcile to their institution phase controls: bachelor 2,631, master 822, bridging 116; combined 3,569. Recorded faculty-phase cells also agree with programme sums; four bridging female controls are blank rather than explicitly zero.
- The 168 recovered 2012–2018 faculty-phase records reconcile to all 112 visible male/female faculty cells. This validates the cached values used, not the availability of the absent linked workbook.

## Mapping and online verification

`entity-mapping.csv` is metadata, not a redistribution of counts. `source_faculty` preserves the supplied attribution; `optional_faculty_group` enables a future grouping choice. Shared programmes are not duplicated or split into arbitrary fractional counts. Observed year ranges describe table coverage, including explicit zero cells, rather than faculty ownership dates or programme lifetimes.

The three proposed additions were checked against institutional and archival evidence:

- **Life Science & Technology → AS**, with **Leiden University / Leiden Institute of Chemistry as a partner**. The [2007 assessment, p. 87](https://pub.math.leidenuniv.nl/~stevenhagenp/Visitatierapport2007.pdf) links the programme to LIC in collaboration with Delft TNW and records a 1999 start. The [current AS board-of-studies page](https://www.tudelft.nl/en/student/faculties/as-student-portal/organisation/board-of-studies-applied-sciences/) explicitly identifies the Delft–Leiden bachelor programme. This does not imply that every later LST master is a joint degree.
- **Media & Kennistechnologie → EEMCS**, through **ITS/EWI**. The [2001–2002 ITS Electrical Engineering study guide](https://www.dcsc.tudelft.nl/~bdeschutter/edu/AfstudeergidsEt_2001_2002.pdf) describes Media en Kennistechnologie together with Technische Informatica; a [TU report from 2006](https://delta.tudelft.nl/article/ik-wil-niet-alleen-maar-hoge-cijfers-halen) places a graduate of the programme at EWI. This supports collaboration between electrical engineering and computer science within that faculty lineage; no evidence of another faculty co-host was found in these sources.
- **Civiel-Landmeter → CEG only as an optional historical grouping**, not exclusive current ownership. [Nationaal Archief inventory 3.12.08.01, items 1280 and 1282, printed p. 147](https://www.nationaalarchief.nl/onderzoeken/archief/3.12.08.01/download/pdf) documents the civil-engineering/geodesy relationship. [TU reporting in December 2002](https://delta.tudelft.nl/article/tu-stopt-opleidingen-geodesie) describes geodesy's earlier separate faculty, its later place within CiTG and the planned research split between OTB and Aerospace Engineering. The related **Geomatics** master moved from Aerospace Engineering to Architecture in September 2011, according to its [2012 accreditation report](https://publicaties.nvao.net/524026d7cb1c2_rapport%20TUD%20wo-ma%20Geomatics.pdf). These are lineage relationships, not reasons to merge programme identities or duplicate old students across successor faculties.

The 2011 source still places `M-GM` under LR/AE despite the documented Geomatics move. That attribution is preserved and flagged in the mapping. Remaining faculty mappings supplied by the historical workbook are retained as source metadata; they have not all been independently audited for joint ownership.

Faculty aliases such as BK/ABE, LR/AE, TNW/AS, CiTG/CEG, EWI/EEMCS, IO/IDE, 3mE/ME and TBM/TPM share stable display IDs. Original labels remain intact. Historical programmes and later programme codes are **not** merged solely on name similarity. The mapping explicitly distinguishes administrative grouping, name aliases, joint partnerships and historical lineage.

## Interface migration

The legacy graph JSON's female faculty counts for 2012–2018 exactly match the older workbook, so they are not an independent third source. Historical annual totals match the newly supplied workbook. However, legacy annual totals for 2002–2011 differ from the newly supplied workbook (all ten male totals and eight female totals). For example, the legacy 2002 combined total is 1,908; the supplied workbook reports 2,086. The app now uses the masters and the newer counts.

The interface defaults to source categories and offers optional faculty grouping through `optional_faculty_group`. Historical categories without a faculty mapping stay separate, and the original rows accompany grouped data exports. Missing-data display choices remain separate from stored counts. Full historical programme detail for 2002–2010 and 2012 onward cannot be reconstructed from these faculty aggregates.

## Reproduction and validation

From the repository root, run `python3 scripts/analyze-source-data.py` in an environment with `openpyxl`, `lxml` and the Poppler `pdftotext` executable. These are analysis tools, not new application dependencies. The script regenerates the CSVs and extraction payload and asserts PDF/SVG agreement, uniqueness, totals, source reconciliation and cached phase sums.

The Excel workbook was authored with the bundled spreadsheet runtime. Its formulas were recalculated and checked against the extraction payload; all 45,954 master cells were independently re-read from the saved XLSX and matched. A changed-count, missing-count and zero-count check passed with inputs restored. All ten sheets were rendered and visually reviewed. Source checksums are recorded in the JSON payload and workbook ReadMe.
