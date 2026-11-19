import {test, expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {csvParse} from "d3";

const chart = (page) => page.locator("svg[data-chart]");
const stats = (page) => page.locator(".stat strong");
async function download(page, format) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button",{name:`Download ${format}`,exact:true}).click();
  const file = await pending;
  return {name:file.suggestedFilename(), bytes:await readFile(await file.path())};
}

test("production masters load under the repository subpath through 2026", async ({page}) => {
  const errors=[],failed=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto("./");
  await expect(chart(page)).toBeVisible();
  await expect(page.getByLabel("To",{exact:true}).locator("option:checked")).toHaveText("2026");
  await expect(page.getByLabel("To",{exact:true}).locator("option")).toHaveCount(122);
  await expect(stats(page)).toHaveText(["2,261","4,638","32.8%","2,261"]);
  await expect(page.locator(".selection-note")).toContainText("snapshot at 1 November");
  await expect(page.locator(".selection-note")).toContainText("faculty counts from 2002");
  await expect(page.locator("[data-axis='share']")).toBeVisible();
  await page.getByLabel("Inspect year",{exact:true}).selectOption("1905");
  await expect(stats(page)).toHaveText(["22","247","8.2%","22"]);
  await page.getByLabel("Inspect year",{exact:true}).selectOption("2002");
  await expect(stats(page)).toHaveText(["439","1,647","21.0%","439"]);
  expect(errors).toEqual([]); expect(failed).toEqual([]);
  await page.screenshot({path:"test-results/masters-default.png",fullPage:true});
});

test("grouping removes duplicate faculty labels, retains exceptions and preserves totals", async ({page}) => {
  await page.goto("./");
  await page.getByLabel("Group programmes by faculty",{exact:true}).check();
  const faculty=page.getByLabel("Faculty / category",{exact:true});
  await expect(faculty.locator("option")).toHaveCount(12);
  await expect(faculty.locator("option").filter({hasText:/^Civil Engineering and Geosciences$/})).toHaveCount(1);
  await expect(faculty.locator("option").filter({hasText:/^All classes \(historical category\)$/})).toHaveCount(1);
  await expect(stats(page)).toHaveText(["2,261","4,638","32.8%","2,261"]);
  await expect(page.getByLabel("Chart title",{exact:true})).toHaveValue(/by faculty.*1905-2026/);
  await expect(chart(page)).toContainText("not historical faculty ownership");
  await page.getByLabel("Inspect year",{exact:true}).selectOption("1905");
  await expect(stats(page)).toHaveText(["22","247","8.2%","22"]);
  await page.getByText("Faculty breakdown",{exact:true}).click();
  await expect(page.locator(".breakdown-table")).toContainText("All classes (historical category)");
  await page.screenshot({path:"test-results/grouped-faculties.png",fullPage:true});

  await faculty.selectOption({label:"Civil Engineering and Geosciences"});
  await expect(stats(page)).toHaveText(["1","76","1.3%"]);
  await page.getByLabel("Inspect year",{exact:true}).selectOption("2026");
  await expect(stats(page)).toHaveText(["238","466","33.8%"]);
  await expect(page.locator(".breakdown-table tbody tr")).toHaveCount(1);
  const json=JSON.parse((await download(page,"JSON")).bytes);
  expect(json.selection).toEqual({from:1905,to:2026,entity_id:"faculty:CEG",grouping:"faculty"});
  expect(json.programmes[0]).toMatchObject({year:1905,male:76,female:1});
  expect(json.source_records.some(r=>r.entity_id==="historical:mijnbouwkundig-ingenieur")).toBe(true);
  expect(json.programmes.at(-1)).toMatchObject({year:2026,male:466,female:238});
  await page.getByRole("button",{name:"Reset",exact:true}).click();
  await expect(page.getByLabel("Group programmes by faculty",{exact:true})).not.toBeChecked();
  await expect(page.getByLabel("Faculty / afdeling",{exact:true}).locator("option")).toHaveCount(32);
  await expect(stats(page)).toHaveText(["2,261","4,638","32.8%","2,261"]);
});

test("grouping a focused historical programme selects its mapped faculty", async ({page}) => {
  await page.goto("./");
  await page.getByLabel("Faculty / afdeling",{exact:true}).selectOption({label:"Civil Engineering (CT)"});
  await page.getByLabel("To",{exact:true}).selectOption("1905");
  await expect(stats(page)).toHaveText(["1","62","1.6%"]);
  await page.getByLabel("Group programmes by faculty",{exact:true}).check();
  await expect(page.getByLabel("Faculty / category",{exact:true}).locator("option:checked")).toHaveText("Civil Engineering and Geosciences");
  await expect(stats(page)).toHaveText(["1","76","1.3%"]);
  await page.getByLabel("Chart title",{exact:true}).fill("My historical comparison");
  await page.getByLabel("Group programmes by faculty",{exact:true}).uncheck();
  await expect(page.getByLabel("Chart title",{exact:true})).toHaveValue("My historical comparison");
  // The original faculty series starts in 2002; the grouping option does not
  // backfill the original category when it is turned off.
  await expect(stats(page)).toHaveText(["Not recorded","Not recorded","0.0%"]);
});

