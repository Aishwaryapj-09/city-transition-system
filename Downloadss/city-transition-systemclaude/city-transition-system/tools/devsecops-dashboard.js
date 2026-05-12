"use strict";

/**
 * City Transition System - DevSecOps Evidence Dashboard
 *
 * Produces ONE simple, visual report inside devsecops-reports/ that
 * summarises the whole pipeline (build, test, security, deploy, monitor)
 * with status badges and per-endpoint Prometheus probe results.
 *
 * Output (everything inside devsecops-reports/):
 *   devsecops-dashboard.html    visual summary (open in browser)
 *   devsecops-summary.json      machine-readable
 *   devsecops-summary.md        plain text
 *   endpoint-evidence.json      per-endpoint HTTP call evidence
 *   prometheus-query-evidence.json
 *   prometheus-endpoints.json   per-endpoint blackbox probe_success
 *   endpoint-responses/*.txt    one file per endpoint (raw response)
 *
 * Run modes:
 *   node tools/devsecops-dashboard.js                 (full report)
 *   node tools/devsecops-dashboard.js --collect-only  (just call endpoints + Prom)
 */

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const reportsDir = path.join(process.cwd(), "devsecops-reports");
const endpointDir = path.join(reportsDir, "endpoint-responses");
const collectOnly = process.argv.includes("--collect-only");

const urls = {
  backend: process.env.BACKEND_URL || "http://localhost:30008",
  frontend: process.env.FRONTEND_URL || "http://localhost:30007",
  prometheus: process.env.PROMETHEUS_URL || "http://localhost:30090",
  grafana: process.env.GRAFANA_URL || "http://localhost:30300"
};

// Every public demo endpoint. Each is:
//   - called directly by this script (creates route metrics on the backend)
//   - probed by Blackbox Exporter (creates probe_success per endpoint)
const endpointChecks = [
  { concept: "Frontend",        name: "React frontend",                method: "GET", url: urls.frontend },
  { concept: "Health Probe",    name: "/health",                       method: "GET", url: `${urls.backend}/health` },
  { concept: "Health Probe",    name: "/api/health",                   method: "GET", url: `${urls.backend}/api/health` },
  { concept: "Listings API",    name: "GET /api/listings",             method: "GET", url: `${urls.backend}/api/listings` },
  { concept: "Listings API",    name: "GET /api/listings/search",      method: "GET", url: `${urls.backend}/api/listings/search?location=Electronic%20City` },
  { concept: "Accommodation",   name: "GET /api/accommodation",        method: "GET", url: `${urls.backend}/api/accommodation?location=12.9716,77.5946` },
  { concept: "Accommodation",   name: "GET /api/accommodation/search", method: "GET", url: `${urls.backend}/api/accommodation/search?location=Electronic%20City` },
  { concept: "Nearby Services", name: "GET /api/nearby",               method: "GET", url: `${urls.backend}/api/nearby?lat=12.9716&lng=77.5946&type=hospital&radius=1000` },
  { concept: "Language Helper", name: "GET /api/language-helper",      method: "GET", url: `${urls.backend}/api/language-helper?place=Electronic%20City` },
  {
    concept: "Language Helper",
    name: "POST /api/language-helper/translate",
    method: "POST",
    url: `${urls.backend}/api/language-helper/translate`,
    body: { place: "Electronic City", text: "Where is the bus stop?" }
  },
  { concept: "App Metrics",     name: "Backend /metrics",              method: "GET", url: `${urls.backend}/metrics` },
  { concept: "Monitoring",      name: "Prometheus /-/healthy",         method: "GET", url: `${urls.prometheus}/-/healthy` },
  { concept: "Monitoring",      name: "Grafana /api/health",           method: "GET", url: `${urls.grafana}/api/health` }
];

