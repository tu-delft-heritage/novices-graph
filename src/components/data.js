import {FACULTY_NAMES, HISTORICAL_ALIASES} from "./entities.js";

function count(value) {
  if (value === "" || value == null) return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new Error(`Invalid count: ${value}`);
  return result;
}

export function femaleShare(female, male, undefinedAsZero = false) {
  return female == null || male == null || female + male === 0
    ? (undefinedAsZero ? 0 : null) : female / (female + male);
}

export function programmeCount(row, view = "women") {
  if (view === "men") return row.male;
  if (view === "all-programmes") return row.count == null || row.male == null ? null : row.count + row.male;
  return row.count;
}

// Empty historical categories are not observations. A partially recorded row
// contributes, but its unknown sex count must not become a measured zero.
function sumCounts(rows, field) {
  const observed = rows.filter((r) => r.count != null || r.male != null);
  return !observed.length || observed.some((r) => r[field] == null)
    ? null : observed.reduce((sum, r) => sum + r[field], 0);
}

export function normalizeMasters(masters, mapping, colors = {}) {
  const entities = {}, rows = [], totals = [], seen = new Set();
  const mappings = new Map();
  for (const m of mapping) {
    const previous = mappings.get(m.entity_id);
    if (previous && previous.optional_faculty_group !== m.optional_faculty_group) throw new Error(`Conflicting faculty mapping: ${m.entity_id}`);
    mappings.set(m.entity_id, m);
  }
  for (const source of masters) {
    const year = Number(source.year);
    if (!Number.isInteger(year)) throw new Error(`Invalid year: ${source.year}`);
    const id = source.entity_id;
    const key = `${year}:${id}`;
    if (!id || seen.has(key)) throw new Error(`Missing or duplicate master key: ${key}`);
    seen.add(key);
    const female = count(source.female), male = count(source.male);
    const total = count(source.total);
    if (total != null && (female == null || male == null || female + male !== total)) throw new Error(`Inconsistent total: ${key}`);
    const provenance = {sourceLabel: source.source_label, sourceFile: source.source_file,
      sourceSheet: source.source_sheet, sourceCells: source.source_cells, definition: source.definition,
      status: source.status, level: source.level};
    if (source.row_type !== "detail") {
      if (!["reported_total", "derived_total"].includes(source.row_type)) throw new Error(`Invalid row type: ${source.row_type}`);
      totals.push({year, female, male, share: femaleShare(female, male), ...provenance});
      continue;
    }
    const m = mappings.get(id);
    if (!m) throw new Error(`Missing entity mapping: ${id}`);
    const faculty = source.level === "faculty" ? source.faculty_code : m.optional_faculty_group;
    if (faculty && !FACULTY_NAMES[faculty]) throw new Error(`Ambiguous or unknown faculty group for ${id}: ${faculty}`);
    entities[id] ??= {label: source.level === "faculty" ? FACULTY_NAMES[faculty] : source.source_label,
      level: source.level, faculty: faculty || null, mapping: m};
    rows.push({year, programme: id, count: female, male, ...provenance});
  }
  totals.sort((a, b) => a.year - b.year);
  const years = totals.map((d) => d.year);
  if (new Set(years).size !== years.length || rows.some((r) => !years.includes(r.year))) throw new Error("Expected exactly one total per year");
  for (const total of totals) total.programmeTotal = sumCounts(rows.filter((r) => r.year === total.year), "count");
  const programmes = Object.keys(entities);
  return {years, programmes, entities, rows, totals, grouping: "source",
    colors: Object.fromEntries(programmes.map((id) => {
      const name = entities[id].label;
      const fallback = {"Alle lessen": "#7b6a56", "Enkele lessen": "#8a8a8a", IJker: "#4d5c66"}[name] ?? "#6c7277";
      return [id, Object.values(colors[HISTORICAL_ALIASES[name] ?? name] ?? {})[0] ?? fallback];
    }))};
}

