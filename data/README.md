# Source data

- `female_at_tu.json`: recorded female counts by programme and year, plus `Totaal`.
- `male_at_tu.json`: recorded male counts by programme and year, plus `Totaal`.
- `colors.json`: original programme colours.

These files are preserved unchanged from the original repository. Run `pnpm prepare:data` after editing them; `pnpm dev` and `pnpm build` do this automatically. The generated `src/data/students.json` is ignored by Git and included in the built site.

`archive/` preserves the original `_cheat`, `_old`, and `_wrong` variants for reference. They are not loaded by the app or included in the published site.
