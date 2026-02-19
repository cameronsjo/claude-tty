// docker-proxy.mjs — Sanitizing reverse proxy for Docker API
//
// Sits between claude-tty and the Docker socket proxy. Strips secrets
// (Config.Env) from container inspect responses and enforces a strict
// allowlist of read-only endpoints.
//
// Usage: DOCKER_UPSTREAM_HOST=dockersocket LISTEN_PORT=2375 node docker-proxy.mjs

import http from "node:http";

const UPSTREAM_HOST = process.env.DOCKER_UPSTREAM_HOST || "dockersocket";
const UPSTREAM_PORT = parseInt(process.env.DOCKER_UPSTREAM_PORT || "2375", 10);
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || "2375", 10);

// Allowed endpoints (after stripping /vN.NN version prefix)
const ALLOWED = [
  { method: "GET", pattern: /^\/_ping$/ },
  { method: "HEAD", pattern: /^\/_ping$/ },
  { method: "GET", pattern: /^\/info$/ },
  { method: "GET", pattern: /^\/version$/ },
  { method: "GET", pattern: /^\/containers\/json/ },
  { method: "GET", pattern: /^\/containers\/[a-zA-Z0-9_.-]+\/json$/ },
  { method: "GET", pattern: /^\/containers\/[a-zA-Z0-9_.-]+\/logs/ },
  { method: "GET", pattern: /^\/containers\/[a-zA-Z0-9_.-]+\/stats/ },
  { method: "GET", pattern: /^\/containers\/[a-zA-Z0-9_.-]+\/top$/ },
  { method: "GET", pattern: /^\/networks$/ },
  { method: "GET", pattern: /^\/networks\/[a-zA-Z0-9_.-]+$/ },
  { method: "GET", pattern: /^\/volumes$/ },
];

// Responses that need env var sanitization
const SANITIZE_PATTERN = /^\/containers\/[a-zA-Z0-9_.-]+\/json$/;

function stripVersion(path) {
  return path.replace(/^\/v[\d.]+/, "");
}

function isAllowed(method, rawPath) {
  const path = stripVersion(rawPath.split("?")[0]);
  return ALLOWED.some((r) => r.method === method && r.pattern.test(path));
}

function needsSanitization(rawPath) {
  return SANITIZE_PATTERN.test(stripVersion(rawPath.split("?")[0]));
}

function sanitize(body) {
  try {
    const data = JSON.parse(body);
    if (data.Config?.Env) {
      data.Config.Env = ["REDACTED_BY_DOCKER_SANITIZER=true"];
    }
    return JSON.stringify(data);
  } catch {
    return body;
  }
}

const server = http.createServer((req, res) => {
  if (!isAllowed(req.method, req.url)) {
    console.log(`BLOCKED ${req.method} ${req.url}`);
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Blocked by docker-sanitizer" }));
    return;
  }

  const proxyReq = http.request(
    {
      hostname: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      if (needsSanitization(req.url)) {
        // Buffer and sanitize inspect responses
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          const body = Buffer.concat(chunks).toString();
          const sanitized = sanitize(body);
          const headers = { ...proxyRes.headers };
          headers["content-length"] = Buffer.byteLength(sanitized);
          res.writeHead(proxyRes.statusCode, headers);
          res.end(sanitized);
        });
      } else {
        // Stream everything else directly (logs, stats, etc.)
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    },
  );

  proxyReq.on("error", (err) => {
    console.error(`Upstream error: ${err.message}`);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: `Upstream error: ${err.message}` }));
  });

  req.pipe(proxyReq);
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(
    `docker-sanitizer listening on :${LISTEN_PORT}, upstream: ${UPSTREAM_HOST}:${UPSTREAM_PORT}`,
  );
});
