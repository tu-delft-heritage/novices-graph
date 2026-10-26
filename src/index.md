---
title: First-year students at the Delft Institute of Technology and TU Delft in the period 1905-2018
---

```js
import {createExplorer} from "./components/explorer.js";
const data = await FileAttachment("./data/students.json").json();
const explorer = createExplorer(data, Inputs);
display(explorer.element);
invalidation.then(() => explorer.destroy());
```

<style>
/* Layout only; colours, typography, and inputs use Framework's default styles. */
.download-actions {display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0;}
.workspace {display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 2rem;}
.controls, .visualization {min-width: 0;}
.controls select {min-width: 0;}
.controls [hidden] {display: none;}
.control-group {margin: 1.5rem 0;}
.control-group:first-child {margin-top: 0;}
.control-group h3 {font-size: 1rem; margin-bottom: 0.5rem;}
.chart-scroll {overflow-x: auto;}
.chart-mount {min-width: 720px;}
.chart-mount > svg {display: block; width: 100%; height: auto;}
.dimensions {display: block; margin: 0.5rem 0 1rem;}
.status:empty, .selection-note:empty {display: none;}
.year-inspector {margin-top: 1.5rem;}
.stat {display: flex; flex-direction: column; gap: 0.5rem;}
.stat strong {font-size: 1.5rem;}
.custom-colours {max-height: 420px; overflow-y: auto;}
.source-notes {margin-top: 2rem;}
@media (max-width: 1000px) {
  .workspace {grid-template-columns: minmax(0, 1fr);}
  .visualization {grid-row: 1;}
  .control-sections {display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 0 1.5rem;}
}
</style>

<noscript>This interactive graph requires JavaScript. The original data are available in the <a href="https://github.com/tu-delft-heritage/novices-graph">project repository</a>.</noscript>
