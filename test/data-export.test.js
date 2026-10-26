import test from "node:test";
import assert from "node:assert/strict";
import {csvParse} from "d3";
import {normalizeData} from "../src/components/data.js";
import {createDataExport, csvDataBlob, jsonDataBlob} from "../src/components/data-export.js";

const name = 'Faculty, "A"\nAfdeling';
const data = normalizeData(
  {Totaal: {2000: 10, 2001: 0, 2002: 4}, [name]: {2000: 2, 2001: 0, 2002: 4}, Inactive: {2000: 0, 2001: 0, 2002: 0}},
  {Totaal: {2000: 90, 2001: 0, 2002: 20}, [name]: {2000: 6, 2001: 0}, Inactive: {2000: 1, 2001: 0, 2002: 1}}
);

test("JSON exports the selected scope with numeric counts and nulls, independent of styling", async () => {
  const selected = createDataExport(data, {start: 2002, end: 2002, programme: name, undefinedAsZero: false});
  const file = jsonDataBlob(selected);
  assert.match(file.type, /^application\/json/);
  const parsed = JSON.parse(await file.text());
  assert.deepEqual(parsed.selection, {from: 2002, to: 2002, faculty: name});
  assert.equal(parsed.share_unit, "fraction");
  assert.equal(parsed.undefined_shares_as_zero, false);
  assert.deepEqual(parsed.totals, [{year: 2002, female: 4, male: null, female_share: null, programme_female_total: 4}]);
  assert.deepEqual(parsed.programmes, [{year: 2002, programme: name, female: 4, male: null, female_share: null}]);
  assert.match(parsed.source, /tu-delft-heritage\/novices-graph$/);
});

test("CSV separates totals, retains inactive categories, escapes names, and distinguishes zero from missing", async () => {
  const selected = createDataExport(data, {start: 2000, end: 2002, undefinedAsZero: false});
  const file = csvDataBlob(selected);
  assert.match(file.type, /^text\/csv/);
  const csv = await file.text();
  assert.ok(csv.includes('"Faculty, ""A""\nAfdeling"'));
  const parsed = csvParse(csv);
  assert.equal(parsed.length, 9); // Three totals plus two categories for every year.
  const total = parsed.find((d) => d.record_type === "selection_total" && d.year === "2000");
  assert.equal(total.female, "10");
  assert.equal(total.programme_female_total, "2");
  assert.equal(total.female_share, "0.1");
  const empty = parsed.find((d) => d.record_type === "programme" && d.programme === name && d.year === "2001");
  assert.equal(empty.female, "0");
  assert.equal(empty.male, "0");
  assert.equal(empty.female_share, "");
  const missing = parsed.find((d) => d.record_type === "programme" && d.programme === name && d.year === "2002");
  assert.equal(missing.female, "4");
  assert.equal(missing.male, "");
  assert.equal(missing.female_share, "");
  assert.equal(parsed.filter((d) => d.programme === "Inactive").length, 3);
});

test("data exports use zero for undefined shares by default while retaining missing counts", async () => {
  const selected = createDataExport(data, {start: 2000, end: 2002, programme: name});
  const parsed = JSON.parse(await jsonDataBlob(selected).text());
  assert.equal(parsed.undefined_shares_as_zero, true);
  assert.deepEqual(parsed.totals.map((d) => d.female_share), [0.25, 0, 0]);
  assert.deepEqual(parsed.programmes.map((d) => d.female_share), [0.25, 0, 0]);
  assert.equal(parsed.totals[2].male, null);
  assert.equal(parsed.programmes[2].male, null);
  const csv = csvParse(await csvDataBlob(selected).text());
  assert.ok(csv.filter((d) => d.year !== "2000").every((d) => d.female_share === "0"));
  assert.ok(csv.filter((d) => d.year === "2002").every((d) => d.male === ""));
  const all = createDataExport(data, {start: 2001, end: 2001});
  assert.equal(all.totals[0].female_share, 0);
});
