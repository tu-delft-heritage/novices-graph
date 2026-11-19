# First-year students at TU Delft

An Observable Framework explorer using D3 and Observable Plot, covering **1905–2026**. It includes four graph views, English/Dutch labels, faculty grouping, styling controls, SVG/JPG images and CSV/JSON downloads. The page uses Framework's default theme and Observable Inputs; custom CSS handles layout only.

## Develop with pnpm

Use Node.js 24 (`.nvmrc`) and pnpm 10.22.0 (`package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Observable, normally `http://127.0.0.1:3000`. Preview and production builds prepare the browser data automatically.

```sh
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

Browser checks use `dist/` at `/novices-graph/`, testing subpath hosting, all four views, grouping, languages, styling, missing counts, mobile layout and real downloads. Rebuild after source changes. `node scripts/serve-built.js` serves the same production preview on port 4173.

## Explorer controls

- **Data → Language / Taal** switches between English and Dutch, including captions, labels, tooltips, number formatting and image exports. Counts, styling and custom titles stay intact. Reset keeps the selected language.
- **View** selects women by programme, women and men, all students by programme, or men by programme. Programme views use the original programme/historical categories through 2001 and recorded faculty categories from 2002. The percentage line always shows the share of women.
- **From / To** select an inclusive range through 2026. Crossing the endpoints moves the other endpoint too.
- **Group programmes by faculty**, off by default, applies `optional_faculty_group` from the mapping. Mapped historical programme counts join the later faculty series under stable faculty IDs. Unmapped `Alle lessen`, `Enkele lessen` and `IJker` remain separate. This is a display grouping, not a claim about historical faculty ownership or exclusive programme ownership. Joint relationships do not duplicate counts.
- The focus dropdown follows the grouping mode. Enabling grouping on a historical programme selects its mapped faculty. Disabling it retains that faculty's original source series, which starts in 2002; select a historical programme to return to its original detail.
- **Undefined percentages as 0**, enabled by default, affects percentages only. Counts always retain the distinction between missing values and recorded zeros.
- **Appearance**, **Layers**, **Fine adjustments** and **Category/Faculty colours** control bars/areas, palettes, individual colours, typography, background, axes, line, grid, markers, legend and opacity. The women/men comparison has separate sex colours. Changing palettes clears colour overrides.
- Hover over the graph or use **Inspect year** for counts and a category/faculty breakdown. Totals from 2012 are labelled as faculty sums.
- **Image export** contains SVG/JPG downloads and image dimensions, resolution and quality. Exports include source, grouping, counting-scope and snapshot notes. JPG exports above 32 megapixels are disabled. Dutch image filenames end in `-nl`; grouped exports include `-grouped-by-faculty`.
- **Data export** contains CSV/JSON downloads that follow the chosen range, focus and grouping. Styling and language do not change exported data.

## Data sources and interpretation

`scripts/prepare-data.js` reads these files:

```text
data/processed/master-1905-2001.csv
data/processed/master-2002-2011.csv
data/processed/master-2012-2026.csv
data/processed/entity-mapping.csv
data/colors.json
```

It validates counts, total rows, unique year/entity keys and unambiguous grouping keys, then writes ignored `src/data/students.json` for Framework's `FileAttachment`. Run `pnpm prepare:data` after editing a master during preview. No Python or spreadsheet runtime is needed for the app or GitHub Actions build.

The masters provide **122 years and 31 original categories**. Faculty grouping has eight faculty series and three separate historical categories. Total rows are kept separate from detail and never added into stacks. In 1905, all source categories together contain 22 women and 247 men. The supplied 2002 master contains 439 women and 1,647 men. The latest 2026 snapshot contains 2,261 women and 4,638 men across faculty rows.

Blank historical category cells stay missing. The recorded annual total is zero in 1944, but the detail cells are blank; grouped category counts stay unknown in that year. A partially known count does not become a zero when grouped. All-blank categories do not contribute to sums of other observed categories. Area series contain explicit missing-year points to prevent interpolation across unavailable years.

The authoritative recent data come from the supplied PDF/SVG pair, superseding the older 2012–2018 workbook. From 2012, annual totals are **sums of faculty influx**, not verified deduplicated university headcounts. **2026 is the snapshot of 1 November**, not a confirmed final year. Source definitions and observation dates change over time. The page and image exports identify these limits.

Git ignores source Excel/PDF/SVG documents, `outputs/`, and auxiliary processed analysis files. The three master CSVs, mapping CSV and analysis README are explicitly retained. Keep the four runtime CSVs in commits so fresh clones and GitHub Actions can build; the source documents are only needed to regenerate the analysis and must be backed up separately.

Incomplete programme detail from the separate analysis sheets is not mixed into the masters: bachelor/master programme counts are available only for 2011, bridging counts for 2006–2011, and the 2012–2018 cache contains faculty-phase aggregates. See [the data analysis](data/processed/README.md) for coverage, comparison results and mapping evidence.

Legacy `female_at_tu.json`, `male_at_tu.json` and `data/archive/` remain reference material and are no longer loaded. The source spreadsheets and PDF/SVG remain unchanged. The existing palette is reused for corresponding source categories and faculty groups.

## Data download schema

JSON schema version 2 contains:

- `selection`: inclusive years, stable `entity_id` (or null), and `grouping` (`source` or `faculty`).
- `totals`: selected annual counts, total, percentage and `total_basis` (`institution`, `faculty_sum` or `selection`).
- `programmes`: the selected category records, including blank/inactive source rows, with stable IDs, labels, level, counts and source metadata.
- `source_records`: only for grouped downloads; the underlying original rows, preserving source labels, workbook/PDF locations and counts.
- `notes`, `share_unit` and `undefined_shares_as_zero`: interpretation and display settings.

CSV contains the same information per record, with `record_type` equal to `selection_total`, `category` or `source_record`. **Filter by record type before summing**; grouped source records explain the category sums and are not extra students. `members` lists contributing entity IDs. `female_share` is a fraction; undefined shares follow the zero option. Missing counts remain JSON null / blank CSV cells; recorded zeros stay numeric zero. Labels and IDs do not change with display language.

## GitHub Pages publishing

`.github/workflows/publish.yml` installs with pnpm's frozen lockfile, runs unit tests and builds Framework. Pushes to `main` and manual runs on `main` upload `dist/` and publish through GitHub Pages actions. Pull requests validate without deploying. The committed master CSVs and mapping must accompany the app changes; the workflow does not regenerate them from the source workbooks.

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The expected site is `https://tu-delft-heritage.github.io/novices-graph/`. `PAGES_BASE_PATH` records the repository path; use `/` for a custom domain or account-root Pages site. No hosting credentials are needed beyond the workflow's scoped `GITHUB_TOKEN`.

```text
data/                     Original sources and reference JSON
  processed/              Master CSVs, mapping, detail and analysis
src/                      Observable page and chart components
  data/students.json      Generated browser dataset (ignored)
scripts/                  Data preparation and preview server
test/                     Data, export and browser checks
.github/workflows/        GitHub Pages build and deployment
dist/                     Generated static site (ignored)
```
