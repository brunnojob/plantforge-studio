import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const args = process.argv.slice(2),
  root = process.cwd(),
  port = Number(args[args.indexOf("--port") + 1]) || 4173;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const path = resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!path.startsWith(root + sep) && path !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      const target =
        path === root || req.url.endsWith("/")
          ? resolve(path, "index.html")
          : path;
      const bytes = await readFile(target);
      res.writeHead(200, {
        "content-type": mime[extname(target)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`PlantForge ready on port ${port}`),
  );
