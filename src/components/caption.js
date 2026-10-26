export const GRAPH_TITLE = "First-year students at the Delft Institute of Technology and TU Delft in the period 1905-2018";

export function graphTitle(view, start, end) {
  const subject = {women: "Female first-year students", both: "First-year students", "all-programmes": "First-year students by programme", men: "Male first-year students"}[view];
  return `${subject} at the Delft Institute of Technology and TU Delft ${start === end ? `in ${start}` : `in the period ${start}-${end}`}`;
}

export function graphFilename(view) {
  return {women: "women-at-tu-delft", both: "first-year-students-at-tu-delft", "all-programmes": "students-by-programme-at-tu-delft", men: "men-at-tu-delft"}[view];
}

export function programmeDataNote(data) {
  const ranges = [];
  for (const year of data.programmeMissingYears) {
    const previous = ranges.at(-1);
    if (previous && year === previous[1] + 1) previous[1] = year;
    else ranges.push([year, year]);
  }
  if (!ranges.length) return "";
  const years = ranges.map(([start, end]) => start === end ? String(start) : `${start}–${end}`).join(", ");
  return `Programme data are incomplete for ${years}; these years are left blank.`;
}

export const GRAPH_SOURCES = "Delft Institute of Technology Yearbooks and reports, TU Delft Statistical Yearbooks and OSIRIS";

export const GRAPH_DESCRIPTION = [
  "This graph shows the absolute number of first-year students, the distribution of men and women, and the percentage of women. It was only possible for women to follow a full-time technical study at Delft from 1905.",
  "A striking aspect of the graph is that the percentage of women before WWII was higher than in the period that followed. The percentage only increases to more than 11% – the highest pre-war percentage – in 1983.",
  "Over the course of time, the definition of first-year students changed. Up until 1982, no statistical distinction was made between different types of first-year students. From 1982, the numbers given for first-year students include 'internal switchers' (students who changed to a different study) because these figures were best in line with earlier data. The introduction of the bachelor’s-master’s system in 2002 also had an impact on the calculation method which probably explains the ‘dip' the graph shows in that year."
];

export function graphDescription(view) {
  const introduction = {
    women: "This graph shows the number of female first-year students by programme and the percentage of women among all first-year students.",
    "all-programmes": "This graph shows the combined number of female and male first-year students by programme and the percentage of women among all first-year students. Years with incomplete programme data are left blank.",
    men: "This graph shows the number of male first-year students by programme. The line shows the percentage of women among all first-year students. Years with incomplete programme data are left blank."
  };
  return view === "both" ? GRAPH_DESCRIPTION : [
    `${introduction[view]} It was only possible for women to follow a full-time technical study at Delft from 1905.`,
    ...GRAPH_DESCRIPTION.slice(1)
  ];
}
