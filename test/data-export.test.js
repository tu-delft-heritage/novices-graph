import test from "node:test";
import assert from "node:assert/strict";
import {csvParse} from "d3";
import {createDataExport, csvDataBlob, jsonDataBlob} from "../src/components/data-export.js";
import {fixture, loadMasters} from "./helpers/master-data.js";

const data = await loadMasters();

test("recent exports include authoritative male counts, source provenance and the 2026 snapshot", async () => {
  const selected = createDataExport(data,{start:2026,end:2026,programme:"faculty:ABE"});
  const exported = JSON.parse(await jsonDataBlob(selected).text());
  assert.deepEqual(exported.selection,{from:2026,to:2026,entity_id:"faculty:ABE",grouping:"source"});
  assert.equal(exported.notes.snapshot_2026,"2026-11-01");
  assert.equal(exported.totals[0].total,864);
  assert.equal(exported.programmes[0].female,529);
  assert.equal(exported.programmes[0].male,335);
  assert.equal(exported.programmes[0].source_file,"2012-2026/Influx studenten.pdf");
  assert.equal(exported.programmes[0].source_label,"ABE");
  assert.equal(exported.programmes[0].female_share,529/864);
});

test("grouped exports match graph aggregates and retain the underlying original rows separately", async () => {
  const selected = createDataExport(data,{start:1905,end:1905,programme:"faculty:CEG",groupByFaculty:true});
  assert.equal(selected.selection.grouping,"faculty");
  assert.equal(selected.programmes.length,1);
  assert.equal(selected.programmes[0].male,76);
  assert.equal(selected.source_records.reduce((n,r) => n+(r.male??0),0),76);
  assert.ok(selected.source_records.some((r) => r.entity_id === "historical:mijnbouwkundig-ingenieur"));
  const csv = csvParse(await csvDataBlob(selected).text());
  assert.equal(csv.filter((r) => r.record_type === "category").length,1);
  assert.equal(csv.filter((r) => r.record_type === "selection_total").length,1);
  assert.equal(csv.filter((r) => r.record_type === "source_record").length,selected.source_records.length);
  assert.ok(csv.every((r) => r.grouping === "faculty"));
});

test("downloads retain blank source rows and distinguish zero counts from zero-share display", async () => {
  for (const undefinedAsZero of [false,true]) {
    const selected = createDataExport(data,{start:1944,end:1944,undefinedAsZero});
    assert.equal(selected.programmes.length,23);
    assert.equal(selected.totals[0].female,0);
    assert.equal(selected.programmes[0].female,null);
    assert.equal(selected.programmes[0].female_share,undefinedAsZero?0:null);
    const csv = csvParse(await csvDataBlob(selected).text());
    assert.equal(csv[0].female,"0");
    assert.ok(csv.filter((r) => r.record_type === "category").every((r) => r.female === "" && r.male === ""));
  }
});

test("CSV quoting, partial male counts and grouped shares preserve the selection", async () => {
  const {data} = fixture();
  data.entities.A.label='Faculty, "A"\nAfdeling';
  const selected=createDataExport(data,{start:2002,end:2002,programme:"A",undefinedAsZero:false});
  const csv=await csvDataBlob(selected).text();
  assert.ok(csv.includes('"Faculty, ""A""\nAfdeling"'));
  const row=csvParse(csv).find((r) => r.record_type === "category");
  assert.equal(row.female,"4"); assert.equal(row.male,""); assert.equal(row.total,""); assert.equal(row.female_share,"");
  assert.equal(createDataExport(data,{start:2002,end:2002,programme:"A"}).totals[0].female_share,0);
});
