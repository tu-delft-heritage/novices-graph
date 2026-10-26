export const EXCLUDED_PROGRAMMES = new Set(["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"]);

function count(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
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

export function normalizeData(women, men, colors = {}) {
  const years = [...new Set([...Object.keys(women.Totaal), ...Object.keys(men.Totaal)])]
    .map(Number).filter(Number.isInteger).sort((a, b) => a - b);
  const programmes = [...new Set([...Object.keys(women), ...Object.keys(men)])].filter((name) => !EXCLUDED_PROGRAMMES.has(name));
  const rows = years.flatMap((year) => programmes.map((programme) => ({
    year, programme, count: count(women[programme]?.[year]), male: count(men[programme]?.[year])
  })));
  const totals = years.map((year) => {
    const female = count(women.Totaal[year]);
    const male = count(men.Totaal[year]);
    const values = rows.filter((d) => d.year === year).map((d) => d.count);
    return {
      year, female, male,
      share: femaleShare(female, male),
      programmeTotal: values.some((d) => d === null) ? null : values.reduce((a, b) => a + b, 0)
    };
  });
  return {
    years, programmes, rows, totals,
    colors: Object.fromEntries(programmes.map((name) => [name, Object.values(colors[name] ?? {})[0] ?? "#6c7277"]))
  };
}

export function selectRange(data, start, end, programme = "", {undefinedAsZero = false, view = "women"} = {}) {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  if (programme && !data.programmes.includes(programme)) throw new Error(`Unknown faculty / afdeling: ${programme}`);
  const rows = data.rows.filter((d) => d.year >= from && d.year <= to && (!programme || d.programme === programme));
  const needsMaleBreakdown = view === "men" || view === "all-programmes";
  const relevant = (d) => d.count > 0 || d.male > 0;
  // Zero-filled, inactive categories precede the 2002 classification change.
  // An active category without a required count makes that year's stack incomplete.
  const programmeMissingYears = needsMaleBreakdown
    ? [...new Set(rows.filter((d) => programmeCount(d, view) == null && (programme || relevant(d))).map((d) => d.year))]
    : [];
  const programmes = programme ? [programme]
    : data.programmes.filter((name) => rows.some((d) => d.programme === name && (
      view === "both" ? relevant(d) : programmeCount(d, view) > 0 || (needsMaleBreakdown && programmeCount(d, view) == null && relevant(d))
    )));
  const totals = programme ? rows.map((d) => ({
    year: d.year, female: d.count, male: d.male, programmeTotal: d.count,
    share: femaleShare(d.count, d.male, undefinedAsZero)
  })) : data.totals.filter((d) => d.year >= from && d.year <= to)
    .map((d) => ({...d, share: d.share ?? (undefinedAsZero ? 0 : null)}));
  return {
    ...data, start: from, end: to, focus: programme || null, programmes, allProgrammes: data.programmes,
    rows: rows.filter((d) => programmes.includes(d.programme)),
    totals, programmeMissingYears
  };
}

export function programmeRows(data, view = "women") {
  const missing = new Set(data.programmeMissingYears);
  const offsets = new Map();
  return data.rows.map((d) => {
    const count = missing.has(d.year) ? null : programmeCount(d, view);
    const lower = offsets.get(d.year) ?? 0;
    const upper = count == null ? null : lower + count;
    if (upper != null) offsets.set(d.year, upper);
    return {...d, count, lower, upper};
  });
}

export function programmeSum(data, year, view) {
  if (data.programmeMissingYears.includes(year)) return null;
  return data.rows.filter((d) => d.year === year).reduce((sum, d) => sum + (programmeCount(d, view) ?? 0), 0);
}

// Use recorded totals, not programme sums. Missing counts stay missing;
// explicit bounds prevent the stack transform from treating them as zero.
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