for(const [view,title,lastSum] of [
  ["Women by programme",/^Female first-year students/,"2,261"],
  ["Women and men",/^First-year students/,"6,899"],
  ["All students by programme",/^First-year students by programme/,"6,899"],
  ["Men by programme",/^Male first-year students/,"4,638"]
]) {
  test(`${view} renders and exports recent counts in both grouping modes`,async ({page})=>{
    await page.goto("./");
    await page.getByLabel("View",{exact:true}).selectOption({label:view});
    await expect(chart(page)).toHaveAttribute("aria-label",title);
    await expect(stats(page).last()).toHaveText(lastSum);
    const titles=await chart(page).locator("g[aria-label='rect'] rect title").allTextContents();
    expect(titles.some(t=>t.startsWith("2026 ·"))).toBe(true);
    await page.getByLabel("Group programmes by faculty",{exact:true}).check();
    await expect(stats(page).last()).toHaveText(lastSum);
    await page.getByLabel("Chart type",{exact:true}).selectOption({label:"Stacked area"});
    await expect(chart(page).locator("g[aria-label='area'] path[d]").first()).toBeVisible();
    const xml=(await download(page,"SVG")).bytes.toString();
    expect(xml).toContain("2026"); expect(xml).toContain("snapshot at 1 November"); expect(xml).not.toContain("NaN");
    expect(xml).toContain("not historical faculty ownership");
    await page.getByLabel("To",{exact:true}).selectOption("1905");
    await page.getByLabel("View",{exact:true}).selectOption({label:"Women and men"});
    await expect(stats(page).last()).toHaveText("269");
  });
}

test("zero-share option changes only percentages, including 1944 and unavailable selections",async ({page})=>{
  await page.goto("./");
  await page.getByLabel("From",{exact:true}).selectOption("1944");
  await page.getByLabel("To",{exact:true}).selectOption("1944");
  await expect(stats(page)).toHaveText(["0","0","0.0%","Not recorded"]);
  await expect(chart(page).locator("g[aria-label='dot'] circle")).toHaveCount(1);
  await page.getByLabel("Undefined percentages as 0",{exact:true}).uncheck();
  await expect(stats(page).nth(2)).toHaveText("Not defined");
  await expect(chart(page).locator("g[aria-label='dot'] circle")).toHaveCount(0);
  await page.getByLabel("Group programmes by faculty",{exact:true}).check();
  await page.getByLabel("Faculty / category",{exact:true}).selectOption({label:"Architecture and the Built Environment"});
  await expect(stats(page)).toHaveText(["Not recorded","Not recorded","Not defined"]);
  const json=JSON.parse((await download(page,"JSON")).bytes);
  expect(json.programmes[0]).toMatchObject({female:null,male:null,female_share:null});
  await page.getByLabel("Undefined percentages as 0",{exact:true}).check();
  await expect(stats(page)).toHaveText(["Not recorded","Not recorded","0.0%"]);
});

test("CSV and JSON follow range, grouping and source counts independently of language",async ({page})=>{
  await page.goto("./");
  await page.getByLabel("From",{exact:true}).selectOption("2026");
  await page.getByLabel("Group programmes by faculty",{exact:true}).check();
  await page.getByLabel("Faculty / category",{exact:true}).selectOption({label:"Architecture and the Built Environment"});
  const dataSection=page.locator(".control-group").filter({has:page.getByRole("heading",{name:"Data export",exact:true})});
  await expect(dataSection.getByRole("button",{name:"Download CSV",exact:true})).toBeVisible();
  await expect(dataSection.getByRole("button",{name:"Download SVG",exact:true})).toHaveCount(0);
  const csv=csvParse((await download(page,"CSV")).bytes.toString());
  expect(csv).toHaveLength(3);
  expect(csv.find(r=>r.record_type==="category")).toMatchObject({year:"2026",male:"335",female:"529",grouping:"faculty"});
  expect(csv.find(r=>r.record_type==="source_record")).toMatchObject({source_label:"ABE",source_file:"2012-2026/Influx studenten.pdf"});
  const english=JSON.parse((await download(page,"JSON")).bytes);
  await page.getByLabel("Language / Taal",{exact:true}).selectOption({label:"Nederlands"});
  expect(JSON.parse((await download(page,"JSON")).bytes)).toEqual(english);
});

