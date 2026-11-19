# Source data

The app loads the three `processed/master-*.csv` files and `processed/entity-mapping.csv`, with `colors.json` providing the historical palette. They cover 1905–2026 and preserve the original programme/category/faculty level. Run `pnpm prepare:data` after editing them; `pnpm dev` and `pnpm build` do this automatically.

The generated `src/data/students.json` is ignored by Git and included in the built site. The optional faculty grouping uses the mapping's `optional_faculty_group`; it never adds master total rows into category counts. Unmapped historical categories remain separate. Source records remain available in grouped downloads.

The original spreadsheets (`1905-2001.xlsx`, `2002-2011.xlsx`, `2012-2018.xlsx`) and `2012-2026/` PDF/SVG pair are retained unchanged. The PDF/SVG pair is authoritative for 2012 onward. The source analysis script is separate from the application build and requires Python/Poppler; normal development and deployment only need pnpm/Node.

Source Excel/PDF/SVG documents under `data/`, generated workbooks under `outputs/`, and auxiliary files under `processed/` are ignored by Git. Only the three master CSVs, mapping CSV and analysis README are kept versionable in `processed/`. Those four CSVs must be committed with the app for fresh clones and GitHub Actions to work. Ignoring files leaves local copies intact but does not back them up; regenerating the analysis requires the original source documents to be supplied separately.

See [processed/README.md](processed/README.md) for the extraction, overlapping-source comparison, counting definitions, missing programme coverage and mapping evidence.

`female_at_tu.json`, `male_at_tu.json` and the variants in `archive/` are preserved legacy references. They are not loaded by the app or published as site assets.
