"use strict";

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

const endpointChecks = [
  {
    concept: "Frontend Deployment",
    name: "React frontend",
    method: "GET",
    url: urls.frontend,
    expected: "2xx/3xx"
  },
  {
    concept: "Kubernetes Health Probe",
    name: "Backend root health",
    method: "GET",
    url: `${urls.backend}/health`,
    expected: "2xx"
  },
  {
    concept: "API Health Probe",
    name: "Backend API health",
    method: "GET",
    url: `${urls.backend}/api/health`,
    expected: "2xx"
  },
  {
    concept: "Property Listing API",
    name: "Verified listings",
    method: "GET",
    url: `${urls.backend}/api/listings`,
    expected: "2xx"
  },
  {
    concept: "Property Search API",
    name: "Listings search",
    method: "GET",
    url: `${urls.backend}/api/listings/search?location=Electronic%20City`,
    expected: "2xx"
  },
  {
    concept: "Accommodation API",
    name: "Accommodation finder",
    method: "GET",
    url: `${urls.backend}/api/accommodation?location=12.9716,77.5946`,
    expected: "2xx"
  },
  {
    concept: "Accommodation API",
    name: "Accommodation search",
    method: "GET",
    url: `${urls.backend}/api/accommodation/search?location=Electronic%20City`,
    expected: "2xx"
  },
  {
    concept: "Nearby Services API",
    name: "Nearby essentials",
    method: "GET",
    url: `${urls.backend}/api/nearby?lat=12.9716&lng=77.5946&type=hospital&radius=1000`,
    expected: "2xx"
  },
  {
    concept: "Language Helper API",
    name: "Language helper",
    method: "GET",
    url: `${urls.backend}/api/language-helper?place=Electronic%20City`,
    expected: "2xx"
  },
  {
    concept: "Language Helper API",
    name: "Language translate",
    method: "POST",
    url: `${urls.backend}/api/language-helper/translate`,
    expected: "2xx",
    body: {
      place: "Electronic City",
      text: "Where is the bus stop?"
    }
  },
  {
    concept: "Application Metrics",
    name: "Backend Prometheus metrics",
    method: "GET",
    url: `${urls.backend}/metrics`,
    expected: "2xx"
  },
  {
    concept: "Monitoring UI",
    name: "Prometheus health",
    method: "GET",
    url: `${urls.prometheus}/-/healthy`,
    expected: "2xx"
  },
  {
    concept: "Monitoring UI",
    name: "Grafana health",
    method: "GET",
    url: `${urls.grafana}/api/health`,
    expected: "2xx"
  }
];

const prometheusQueries = [
  {
    name: "Backend health",
    query: "city_transition_up"
  },
  {
    name: "Request throughput",
    query: "sum(rate(city_transition_http_requests_total[1m]))"
  },
  {
    name: "Request count by route",
    query: "sum(city_transition_http_requests_total) by (route, status_code)"
  },
  {
    name: "p95 API latency by route",
    query: "histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route))"
  },
  {
    name: "HTTP error rate",
    query: "100 * sum(rate(city_transition_http_errors_total[5m])) / clamp_min(sum(rate(city_transition_http_requests_total[5m])), 1)"
  },
  {
    name: "Backend memory",
    query: "city_transition_process_resident_memory_bytes"
  },
  {
    name: "Backend CPU",
    query: "rate(city_transition_process_cpu_seconds_total[5m])"
  },
  {
    name: "Endpoint uptime probes",
    query: "probe_success{job=\"blackbox-http\"}"
  },
  {
    name: "Endpoint probe latency",
    query: "probe_duration_seconds{job=\"blackbox-http\"}"
  }
];

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

