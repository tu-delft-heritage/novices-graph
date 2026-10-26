import {readFile, mkdir, writeFile} from "node:fs/promises";
import {normalizeData} from "../src/components/data.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [women, men, colors] = await Promise.all([
  read("female_at_tu.json"), read("male_at_tu.json"), read("colors.json")
]);
const data = normalizeData(women, men, colors);
const target = new URL("../src/data/students.json", import.meta.url);
await mkdir(new URL("../src/data/", import.meta.url), {recursive: true});
await writeFile(target, JSON.stringify(data));
console.log(`Prepared ${data.years.length} years and ${data.programmes.length} programmes from the original JSON files.`);
