# First-year students at TU Delft

An Observable Framework site using D3 and Observable Plot: annual first-year student counts, a separate percentage axis, historical markers, styling controls, SVG/JPG images, and CSV/JSON data downloads. The source data cover 1905–2018.

## Develop with pnpm

Use Node.js 24 (see `.nvmrc`) and pnpm 10.22.0 (pinned in `package.json`). If pnpm is not already installed, use `corepack enable`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Observable, normally `http://127.0.0.1:3000`. The default commands prepare the data before starting the preview or building the site.

```sh
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

The browser checks run against `dist/` at `/novices-graph/`, exercising GitHub Pages subpath hosting, controls, zero-count years, mobile layout, and actual SVG/JPG/CSV/JSON downloads. Run `pnpm build` after changing source files before rerunning browser tests. `node scripts/serve-built.js` also lets you inspect the production build at `http://127.0.0.1:4173/novices-graph/`.

## Use the explorer

The page uses Observable Framework's default theme and standard Observable Inputs. Custom CSS is limited to layout; background, typography, and control styling follow Framework. Essential caveats are grouped under **Data notes**.

- Choose an inclusive year range. Moving one endpoint beyond the other moves both to that year.
- Under **Data → View**, choose **Women by programme** (the original view) or **Women and men**. The comparison stacks recorded female and male totals, with the percentage of women on the right axis. Both views support bars and areas, faculty selection, styling, and exports. The comparison has separate colour controls for women and men.
- The default graph title follows the view and selected years; a manually edited title is preserved. The description also follows the selected view.
- Under **Data**, select **All faculties / afdelingen** or one original faculty/afdeling category. The graph, year values, breakdown, and exports follow this selection, and the vertical axis rescales. Categories before and after 2002 remain separate, as supplied in the source files.
- A focused percentage uses female and male counts for that same category. The eight newer faculty categories have no matching male series in the source; their male counts are shown as unavailable.
- **Undefined percentages as 0** is enabled by default under **Data**. Missing counts or zero denominators use 0% in the chart, year values, and all exports. Turn it off to restore gaps and undefined shares. Source counts remain unchanged.
- Switch between stacked bars and stacked areas. Change the title, palette, background, text/axis colour, percentage-line colour, font, font size, bar spacing, opacity, and line width. Expand **Programme colours** to override individual series. Choosing a palette clears those overrides.
- Toggle the percentage line, grid, historical markers, and legend. The original view lists programmes with nonzero female counts in the visible period; the comparison legend lists women and men.
- Hover over the graph or use the keyboard-accessible **Inspect year** select to read totals and the programme breakdown.
- Under **Export**, set the SVG width and plot height and use the download buttons. The complete image height also includes the title, legend, and source note; dimensions are shown with the export controls.
- Download an editable, self-contained SVG or a JPG with the same styling. JPG supports 1×, 2×, and 3× resolution plus adjustable quality; exports above 32 megapixels are disabled. Fonts use portable system stacks; exact glyphs can vary across computers. Exports have the chosen solid background.
- **Download CSV** and **Download JSON** export the selected years and faculty/afdeling, including zero-count categories. JSON includes the source, selection, annual `totals`, per-year `programmes`, and the `undefined_shares_as_zero` setting. CSV combines those records with `record_type` set to `selection_total` or `programme`; filter by that column before aggregating to avoid counting totals twice. `female_share` is a fraction from 0 to 1 and follows **Undefined percentages as 0**. With that option off, undefined shares are `null` in JSON and blank in CSV. Missing counts always stay `null`/blank, while recorded zeros remain `0`. `programme_female_total` keeps programme sums distinct from recorded female totals. Styling options do not affect data downloads.
- **Reset** restores the original styling. Settings last for the current page session.

## Data and interpretation

The source files are `data/female_at_tu.json`, `data/male_at_tu.json`, and `data/colors.json`. `scripts/prepare-data.js` reads them and writes a generated, ignored `src/data/students.json` for Framework's `FileAttachment`. After editing a source file, rerun `pnpm prepare:data` during preview (or restart `pnpm dev`). Every production build regenerates it. Alternate historical JSON files are preserved in `data/archive/` and are not used or published.

The dataset contains 28 programme names across 114 years. The legacy exclusions (`alle lessen`, `enkele lessen`, `ijker`, `nan`, and `Totaal`) are retained when selecting programme series. Names and counts are not corrected or merged. Some programme sums do not match the recorded female totals, including 1905 (9 by programme versus 22 recorded). Bars use programme counts; the line uses `female total / (female total + male total)`, joined by year. Missing totals and zero denominators make the percentage undefined, including 1944. The default setting substitutes 0% for these shares without modifying the source data; disabling it leaves gaps. The programme classification changes in 2002.

The **Women and men** view uses recorded totals rather than programme sums: for example, 1905 has 22 women and 247 men, and 2018 has 1,853 women and 4,078 men. Both total series cover all 114 years. Matching male counts are unavailable for the eight newer faculty categories; a focused comparison leaves those male counts missing, shows a note, and reports the combined total as unavailable. The zero-percentage option does not fill missing counts. CSV and JSON continue to include both female and male columns in either view.

Historical markers retain the original events. The Second World War marker starts at 1939, correcting the old graph's 1938 start. The chart uses linear interpolation between annual values. The app's data notes explain the count discrepancies. Image and JSON exports include a source reference.

## Repository layout

```text
data/                     Source JSON files
  archive/                Unused historical dataset variants
src/                      Observable page and chart components
  data/students.json      Generated browser dataset (ignored)
scripts/                  Data preparation and production preview server
test/                     Data, export, and browser checks
.github/workflows/        GitHub Pages build and deployment
dist/                     Generated static site (ignored)
```

The old standalone pages, scripts, CanvasJS bundle and examples, and Jekyll/Ruby dependencies have been removed. The remaining dependencies support Observable Framework, Observable Plot, D3, and Playwright. Start the app with `pnpm dev`.

## GitHub Pages publishing

`.github/workflows/publish.yml` installs dependencies with pnpm's frozen lockfile, runs unit tests, builds Framework, and runs Chromium checks against the built site. Pushes to `main` and manual runs on `main` then upload `dist/` and publish it using the official GitHub Pages actions. Pull requests to `main` and manual runs on other branches validate without deploying. New commits cancel outdated pull request checks; an active deployment is allowed to finish.

One-time repository setup:

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. Merge this feature branch into `main` and push it to GitHub.
3. Open the **Build and publish Observable** workflow to follow the deployment.

The repository's expected Pages URL is `https://tu-delft-heritage.github.io/novices-graph/`. The workflow uses `GITHUB_TOKEN` with deployment permissions scoped to the deploy job; no personal token or Observable hosting account is needed. This change supplies the workflow; it does not alter repository settings or publish the site itself.

Framework generates relative asset links, and `PAGES_BASE_PATH` records the repository path in configuration. For a custom domain or an account-root Pages repository, set that workflow value to `/`.

References: [Observable Framework deployment](https://observablehq.github.io/framework/deploying), [Observable Plot](https://observablehq.github.io/plot/), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
