import {test, expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {csvParse} from "d3";

test("production site loads under the repository subpath and keeps original totals", async ({page}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const failed = [];
  page.on("response", (response) => {if (response.status() >= 400) failed.push(response.url());});
  await page.goto("./");
  await expect(page.locator("svg[data-chart]")).toBeVisible();
  await expect(page.locator("[data-axis='share']")).toBeVisible();
  await expect(page.locator(".year-stats")).toContainText("1,853");
  await expect(page.locator(".year-stats")).toContainText("31.2%");
  await page.getByLabel("Inspect year").selectOption({label: "1905"});
  await expect(page.locator(".stat").first()).toContainText("22");
  await expect(page.locator(".stat").last()).toContainText("9");
  await page.getByLabel("Inspect year").selectOption({label: "1944"});
  await expect(page.getByLabel("Undefined percentages as 0")).toBeChecked();
  await expect(page.locator(".year-stats")).toContainText("0.0%");
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  await page.screenshot({path: "test-results/desktop-preview.png", fullPage: true});
});

test("range and styling controls update the chart, including a single zero-count year", async ({page}) => {
  await page.goto("./");
  await page.getByLabel("From", {exact: true}).selectOption({label: "2002"});
  await expect(page.locator("svg[data-chart]")).toHaveAttribute("aria-label", /2002 to 2018/);
  await page.getByLabel("Chart type", {exact: true}).selectOption({label: "Stacked area"});
  await expect(page.locator("g[aria-label='area']")).toBeVisible();
  await page.getByLabel("Percentage line & right axis").uncheck();
  await expect(page.locator("[data-axis='share']")).toHaveCount(0);
  await page.getByLabel("To", {exact: true}).selectOption({label: "1944"});
  await expect(page.getByLabel("From", {exact: true}).locator("option:checked")).toHaveText("1944");
  await expect(page.locator("svg[data-chart]")).toBeVisible();
  await expect(page.locator(".year-stats")).toContainText("0.0%");
  await page.getByLabel("Percentage line & right axis").check();
  await expect(page.locator("g[aria-label='dot'] circle")).toHaveCount(1);
  await page.getByLabel("Undefined percentages as 0").uncheck();
  await expect(page.locator(".year-stats")).toContainText("Not defined");
  await expect(page.locator("g[aria-label='dot'] circle")).toHaveCount(0);
  await page.getByRole("button", {name: "Reset", exact: true}).click();
  await expect(page.getByLabel("Undefined percentages as 0")).toBeChecked();
  await expect(page.getByLabel("From", {exact: true}).locator("option:checked")).toHaveText("1905");
  await expect(page.locator("[data-axis='share']")).toBeVisible();
});

test("exports a standalone SVG and a decodable JPG with the selected styling and dimensions", async ({page}) => {
  await page.goto("./");
  await page.getByLabel("Chart title", {exact: true}).fill("Delft & women <1905–2018>");
  await page.getByLabel("Background", {exact: true}).fill("#f5f0e8");
  await page.getByLabel("JPG resolution").selectOption({label: "1×"});
  const chart = page.locator("svg[data-chart]");
  await expect(chart).toHaveAttribute("aria-label", /Delft & women/);
  const width = Number(await chart.getAttribute("width"));
  const height = Number(await chart.getAttribute("height"));
  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download SVG"}).click();
  const svgFile = await svgDownload;
  expect(svgFile.suggestedFilename()).toBe("women-at-tu-delft-1905-2018.svg");
  const xml = await readFile(await svgFile.path(), "utf8");
  expect(xml).toContain("Delft &amp; women &lt;1905–2018&gt;");
  expect(xml).toContain("Source: Delft Institute of Technology Yearbooks and reports, TU Delft Statistical Yearbooks and OSIRIS");
  expect(xml).toContain("Architecture and the Built Environment");
  expect(xml).not.toContain("NaN");
  const svgResult = await page.evaluate(async (source) => {
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    const image = new Image();
    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
    await image.decode();
    return {errors: doc.querySelectorAll("parsererror").length, width: image.naturalWidth, height: image.naturalHeight};
  }, xml);
  expect(svgResult).toEqual({errors: 0, width, height});
  const jpgDownload = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download JPG"}).click();
  const jpgFile = await jpgDownload;
  const bytes = await readFile(await jpgFile.path());
  expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  const result = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return {width: image.naturalWidth, height: image.naturalHeight, corner: [...context.getImageData(2, 2, 1, 1).data]};
  }, bytes.toString("base64"));
  expect(result.width).toBe(width);
  expect(result.height).toBe(height);
  expect(result.corner[0]).toBeGreaterThan(240);
  expect(result.corner[2]).toBeLessThan(240);
  await expect(page.locator(".status")).toContainText("JPG downloaded");
});

