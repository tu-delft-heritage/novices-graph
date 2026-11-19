import {readFile} from "node:fs/promises";
import {csvParse} from "d3";
import {normalizeMasters} from "../../src/components/data.js";

export const readCsv = async (name) => csvParse(await readFile(new URL(`../../data/processed/${name}`, import.meta.url), "utf8"));
export async function loadMasters() {
  const [a, b, c, mapping] = await Promise.all(["master-1905-2001.csv", "master-2002-2011.csv", "master-2012-2026.csv", "entity-mapping.csv"].map(readCsv));
  return normalizeMasters([...a, ...b, ...c], mapping);
}

export function fixture() {
  const rows = [];
  const add = (year, id, female, male, row_type = "detail") => rows.push({year, entity_id: id, source_label: id,
    female, male, total: female == null || male == null ? null : female + male,
    row_type, level: row_type === "detail" ? "programme" : "institution", definition: "fixture"});
  add(2000, "A", 2, 6); add(2000, "B", 3, 9); add(2000, "TUD", 5, 15, "reported_total");
  add(2001, "A", 0, 0); add(2001, "B", null, null); add(2001, "TUD", 0, 0, "reported_total");
  add(2002, "A", 4, null); add(2002, "B", 2, 8); add(2002, "TUD", 6, 20, "reported_total");
  const mapping = ["A", "B"].map((entity_id) => ({entity_id, optional_faculty_group: "CEG"}));
  return {rows, mapping, data: normalizeMasters(rows, mapping)};
}
