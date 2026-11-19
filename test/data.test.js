import test from "node:test";
import assert from "node:assert/strict";
import {comparisonRows, groupedData, normalizeMasters, programmeCount, programmeRows, programmeSum, selectRange} from "../src/components/data.js";
import {fixture, loadMasters} from "./helpers/master-data.js";

const data = await loadMasters();

test("masters replace legacy totals and cover every year through 2026", () => {
  assert.equal(data.years.length, 122);
  assert.equal(data.years[0], 1905);
  assert.equal(data.years.at(-1), 2026);
  assert.equal(data.programmes.length, 31);
  for (const [year, female, male] of [[1905,22,247], [2002,439,1647], [2015,1461,3885], [2018,1935,4282], [2026,2261,4638]]) {
    const r = data.totals.find((r) => r.year === year);
    assert.equal(r.female, female); assert.equal(r.male, male);
    assert.equal(r.share, female/(female+male));
  }
  assert.equal(data.totals.at(-1).level, "faculty_sum");
  assert.equal(data.totals.at(-1).status, "current_snapshot_2026-11-01");
});

test("both grouping modes conserve all known annual counts without including master total rows", () => {
  for (const groupByFaculty of [false,true]) {
    for (const view of ["women","men","all-programmes"]) {
      const selected = selectRange(data,1905,2026,"",{groupByFaculty,view});
      assert.deepEqual(selected.programmeMissingYears,[1944]);
      for (const total of selected.totals) {
        const expected = total.year === 1944 ? null : view === "women" ? total.female : view === "men" ? total.male : total.female+total.male;
        assert.equal(programmeSum(selected,total.year,view),expected,`${groupByFaculty}/${view}/${total.year}`);
      }
      assert.ok(programmeRows(selected,view).filter((r) => r.year === 2026).some((r) => r.upper > 0));
    }
  }
});

test("faculty mapping merges programmes, joins later faculty aliases and retains historical exceptions", () => {
  const grouped = groupedData(data,true);
  assert.equal(grouped.programmes.length,11);
  assert.equal(grouped.programmes.filter((id) => id === "faculty:CEG").length,1);
  assert.ok(grouped.programmes.includes("historical:alle-lessen"));
  assert.ok(grouped.programmes.includes("historical:enkele-lessen"));
  assert.ok(grouped.programmes.includes("historical:ijker"));
  const focus = selectRange(data,1905,2026,"faculty:CEG",{groupByFaculty:true});
  assert.deepEqual(focus.totals.filter((r) => r.year === 1905).map((r) => [r.female,r.male]),[[1,76]]);
  assert.deepEqual(focus.totals.filter((r) => r.year === 2026).map((r) => [r.female,r.male]),[[238,466]]);
  const row = grouped.rows.find((r) => r.year === 1999 && r.programme === "faculty:AS");
  assert.ok(row.members.includes("historical:life-science-technology"));
  assert.equal(grouped.rows.filter((r) => r.year === 1999 && r.members.includes("historical:life-science-technology")).length,1);
  assert.deepEqual(selectRange(data,2002,2002,"faculty:ABE").totals.map((r) => [r.female,r.male]),[[153,307]]);
});

test("1944 blanks are preserved separately from the recorded zero total and zero-share display", () => {
  const before = structuredClone(data);
  for (const groupByFaculty of [false,true]) {
    const all = selectRange(data,1944,1944,"",{groupByFaculty,undefinedAsZero:true});
    assert.equal(all.totals[0].female,0);
    assert.equal(all.totals[0].share,0);
    assert.equal(all.totals[0].programmeTotal,null);
    assert.ok(all.selectedRows.every((r) => r.count === null && r.male === null));
    const focus = selectRange(data,1944,1944,groupByFaculty?"faculty:ABE":"historical:bouwkundig-ingenieur",{groupByFaculty,undefinedAsZero:true});
    assert.equal(focus.totals[0].female,null);
    assert.equal(focus.totals[0].share,0);
    assert.equal(selectRange(data,1944,1944,"",{groupByFaculty}).totals[0].share,null);
  }
  assert.deepEqual(data,before);
});

test("partial counts stay unknown during grouping, comparisons and range selection", () => {
  const {data} = fixture();
  const grouped = selectRange(data,2002,2000,"faculty:CEG",{groupByFaculty:true,view:"all-programmes",undefinedAsZero:true});
  assert.deepEqual(grouped.totals.map((r) => [r.female,r.male,r.share]),[[5,15,0.25],[0,0,0],[6,null,0]]);
  assert.deepEqual(grouped.programmeMissingYears,[2002]);
  assert.deepEqual(programmeRows(grouped,"all-programmes").map((r) => r.count),[20,0,null]);
  assert.equal(comparisonRows(grouped).at(-1).upper,null);
  assert.equal(programmeCount({count:null,male:3},"all-programmes"),null);
  assert.equal(selectRange(data,2002,2002,"A",{undefinedAsZero:false}).totals[0].share,null);
  assert.throws(() => selectRange(data,2000,2002,"unknown"),/Unknown category/);
});

test("area series include missing-year sentinels rather than connecting across absent observations", () => {
  const selected = selectRange(data,2000,2003,"",{view:"women"});
  const rows = programmeRows(selected);
  assert.equal(rows.find((r) => r.year === 2002 && r.programme === "historical:bouwkundig-ingenieur").upper,null);
  assert.equal(rows.find((r) => r.year === 2001 && r.programme === "faculty:ABE").upper,null);
  assert.equal(rows.length,selected.years.length*selected.programmes.length);
});

test("invalid masters and ambiguous mappings fail instead of silently altering sums", () => {
  const {rows,mapping} = fixture();
  assert.throws(() => normalizeMasters([...rows,rows[0]],mapping),/duplicate master key/);
  assert.throws(() => normalizeMasters([{...rows[0],female:-1}],mapping),/Invalid count/);
  assert.throws(() => normalizeMasters([{...rows[0],total:500}],mapping),/Inconsistent total/);
  assert.throws(() => normalizeMasters(rows,[]),/Missing entity mapping/);
  assert.throws(() => normalizeMasters(rows,[...mapping,{entity_id:"A",optional_faculty_group:"AS"}]),/Conflicting faculty mapping/);
  assert.throws(() => normalizeMasters(rows,mapping.map((r) => ({...r,optional_faculty_group:"AS | CEG"}))),/Ambiguous/);
});
