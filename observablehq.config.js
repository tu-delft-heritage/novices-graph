import {GRAPH_TITLE} from "./src/components/caption.js";

export default {
  title: GRAPH_TITLE,
  root: "src",
  output: "dist",
  theme: "default",
  sidebar: false,
  toc: false,
  pager: false,
  footer: false,
  globalStylesheets: [],
  base: process.env.PAGES_BASE_PATH || "/"
};
