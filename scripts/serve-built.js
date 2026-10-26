// Serve the production build at a GitHub Pages repository subpath for browser checks.
import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {resolve, extname, sep} from "node:path";

const root = resolve("dist");
const base = "/novices-graph/";
const types = {".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2"};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!pathname.startsWith(base)) {response.writeHead(404).end(); return;}
    let file = resolve(root, pathname.slice(base.length) || "index.html");
    if (!file.startsWith(root + sep)) {response.writeHead(403).end(); return;}
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const content = await readFile(file);
    response.writeHead(200, {"Content-Type": types[extname(file)] ?? "application/octet-stream"});
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log(`Built site: http://127.0.0.1:4173${base}`));
