import * as Plot from "@observablehq/plot";
import {axisRight, format, interpolateBlues, scaleLinear, scaleOrdinal, schemeTableau10, select} from "d3";
import {comparisonRows, EVENTS, programmeRows} from "./data.js";
import {graphFilename, GRAPH_SOURCES, programmeDataNote} from "./caption.js";

const SVG_NS = "http://www.w3.org/2000/svg";
export const number = format(",d");
export const percent = (value) => value == null ? "Not defined" : format(".1%")(value);
export const FONTS = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', monospace"
};

export function programmeColors(data, settings) {
  const domain = data.allProgrammes ?? data.programmes;
  const palette = scaleOrdinal(domain, schemeTableau10);
  return Object.fromEntries(domain.map((name, i) => [name,
    settings.customColors[name] ?? (settings.palette === "original" ? data.colors[name]
      : settings.palette === "tableau" ? palette(name)
      : interpolateBlues(0.35 + (i % 8) / 7 * 0.6))
  ]));
}

function svgNode(tag, attrs = {}, content) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (content != null) node.textContent = content;
  return node;
}

function lines(text, maxCharacters) {
  const result = [""];
  for (const word of text.split(/\s+/)) {
    const last = result.length - 1;
    if (result[last] && result[last].length + word.length + 1 > maxCharacters) result.push(word);
    else result[last] += `${result[last] ? " " : ""}${word}`;
  }
  return result;
}

function textBlock(parent, text, x, y, attrs, maxCharacters, lineHeight) {
  const chunks = lines(text, maxCharacters);
  chunks.forEach((chunk, i) => parent.append(svgNode("text", {x, y: y + i * lineHeight, ...attrs}, chunk)));
  return chunks.length * lineHeight;
}

