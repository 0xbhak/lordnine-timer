import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const dataFile = join(dataDir, "timers.json");

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".png", "image/png"]
]);

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const GLOBAL_WRITE_PIN = "4444";

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  const sendJson = (body, status = 200, headers = {}) => {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    });
    res.end(JSON.stringify(body));
  };

  if (url.pathname === "/api/timers") {
    if (req.method === "GET") {
      const state = await readTimerState();
      return sendJson(state);
    }
    
    if (req.method === "PUT") {
      let bodyStr = "";
      req.on("data", chunk => {
        bodyStr += chunk;
      });
      req.on("end", async () => {
        let body;
        try {
          body = JSON.parse(bodyStr);
        } catch {
          return sendJson({ error: "Invalid JSON body" }, 400);
        }

        if (body?.pin !== GLOBAL_WRITE_PIN) return sendJson({ error: "Invalid PIN" }, 403);

        const timers = Array.isArray(body?.timers) ? body.timers.map(normalizeTimer).filter(Boolean) : null;
        if (!timers) return sendJson({ error: "Expected timers array" }, 400);

        const state = { timers, updatedAt: new Date().toISOString() };
        try {
          await mkdir(dataDir, { recursive: true });
          await writeFile(dataFile, JSON.stringify(state, null, 2));
          return sendJson(state);
        } catch (err) {
          return sendJson({ error: "Failed to save state: " + err.message }, 500);
        }
      });
      return;
    }
    
    return sendJson({ error: "Method not allowed" }, 405, { allow: "GET, PUT" });
  }

  // Serve static files
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(__dirname, path);

  // Security check: ensure filePath is inside __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }

    const ext = extname(path);
    const contentType = types.get(ext) || "application/octet-stream";
    const fileContent = await readFile(filePath);
    res.writeHead(200, { "content-type": contentType });
    res.end(fileContent);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Lordnine Boss Timer running at http://${HOST}:${PORT}`);
});

async function readTimerState() {
  try {
    const data = await readFile(dataFile, "utf-8");
    const state = JSON.parse(data);
    return {
      timers: Array.isArray(state.timers) ? state.timers.map(normalizeTimer).filter(Boolean) : [],
      updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : null
    };
  } catch {
    return { timers: [], updatedAt: null };
  }
}

function normalizeTimer(timer) {
  if (!timer || typeof timer !== "object") return null;
  if (typeof timer.id !== "string" || typeof timer.name !== "string" || typeof timer.world !== "string" || !Number.isFinite(timer.targetTime)) return null;

  return {
    id: timer.id,
    name: timer.name,
    world: timer.world,
    location: typeof timer.location === "string" ? timer.location : null,
    targetTime: timer.targetTime
  };
}
