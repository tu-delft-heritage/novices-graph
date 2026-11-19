import {csvFormat} from "d3";
import {femaleShare, selectRange} from "./data.js";

export function createDataExport(data, {start, end, programme = "", undefinedAsZero = true, groupByFaculty = false}) {
  const range = selectRange(data, start, end, programme, {undefinedAsZero, groupByFaculty});
  const sourceRows = data.rows.filter((r) => r.year >= range.start && r.year <= range.end && (!range.focus ||
    (groupByFaculty && data.entities[r.programme].faculty ? `faculty:${data.entities[r.programme].faculty}` : r.programme) === range.focus));
  const provenance = (d) => ({source_label: d.sourceLabel ?? null, source_file: d.sourceFile ?? null,
    source_sheet: d.sourceSheet ?? null, source_cells: d.sourceCells ?? null, definition: d.definition ?? null, status: d.status ?? null});
  const exportedRow = (d, entities) => ({year: d.year, entity_id: d.programme, programme: entities[d.programme].label,
    level: d.level, faculty_code: entities[d.programme].faculty, female: d.count, male: d.male,
    total: d.count == null || d.male == null ? null : d.count + d.male,
    female_share: femaleShare(d.count, d.male, undefinedAsZero), ...provenance(d), members: d.members ?? [d.programme]});
  return {
    schema_version: 2,
    source: "https://github.com/tu-delft-heritage/novices-graph",
    selection: {from: range.start, to: range.end, entity_id: range.focus, grouping: range.grouping},
    notes: {recent_totals: "Sum of faculty influx, not deduplicated university headcounts", snapshot_2026: "2026-11-01",
      grouping: "Optional faculty mapping, not historical ownership; unmapped categories remain separate"},
    share_unit: "fraction",
    undefined_shares_as_zero: undefinedAsZero,
    totals: range.totals.map((d) => ({
      year: d.year, female: d.female, male: d.male, female_share: d.share,
      total: d.female == null || d.male == null ? null : d.female + d.male,
      total_basis: d.level, programme_female_total: d.programmeTotal, ...provenance(d)
    })),
    programmes: range.selectedRows.map((d) => exportedRow(d, range.entities)),
    ...(groupByFaculty ? {source_records: sourceRows.map((d) => exportedRow(d, data.entities))} : {})
  };
}

export function jsonDataBlob(data) {
  return new Blob([JSON.stringify(data, null, 2) + "\n"], {type: "application/json;charset=utf-8"});
}

export function csvDataBlob(data) {
  const rows = [
    ...data.totals.map((d) => ({record_type: "selection_total", entity_id: data.selection.entity_id, ...d})),
    ...data.programmes.map((d) => ({record_type: "category", ...d})),
    ...(data.source_records ?? []).map((d) => ({record_type: "source_record", ...d}))
  ].map((d) => ({...d, grouping: data.selection.grouping, members: d.members?.join(" | ")})).sort((a, b) => a.year - b.year);
  const columns = ["record_type", "grouping", "year", "entity_id", "programme", "level", "faculty_code", "female", "male", "total", "female_share", "programme_female_total", "total_basis", "source_label", "source_file", "source_sheet", "source_cells", "definition", "status", "members"];
  return new Blob([csvFormat(rows, columns) + "\n"], {type: "text/csv;charset=utf-8"});
}
