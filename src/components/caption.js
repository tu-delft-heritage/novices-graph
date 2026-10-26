import {translate} from "./i18n.js";

export const GRAPH_TITLE = "First-year students at the Delft Institute of Technology and TU Delft in the period 1905-2018";

export function graphTitle(view, start, end, language = "en") {
  if (language === "nl") {
    const subject = {women: "Vrouwelijke eerstejaarsstudenten", both: "Eerstejaarsstudenten", "all-programmes": "Eerstejaarsstudenten per opleiding", men: "Mannelijke eerstejaarsstudenten"}[view];
    return `${subject} aan de Technische Hogeschool Delft en de TU Delft ${start === end ? `in ${start}` : `in de periode ${start}-${end}`}`;
  }
  const subject = {women: "Female first-year students", both: "First-year students", "all-programmes": "First-year students by programme", men: "Male first-year students"}[view];
  return `${subject} at the Delft Institute of Technology and TU Delft ${start === end ? `in ${start}` : `in the period ${start}-${end}`}`;
}

export function graphFilename(view) {
  return {women: "women-at-tu-delft", both: "first-year-students-at-tu-delft", "all-programmes": "students-by-programme-at-tu-delft", men: "men-at-tu-delft"}[view];
}

export function programmeDataNote(data, language = "en") {
  const ranges = [];
  for (const year of data.programmeMissingYears) {
    const previous = ranges.at(-1);
    if (previous && year === previous[1] + 1) previous[1] = year;
    else ranges.push([year, year]);
  }
  if (!ranges.length) return "";
  const years = ranges.map(([start, end]) => start === end ? String(start) : `${start}–${end}`).join(", ");
  return translate(language, "Programme data are incomplete for {years}; these years are left blank.", {years});
}

export const GRAPH_SOURCES = "Delft Institute of Technology Yearbooks and reports, TU Delft Statistical Yearbooks and OSIRIS";

export function graphSources(language = "en") {
  return language === "nl" ? "Jaarboeken en verslagen van de Technische Hogeschool Delft, Statistische Jaarboeken van de TU Delft en OSIRIS" : GRAPH_SOURCES;
}

export const GRAPH_DESCRIPTION = [
  "This graph shows the absolute number of first-year students, the distribution of men and women, and the percentage of women. It was only possible for women to follow a full-time technical study at Delft from 1905.",
  "A striking aspect of the graph is that the percentage of women before WWII was higher than in the period that followed. The percentage only increases to more than 11% – the highest pre-war percentage – in 1983.",
  "Over the course of time, the definition of first-year students changed. Up until 1982, no statistical distinction was made between different types of first-year students. From 1982, the numbers given for first-year students include 'internal switchers' (students who changed to a different study) because these figures were best in line with earlier data. The introduction of the bachelor’s-master’s system in 2002 also had an impact on the calculation method which probably explains the ‘dip' the graph shows in that year."
];

export function graphDescription(view, language = "en") {
  if (language === "nl") {
    const introduction = {
      women: "Deze grafiek toont het aantal vrouwelijke eerstejaarsstudenten per opleiding en het percentage vrouwen onder alle eerstejaarsstudenten.",
      both: "Deze grafiek toont het absolute aantal eerstejaarsstudenten, de verdeling tussen mannen en vrouwen en het percentage vrouwen.",
      "all-programmes": "Deze grafiek toont het gezamenlijke aantal vrouwelijke en mannelijke eerstejaarsstudenten per opleiding en het percentage vrouwen onder alle eerstejaarsstudenten. Jaren met onvolledige opleidingsgegevens blijven leeg.",
      men: "Deze grafiek toont het aantal mannelijke eerstejaarsstudenten per opleiding. De lijn toont het percentage vrouwen onder alle eerstejaarsstudenten. Jaren met onvolledige opleidingsgegevens blijven leeg."
    };
    return [
      `${introduction[view]} Pas vanaf 1905 konden vrouwen in Delft een voltijdse technische studie volgen.`,
      "Opvallend is dat het percentage vrouwen vóór de Tweede Wereldoorlog hoger was dan in de periode daarna. Pas in 1983 stijgt het percentage tot boven de 11% – het hoogste vooroorlogse percentage.",
      "In de loop van de tijd veranderde de definitie van eerstejaarsstudenten. Tot 1982 werd in de statistieken geen onderscheid gemaakt tussen verschillende soorten eerstejaarsstudenten. Vanaf 1982 zijn ‘interne omzwaaiers’ (studenten die overstapten naar een andere studie) meegeteld, omdat deze cijfers het beste aansloten bij eerdere gegevens. Ook de invoering van het bachelor-masterstelsel in 2002 had invloed op de berekeningswijze. Dit verklaart waarschijnlijk de ‘dip’ die de grafiek in dat jaar laat zien."
    ];
  }
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