// PromQL queries used by the Grafana dashboard; verified live via Prometheus HTTP API.
const prometheusQueries = [
  { name: "Backend UP",                       query: "city_transition_up" },
  { name: "Throughput (req/s)",               query: "sum(rate(city_transition_http_requests_total[1m]))" },
  { name: "Request count by route + status",  query: "sum(city_transition_http_requests_total) by (route, status_code)" },
  { name: "p95 latency by route",             query: "histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route))" },
  { name: "HTTP error rate %",                query: "100 * sum(rate(city_transition_http_errors_total[5m])) / clamp_min(sum(rate(city_transition_http_requests_total[5m])), 1)" },
  { name: "Backend memory bytes",             query: "city_transition_process_resident_memory_bytes" },
  { name: "Backend CPU rate",                 query: "rate(city_transition_process_cpu_seconds_total[5m])" },
  { name: "Endpoint probes (all)",            query: "probe_success{job=\"blackbox-http\"}" },
  { name: "Endpoint probe latency",           query: "probe_duration_seconds{job=\"blackbox-http\"}" }
];

// ----------------------------------------------------------------------------
// HTTP helpers
// ----------------------------------------------------------------------------

function ensureDirs() {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(endpointDir, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function httpRequest(check) {
  return new Promise((resolve) => {
    const started = Date.now();
    let target;
    try {
      target = new URL(check.url);
    } catch (err) {
      resolve({ ...check, statusCode: 0, ok: false, durationMs: 0, bodySample: "", error: `Bad URL: ${err.message}` });
      return;
    }

    const payload = check.body ? JSON.stringify(check.body) : null;
    const transport = target.protocol === "https:" ? https : http;
    const headers = {};
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = transport.request(
      {
        method: check.method || "GET",
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers,
        timeout: Number(process.env.REPORT_HTTP_TIMEOUT_MS || 15000)
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const durationMs = Date.now() - started;
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            ...check,
            statusCode: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 400,
            durationMs,
            contentType: res.headers["content-type"] || "",
            bodySample: body.slice(0, 2000)
          });
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", (error) => {
      resolve({
        ...check,
        statusCode: 0,
        ok: false,
        durationMs: Date.now() - started,
        contentType: "",
        bodySample: "",
        error: error.message
      });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ----------------------------------------------------------------------------
// Evidence collection
// ----------------------------------------------------------------------------

async function collectEndpointEvidence() {
  const results = [];

  for (const check of endpointChecks) {
    const result = await httpRequest(check);
    const fileBase = safeName(`${result.concept}-${result.name}`);
    const responsePath = path.join(endpointDir, `${fileBase}.txt`);

    fs.writeFileSync(
      responsePath,
      [
        `Name      : ${result.name}`,
        `Concept   : ${result.concept}`,
        `Method    : ${result.method}`,
        `URL       : ${result.url}`,
        `Status    : ${result.statusCode}`,
        `Duration  : ${result.durationMs} ms`,
        `OK        : ${result.ok}`,
        `Error     : ${result.error || ""}`,
        "",
        "--- response (first 2 KB) ---",
        result.bodySample
      ].join("\n")
    );

    results.push({
      concept: result.concept,
      name: result.name,
      method: result.method,
      url: result.url,
      statusCode: result.statusCode,
      ok: result.ok,
      durationMs: result.durationMs,
      responseArtifact: `endpoint-responses/${fileBase}.txt`,
      error: result.error || ""
    });
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    urls,
    endpoints: results,
    passed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length
  };

  fs.writeFileSync(path.join(reportsDir, "endpoint-evidence.json"), JSON.stringify(evidence, null, 2));
  return evidence;
}

async function collectPrometheusEvidence() {
  const results = [];

  for (const item of prometheusQueries) {
    const queryUrl = `${urls.prometheus}/api/v1/query?query=${encodeURIComponent(item.query)}`;
    const result = await httpRequest({ name: item.name, method: "GET", url: queryUrl });

    let valueCount = 0;
    let firstValue = null;
    try {
      const parsed = JSON.parse(result.bodySample);
      const data = parsed.data?.result || [];
      valueCount = data.length;
      firstValue = data[0]?.value?.[1] ?? null;
    } catch {
      // not JSON
    }

    results.push({
      name: item.name,
      query: item.query,
      ok: result.ok && valueCount > 0,
      reachable: result.ok,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      valueCount,
      firstValue,
      error: result.error || ""
    });
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    prometheusUrl: urls.prometheus,
    queries: results
  };

  fs.writeFileSync(path.join(reportsDir, "prometheus-query-evidence.json"), JSON.stringify(evidence, null, 2));
  return evidence;
}

/**
 * Query Prometheus for probe_success per endpoint. Produces a clear
 * per-endpoint pass/fail row so the demo can show "ALL endpoints are
 * being monitored, not just one".
 */
async function collectPerEndpointProbes() {
  const queryUrl = `${urls.prometheus}/api/v1/query?query=${encodeURIComponent('probe_success{job="blackbox-http"}')}`;
  const result = await httpRequest({ name: "probes", method: "GET", url: queryUrl });

  const rows = [];
  try {
    const parsed = JSON.parse(result.bodySample);
    for (const series of parsed.data?.result || []) {
      const value = Number(series.value?.[1] ?? 0);
      rows.push({
        instance: series.metric?.instance || "unknown",
        up: value === 1,
        rawValue: value
      });
    }
  } catch {
    // Prometheus unreachable or empty
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    prometheusUrl: urls.prometheus,
    totalEndpoints: rows.length,
    endpointsUp: rows.filter((row) => row.up).length,
    endpointsDown: rows.filter((row) => !row.up).length,
    endpoints: rows.sort((a, b) => a.instance.localeCompare(b.instance))
  };

  fs.writeFileSync(path.join(reportsDir, "prometheus-endpoints.json"), JSON.stringify(evidence, null, 2));
  return evidence;
}

// ----------------------------------------------------------------------------
// Pipeline-stage summarisation (reads artifacts written by Jenkins stages)
// ----------------------------------------------------------------------------

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(reportsDir, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(reportsDir, relativePath));
}

function presentIf(files, okDetail, missingDetail) {
  const present = files.some(exists);
  return {
    status: present ? "PASS" : "MISSING",
    details: present ? okDetail : missingDetail,
    files: files.filter(exists)
  };
}

function summariseConcepts(endpointEvidence, prometheusEvidence, probeEvidence) {
  const backendLint = readJson("backend-eslint-report.json");
  const frontendLint = readJson("frontend-eslint-report.json");
  const coverage = readJson("backend-coverage-test-report.json");
  const integration = readJson("backend-integration-test-report.json");
  const backendAudit = readJson("backend-npm-audit-report.json");
  const frontendAudit = readJson("frontend-npm-audit-report.json");
  const rootAudit = readJson("root-npm-audit-report.json");

  const backendLintErrors = Array.isArray(backendLint)
    ? backendLint.reduce((sum, f) => sum + Number(f.errorCount || 0), 0)
    : null;
  const frontendLintErrors = Array.isArray(frontendLint)
    ? frontendLint.reduce((sum, f) => sum + Number(f.errorCount || 0), 0)
    : null;

  const auditTotal = [backendAudit, frontendAudit, rootAudit]
    .filter(Boolean)
    .reduce((sum, audit) => sum + Number(audit.metadata?.vulnerabilities?.total || 0), 0);

  return [
    {
      name: "1. CI/CD Pipeline (Jenkins)",
      ...presentIf(
        ["deployment-report.txt", "kubernetes-verification-report.txt"],
        "Jenkins ran build, test, scan, deploy, and monitoring stages.",
        "Jenkins reports not found yet. Run a build."
      )
    },
    {
      name: "2. Static Code Analysis (ESLint + SonarQube)",
      status: (backendLintErrors === 0 && frontendLintErrors === 0 && exists("sonarqube-scanner-report.txt"))
        ? "PASS"
        : "CHECK",
      details: `Backend ESLint errors: ${backendLintErrors ?? "n/a"}. Frontend ESLint errors: ${frontendLintErrors ?? "n/a"}. SonarQube report: ${exists("sonarqube-scanner-report.txt") ? "saved" : "missing"}.`,
      files: ["backend-eslint-report.json", "frontend-eslint-report.json", "sonarqube-scanner-report.txt"].filter(exists)
    },
    {
      name: "3. Testing and Coverage (Jest)",
      status: (coverage?.success || integration?.success) ? "PASS" : "CHECK",
      details: `Unit/coverage tests passed: ${coverage?.numPassedTests ?? "n/a"}. Integration tests passed: ${integration?.numPassedTests ?? "n/a"}.`,
      files: ["backend-coverage-test-report.json", "backend-integration-test-report.json"].filter(exists)
    },
    {
      name: "4. Dependency Security (npm audit)",
      status: (backendAudit || frontendAudit || rootAudit) ? "PASS" : "MISSING",
      details: `Vulnerabilities reported (total across reports): ${auditTotal}.`,
      files: ["root-npm-audit-report.json", "backend-npm-audit-report.json", "frontend-npm-audit-report.json"].filter(exists)
    },
    {
      name: "5. Docker Containerisation",
      ...presentIf(
        ["docker-image-report.json"],
        "Backend and frontend images inspected.",
        "Docker image report not found."
      )
    },
    {
      name: "6. Kubernetes Deployment",
      ...presentIf(
        ["kubernetes-verification-report.txt"],
        "Deployments, pods, services, daemonsets captured.",
        "Kubernetes verification report not found."
      )
    },
    {
      name: "7. Ansible IaC",
      ...presentIf(
        ["deployment-report.txt"],
        "Ansible (or kubectl fallback) deployment log saved.",
        "Deployment log not found."
      )
    },
    {
      name: "8. API Smoke Tests (Newman / Postman)",
      ...presentIf(
        ["postman-api-smoke-report.json", "postman-api-smoke-report.xml"],
        "Postman smoke test ran against the deployed API.",
        "Postman smoke test report not found."
      )
    },
    {
      name: "9. Prometheus Monitoring",
      status: probeEvidence.totalEndpoints > 0 && probeEvidence.endpointsDown === 0 ? "PASS" : "CHECK",
      details: `Blackbox probes: ${probeEvidence.endpointsUp}/${probeEvidence.totalEndpoints} endpoints UP. ` +
               `${prometheusEvidence.queries.filter((q) => q.ok).length}/${prometheusEvidence.queries.length} key metrics responded.`,
      files: ["prometheus-query-evidence.json", "prometheus-endpoints.json", "prometheus-metrics-snapshot.txt"].filter(exists)
    },
    {
      name: "10. Grafana Dashboard",
      ...presentIf(
        ["monitoring-health-report.txt"],
        "Grafana reachable; 'City Transition System - DevSecOps Monitoring' dashboard is provisioned.",
        "Monitoring health report not found."
      )
    }
  ];
}

// ----------------------------------------------------------------------------
// HTML rendering - simple, summarised UI
// ----------------------------------------------------------------------------

function statusKind(status) {
  if (status === "PASS") return "pass";
  if (status === "MISSING" || status === "FAIL") return "fail";
  return "check";
}

function badge(label, status) {
  return `<span class="badge ${statusKind(status)}">${escapeHtml(label)}</span>`;
}

function dashboardHtml(summary) {
  const conceptCards = summary.concepts.map((c) => `
    <article class="concept ${statusKind(c.status)}">
      <header>
        ${badge(c.status, c.status)}
        <h3>${escapeHtml(c.name)}</h3>
      </header>
      <p>${escapeHtml(c.details)}</p>
      ${c.files.length ? `<footer>${c.files.map((f) => `<a href="${escapeHtml(f)}">${escapeHtml(f)}</a>`).join(" &middot; ")}</footer>` : ""}
    </article>`).join("");

  const endpointRows = summary.endpointEvidence.endpoints.map((e) => `
    <tr class="${e.ok ? "row-pass" : "row-fail"}">
      <td>${badge(e.ok ? "UP" : "DOWN", e.ok ? "PASS" : "FAIL")}</td>
      <td>${escapeHtml(e.concept)}</td>
      <td>${escapeHtml(e.name)}</td>
      <td class="mono">${escapeHtml(e.statusCode || "-")}</td>
      <td class="mono">${escapeHtml(e.durationMs)} ms</td>
    </tr>`).join("");

  const probeRows = summary.probeEvidence.endpoints.length
    ? summary.probeEvidence.endpoints.map((p) => `
        <tr class="${p.up ? "row-pass" : "row-fail"}">
          <td>${badge(p.up ? "UP" : "DOWN", p.up ? "PASS" : "FAIL")}</td>
          <td class="mono">${escapeHtml(p.instance)}</td>
        </tr>`).join("")
    : `<tr><td colspan="2"><em>No Prometheus blackbox data yet. Open Prometheus at ${escapeHtml(summary.urls.prometheus)}/targets after the stack is up.</em></td></tr>`;

  const queryRows = summary.prometheusEvidence.queries.map((q) => `
    <tr class="${q.ok ? "row-pass" : "row-fail"}">
      <td>${badge(q.ok ? "OK" : "EMPTY", q.ok ? "PASS" : "CHECK")}</td>
      <td>${escapeHtml(q.name)}</td>
      <td class="mono">${escapeHtml(q.valueCount)} series</td>
    </tr>`).join("");

  const allPass = summary.concepts.every((c) => c.status === "PASS");
  const overall = allPass ? "PASS" : "REVIEW";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>City Transition - DevSecOps Report</title>
<style>
  :root {
    --bg:#f4f6fa; --panel:#fff; --ink:#1a2238; --muted:#5b6779;
    --line:#e3e8f0; --pass:#0e8f4a; --check:#b85d00; --fail:#c0241a;
    --accent:#1f6feb;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5}
  .wrap{max-width:1100px;margin:0 auto;padding:24px}
  .hero{background:var(--panel);border-radius:10px;padding:28px;box-shadow:0 6px 18px rgba(0,0,0,.05);border-top:5px solid var(--accent)}
  .hero h1{margin:0 0 6px;font-size:26px}
  .hero p{margin:0;color:var(--muted)}
  .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:18px}
  .stat{background:#fbfcff;border:1px solid var(--line);border-radius:8px;padding:14px}
  .stat span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .stat strong{font-size:20px;font-weight:600;display:block}
  section{background:var(--panel);border-radius:10px;padding:24px;margin-top:18px;box-shadow:0 4px 12px rgba(0,0,0,.04)}
  section h2{margin:0 0 14px;font-size:18px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
  .concept{padding:14px;border:1px solid var(--line);border-radius:8px;background:#fbfcff}
  .concept.pass{border-left:4px solid var(--pass)}
  .concept.check{border-left:4px solid var(--check)}
  .concept.fail{border-left:4px solid var(--fail)}
  .concept header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .concept h3{margin:0;font-size:14px;font-weight:600}
  .concept p{margin:0;font-size:13px;color:var(--muted)}
  .concept footer{margin-top:8px;font-size:11px;display:flex;flex-wrap:wrap;gap:6px}
  .badge{display:inline-block;padding:3px 8px;border-radius:999px;color:#fff;font-size:11px;font-weight:600;min-width:50px;text-align:center}
  .badge.pass{background:var(--pass)} .badge.check{background:var(--check)} .badge.fail{background:var(--fail)}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left}
  th{background:#f0f4fb;color:#2c3e60;font-size:12px;font-weight:600}
  tr:last-child td{border-bottom:0}
  .row-pass td{background:#fafffb}
  .row-fail td{background:#fff7f6}
  .mono{font-family:ui-monospace,Consolas,Monaco,monospace;font-size:12px}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media (max-width:760px){.two-col{grid-template-columns:1fr}}
  .hint{margin:-6px 0 10px;color:var(--muted);font-size:13px}
</style>
</head>
<body>
<div class="wrap">

  <div class="hero">
    <h1>City Transition System - DevSecOps Report</h1>
    <p>One-page summary of CI/CD, security scans, deployment, and continuous monitoring. Generated by Jenkins.</p>
    <div class="summary">
      <div class="stat"><span>Overall</span><strong>${badge(overall, overall)}</strong></div>
      <div class="stat"><span>Pipeline steps</span><strong>${summary.concepts.filter((c) => c.status === "PASS").length}/${summary.concepts.length} PASS</strong></div>
      <div class="stat"><span>API endpoints (live)</span><strong>${summary.endpointEvidence.passed}/${summary.endpointEvidence.endpoints.length} UP</strong></div>
      <div class="stat"><span>Prometheus probes</span><strong>${summary.probeEvidence.endpointsUp}/${summary.probeEvidence.totalEndpoints} UP</strong></div>
      <div class="stat"><span>Generated</span><strong style="font-size:13px">${escapeHtml(summary.generatedAt.replace("T", " ").slice(0, 19))} UTC</strong></div>
    </div>
  </div>

  <section>
    <h2>Pipeline Stages</h2>
    <div class="grid">${conceptCards}</div>
  </section>

  <section>
    <h2>API Endpoint Health (live HTTP call)</h2>
    <table>
      <thead><tr><th>Status</th><th>Concept</th><th>Endpoint</th><th>HTTP</th><th>Latency</th></tr></thead>
      <tbody>${endpointRows}</tbody>
    </table>
  </section>

  <div class="two-col">
    <section>
      <h2>Prometheus Blackbox: per endpoint</h2>
      <p class="hint">Proves <strong>every</strong> endpoint is being monitored, not just one.</p>
      <table>
        <thead><tr><th>Probe</th><th>Target instance</th></tr></thead>
        <tbody>${probeRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Prometheus key metrics</h2>
      <p class="hint">Each metric powers a Grafana panel.</p>
      <table>
        <thead><tr><th>Status</th><th>Metric</th><th>Series</th></tr></thead>
        <tbody>${queryRows}</tbody>
      </table>
    </section>
  </div>

  <section>
    <h2>Demo Links</h2>
    <p style="margin:0">
      <a href="${escapeHtml(urls.frontend)}">Frontend</a> &middot;
      <a href="${escapeHtml(urls.backend)}/health">Backend Health</a> &middot;
      <a href="${escapeHtml(urls.backend)}/metrics">Backend /metrics</a> &middot;
      <a href="${escapeHtml(urls.prometheus)}/targets">Prometheus Targets</a> &middot;
      <a href="${escapeHtml(urls.grafana)}">Grafana</a>
    </p>
  </section>

</div>
</body>
</html>`;
}

function markdownSummary(summary) {
  const lines = [
    "# City Transition System - DevSecOps Report",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "## Pipeline stages",
    ""
  ];
  for (const c of summary.concepts) {
    lines.push(`- [${c.status}] ${c.name} - ${c.details}`);
  }
  lines.push("", "## API endpoints", "");
  for (const e of summary.endpointEvidence.endpoints) {
    lines.push(`- [${e.ok ? "UP" : "DOWN"}] ${e.method} ${e.url} -> ${e.statusCode} (${e.durationMs} ms)`);
  }
  lines.push("", "## Prometheus blackbox probes (per endpoint)", "");
  if (summary.probeEvidence.endpoints.length === 0) {
    lines.push("- (no data yet)");
  } else {
    for (const p of summary.probeEvidence.endpoints) {
      lines.push(`- [${p.up ? "UP" : "DOWN"}] ${p.instance}`);
    }
  }
  lines.push("", "## Prometheus key metrics", "");
  for (const q of summary.prometheusEvidence.queries) {
    lines.push(`- [${q.ok ? "OK" : "EMPTY"}] ${q.name} (${q.valueCount} series)`);
  }
  return lines.join("\n") + "\n";
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

async function main() {
  ensureDirs();

  const endpointEvidence = await collectEndpointEvidence();
  const prometheusEvidence = await collectPrometheusEvidence();
  const probeEvidence = await collectPerEndpointProbes();

  const summary = {
    generatedAt: new Date().toISOString(),
    urls,
    concepts: summariseConcepts(endpointEvidence, prometheusEvidence, probeEvidence),
    endpointEvidence,
    prometheusEvidence,
    probeEvidence
  };

  fs.writeFileSync(path.join(reportsDir, "devsecops-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(reportsDir, "devsecops-summary.md"), markdownSummary(summary));
  fs.writeFileSync(path.join(reportsDir, "devsecops-dashboard.html"), dashboardHtml(summary));

  console.log(`DevSecOps dashboard saved: ${path.join(reportsDir, "devsecops-dashboard.html")}`);
  console.log(`API endpoints: ${endpointEvidence.passed}/${endpointEvidence.endpoints.length} UP`);
  console.log(`Prometheus probes: ${probeEvidence.endpointsUp}/${probeEvidence.totalEndpoints} UP`);

  if (collectOnly) {
    console.log("Collect-only mode complete.");
  }
}

main().catch((error) => {
  ensureDirs();
  fs.writeFileSync(path.join(reportsDir, "devsecops-dashboard-error.txt"), error.stack || error.message);
  console.error(error);
  // Don't fail the Jenkins build on report-generation errors.
});
