import {csvFormat} from "d3";
import {femaleShare, selectRange} from "./data.js";

export function createDataExport(data, {start, end, programme = "", undefinedAsZero = true}) {
  const range = selectRange(data, start, end, programme, {undefinedAsZero});
  return {
    source: "https://github.com/tu-delft-heritage/novices-graph",
    selection: {from: range.start, to: range.end, faculty: range.focus},
    share_unit: "fraction",
    undefined_shares_as_zero: undefinedAsZero,
    totals: range.totals.map((d) => ({
      year: d.year, female: d.female, male: d.male, female_share: d.share,
      programme_female_total: d.programmeTotal
    })),
    // Keep zero-count categories too: the chart's legend hides inactive series,
    // but data downloads should retain every category in the selected scope.
    programmes: data.rows
      .filter((d) => d.year >= range.start && d.year <= range.end && (!range.focus || d.programme === range.focus))
      .map((d) => ({
        year: d.year, programme: d.programme, female: d.count, male: d.male,
        female_share: femaleShare(d.count, d.male, undefinedAsZero)
      }))
  };
}

export function jsonDataBlob(data) {
  return new Blob([JSON.stringify(data, null, 2) + "\n"], {type: "application/json;charset=utf-8"});
}

export function csvDataBlob(data) {
  const rows = [
    ...data.totals.map((d) => ({record_type: "selection_total", programme: data.selection.faculty, ...d})),
    ...data.programmes.map((d) => ({record_type: "programme", ...d}))
  ].sort((a, b) => a.year - b.year);
  const columns = ["record_type", "year", "programme", "female", "male", "female_share", "programme_female_total"];
  return new Blob([csvFormat(rows, columns) + "\n"], {type: "text/csv;charset=utf-8"});
}