for(const view of ["women","both","all-programmes","men"]) {
  test(`${view} keeps grouped geometry and controls when switching Dutch and English`,async ({page})=>{
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto("./");
    await page.getByLabel("View",{exact:true}).selectOption({label:{women:"Women by programme",both:"Women and men","all-programmes":"All students by programme",men:"Men by programme"}[view]});
    await page.getByLabel("Group programmes by faculty",{exact:true}).check();
    await page.getByLabel("Background",{exact:true}).fill("#f5f0e8");
    const geometry=()=>chart(page).locator("g[aria-label='rect'] rect").evaluateAll(nodes=>nodes.map(n=>["x","y","width","height","fill"].map(k=>n.getAttribute(k))));
    await expect(chart(page)).toContainText("not historical faculty ownership");
    const before=await geometry();
    await page.getByLabel("Language / Taal",{exact:true}).selectOption({label:"Nederlands"});
    await expect(chart(page)).toHaveAttribute("lang","nl");
    await expect(page.getByLabel("Opleidingen groeperen per faculteit",{exact:true})).toBeChecked();
    await expect(page.locator(".year-stats")).toContainText("2.261");
    await expect(page.locator(".year-stats")).toContainText("32,8%");
    await expect(chart(page)).toContainText("peildatum 1 november");
    expect(await geometry()).toEqual(before);
    const svg=await download(page,"SVG");
    expect(svg.name).toMatch(/grouped-by-faculty-1905-2026-nl\.svg$/);
    expect(svg.bytes.toString()).toContain("Bron: Jaarboeken");
    expect(svg.bytes.toString()).not.toContain("snapshot at 1 November");
    await page.getByLabel("Faculteit / categorie",{exact:true}).selectOption({label:"Bouwkunde"});
    await page.getByLabel("Tot",{exact:true}).selectOption("1905");
    await expect(stats(page).nth(2)).toHaveText("25,0%");
    await page.getByLabel("Language / Taal",{exact:true}).selectOption({label:"English"});
    await expect(page.getByLabel("Faculty / category",{exact:true}).locator("option:checked")).toHaveText("Architecture and the Built Environment");
    await expect(page.getByLabel("Background",{exact:true})).toHaveValue("#f5f0e8");
    await expect(stats(page).nth(2)).toHaveText("25.0%");
    await page.getByRole("button",{name:"Reset",exact:true}).click();
    await expect(page.getByLabel("Group programmes by faculty",{exact:true})).not.toBeChecked();
    expect(errors).toEqual([]);
  });
}

test("SVG/JPG preserve styling, decode correctly, and the sidebar fits on mobile",async ({page})=>{
  await page.goto("./");
  await page.getByLabel("Group programmes by faculty",{exact:true}).check();
  await page.getByLabel("Chart title",{exact:true}).fill("Delft & students <1905–2026>");
  await page.getByLabel("Background",{exact:true}).fill("#f5f0e8");
  await page.getByLabel("JPG resolution",{exact:true}).selectOption({label:"1×"});
  await page.getByText("Faculty colours",{exact:true}).click();
  await page.getByLabel("Architecture and the Built Environment",{exact:true}).fill("#117744");
  await expect(chart(page).locator("g[aria-label='rect'] rect[fill='#117744']").first()).toBeVisible();
  const xml=(await download(page,"SVG")).bytes.toString();
  expect(xml).toContain("Delft &amp; students &lt;1905–2026&gt;"); expect(xml).toContain("#117744");
  const parsed=await page.evaluate(xml=>new DOMParser().parseFromString(xml,"image/svg+xml").querySelectorAll("parsererror").length,xml);
  expect(parsed).toBe(0);
  const jpg=await download(page,"JPG");
  expect(jpg.bytes.subarray(0,2).toString("hex")).toBe("ffd8");
  const dimensions=await page.evaluate(async base64=>{const img=new Image();img.src=`data:image/jpeg;base64,${base64}`;await img.decode();return [img.naturalWidth,img.naturalHeight];},jpg.bytes.toString("base64"));
  expect(dimensions).toEqual([Number(await chart(page).getAttribute("width")),Number(await chart(page).getAttribute("height"))]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByLabel("Language / Taal",{exact:true}).selectOption({label:"Nederlands"});
  await expect(page.getByLabel("Grafiektitel",{exact:true})).toHaveValue("Delft & students <1905–2026>");
  await page.screenshot({path:"test-results/grouped-dutch-mobile.png",fullPage:true});
  await page.getByRole("button",{name:"Herstellen",exact:true}).click();
  await expect(page.getByLabel("Language / Taal",{exact:true}).locator("option:checked")).toHaveText("Nederlands");
  await expect(page.getByLabel("Opleidingen groeperen per faculteit",{exact:true})).not.toBeChecked();
});
