export const GRAPH_TITLE = "First-year students at the Delft Institute of Technology and TU Delft in the period 1905-2018";

export function graphTitle(view, start, end) {
  return `${view === "both" ? "First-year students" : "Female first-year students"} at the Delft Institute of Technology and TU Delft ${start === end ? `in ${start}` : `in the period ${start}-${end}`}`;
}

export const GRAPH_SOURCES = "Delft Institute of Technology Yearbooks and reports, TU Delft Statistical Yearbooks and OSIRIS";

export const GRAPH_DESCRIPTION = [
  "This graph shows the absolute number of first-year students, the distribution of men and women, and the percentage of women. It was only possible for women to follow a full-time technical study at Delft from 1905.",
  "A striking aspect of the graph is that the percentage of women before WWII was higher than in the period that followed. The percentage only increases to more than 11% – the highest pre-war percentage – in 1983.",
  "Over the course of time, the definition of first-year students changed. Up until 1982, no statistical distinction was made between different types of first-year students. From 1982, the numbers given for first-year students include 'internal switchers' (students who changed to a different study) because these figures were best in line with earlier data. The introduction of the bachelor’s-master’s system in 2002 also had an impact on the calculation method which probably explains the ‘dip' the graph shows in that year."
];

export function graphDescription(view) {
  return view === "both" ? GRAPH_DESCRIPTION : [
    "This graph shows the number of female first-year students by programme and the percentage of women among all first-year students. It was only possible for women to follow a full-time technical study at Delft from 1905.",
    ...GRAPH_DESCRIPTION.slice(1)
  ];
}