function requestText(check) {
  return new Promise((resolve) => {
    const started = Date.now();
    const target = new URL(check.url);
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

    req.on("timeout", () => {
      req.destroy(new Error("Request timeout"));
    });

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

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function collectEndpointEvidence() {
  const results = [];

  for (const check of endpointChecks) {
    const result = await requestText(check);
    const fileBase = safeName(`${result.concept}-${result.name}`);
    const responsePath = path.join(endpointDir, `${fileBase}.txt`);

    fs.writeFileSync(
      responsePath,
      [
        `Name: ${result.name}`,
        `Concept: ${result.concept}`,
        `Method: ${result.method}`,
        `URL: ${result.url}`,
        `Status: ${result.statusCode}`,
        `Duration: ${result.durationMs} ms`,
        `Content-Type: ${result.contentType}`,
        `Error: ${result.error || ""}`,
        "",
        result.bodySample
      ].join("\n")
    );

    results.push({
      concept: result.concept,
      name: result.name,
      method: result.method,
      url: result.url,
      expected: result.expected,
      statusCode: result.statusCode,
      ok: result.ok,
      durationMs: result.durationMs,
      contentType: result.contentType,
      error: result.error || "",
      responseArtifact: `endpoint-responses/${fileBase}.txt`
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
  fs.writeFileSync(path.join(reportsDir, "endpoint-evidence.html"), endpointHtml(evidence));

  return evidence;
}

async function collectPrometheusEvidence() {
  const results = [];

  for (const item of prometheusQueries) {
    const queryUrl = `${urls.prometheus}/api/v1/query?query=${encodeURIComponent(item.query)}`;
    const result = await requestText({
      concept: "Prometheus Query",
      name: item.name,
      method: "GET",
      url: queryUrl,
      expected: "success"
    });

    let valueCount = 0;
    let sample = "";

    try {
      const parsed = JSON.parse(result.bodySample);
      const data = parsed.data?.result || [];
      valueCount = data.length;
      sample = JSON.stringify(data.slice(0, 5), null, 2);
    } catch {
      sample = result.bodySample;
    }

    results.push({
      name: item.name,
      query: item.query,
      ok: result.ok,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      valueCount,
      sample,
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

function artifactStatus(name, files, details) {
  const present = files.some(exists);

  return {
    name,
    status: present ? "PASS" : "MISSING",
    details: details || (present ? "Report artifact saved" : "Report artifact not found"),
    files: files.filter(exists)
  };
}

function summarizeReports(endpointEvidence, prometheusEvidence) {
  const backendLint = readJson("backend-eslint-report.json");
  const frontendLint = readJson("frontend-eslint-report.json");
  const coverage = readJson("backend-coverage-test-report.json");
  const integration = readJson("backend-integration-test-report.json");
  const backendAudit = readJson("backend-npm-audit-report.json");
  const frontendAudit = readJson("frontend-npm-audit-report.json");
  const rootAudit = readJson("root-npm-audit-report.json");

  const backendLintErrors = Array.isArray(backendLint)
    ? backendLint.reduce((total, file) => total + Number(file.errorCount || 0), 0)
    : 0;
  const frontendLintErrors = Array.isArray(frontendLint)
    ? frontendLint.reduce((total, file) => total + Number(file.errorCount || 0), 0)
    : 0;

  const auditTotal = [backendAudit, frontendAudit, rootAudit]
    .filter(Boolean)
    .reduce((total, audit) => total + Number(audit.metadata?.vulnerabilities?.total || 0), 0);

  const concepts = [
    artifactStatus(
      "Source checkout and workspace setup",
      ["kubernetes-verification-report.txt", "deployment-report.txt"],
      "Jenkins completed checkout, build preparation, and later deployment evidence."
    ),
    {
      name: "Static code analysis",
      status: backendLintErrors + frontendLintErrors === 0 && backendLint && frontendLint ? "PASS" : "CHECK",
      details: `Backend ESLint errors: ${backendLintErrors}. Frontend ESLint errors: ${frontendLintErrors}.`,
      files: ["backend-eslint-report.json", "frontend-eslint-report.json"].filter(exists)
    },
    {
      name: "Automated testing and coverage",
      status: coverage?.success === true || integration?.success === true ? "PASS" : "CHECK",
      details: `Coverage tests: ${coverage?.numPassedTests ?? "n/a"} passed. Integration tests: ${integration?.numPassedTests ?? "n/a"} passed.`,
      files: ["backend-coverage-test-report.json", "backend-integration-test-report.json"].filter(exists)
    },
    artifactStatus(
      "SonarQube quality gate evidence",
      ["sonarqube-scanner-report.txt"],
      "Sonar scanner console output is saved for review."
    ),
    {
      name: "Dependency security scanning",
      status: backendAudit || frontendAudit || rootAudit ? "PASS" : "MISSING",
      details: `npm audit reports saved. Total reported vulnerabilities: ${auditTotal}.`,
      files: [
        "root-npm-audit-report.json",
        "backend-npm-audit-report.json",
        "frontend-npm-audit-report.json"
      ].filter(exists)
    },
    artifactStatus(
      "Docker image build evidence",
      ["docker-image-report.json"],
      "Docker image inspect report saved."
    ),
    artifactStatus(
      "Kubernetes and Ansible deployment",
      ["deployment-report.txt", "kubernetes-verification-report.txt"],
      "Deployment logs, pods, services, deployments, and daemonsets are saved."
    ),
    artifactStatus(
      "Postman/Newman API smoke tests",
      ["postman-api-smoke-report.json", "postman-api-smoke-report.xml"],
      "Deployed API smoke test output is saved."
    ),
    {
      name: "Endpoint-wise monitoring evidence",
      status: endpointEvidence.failed === 0 ? "PASS" : "CHECK",
      details: `${endpointEvidence.passed} endpoints passed, ${endpointEvidence.failed} endpoints need review.`,
      files: ["endpoint-evidence.json", "endpoint-evidence.html"]
    },
    {
      name: "Prometheus and Grafana observability",
      status: prometheusEvidence.queries.some((query) => query.ok) ? "PASS" : "CHECK",
      details: `${prometheusEvidence.queries.filter((query) => query.ok).length} Prometheus queries responded.`,
      files: [
        "monitoring-health-report.txt",
        "prometheus-metrics-snapshot.txt",
        "prometheus-query-evidence.json"
      ].filter(exists)
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    urls,
    concepts,
    endpointEvidence,
    prometheusEvidence
  };
}

function statusClass(status) {
  if (status === "PASS" || status === true) {
    return "pass";
  }

  if (status === "MISSING" || status === false) {
    return "fail";
  }

  return "check";
}

function badge(label, status) {
  return `<span class="badge ${statusClass(status)}">${escapeHtml(label)}</span>`;
}

function endpointHtml(evidence) {
  const rows = evidence.endpoints.map((item) => `
    <tr>
      <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
      <td>${escapeHtml(item.concept)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.method)}</td>
      <td class="mono">${escapeHtml(item.statusCode)}</td>
      <td class="mono">${escapeHtml(item.durationMs)} ms</td>
      <td><a href="${escapeHtml(item.responseArtifact)}">${escapeHtml(item.responseArtifact)}</a></td>
    </tr>`).join("");

  return htmlShell("Endpoint Monitoring Evidence", `
    <section class="hero">
      <h1>Endpoint Monitoring Evidence</h1>
      <p>Every public City Transition endpoint is called so Prometheus route metrics and Blackbox endpoint probes can be demonstrated.</p>
      <div class="cards">
        <div class="card"><span>Total endpoints</span><strong>${evidence.endpoints.length}</strong></div>
        <div class="card"><span>Passed</span><strong>${evidence.passed}</strong></div>
        <div class="card"><span>Review</span><strong>${evidence.failed}</strong></div>
      </div>
    </section>
    <section>
      <h2>Endpoint Results</h2>
      <table>
        <thead><tr><th>Status</th><th>DevSecOps Concept</th><th>Endpoint</th><th>Method</th><th>HTTP</th><th>Time</th><th>Saved Response</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `);
}

function dashboardHtml(summary) {
  const conceptCards = summary.concepts.map((concept) => `
    <article class="concept ${statusClass(concept.status)}">
      <div>${badge(concept.status, concept.status)}</div>
      <h3>${escapeHtml(concept.name)}</h3>
      <p>${escapeHtml(concept.details)}</p>
      <small>${concept.files.map((file) => `<a href="${escapeHtml(file)}">${escapeHtml(file)}</a>`).join(" ")}</small>
    </article>`).join("");

  const endpointRows = summary.endpointEvidence.endpoints.map((item) => `
    <tr>
      <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
      <td>${escapeHtml(item.concept)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="mono">${escapeHtml(item.statusCode)}</td>
      <td class="mono">${escapeHtml(item.durationMs)} ms</td>
      <td class="mono">${escapeHtml(item.url)}</td>
    </tr>`).join("");

  const queryRows = summary.prometheusEvidence.queries.map((item) => `
    <tr>
      <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="mono">${escapeHtml(item.valueCount)}</td>
      <td class="mono">${escapeHtml(item.query)}</td>
    </tr>`).join("");

  return htmlShell("City Transition DevSecOps Report", `
    <section class="hero">
      <p class="eyebrow">City Transition System</p>
      <h1>DevSecOps Evidence Dashboard</h1>
      <p>This report is generated by Jenkins and saved as a visual artifact. It connects CI/CD, security, deployment, API checks, and continuous monitoring in one place.</p>
      <div class="cards">
        <div class="card"><span>Generated</span><strong>${escapeHtml(summary.generatedAt.replace("T", " ").replace("Z", " UTC"))}</strong></div>
        <div class="card"><span>Endpoint checks</span><strong>${summary.endpointEvidence.passed}/${summary.endpointEvidence.endpoints.length}</strong></div>
        <div class="card"><span>Prometheus queries</span><strong>${summary.prometheusEvidence.queries.filter((query) => query.ok).length}/${summary.prometheusEvidence.queries.length}</strong></div>
        <div class="card"><span>Grafana</span><strong>${escapeHtml(summary.urls.grafana)}</strong></div>
      </div>
    </section>

    <section>
      <h2>DevSecOps Concept Status</h2>
      <div class="grid">${conceptCards}</div>
    </section>

    <section>
      <h2>Endpoint-Wise API Evidence</h2>
      <p>These calls create real route labels in <code>city_transition_http_requests_total</code> and latency histograms for Grafana.</p>
      <table>
        <thead><tr><th>Status</th><th>Concept</th><th>Endpoint</th><th>HTTP</th><th>Time</th><th>URL</th></tr></thead>
        <tbody>${endpointRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Prometheus Query Evidence</h2>
      <p>These are the same metric families used by the Grafana dashboard.</p>
      <table>
        <thead><tr><th>Status</th><th>Panel / Metric</th><th>Series</th><th>PromQL</th></tr></thead>
        <tbody>${queryRows}</tbody>
      </table>
    </section>

    <section>
      <h2>How To Demo</h2>
      <ol>
        <li>Open this HTML artifact from Jenkins.</li>
        <li>Open Prometheus targets at <code>${escapeHtml(summary.urls.prometheus)}/targets</code>.</li>
        <li>Open Grafana at <code>${escapeHtml(summary.urls.grafana)}</code>.</li>
        <li>Show route-wise API metrics, endpoint probes, CPU, memory, uptime, and error rate.</li>
      </ol>
    </section>
  `);
}

function htmlShell(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --ink: #18202f;
      --muted: #667085;
      --line: #d9e2ef;
      --pass: #0f8a4b;
      --check: #b45f06;
      --fail: #b42318;
      --accent: #1f6feb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }
    .hero, section {
      max-width: 1180px;
      margin: 24px auto;
      padding: 24px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(16, 24, 40, 0.07);
    }
    .hero {
      border-top: 5px solid var(--accent);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--accent);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: 32px; margin-bottom: 8px; }
    h2 { font-size: 22px; margin-bottom: 14px; }
    h3 { font-size: 16px; margin: 12px 0 8px; }
    p, small { color: var(--muted); }
    code, .mono {
      font-family: Consolas, Monaco, monospace;
      font-size: 13px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .card {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfdff;
    }
    .card span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 6px;
    }
    .card strong {
      display: block;
      overflow-wrap: anywhere;
      font-size: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .concept {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfdff;
    }
    .concept.pass { border-left: 5px solid var(--pass); }
    .concept.check { border-left: 5px solid var(--check); }
    .concept.fail { border-left: 5px solid var(--fail); }
    .badge {
      display: inline-block;
      min-width: 58px;
      padding: 4px 8px;
      border-radius: 999px;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }
    .badge.pass { background: var(--pass); }
    .badge.check { background: var(--check); }
    .badge.fail { background: var(--fail); }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      background: #eef4ff;
      color: #243b63;
      font-size: 13px;
    }
    tr:last-child td { border-bottom: 0; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function markdownSummary(summary) {
  const lines = [
    "# City Transition System DevSecOps Report",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "## Concept Status",
    ""
  ];

  for (const concept of summary.concepts) {
    lines.push(`- ${concept.status}: ${concept.name} - ${concept.details}`);
  }

  lines.push("", "## Endpoint Evidence", "");

  for (const item of summary.endpointEvidence.endpoints) {
    lines.push(`- ${item.ok ? "PASS" : "CHECK"}: ${item.method} ${item.url} -> ${item.statusCode} in ${item.durationMs} ms`);
  }

  lines.push("", "## Prometheus Evidence", "");

  for (const item of summary.prometheusEvidence.queries) {
    lines.push(`- ${item.ok ? "PASS" : "CHECK"}: ${item.name} (${item.valueCount} series)`);
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  ensureDirs();

  const endpointEvidence = await collectEndpointEvidence();
  const prometheusEvidence = await collectPrometheusEvidence();
  const summary = summarizeReports(endpointEvidence, prometheusEvidence);

  fs.writeFileSync(path.join(reportsDir, "devsecops-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(reportsDir, "devsecops-summary.md"), markdownSummary(summary));
  fs.writeFileSync(path.join(reportsDir, "devsecops-dashboard.html"), dashboardHtml(summary));

  console.log(`DevSecOps dashboard saved: ${path.join(reportsDir, "devsecops-dashboard.html")}`);
  console.log(`Endpoint evidence: ${endpointEvidence.passed} passed, ${endpointEvidence.failed} check`);

  if (collectOnly) {
    console.log("Collect-only mode completed.");
  }
}

main().catch((error) => {
  ensureDirs();
  fs.writeFileSync(path.join(reportsDir, "devsecops-dashboard-error.txt"), error.stack || error.message);
  console.error(error);
});
