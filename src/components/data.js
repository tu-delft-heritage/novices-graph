export const EXCLUDED_PROGRAMMES = new Set(["alle lessen", "enkele lessen", "ijker", "nan", "Totaal"]);

function count(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function femaleShare(female, male, undefinedAsZero = false) {
  return female == null || male == null || female + male === 0
    ? (undefinedAsZero ? 0 : null) : female / (female + male);
}

export function normalizeData(women, men, colors = {}) {
  const years = [...new Set([...Object.keys(women.Totaal), ...Object.keys(men.Totaal)])]
    .map(Number).filter(Number.isInteger).sort((a, b) => a - b);
  const programmes = Object.keys(women).filter((name) => !EXCLUDED_PROGRAMMES.has(name));
  const rows = years.flatMap((year) => programmes.map((programme) => ({
    year, programme, count: count(women[programme][year]), male: count(men[programme]?.[year])
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
  const programmes = programme ? [programme]
    : data.programmes.filter((name) => rows.some((d) => d.programme === name && (d.count > 0 || (view === "both" && d.male > 0))));
  const totals = programme ? rows.map((d) => ({
    year: d.year, female: d.count, male: d.male, programmeTotal: d.count,
    share: femaleShare(d.count, d.male, undefinedAsZero)
  })) : data.totals.filter((d) => d.year >= from && d.year <= to)
    .map((d) => ({...d, share: d.share ?? (undefinedAsZero ? 0 : null)}));
  return {
    ...data, start: from, end: to, focus: programme || null, programmes, allProgrammes: data.programmes,
    rows: rows.filter((d) => programmes.includes(d.programme)),
    totals
  };
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
