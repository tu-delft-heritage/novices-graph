import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {comparisonRows, normalizeData, selectRange} from "../src/components/data.js";

test("joins totals by year, preserves missing values and leaves zero-denominator shares undefined", () => {
  const data = normalizeData(
    {Totaal: {2002: 4, 2000: 0, 2001: 2}, Programme: {2000: 0, 2001: 1, 2002: 3}, nan: {2000: 99}},
    {Totaal: {2001: 6, 2000: 0}},
    {Programme: {0: "#123456"}}
  );
  assert.deepEqual(data.years, [2000, 2001, 2002]);
  assert.deepEqual(data.programmes, ["Programme"]);
  assert.deepEqual(data.totals.map((d) => d.share), [null, 0.25, null]);
  assert.equal(data.totals[2].male, null);
  assert.equal(data.totals[1].female, 2);
  assert.equal(data.totals[1].programmeTotal, 1);
  assert.equal(data.colors.Programme, "#123456");
});

test("range selection is inclusive and removes inactive programmes without changing totals", () => {
  const data = normalizeData(
    {Totaal: {2000: 3, 2001: 5}, Old: {2000: 3, 2001: 0}, New: {2000: 0, 2001: 4}},
    {Totaal: {2000: 7, 2001: 5}}
  );
  const range = selectRange(data, 2001, 2001);
  assert.deepEqual(range.programmes, ["New"]);
  assert.equal(range.rows[0].count, 4);
  assert.equal(range.totals[0].female, 5);
  assert.equal(selectRange(data, 2001, 2000).totals.length, 2);
});

test("the original 1905–2018 data retain their recorded totals and programme discrepancies", async () => {
  const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url)));
  const data = normalizeData(await read("female_at_tu.json"), await read("male_at_tu.json"), await read("colors.json"));
  assert.equal(data.years.length, 114);
  assert.equal(data.programmes.length, 28);
  assert.deepEqual(data.totals[0], {year: 1905, female: 22, male: 247, share: 22 / 269, programmeTotal: 9});
  assert.equal(data.totals.find((d) => d.year === 1944).share, null);
  assert.equal(data.totals.at(-1).share, 1853 / (1853 + 4078));
  assert.ok(data.totals.every((d) => Number.isFinite(d.male) && Number.isFinite(d.female)));
});

test("comparison stacks recorded female and male totals while preserving missing counts", () => {
  const data = normalizeData(
    {Totaal: {2000: 10, 2001: 0, 2002: 4}, Faculty: {2000: 2, 2001: 0, 2002: 4}},
    {Totaal: {2000: 90, 2001: 0}, Faculty: {2000: 6, 2001: 3}}
  );
  const combined = comparisonRows(selectRange(data, 2000, 2002, "", {view: "both", undefinedAsZero: true}));
  assert.deepEqual(combined, [
    {year: 2000, sex: "Women", count: 10, lower: 0, upper: 10},
    {year: 2000, sex: "Men", count: 90, lower: 10, upper: 100},
    {year: 2001, sex: "Women", count: 0, lower: 0, upper: 0},
    {year: 2001, sex: "Men", count: 0, lower: 0, upper: 0},
    {year: 2002, sex: "Women", count: 4, lower: 0, upper: 4},
    {year: 2002, sex: "Men", count: null, lower: 4, upper: null}
  ]);
  const focused = comparisonRows(selectRange(data, 2000, 2000, "Faculty"));
  assert.equal(focused[0].count, 2);
  assert.equal(focused[1].count, 6);
  assert.equal(focused[1].upper, 8);
  // A programme with only male students still belongs in the comparison breakdown.
  assert.deepEqual(selectRange(data, 2001, 2001, "", {view: "both"}).programmes, ["Faculty"]);
});

test("faculty focus uses matching counts and preserves unknown and zero-denominator percentages", () => {
  const data = normalizeData(
    {Totaal: {2000: 10, 2001: 20}, Old: {2000: 2, 2001: 0}, New: {2000: 4, 2001: 5}},
    {Totaal: {2000: 90, 2001: 80}, Old: {2000: 6, 2001: 0}}
  );
  const old = selectRange(data, 2000, 2001, "Old");
  assert.deepEqual(old.programmes, ["Old"]);
  assert.deepEqual(old.allProgrammes, ["Old", "New"]);
  assert.ok(old.rows.every((d) => d.programme === "Old"));
  assert.deepEqual(old.totals[0], {year: 2000, female: 2, male: 6, programmeTotal: 2, share: 0.25});
  assert.equal(old.totals[1].share, null);
  const newer = selectRange(data, 2000, 2001, "New");
  assert.equal(newer.totals[1].female, 5);
  assert.equal(newer.totals[1].male, null);
  assert.equal(newer.totals[1].share, null);
  assert.deepEqual(selectRange(data, 2001, 2001, "Old").programmes, ["Old"]);
  assert.equal(selectRange(data, 2000, 2001).totals[0].share, 0.1);
});

test("undefined shares can use zero without changing counts or the underlying data", () => {
  const data = normalizeData(
    {Totaal: {2000: 0, 2001: 4, 2002: 2}, Faculty: {2000: 0, 2001: 4, 2002: 2}},
    {Totaal: {2000: 0, 2002: 6}, Faculty: {2000: 0, 2002: 6}}
  );
  const original = structuredClone(data);
  for (const programme of ["", "Faculty"]) {
    const filled = selectRange(data, 2000, 2002, programme, {undefinedAsZero: true});
    assert.deepEqual(filled.totals.map((d) => d.share), [0, 0, 0.25]);
    assert.equal(filled.totals[0].female, 0);
    assert.equal(filled.totals[1].female, 4);
    assert.equal(filled.totals[1].male, null);
    const gaps = selectRange(data, 2000, 2002, programme, {undefinedAsZero: false});
    assert.deepEqual(gaps.totals.map((d) => d.share), [null, null, 0.25]);
  }
  assert.deepEqual(data, original);
});
