import {readFile, mkdir, writeFile} from "node:fs/promises";
import {csvParse} from "d3";
import {normalizeMasters} from "../src/components/data.js";

const read = async (name) => readFile(new URL(`../data/${name}`, import.meta.url), "utf8");
const [historical, middle, recent, mapping, colors] = await Promise.all([
  ...["master-1905-2001.csv", "master-2002-2011.csv", "master-2012-2026.csv", "entity-mapping.csv"]
    .map(async (name) => csvParse(await read(`processed/${name}`))),
  read("colors.json").then(JSON.parse)
]);
const data = normalizeMasters([...historical, ...middle, ...recent], mapping, colors);
const target = new URL("../src/data/students.json", import.meta.url);
await mkdir(new URL("../src/data/", import.meta.url), {recursive: true});
await writeFile(target, JSON.stringify(data));
console.log(`Prepared ${data.years.length} years (${data.years[0]}–${data.years.at(-1)}) and ${data.programmes.length} source categories from the masters.`);