test("mobile layout keeps controls usable without overflowing the page", async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto("./");
  await expect(page.locator("svg[data-chart]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("Legend", {exact: true}).uncheck();
  await expect(page.getByLabel("Legend", {exact: true})).not.toBeChecked();
  await page.screenshot({path: "test-results/mobile-preview.png", fullPage: true});
});

test("faculty focus applies to counts, percentages and exports, and reset restores all faculties", async ({page}) => {
  await page.goto("./");
  const dataSection = page.locator(".control-group").filter({has: page.getByRole("heading", {name: "Data", exact: true})});
  const exportSection = page.locator(".control-group").filter({has: page.getByRole("heading", {name: "Export", exact: true})});
  await expect(dataSection.getByLabel("From", {exact: true})).toBeVisible();
  await expect(exportSection.getByRole("button", {name: "Download SVG"})).toBeVisible();
  const faculty = dataSection.getByLabel("Faculty / afdeling", {exact: true});
  await faculty.selectOption({label: "Architecture and the Built Environment"});
  await page.getByLabel("From", {exact: true}).selectOption({label: "2002"});
  await expect(page.locator("svg[data-chart]")).toHaveAttribute("aria-label", /Architecture and the Built Environment, 2002 to 2018/);
  await expect(page.locator(".year-stats .stat")).toHaveCount(3);
  await expect(page.locator(".stat").first()).toContainText("393");
  await expect(page.locator(".stat").nth(1)).toContainText("Not recorded");
  await expect(page.locator(".stat").last()).toContainText("0.0%");
  await expect(page.locator("[data-axis='share']")).toBeVisible();
  await expect(page.locator(".selection-note")).toContainText("undefined percentages are shown as 0%");
  await page.getByText("Programme breakdown", {exact: true}).click();
  await expect(page.locator(".breakdown-table tbody tr")).toHaveCount(1);

  const pending = page.waitForEvent("download");
  await exportSection.getByRole("button", {name: "Download SVG"}).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("women-at-tu-delft-architecture-and-the-built-environment-2002-2018.svg");
  const xml = await readFile(await file.path(), "utf8");
  expect(xml).toContain("Architecture and the Built Environment");
  expect(xml).not.toContain("Civil Engineering and Geosciences");
  expect(xml).toContain('data-axis="share"');
  expect(xml).toContain("undefined percentages shown as 0%");

  await page.getByLabel("Undefined percentages as 0").uncheck();
  await expect(page.locator(".stat").last()).toContainText("Not defined");
  await expect(page.locator("[data-axis='share']")).toHaveCount(0);
  await expect(page.locator(".selection-note")).toContainText("no percentage is shown");

  await faculty.selectOption({label: "Bouwkunidg ingenieur (Bk)"});
  await page.getByLabel("From", {exact: true}).selectOption({label: "1905"});
  await page.getByLabel("To", {exact: true}).selectOption({label: "2001"});
  await expect(page.locator(".stat").first()).toContainText("180");
  await expect(page.locator(".stat").nth(1)).toContainText("337");
  await expect(page.locator(".stat").last()).toContainText("34.8%");
  await expect(page.locator("[data-axis='share']")).toBeVisible();
  await page.getByRole("button", {name: "Reset", exact: true}).click();
  await expect(faculty.locator("option:checked")).toHaveText("All faculties / afdelingen");
  await expect(page.locator(".year-stats .stat")).toHaveCount(4);
  await expect(page.locator(".stat").first()).toContainText("1,853");
});

test("CSV and JSON downloads follow the selected years and faculty and do not depend on image settings", async ({page}) => {
  await page.goto("./");
  await page.getByLabel("To", {exact: true}).selectOption({label: "1905"});
  // Data is still downloadable while a required image-title field is empty.
  await page.getByLabel("Chart title", {exact: true}).fill("");
  const csvPending = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download CSV", exact: true}).click();
  const csvFile = await csvPending;
  expect(csvFile.suggestedFilename()).toBe("women-at-tu-delft-1905-1905.csv");
  const rows = csvParse(await readFile(await csvFile.path(), "utf8"));
  expect(rows).toHaveLength(29);
  expect(rows.every((row) => row.year === "1905")).toBe(true);
  const total = rows.find((row) => row.record_type === "selection_total");
  expect(total.female).toBe("22");
  expect(total.programme_female_total).toBe("9");
  expect(rows.find((row) => row.programme === "Civiel-Landmeter").female).toBe("0");
  await expect(page.getByRole("button", {name: "Download JSON", exact: true})).toBeEnabled();

  await page.getByLabel("Faculty / afdeling", {exact: true}).selectOption({label: "Architecture and the Built Environment"});
  await page.getByLabel("From", {exact: true}).selectOption({label: "2002"});
  const jsonPending = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download JSON", exact: true}).click();
  const jsonFile = await jsonPending;
  expect(jsonFile.suggestedFilename()).toBe("women-at-tu-delft-architecture-and-the-built-environment-2002-2002.json");
  const json = JSON.parse(await readFile(await jsonFile.path(), "utf8"));
  expect(json.selection).toEqual({from: 2002, to: 2002, faculty: "Architecture and the Built Environment"});
  expect(json.undefined_shares_as_zero).toBe(true);
  expect(json.totals).toEqual([{year: 2002, female: 153, male: null, female_share: 0, programme_female_total: 153}]);
  expect(json.programmes).toEqual([{year: 2002, programme: "Architecture and the Built Environment", female: 153, male: null, female_share: 0}]);
  await expect(page.locator(".status")).toHaveText("JSON downloaded.");
  await expect(page.getByRole("button", {name: "Download CSV", exact: true})).toBeEnabled();

  await page.getByLabel("Undefined percentages as 0").uncheck();
  const gapsPending = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download CSV", exact: true}).click();
  const gapsFile = await gapsPending;
  const gaps = csvParse(await readFile(await gapsFile.path(), "utf8"));
  expect(gaps).toHaveLength(2);
  expect(gaps.every((row) => row.female === "153" && row.male === "" && row.female_share === "")).toBe(true);
});

test("the alternative view stacks recorded totals and follows view, range, colours, and exports", async ({page}) => {
  await page.goto("./");
  const view = page.getByLabel("View", {exact: true});
  const chart = page.locator("svg[data-chart]");
  await expect(chart).toHaveAttribute("aria-label", /^Female first-year students/);
  await expect(page.locator(".chart-description")).toContainText("female first-year students by programme");
  await view.selectOption({label: "Women and men"});
  await expect(chart).toHaveAttribute("aria-label", /^First-year students/);
  await expect(page.locator(".chart-description")).toContainText("the distribution of men and women");
  await expect(page.locator(".stat").last()).toContainText("5,931");
  await expect(page.getByLabel("Women colour", {exact: true})).toBeVisible();
  await expect(page.getByLabel("Colour palette", {exact: true})).toBeHidden();
  await page.screenshot({path: "test-results/comparison-preview.png", fullPage: true});

  await page.getByLabel("To", {exact: true}).selectOption({label: "1905"});
  await expect(page.getByLabel("Chart title", {exact: true})).toHaveValue(/in 1905$/);
  await expect(page.locator(".stat").last()).toContainText("269");
  const women = chart.locator("rect").filter({has: page.locator("title", {hasText: "1905 · Women\n22 first-year students"})});
  const men = chart.locator("rect").filter({has: page.locator("title", {hasText: "1905 · Men\n247 first-year students"})});
  await expect(women).toHaveCount(1);
  await expect(men).toHaveCount(1);
  const womenHeight = Number(await women.getAttribute("height"));
  const menHeight = Number(await men.getAttribute("height"));
  expect(menHeight / womenHeight).toBeCloseTo(247 / 22, 5);
  expect(Number(await men.getAttribute("y")) + menHeight).toBeCloseTo(Number(await women.getAttribute("y")), 5);

  await page.getByLabel("Women colour", {exact: true}).fill("#8b2f87");
  await expect(women).toHaveAttribute("fill", "#8b2f87");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download SVG", exact: true}).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("first-year-students-at-tu-delft-1905-1905.svg");
  const xml = await readFile(await file.path(), "utf8");
  expect(xml).toContain("247 first-year students");
  expect(xml).toContain("22 first-year students");
  expect(xml).toContain("#8b2f87");
  expect(xml).toContain("First-year students at the Delft Institute of Technology and TU Delft in 1905");

  await page.getByLabel("To", {exact: true}).selectOption({label: "2018"});
  await page.getByLabel("Chart type", {exact: true}).selectOption({label: "Stacked area"});
  await expect(chart.locator("g[aria-label='area']")).toBeVisible();
  await expect(chart.locator("g[aria-label='area'] path[fill='#4c78a8']").first()).toBeVisible();
  await page.getByLabel("Chart title", {exact: true}).fill("My comparison");
  await view.selectOption({label: "Women by programme"});
  await expect(page.getByLabel("Chart title", {exact: true})).toHaveValue("My comparison");
  await page.getByRole("button", {name: "Reset", exact: true}).click();
  await expect(view.locator("option:checked")).toHaveText("Women by programme");
  await expect(chart).toHaveAttribute("aria-label", /^Female first-year students/);
});

test("the comparison uses faculty counts and does not invent missing male values", async ({page}) => {
  await page.goto("./");
  await page.getByLabel("View", {exact: true}).selectOption({label: "Women and men"});
  await page.getByLabel("Faculty / afdeling", {exact: true}).selectOption({label: "Bouwkunidg ingenieur (Bk)"});
  await page.getByLabel("To", {exact: true}).selectOption({label: "1905"});
  await expect(page.locator(".stat").first().locator("strong")).toHaveText("1");
  await expect(page.locator(".stat").nth(1).locator("strong")).toHaveText("3");
  await expect(page.locator(".stat").last().locator("strong")).toHaveText("4");
  await expect(page.locator(".stat").nth(2)).toContainText("25.0%");

  await page.getByLabel("Faculty / afdeling", {exact: true}).selectOption({label: "Architecture and the Built Environment"});
  await page.getByLabel("From", {exact: true}).selectOption({label: "2002"});
  await expect(page.locator(".stat").first().locator("strong")).toHaveText("153");
  await expect(page.locator(".stat").nth(1)).toContainText("Not recorded");
  await expect(page.locator(".stat").last()).toContainText("Not recorded");
  await expect(page.locator(".selection-note")).toContainText("Male counts are unavailable");
  await expect(page.locator("svg[data-chart] g[aria-label='rect'] rect[fill='#4c78a8']")).toHaveCount(0);
  await page.getByLabel("Undefined percentages as 0").uncheck();
  await expect(page.locator(".stat").nth(2)).toContainText("Not defined");
  await expect(page.locator(".stat").nth(1)).toContainText("Not recorded");

  const pending = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download JSON", exact: true}).click();
  const file = await pending;
  const json = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(json.totals[0]).toMatchObject({year: 2002, female: 153, male: null, female_share: null});
  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const scenario of [
  {view: "All students by programme", title: /^First-year students by programme/, count: 4, unit: "first-year students", sum: "230", prefix: "students-by-programme-at-tu-delft"},
  {view: "Men by programme", title: /^Male first-year students/, count: 3, unit: "men", sum: "221", prefix: "men-at-tu-delft"}
]) {
  test(`${scenario.view} supports counts, styling, areas, and exports without filling missing years`, async ({page}) => {
    await page.goto("./");
    await page.getByLabel("View", {exact: true}).selectOption({label: scenario.view});
    const chart = page.locator("svg[data-chart]");
    await expect(chart).toHaveAttribute("aria-label", scenario.title);
    await expect(page.getByLabel("Colour palette", {exact: true})).toBeVisible();
    await expect(page.getByLabel("Women colour", {exact: true})).toBeHidden();
    await expect(page.locator(".selection-note")).toContainText("2002–2018");
    await expect(page.locator(".stat").nth(1)).toContainText("4,078");
    await expect(page.locator(".stat").last()).toContainText("Not recorded");
    const plotTitles = await chart.locator("g[aria-label='rect'] rect title").allTextContents();
    expect(plotTitles.some((text) => /^2001 ·/.test(text))).toBe(true);
    expect(plotTitles.some((text) => /^(200[2-9]|201\d) ·/.test(text))).toBe(false);
    await page.screenshot({path: `test-results/${scenario.prefix}-preview.png`, fullPage: true});

    await page.getByLabel("Inspect year", {exact: true}).selectOption({label: "1905"});
    await expect(page.locator(".stat").last().locator("strong")).toHaveText(scenario.sum);
    const bar = chart.locator("rect").filter({has: page.locator("title", {hasText: `1905 · Bouwkunidg ingenieur (Bk)\n${scenario.count} ${scenario.unit}`})});
    await expect(bar).toHaveCount(1);
    await page.getByText("Programme colours", {exact: true}).click();
    await page.getByLabel("Bouwkunidg ingenieur (Bk)", {exact: true}).fill("#117744");
    await expect(bar).toHaveAttribute("fill", "#117744");

    const pending = page.waitForEvent("download");
    await page.getByRole("button", {name: "Download SVG", exact: true}).click();
    const file = await pending;
    expect(file.suggestedFilename()).toBe(`${scenario.prefix}-1905-2018.svg`);
    const xml = await readFile(await file.path(), "utf8");
    expect(xml).toContain("Programme data are incomplete for 2002–2018");
    expect(xml).toContain(`${scenario.count} ${scenario.unit}`);
    expect(xml).toContain("#117744");
    expect(xml).not.toContain("NaN");

    await page.getByLabel("Chart type", {exact: true}).selectOption({label: "Stacked area"});
    await expect(chart.locator("g[aria-label='area']")).toBeVisible();
    // The programme area stops at 2001; the percentage line may continue to 2018.
    const lastX = await chart.locator("g[aria-label='area'] path[d]").evaluateAll((paths) => Math.max(...paths.map((path) => {const box = path.getBBox(); return box.x + box.width;})));
    expect(lastX).toBeGreaterThan(900);
    expect(lastX).toBeLessThan(970);
    await page.getByLabel("To", {exact: true}).selectOption({label: "2001"});
    await expect(page.locator(".selection-note")).toBeEmpty();
    await expect(page.getByLabel("Chart title", {exact: true})).toHaveValue(/1905-2001$/);
    await page.getByLabel("Faculty / afdeling", {exact: true}).selectOption({label: "Bouwkunidg ingenieur (Bk)"});
    await page.getByLabel("To", {exact: true}).selectOption({label: "1905"});
    await page.getByText("Programme breakdown", {exact: true}).click();
    await expect(page.locator(".breakdown-table tbody tr")).toHaveCount(1);
    await expect(page.locator(".breakdown-table tbody td").last()).toHaveText(String(scenario.count));

    await page.getByLabel("Faculty / afdeling", {exact: true}).selectOption({label: "Architecture and the Built Environment"});
    await page.getByLabel("From", {exact: true}).selectOption({label: "2002"});
    await page.getByLabel("Chart type", {exact: true}).selectOption({label: "Stacked bars"});
    await expect(chart.locator("g[aria-label='rect'] rect title")).toHaveCount(0);
    await expect(page.locator(".selection-note")).toContainText("incomplete for 2002");
    await expect(page.locator(".breakdown-table tbody td").last()).toHaveText("Not recorded");
    await page.getByLabel("Undefined percentages as 0").uncheck();
    await expect(page.locator(".stat").nth(2)).toContainText("Not defined");
    await expect(chart.locator("g[aria-label='rect'] rect title")).toHaveCount(0);

    const jsonPending = page.waitForEvent("download");
    await page.getByRole("button", {name: "Download JSON", exact: true}).click();
    const jsonFile = await jsonPending;
    const json = JSON.parse(await readFile(await jsonFile.path(), "utf8"));
    expect(json.programmes[0]).toMatchObject({year: 2002, female: 153, male: null, female_share: null});
    await page.setViewportSize({width: 390, height: 844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
