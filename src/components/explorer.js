import {programmeCount, programmeSum, selectRange} from "./data.js";
import {FONTS, programmeColors, renderChart} from "./chart.js";
import {download, jpgBlob, jpgDimensions, svgBlob} from "./export.js";
import {createDataExport, csvDataBlob, jsonDataBlob} from "./data-export.js";
import {graphDescription, graphFilename, graphTitle, programmeDataNote} from "./caption.js";

import {formatters, programmeLabel, translate} from "./i18n.js";

export function defaultSettings(data, language = "en") {
  return {
    start: data.years[0], end: data.years.at(-1), programme: "", view: "women", language, undefinedAsZero: true,
    title: graphTitle("women", data.years[0], data.years.at(-1), language),
    chartType: "bars", palette: "original", width: 1200, height: 450,
    font: "sans", fontSize: 13, background: "#ffffff", foreground: "#263238",
    lineColor: "#222b30", lineWidth: 2.5, barGap: 0.15, opacity: 1,
    womenColor: "#c8367f", menColor: "#4c78a8",
    share: true, grid: true, annotations: true, legend: true,
    jpgScale: 2, jpgQuality: 0.95, customColors: {}
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function createExplorer(data, Inputs) {
  let settings = defaultSettings(data);
  const t = (message, values) => translate(settings.language, message, values);
  let selectedYear = settings.end;
  let svg;
  let frame;
  let disposed = false;
  let exporting = false;
  const root = element("div", "heritage-app");
  root.innerHTML = `
    <div class="workspace">
      <aside class="controls" aria-label="Chart configuration"><div class="control-sections"></div><button type="button" data-reset>Reset</button></aside>
      <div class="visualization">
        <div class="chart-scroll" tabindex="0" aria-label="Graph preview; scroll horizontally on small screens"><div class="chart-mount"></div></div>
        <section class="chart-description" aria-label="Graph description"></section>
        <p class="selection-note muted"></p>
        <section class="year-inspector" aria-label="Values for a selected year"><div class="inspect-control"></div><div class="year-stats grid grid-cols-4"></div><details class="programme-details"><summary>Programme breakdown</summary><div class="programme-table"></div></details></section>
      </div>
    </div>
    <details class="source-notes"><summary>Data notes</summary><p>Programme sums can differ from recorded totals, which are used for the percentage line. Missing counts or a zero denominator (as in 1944) make the percentage undefined. These percentages use 0% by default; turn off “Undefined percentages as 0” to leave gaps. Programme classifications change in 2002.</p><a href="https://github.com/tu-delft-heritage/novices-graph">Data repository</a></details>`;
  const fields = {};
  const controlDefinitions = new Map();
  const sections = root.querySelector(".control-sections");
  const chartMount = root.querySelector(".chart-mount");

  function section(title, parent = sections, collapsible = false) {
    const group = element(collapsible ? "details" : "section", "control-group");
    group.append(element(collapsible ? "summary" : "h3", "", title));
    parent.append(group);
    return group;
  }
  function createControl(key, label, type, options) {
    const config = {...options, label: t(label), value: settings[key]};
    let input;
    if (type === "select") {
      input = Inputs.select(new Map(options.choices.map(([value, name]) => [key === "programme" && value ? programmeLabel(value, settings.language) : t(name), value])), config);
    } else if (type === "checkbox") {
      input = Inputs.toggle(config);
    } else if (type === "range" || type === "number") {
      input = Inputs[type]([options.min, options.max], config);
    } else {
      input = Inputs[type](config);
    }
    input.dataset.setting = key;
    return input;
  }
  function control(parent, key, label, type, options = {}) {
    controlDefinitions.set(key, {label, type, options});
    const input = createControl(key, label, type, options);
    fields[key] = input;
    parent.append(input);
    return input;
  }

  const years = data.years.map((year) => [year, String(year)]);
  const dataControls = section("Data");
  control(dataControls, "language", "Language / Taal", "select", {choices: [["en", "English"], ["nl", "Nederlands"]]});
  control(dataControls, "view", "View", "select", {choices: [
    ["women", "Women by programme"], ["both", "Women and men"],
    ["all-programmes", "All students by programme"], ["men", "Men by programme"]
  ]});
  control(dataControls, "start", "From", "select", {choices: years});
  control(dataControls, "end", "To", "select", {choices: years});
  control(dataControls, "programme", "Faculty / afdeling", "select", {
    choices: [["", "All faculties / afdelingen"], ...data.programmes.map((name) => [name, name.trim()])]
  });
  control(dataControls, "undefinedAsZero", "Undefined percentages as 0", "checkbox");
  const appearance = section("Appearance");
  control(appearance, "title", "Chart title", "text", {maxlength: 120, required: true});
  control(appearance, "chartType", "Chart type", "select", {choices: [["bars", "Stacked bars"], ["area", "Stacked area"]]});
  control(appearance, "palette", "Colour palette", "select", {choices: [["original", "Original programme colours"], ["tableau", "Tableau categorical"], ["blue", "Tonal blues"]]});
  control(appearance, "womenColor", "Women colour", "color");
  control(appearance, "menColor", "Men colour", "color");
  control(appearance, "background", "Background", "color");
  control(appearance, "foreground", "Text & axes", "color");
  control(appearance, "lineColor", "Share line", "color");
  control(appearance, "font", "Typeface", "select", {choices: Object.keys(FONTS).map((key) => [key, {sans: "Sans serif", serif: "Serif", mono: "Monospace"}[key]])});
  control(appearance, "fontSize", "Text size", "range", {min: 10, max: 20, step: 1});
  const layers = section("Layers");
  control(layers, "share", "Percentage line & right axis", "checkbox");
  control(layers, "annotations", "Historical markers", "checkbox");
  control(layers, "grid", "Horizontal grid", "checkbox");
  control(layers, "legend", "Legend", "checkbox");
  const layout = section("Image export");
  control(layout, "width", "Width (px)", "number", {min: 720, max: 2400, step: 10, required: true});
  control(layout, "height", "Plot height (px)", "number", {min: 280, max: 1000, step: 10, required: true});
  control(layout, "jpgScale", "JPG resolution", "select", {choices: [[1, "1×"], [2, "2×"], [3, "3×"]]});
  control(layout, "jpgQuality", "JPG quality", "range", {min: 0.5, max: 1, step: 0.05});
  const downloadActions = element("div", "download-actions");
  downloadActions.innerHTML = '<button type="button" data-export="svg">Download SVG</button><button type="button" data-export="jpg">Download JPG</button>';
  const status = element("p", "status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  layout.append(downloadActions, element("small", "dimensions muted"), status);
  const dataExport = section("Data export");
  const dataDownloadActions = element("div", "download-actions");
  dataDownloadActions.innerHTML = '<button type="button" data-export="csv">Download CSV</button><button type="button" data-export="json">Download JSON</button>';
  dataExport.append(dataDownloadActions);
  const buttons = [...sections.querySelectorAll("[data-export]")];
  const jpgButton = downloadActions.querySelector('[data-export="jpg"]');
  const fine = section("Fine adjustments", sections, true);
  control(fine, "lineWidth", "Line width", "range", {min: 1, max: 6, step: 0.5});
  control(fine, "barGap", "Bar spacing", "range", {min: 0, max: 0.7, step: 0.05});
  control(fine, "opacity", "Fill opacity", "range", {min: 0.2, max: 1, step: 0.05});
  const customSection = section("Programme colours", sections, true);
  customSection.append(element("p", "control-help", "Changing the palette clears these overrides."));
  const customFields = element("div", "custom-colours");
  customSection.append(customFields);
  const staticText = [...root.querySelectorAll(".control-group > h3, .control-group > summary, .control-help, [data-reset], .programme-details > summary, .source-notes > summary, .source-notes > p, .source-notes > a")].map((node) => [node, node.textContent]);
  const staticAria = [...root.querySelectorAll(".controls, .chart-scroll, .chart-description, .year-inspector")].map((node) => [node, node.getAttribute("aria-label")]);
  function translateInterface() {
    root.lang = settings.language;
    document.documentElement.lang = settings.language;
    staticText.forEach(([node, message]) => {node.textContent = t(message);});
    staticAria.forEach(([node, message]) => {node.setAttribute("aria-label", t(message));});
    for (const [key, {label, type, options}] of controlDefinitions) {
      const input = createControl(key, label, type, options);
      fields[key].replaceWith(input);
      fields[key] = input;
    }
    syncColours();
  }
  let yearSelect;
  let inspectorRange;
  let visibleData;

  function updateInspector(year) {
    const {number, percent} = formatters(settings.language);
    const combined = settings.view === "both";
    const allProgrammes = settings.view === "all-programmes";
    const menOnly = settings.view === "men";
    const record = visibleData.totals.find((d) => d.year === year);
    if (!record) return;
    selectedYear = year;
    yearSelect.value = year;
    const stats = root.querySelector(".year-stats");
    stats.replaceChildren();
    const values = [
      ["Women · recorded total", record.female == null ? t("Not recorded") : number(record.female)],
      ["Men · recorded total", record.male == null ? t("Not recorded") : number(record.male)],
      ["Share of women", percent(record.share)],
      ["Women · programme sum", record.programmeTotal == null ? t("Not recorded") : number(record.programmeTotal)]
    ];
    if (allProgrammes || menOnly) {
      const sum = programmeSum(visibleData, year, settings.view);
      values[3] = [`${menOnly ? "Men" : "Students"} · programme sum`, sum == null ? t("Not recorded") : number(sum)];
    }
    if (visibleData.focus) {
      values[0][0] = "Women";
      values[1][0] = "Men";
      if (!combined && !allProgrammes) values.pop();
    }
    if (combined) values[3] = ["All students", record.female == null || record.male == null ? t("Not recorded") : number(record.female + record.male)];
    stats.classList.toggle("grid-cols-3", values.length === 3);
    stats.classList.toggle("grid-cols-4", values.length === 4);
    for (const [label, value] of values) {
      const item = element("div", "stat card");
      item.append(element("span", "muted", t(label)), element("strong", "", value));
      stats.append(item);
    }
    const table = element("table", "breakdown-table");
    const columns = menOnly ? [["Men", (d) => d.male]] : [["Women", (d) => d.count]];
    if (combined || allProgrammes) columns.push(["Men", (d) => d.male]);
    if (allProgrammes) columns.push(["All students", (d) => programmeCount(d, "all-programmes")]);
    const header = element("tr");
    for (const label of ["Programme", ...columns.map(([label]) => label)]) {
      const th = element("th", "", t(label));
      th.scope = "col";
      header.append(th);
    }
    const head = element("thead");
    head.append(header);
    table.append(head);
    const body = document.createElement("tbody");
    const rows = visibleData.rows.filter((d) => d.year === year && (
      settings.view === "women" ? d.count !== 0 : visibleData.focus || d.count > 0 || d.male > 0
    )).sort((a, b) => (programmeCount(b, settings.view) ?? -1) - (programmeCount(a, settings.view) ?? -1));
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.append(element("td", "", programmeLabel(row.programme, settings.language)));
      for (const [, value] of columns) tr.append(element("td", "", value(row) == null ? t("Not recorded") : number(value(row))));
      body.append(tr);
    });
    table.append(body);
    root.querySelector(".programme-table").replaceChildren(rows.length ? table : element("p", "", t("No programme counts for this year.")));
  }

  function syncColours() {
    const colors = programmeColors(data, settings);
    customFields.replaceChildren(...data.programmes.map((name) => {
      // Native colour inputs need hex; D3 interpolators may return rgb().
      const canvas = document.createElement("canvas").getContext("2d");
      canvas.fillStyle = colors[name];
      const input = Inputs.color({label: programmeLabel(name, settings.language), value: canvas.fillStyle});
      input.dataset.programme = name;
      return input;
    }));
  }
  function render() {
    if (disposed) return;
    try {
      const range = selectRange(data, settings.start, settings.end, settings.programme, settings);
      visibleData = range;
      const combined = settings.view === "both";
      fields.palette.hidden = combined;
      customSection.hidden = combined;
      fields.womenColor.hidden = !combined;
      fields.menColor.hidden = !combined;
      root.querySelector(".chart-description").replaceChildren(...graphDescription(settings.view, settings.language).map((paragraph) => element("p", "", paragraph)));
      root.querySelector(".selection-note").textContent = programmeDataNote(range, settings.language) || (range.focus && range.totals.every((d) => d.male == null)
        ? t(settings.undefinedAsZero ? "Male counts are unavailable for this faculty / afdeling; undefined percentages are shown as 0%." : "Male counts are unavailable for this faculty / afdeling; no percentage is shown.") : "");
      svg = renderChart(range, settings, {onYear: (year) => {if (selectedYear !== year) updateInspector(year);}});
      chartMount.replaceChildren(svg);
      document.title = settings.title;
      const rangeKey = `${range.start}-${range.end}-${settings.language}`;
      if (inspectorRange !== rangeKey) {
        inspectorRange = rangeKey;
        yearSelect = Inputs.select(range.totals.map((d) => d.year), {label: t("Inspect year"), value: selectedYear, format: String});
        yearSelect.addEventListener("input", () => updateInspector(yearSelect.value));
        root.querySelector(".inspect-control").replaceChildren(yearSelect);
      }
      updateInspector(Math.max(range.start, Math.min(range.end, selectedYear)));
      const baseSize = `${settings.width} × ${svg.getAttribute("height")}`;
      buttons.forEach((button) => {button.disabled = exporting;});
      try {
        const jpg = jpgDimensions(svg, settings.jpgScale);
        root.querySelector(".dimensions").textContent = `SVG ${baseSize} · JPG ${jpg.width} × ${jpg.height} px`;
        jpgButton.title = "";
      } catch (error) {
        root.querySelector(".dimensions").textContent = t(error.message);
        jpgButton.disabled = true;
        jpgButton.title = t(error.message);
      }
      fields.barGap.querySelectorAll("input").forEach((input) => {input.disabled = settings.chartType === "area";});
    } catch (error) {
      chartMount.replaceChildren(element("p", "render-error", t("Unable to draw the graph: {error}", {error: t(error.message)})));
      buttons.forEach((button) => {button.disabled = exporting || ["svg", "jpg"].includes(button.dataset.export);});
      console.error(error);
    }
  }
  root.addEventListener("input", (event) => {
    const input = event.target.closest("[data-setting], [data-programme]");
    if (!input || !input.checkValidity()) return;
    if (input.dataset.programme) settings.customColors[input.dataset.programme] = input.value;
    else {
      const key = input.dataset.setting;
      const automaticTitle = settings.title === graphTitle(settings.view, settings.start, settings.end, settings.language);
      settings[key] = input.value;
      if (key === "start" && settings.start > settings.end) settings.end = settings.start;
      if (key === "end" && settings.end < settings.start) settings.start = settings.end;
      fields.start.value = settings.start;
      fields.end.value = settings.end;
      if (key !== "title" && automaticTitle) {
        settings.title = graphTitle(settings.view, settings.start, settings.end, settings.language);
        fields.title.value = settings.title;
      }
      if (key === "language") {
        translateInterface();
        fields.language.querySelector("select").focus();
      }
      if (key === "palette") {settings.customColors = {}; syncColours();}
    }
    status.textContent = "";
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
  });
  root.querySelector("[data-reset]").addEventListener("click", () => {
    settings = defaultSettings(data, settings.language);
    selectedYear = settings.end;
    Object.entries(fields).forEach(([key, input]) => {
      input.value = settings[key];
      input.querySelector("input[type=color]")?.dispatchEvent(new Event("input"));
    });
    syncColours();
    render();
    status.textContent = t("Settings reset.");
  });
  buttons.forEach((button) => button.addEventListener("click", async () => {
    const format = button.dataset.export;
    const isDataExport = format === "csv" || format === "json";
    const requiredFields = isDataExport ? [fields.start, fields.end, fields.programme] : Object.values(fields);
    if (!requiredFields.every((input) => input.reportValidity())) return;
    const snapshot = {...settings, customColors: {...settings.customColors}};
    (isDataExport ? dataExport : layout).append(status);
    exporting = true;
    buttons.forEach((item) => {item.disabled = true;});
    status.textContent = t("Preparing {format}…", {format: format.toUpperCase()});
    try {
      let blob;
      if (isDataExport) {
        const selectedData = createDataExport(data, snapshot);
        blob = format === "csv" ? csvDataBlob(selectedData) : jsonDataBlob(selectedData);
      } else {
        const exportSvg = renderChart(selectRange(data, snapshot.start, snapshot.end, snapshot.programme, snapshot), snapshot);
        blob = format === "svg" ? svgBlob(exportSvg) : await jpgBlob(exportSvg, {
          scale: snapshot.jpgScale, quality: snapshot.jpgQuality, background: snapshot.background
        });
      }
      if (disposed) return;
      const faculty = snapshot.programme ? `-${snapshot.programme.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}` : "";
      const name = graphFilename(snapshot.view);
      download(blob, `${name}${faculty}-${snapshot.start}-${snapshot.end}${!isDataExport && snapshot.language === "nl" ? "-nl" : ""}.${format}`);
      status.textContent = t("{format} downloaded.", {format: format.toUpperCase()});
    } catch (error) {
      status.textContent = t("Export failed: {error}", {error: t(error.message)});
    } finally {
      exporting = false;
      render();
    }
  }));
  translateInterface();
  render();
  return {element: root, destroy() {disposed = true; cancelAnimationFrame(frame);}};
}