/** A single self-contained SVG: Plot marks, D3's independent percentage axis, and export furniture. */
export function renderChart(data, settings, {onYear} = {}) {
  const combined = settings.view === "both";
  const countLabel = {women: "women", both: "first-year students", "all-programmes": "first-year students", men: "men"}[settings.view];
  const rows = combined ? comparisonRows(data) : programmeRows(data, settings.view);
  const series = combined ? ["Women", "Men"] : data.focus ? data.programmes
    : data.programmes.filter((name) => rows.some((d) => d.programme === name && d.count > 0));
  const showShare = settings.share && (!data.focus || data.totals.some((d) => d.share != null));
  const scope = data.focus ? `, ${data.focus.trim()}` : "";
  const width = settings.width;
  const fontSize = settings.fontSize;
  const font = FONTS[settings.font];
  const colors = combined ? {Women: settings.womenColor, Men: settings.menColor} : programmeColors(data, settings);
  const titleLines = lines(settings.title, Math.floor((width - 80) / 17));
  const subtitle = `${data.start}–${data.end}${data.focus ? ` · ${data.focus.trim()}` : ""}`;
  const subtitleLines = lines(subtitle, Math.floor((width - 64) / (fontSize * 0.6)));
  const headerHeight = 52 + titleLines.length * 30 + (subtitleLines.length - 1) * (fontSize + 3);
  const height = settings.height;
  const margin = {top: settings.annotations ? 66 : 38, bottom: 48, left: 70, right: showShare ? 72 : 30};
  const countMax = Math.max(1, ...rows.map((d) => d.upper ?? 0));
  const y = scaleLinear([0, countMax], [height - margin.bottom, margin.top]).nice();
  const yMax = y.domain()[1];
  const shareMax = Math.max(0.35, Math.ceil(Math.max(0, ...data.totals.map((d) => d.share ?? 0)) * 20) / 20);
  const shareScale = scaleLinear([0, shareMax], [0, yMax]);
  const xDomain = [data.start - 0.5, data.end + 0.5];
  const x = scaleLinear(xDomain, [margin.left, width - margin.right]);
  const events = EVENTS.filter((d) => d.end >= data.start && d.start <= data.end);
  const marks = [];

  if (settings.annotations) {
    marks.push(Plot.rect(events.filter((d) => d.start !== d.end), {
      x1: (d) => Math.max(d.start, xDomain[0]), x2: (d) => Math.min(d.end, xDomain[1]),
      y1: 0, y2: yMax, fill: settings.foreground, fillOpacity: 0.045
    }));
  }
  const markOptions = {
    x: "year", y1: "lower", y2: "upper", fill: combined ? "sex" : "programme", z: combined ? "sex" : "programme", fillOpacity: settings.opacity,
    order: series,
    title: (d) => `${d.year} · ${combined ? d.sex : d.programme}\n${d.count == null ? "Not recorded" : number(d.count)} ${countLabel}`
  };
  if (settings.chartType === "area") {
    marks.push(Plot.areaY(rows, {...markOptions, curve: "linear"}));
  } else {
    const halfWidth = (1 - settings.barGap) / 2;
    marks.push(Plot.rectY(rows, {
      ...markOptions, x1: (d) => d.year - halfWidth, x2: (d) => d.year + halfWidth
    }));
  }
  if (settings.annotations) {
    marks.push(Plot.ruleX(events.filter((d) => d.start === d.end), {
      x: "start", stroke: settings.foreground, strokeOpacity: 0.35, strokeDasharray: "4,4"
    }));
  }
  if (showShare) {
    marks.push(Plot.lineY(data.totals, {
      x: "year", y: (d) => d.share == null ? NaN : shareScale(d.share),
      stroke: settings.lineColor, strokeWidth: settings.lineWidth,
      title: (d) => `${d.year} · ${percent(d.share)} women (${data.focus ? "selected faculty / afdeling" : "recorded totals"})`
    }));
    if (data.start === data.end && data.totals[0]?.share != null) {
      marks.push(Plot.dot(data.totals, {x: "year", y: (d) => shareScale(d.share), fill: settings.lineColor, r: 4}));
    }
  }
  marks.push(Plot.ruleY([0], {stroke: settings.foreground, strokeOpacity: 0.35}));
  const plot = Plot.plot({
    width, height,
    marginTop: margin.top, marginBottom: margin.bottom, marginLeft: margin.left, marginRight: margin.right,
    x: {domain: xDomain, label: null, tickFormat: format("d"), ticks: Math.min(12, data.end - data.start + 1)},
    y: {domain: [0, yMax], label: null, grid: settings.grid, ticks: Math.min(5, yMax)},
    color: {domain: series, range: series.map((name) => colors[name])},
    style: {background: "transparent", color: settings.foreground, fontFamily: font, fontSize: `${fontSize}px`},
    marks
  });
  // Plot's embedded styles and all presentation attributes travel with the exported SVG.
  const svg = svgNode("svg", {
    xmlns: SVG_NS, width, role: "img", "aria-label": `${settings.title}${scope}, ${data.start} to ${data.end}`,
    "font-family": font, "font-size": fontSize, fill: settings.foreground,
    color: settings.foreground, "data-chart": graphFilename(settings.view)
  });
  svg.style.cssText = `display:block;background:${settings.background};font-family:${font};color:${settings.foreground}`;
  svg.append(svgNode("title", {}, `${settings.title}${scope}, ${data.start}–${data.end}`));
  svg.append(svgNode("desc", {}, `${combined ? "Recorded counts of female and male first-year students" : `Counts of ${countLabel}`}${data.focus ? ` in ${data.focus.trim()}` : combined ? "" : " by programme"}.${showShare ? ` The line uses an independent right axis and shows women as a share of female and male counts in this selection. Undefined percentages ${settings.undefinedAsZero ? "are shown as 0%." : "leave gaps."}` : ""}`));
  const background = svgNode("rect", {width, height: 1, fill: settings.background});
  svg.append(background);
  titleLines.forEach((line, i) => svg.append(svgNode("text", {x: 32, y: 40 + i * 30, "font-size": 26, "font-weight": 600}, line)));
  subtitleLines.forEach((line, i) => svg.append(svgNode("text", {
    x: 32, y: 40 + titleLines.length * 30 + i * (fontSize + 3), "font-size": fontSize, opacity: 0.7
  }, line)));
  plot.setAttribute("y", headerHeight);
  svg.append(plot);
  const axisLabel = {women: "Women", both: "First-year students", "all-programmes": "Students", men: "Men"}[settings.view];
  plot.append(svgNode("text", {x: margin.left, y: 19, "text-anchor": "start", fill: settings.foreground, "font-weight": 600}, `${axisLabel}${combined || data.focus ? "" : " by programme"}`));
  if (showShare) {
    const axis = select(plot).append("g")
      .attr("data-axis", "share")
      .attr("transform", `translate(${width - margin.right},0)`)
      .call(axisRight(scaleLinear([0, shareMax], [height - margin.bottom, margin.top])).ticks(5).tickFormat(format(".0%")));
    axis.attr("font-size", fontSize).attr("font-family", font).attr("color", settings.lineColor);
    axis.select(".domain").remove();
    plot.append(svgNode("text", {x: width - margin.right, y: 19, "text-anchor": "end", fill: settings.lineColor, "font-weight": 600}, data.focus ? "Share of women within faculty / afdeling" : "Share of women"));
  }
  if (settings.annotations) events.forEach((event, i) => {
    const center = x((Math.max(event.start, data.start) + Math.min(event.end, data.end)) / 2);
    const anchor = center > width - 200 ? "end" : center < 160 ? "start" : "middle";
    plot.append(svgNode("text", {
      x: center, y: 39 + (i % 2) * 15, "text-anchor": anchor,
      "font-size": Math.max(10, fontSize - 1), fill: settings.foreground, opacity: 0.65
    }, event.label));
  });

  let cursor = headerHeight + height;
  if (settings.legend) {
    svg.append(svgNode("line", {x1: 32, x2: width - 32, y1: cursor, y2: cursor, stroke: settings.foreground, "stroke-opacity": 0.15}));
    cursor += 28;
    const columns = combined || width < 1000 ? 2 : 3;
    const columnWidth = (width - 64) / columns;
    const maxCharacters = Math.max(20, Math.floor((columnWidth - 28) / (fontSize * 0.57)));
    for (let i = 0; i < series.length; i += columns) {
      let rowHeight = 0;
      series.slice(i, i + columns).forEach((name, column) => {
        const left = 32 + column * columnWidth;
        svg.append(svgNode("rect", {x: left, y: cursor - 9, width: 9, height: 9, rx: 2, fill: colors[name], "fill-opacity": settings.opacity}));
        rowHeight = Math.max(rowHeight, textBlock(svg, name.trim(), left + 17, cursor,
          {"font-size": fontSize - 1}, maxCharacters, fontSize + 3));
      });
      cursor += rowHeight + 9;
    }
    if (showShare) {
      svg.append(svgNode("line", {x1: 32, x2: 47, y1: cursor - 4, y2: cursor - 4, stroke: settings.lineColor, "stroke-width": settings.lineWidth}));
      svg.append(svgNode("text", {x: 55, y: cursor, "font-size": fontSize - 1}, data.focus ? "Share of women within this faculty / afdeling" : "Women as a share of all students (recorded totals)"));
      cursor += 24;
    }
  }
  cursor += 18;
  cursor += textBlock(svg, `Source: ${GRAPH_SOURCES}`,
    32, cursor, {"font-size": Math.max(10, fontSize - 2), opacity: 0.65}, Math.floor((width - 64) / (fontSize * 0.5)), fontSize + 3);
  const missingProgrammeNote = programmeDataNote(data);
  if (missingProgrammeNote) {
    cursor += textBlock(svg, missingProgrammeNote,
      32, cursor, {"font-size": Math.max(10, fontSize - 2), opacity: 0.65}, Math.floor((width - 64) / (fontSize * 0.5)), fontSize + 3);
  } else if (data.focus && data.totals.every((d) => d.male == null)) {
    cursor += textBlock(svg,
      `Male counts unavailable; ${showShare && settings.undefinedAsZero ? "undefined percentages shown as 0%." : "percentage not shown."}`,
      32, cursor, {"font-size": Math.max(10, fontSize - 2), opacity: 0.65}, Math.floor((width - 64) / (fontSize * 0.5)), fontSize + 3);
  }
  const fullHeight = cursor + 16;
  svg.setAttribute("height", fullHeight);
  svg.setAttribute("viewBox", `0 0 ${width} ${fullHeight}`);
  background.setAttribute("height", fullHeight);

  if (onYear) {
    // Keep interaction out of the export; pointer coordinates use the SVG viewBox.
    svg.addEventListener("pointermove", (event) => {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
      if (point.y < headerHeight + margin.top || point.y > headerHeight + height - margin.bottom) return;
      const year = Math.max(data.start, Math.min(data.end, Math.round(x.invert(point.x))));
      onYear(year);
    });
  }
  return svg;
}