const facultyCache = new WeakMap();
export function groupedData(data, groupByFaculty = false) {
  if (!groupByFaculty) return data;
  if (facultyCache.has(data)) return facultyCache.get(data);
  const entities = {}, colors = {}, buckets = new Map();
  for (const row of data.rows) {
    const entity = data.entities[row.programme];
    const id = entity.faculty ? `faculty:${entity.faculty}` : row.programme;
    entities[id] ??= entity.faculty ? {label: FACULTY_NAMES[entity.faculty], level: "faculty_group", faculty: entity.faculty} : entity;
    colors[id] = data.colors[id] ?? data.colors[row.programme];
    const key = `${row.year}:${id}`;
    if (!buckets.has(key)) buckets.set(key, {year: row.year, programme: id, members: []});
    buckets.get(key).members.push(row);
  }
  const rows = [...buckets.values()].map(({year, programme, members}) => ({
    year, programme, count: sumCounts(members, "count"), male: sumCounts(members, "male"),
    level: members.every((r) => r.level === "faculty") ? "faculty" : entities[programme].level,
    definition: [...new Set(members.map((r) => r.definition))].join("; "),
    status: members.every((r) => r.count == null && r.male == null) ? "blank" : "grouped_recorded_counts",
    members: members.map((r) => r.programme)
  }));
  const programmes = [...Object.keys(FACULTY_NAMES).map((code) => `faculty:${code}`).filter((id) => entities[id]),
    ...Object.keys(entities).filter((id) => !entities[id].faculty)];
  const result = {...data, entities, colors, rows, programmes, grouping: "faculty"};
  facultyCache.set(data, result);
  return result;
}

export function selectRange(original, start, end, programme = "", {undefinedAsZero = false, view = "women", groupByFaculty = false} = {}) {
  const data = groupedData(original, groupByFaculty);
  const from = Math.min(start, end), to = Math.max(start, end);
  if (programme && !data.programmes.includes(programme)) throw new Error(`Unknown category: ${programme}`);
  const years = data.years.filter((y) => y >= from && y <= to);
  const selectedRows = data.rows.filter((r) => years.includes(r.year) && (!programme || r.programme === programme));
  const programmes = programme ? [programme] : data.programmes.filter((id) => selectedRows.some((r) => r.programme === id && (r.count > 0 || r.male > 0)));
  const programmeMissingYears = years.filter((year) => {
    const observed = selectedRows.filter((r) => r.year === year && (r.count != null || r.male != null));
    return !observed.length || observed.some((r) => programmeCount(r, view) == null);
  });
  const totals = years.map((year) => {
    const rows = selectedRows.filter((r) => r.year === year);
    const total = programme ? {year, female: sumCounts(rows, "count"), male: sumCounts(rows, "male"), level: "selection"}
      : data.totals.find((r) => r.year === year);
    return {...total, programmeTotal: sumCounts(rows, "count"), share: femaleShare(total.female, total.male, undefinedAsZero)};
  });
  return {...data, start: from, end: to, years, view, focus: programme || null, programmes, allProgrammes: data.programmes,
    selectedRows, rows: selectedRows.filter((r) => programmes.includes(r.programme)), totals, programmeMissingYears};
}

export function programmeRows(data, view = "women") {
  const missing = new Set(data.programmeMissingYears);
  const lookup = new Map(data.rows.map((r) => [`${r.year}:${r.programme}`, r]));
  return data.years.flatMap((year) => {
    let offset = 0;
    return data.programmes.map((programme) => {
      const row = lookup.get(`${year}:${programme}`) ?? {year, programme, count: null, male: null};
      const count = missing.has(year) ? null : programmeCount(row, view);
      const lower = offset, upper = count == null ? null : lower + count;
      if (upper != null) offset = upper;
      return {...row, count, lower, upper};
    });
  });
}

export function programmeSum(data, year, view = "women") {
  if (data.programmeMissingYears.includes(year)) return null;
  return data.rows.filter((r) => r.year === year).reduce((sum, r) => sum + (programmeCount(r, view) ?? 0), 0);
}

export function comparisonRows(data) {
  return data.totals.flatMap((d) => [
    {year: d.year, sex: "Women", count: d.female, lower: 0, upper: d.female},
    {year: d.year, sex: "Men", count: d.male, lower: d.female ?? 0,
      upper: d.male == null ? null : (d.female ?? 0) + d.male}
  ]);
}

export const EVENTS = [
  {start: 1914, end: 1918, label: "First World War"},
  {start: 1939, end: 1945, label: "Second World War"},
  {start: 1973, end: 1973, label: "Oil crisis"},
  {start: 2002, end: 2002, label: "Bachelor–master system"}
];
