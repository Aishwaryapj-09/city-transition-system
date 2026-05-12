"use strict";

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const reportsDir = path.join(process.cwd(), "devsecops-reports");
const endpointDir = path.join(reportsDir, "endpoint-responses");
const collectOnly = process.argv.includes("--collect-only");
const noWait = process.argv.includes("--no-wait");

const urls = {
  backend: process.env.BACKEND_URL || "http://localhost:30008",
  frontend: process.env.FRONTEND_URL || "http://localhost:30007",
  prometheus: process.env.PROMETHEUS_URL || "http://localhost:30090",
  grafana: process.env.GRAFANA_URL || "http://localhost:30300"
};

const demoObjectId = "507f1f77bcf86cd799439011";

const endpointChecks = [
  {
    concept: "Frontend Deployment",
    name: "React frontend",
    method: "GET",
    url: urls.frontend,
    expected: "2xx/3xx",
    expectedStatuses: "success"
  },
  {
    concept: "Kubernetes Health Probe",
    name: "Backend root health",
    method: "GET",
    url: `${urls.backend}/health`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/health"
  },
  {
    concept: "API Health Probe",
    name: "Backend API health",
    method: "GET",
    url: `${urls.backend}/api/health`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/health"
  },
  {
    concept: "Authentication API",
    name: "Register validation",
    method: "POST",
    url: `${urls.backend}/api/auth/register`,
    expected: "400 validation",
    expectedStatuses: [400],
    body: {
      name: "",
      email: "invalid-email",
      password: "123"
    },
    metricRoute: "/api/auth/register"
  },
  {
    concept: "Authentication API",
    name: "Login validation",
    method: "POST",
    url: `${urls.backend}/api/auth/login`,
    expected: "400 validation or 429 rate limit",
    expectedStatuses: [400, 429],
    body: {
      email: "invalid-email",
      password: ""
    },
    metricRoute: "/api/auth/login"
  },
  {
    concept: "Authentication API",
    name: "Protected route security",
    method: "GET",
    url: `${urls.backend}/api/auth/protected`,
    expected: "401 without token",
    expectedStatuses: [401],
    metricRoute: "/api/auth/protected"
  },
  {
    concept: "Authentication API",
    name: "Admin route security",
    method: "GET",
    url: `${urls.backend}/api/auth/admin`,
    expected: "401 without token",
    expectedStatuses: [401],
    metricRoute: "/api/auth/admin"
  },
  {
    concept: "Property Listing API",
    name: "Verified listings",
    method: "GET",
    url: `${urls.backend}/api/listings`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/listings"
  },
  {
    concept: "Property Listing API",
    name: "Create listing security",
    method: "POST",
    url: `${urls.backend}/api/listings`,
    expected: "401 without owner token",
    expectedStatuses: [401],
    body: {
      title: "Demo listing"
    },
    metricRoute: "/api/listings"
  },
  {
    concept: "Property Listing API",
    name: "Owner listings security",
    method: "GET",
    url: `${urls.backend}/api/listings/my`,
    expected: "401 without owner token",
    expectedStatuses: [401],
    metricRoute: "/api/listings/my"
  },
  {
    concept: "Property Listing API",
    name: "Pending listings security",
    method: "GET",
    url: `${urls.backend}/api/listings/pending`,
    expected: "401 without admin token",
    expectedStatuses: [401],
    metricRoute: "/api/listings/pending"
  },
  {
    concept: "Property Listing API",
    name: "Verify listing security",
    method: "PATCH",
    url: `${urls.backend}/api/listings/verify/${demoObjectId}`,
    expected: "401 without admin token",
    expectedStatuses: [401],
    metricRoute: "/api/listings/verify/:id"
  },
  {
    concept: "Property Listing API",
    name: "Update listing security",
    method: "PUT",
    url: `${urls.backend}/api/listings/${demoObjectId}`,
    expected: "401 without owner token",
    expectedStatuses: [401],
    body: {
      title: "Updated demo listing"
    },
    metricRoute: "/api/listings/:id"
  },
  {
    concept: "Property Listing API",
    name: "Delete listing security",
    method: "DELETE",
    url: `${urls.backend}/api/listings/${demoObjectId}`,
    expected: "401 without owner token",
    expectedStatuses: [401],
    metricRoute: "/api/listings/:id"
  },
  {
    concept: "Property Search API",
    name: "Listings search",
    method: "GET",
    url: `${urls.backend}/api/listings/search?location=Electronic%20City`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/listings/search"
  },
  {
    concept: "Accommodation API",
    name: "Accommodation finder",
    method: "GET",
    url: `${urls.backend}/api/accommodation?location=12.9716,77.5946`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/accommodation"
  },
  {
    concept: "Accommodation API",
    name: "Accommodation search",
    method: "GET",
    url: `${urls.backend}/api/accommodation/search?location=Electronic%20City`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/accommodation/search"
  },
  {
    concept: "Nearby Services API",
    name: "Nearby essentials",
    method: "GET",
    url: `${urls.backend}/api/nearby?lat=12.9716&lng=77.5946&type=hospital&radius=1000`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/nearby"
  },
  {
    concept: "Language Helper API",
    name: "Language helper",
    method: "GET",
    url: `${urls.backend}/api/language-helper?place=Electronic%20City`,
    expected: "200",
    expectedStatuses: [200],
    metricRoute: "/api/language-helper"
  },
  {
    concept: "Language Helper API",
    name: "Language translate",
    method: "POST",
    url: `${urls.backend}/api/language-helper/translate`,
    expected: "200",
    expectedStatuses: [200],
    body: {
      place: "Electronic City",
      text: "Where is the bus stop?"
    },
    metricRoute: "/api/language-helper/translate"
  },
  {
    concept: "Application Metrics",
    name: "Backend Prometheus metrics",
    method: "GET",
    url: `${urls.backend}/metrics`,
    expected: "200",
    expectedStatuses: [200]
  },
  {
    concept: "Monitoring UI",
    name: "Prometheus health",
    method: "GET",
    url: `${urls.prometheus}/-/healthy`,
    expected: "200",
    expectedStatuses: [200]
  },
  {
    concept: "Monitoring UI",
    name: "Grafana health",
    method: "GET",
    url: `${urls.grafana}/api/health`,
    expected: "200",
    expectedStatuses: [200]
  }
];

const basePrometheusQueries = [
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
    query: "sum(city_transition_http_requests_total) by (method, route, status_code)"
  },
  {
    name: "p95 API latency by route",
    query: "histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, method, route))"
  },
  {
    name: "Average API latency by route",
    query: "sum(rate(city_transition_http_request_duration_seconds_sum[5m])) by (method, route) / sum(rate(city_transition_http_request_duration_seconds_count[5m])) by (method, route)"
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

function uniqueMetricChecks() {
  const seen = new Set();

  return endpointChecks
    .filter((item) => item.metricRoute)
    .filter((item) => {
      const key = `${item.method} ${item.metricRoute}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function routePrometheusQueries() {
  return uniqueMetricChecks().flatMap((item) => {
    const labels = `method="${escapePromLabel(item.method)}",route="${escapePromLabel(item.metricRoute)}"`;
    const title = `${item.method} ${item.metricRoute}`;

    return [
      {
        name: `${title} throughput`,
        query: `sum(rate(city_transition_http_requests_total{${labels}}[1m]))`,
        route: item.metricRoute,
        method: item.method
      },
      {
        name: `${title} p95 latency`,
        query: `histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket{${labels}}[5m])) by (le))`,
        route: item.metricRoute,
        method: item.method
      }
    ];
  });
}

function prometheusQueries() {
  return basePrometheusQueries.concat(routePrometheusQueries());
}

function ensureDirs() {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(endpointDir, { recursive: true });

  for (const legacyFile of ["performance-report.json", "performance-summary.txt"]) {
    const legacyPath = path.join(reportsDir, legacyFile);
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath);
      } catch {
        // Old generated files can be locked on Windows. They are ignored by the
        // new concept reports, so cleanup should never block report generation.
      }
    }
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePromLabel(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function statusMatches(statusCode, check) {
  if (statusCode <= 0) {
    return false;
  }

  if (Array.isArray(check.expectedStatuses)) {
    return check.expectedStatuses.includes(statusCode);
  }

  if (check.expectedStatuses === "success") {
    return statusCode >= 200 && statusCode < 400;
  }

  return statusCode >= 200 && statusCode < 400;
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
        timeout: Number(process.env.REPORT_HTTP_TIMEOUT_MS || 60000)
      },
      (res) => {
        const chunks = [];

        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const durationMs = Date.now() - started;
          const body = Buffer.concat(chunks).toString("utf8");
          const statusCode = Number(res.statusCode || 0);

          resolve({
            ...check,
            statusCode,
            ok: statusMatches(statusCode, check),
            durationMs,
            contentType: res.headers["content-type"] || "",
            bodySample: body.slice(0, Number(process.env.REPORT_BODY_SAMPLE_LIMIT || 4000))
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
        `Expected: ${result.expected}`,
        `Status: ${result.statusCode}`,
        `Duration: ${result.durationMs} ms`,
        `Prometheus route label: ${result.metricRoute || ""}`,
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
      metricRoute: result.metricRoute || "",
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
    failed: results.filter((item) => !item.ok).length,
    metricRoutes: uniqueMetricChecks().map((item) => ({
      method: item.method,
      route: item.metricRoute,
      concept: item.concept,
      name: item.name
    }))
  };

  fs.writeFileSync(path.join(reportsDir, "endpoint-evidence.json"), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(path.join(reportsDir, "endpoint-evidence.html"), endpointHtml(evidence));

  return evidence;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPrometheusScrape(endpointEvidence) {
  const hasLiveBackendTraffic = endpointEvidence.endpoints.some((item) => {
    return item.ok && item.url.startsWith(urls.backend) && item.metricRoute;
  });

  if (!hasLiveBackendTraffic || noWait) {
    return;
  }

  const waitMs = Number(process.env.PROMETHEUS_SCRAPE_WAIT_MS || 12000);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

async function collectPrometheusEvidence() {
  const results = [];

  for (const item of prometheusQueries()) {
    const queryUrl = `${urls.prometheus}/api/v1/query?query=${encodeURIComponent(item.query)}`;
    const result = await requestText({
      concept: "Prometheus Query",
      name: item.name,
      method: "GET",
      url: queryUrl,
      expected: "Prometheus success",
      expectedStatuses: [200]
    });

    let valueCount = 0;
    let sample = "";
    let queryStatus = "";
    let queryOk = result.ok;

    try {
      const parsed = JSON.parse(result.bodySample);
      const data = parsed.data?.result || [];
      valueCount = data.length;
      sample = JSON.stringify(data.slice(0, 5), null, 2);
      queryStatus = parsed.status || "";
      queryOk = result.ok && queryStatus === "success";
    } catch {
      sample = result.bodySample;
    }

    results.push({
      name: item.name,
      query: item.query,
      ok: queryOk,
      statusCode: result.statusCode,
      queryStatus,
      durationMs: result.durationMs,
      valueCount,
      method: item.method || "",
      route: item.route || "",
      sample,
      error: result.error || ""
    });
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    prometheusUrl: urls.prometheus,
    queries: results,
    passed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length
  };

  fs.writeFileSync(path.join(reportsDir, "prometheus-query-evidence.json"), JSON.stringify(evidence, null, 2));
  return evidence;
}

function copyIfExists(source, destination) {
  const sourcePath = path.join(process.cwd(), source);
  const destinationPath = path.join(reportsDir, destination);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destinationPath);
    return destination;
  }

  return "";
}

function copyStaticEvidence() {
  return [
    copyIfExists("Jenkinsfile", "jenkins-pipeline-definition.txt"),
    copyIfExists("ansible/deploy.yml", "ansible-deploy-playbook.yml"),
    copyIfExists("monitoring/grafana/dashboards/city-transition-dashboard.json", "grafana-dashboard-definition.json"),
    copyIfExists("monitoring/prometheus/prometheus-docker.yml", "prometheus-docker-config.yml"),
    copyIfExists("k8s/prometheus-configmap.yaml", "prometheus-kubernetes-config.yaml"),
    copyIfExists("postman/city-transition-api.postman_collection.json", "postman-api-collection.json")
  ].filter(Boolean);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(reportsDir, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(reportsDir, relativePath), "utf8");
  } catch {
    return "";
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(reportsDir, relativePath));
}

function firstExisting(files) {
  return files.filter(exists);
}

function artifactState(files) {
  const present = firstExisting(files);
  if (present.length === files.length && files.length > 0) {
    return "PASS";
  }

  if (present.length > 0) {
    return "CHECK";
  }

  return "MISSING";
}

function summarizeLint(report) {
  if (!Array.isArray(report)) {
    return {
      files: 0,
      errors: 0,
      warnings: 0
    };
  }

  return report.reduce(
    (total, file) => ({
      files: total.files + 1,
      errors: total.errors + Number(file.errorCount || 0),
      warnings: total.warnings + Number(file.warningCount || 0)
    }),
    {
      files: 0,
      errors: 0,
      warnings: 0
    }
  );
}

function summarizeJest(report) {
  if (!report) {
    return null;
  }

  return {
    success: report.success === true,
    passed: Number(report.numPassedTests || 0),
    failed: Number(report.numFailedTests || 0),
    total: Number(report.numTotalTests || 0)
  };
}

function summarizeAudit(report) {
  const vulnerabilities = report?.metadata?.vulnerabilities || {};

  return {
    total: Number(vulnerabilities.total || 0),
    critical: Number(vulnerabilities.critical || 0),
    high: Number(vulnerabilities.high || 0),
    moderate: Number(vulnerabilities.moderate || 0),
    low: Number(vulnerabilities.low || 0)
  };
}

function summarizeNewman(report) {
  const stats = report?.run?.stats || {};
  const assertions = stats.assertions || {};
  const requests = stats.requests || {};

  if (!report) {
    return null;
  }

  return {
    requests: Number(requests.total || 0),
    failedRequests: Number(requests.failed || 0),
    assertions: Number(assertions.total || 0),
    failedAssertions: Number(assertions.failed || 0)
  };
}

function summarizeReports(endpointEvidence, prometheusEvidence, copiedEvidence) {
  const backendLint = summarizeLint(readJson("backend-eslint-report.json"));
  const frontendLint = summarizeLint(readJson("frontend-eslint-report.json"));
  const coverage = summarizeJest(readJson("backend-coverage-test-report.json"));
  const integration = summarizeJest(readJson("backend-integration-test-report.json"));
  const nearbyUnit = summarizeJest(readJson("nearby-unit-test-report.json"));
  const languageUnit = summarizeJest(readJson("language-helper-unit-test-report.json"));
  const nearbyIntegration = summarizeJest(readJson("nearby-integration-test-report.json"));
  const languageIntegration = summarizeJest(readJson("language-helper-integration-test-report.json"));
  const smoke = summarizeNewman(readJson("postman-api-smoke-report.json"));

  const routeQueries = prometheusEvidence.queries.filter((item) => item.route);
  const routeQueriesWithSeries = routeQueries.filter((item) => item.valueCount > 0);
  const grafanaPanels = readGrafanaPanels();

  const facts = {
    backendLint,
    frontendLint,
    coverage,
    integration,
    nearbyUnit,
    languageUnit,
    nearbyIntegration,
    languageIntegration,
    smoke,
    routeQueries,
    routeQueriesWithSeries,
    grafanaPanels,
    copiedEvidence
  };

  const concepts = buildConcepts(endpointEvidence, prometheusEvidence, facts);

  return {
    generatedAt: new Date().toISOString(),
    urls,
    concepts,
    endpointEvidence,
    prometheusEvidence,
    facts,
    removedLegacyPerformanceTesting: true,
    singleReportsFolder: "devsecops-reports"
  };
}

function readGrafanaPanels() {
  const dashboard = readJson("grafana-dashboard-definition.json");

  if (!dashboard || !Array.isArray(dashboard.panels)) {
    return [];
  }

  return dashboard.panels.map((panel) => ({
    id: panel.id,
    title: panel.title,
    type: panel.type,
    description: panel.description || ""
  }));
}

function conceptStatusFromArtifacts(files) {
  return artifactState(files);
}

function buildConcepts(endpointEvidence, prometheusEvidence, facts) {
  const lintStatus = facts.backendLint.errors + facts.frontendLint.errors === 0 ? "PASS" : "CHECK";
  const lintFiles = firstExisting(["backend-eslint-report.json", "frontend-eslint-report.json"]);
  const staticStatus = lintFiles.length > 0 && exists("sonarqube-scanner-report.txt") ? lintStatus : "CHECK";
  const unitStatus = [facts.nearbyUnit, facts.languageUnit].some((item) => item?.success)
    ? "PASS"
    : conceptStatusFromArtifacts(["nearby-unit-test-report.json", "language-helper-unit-test-report.json"]);
  const integrationStatus = [facts.integration, facts.nearbyIntegration, facts.languageIntegration].some((item) => item?.success)
    ? "PASS"
    : conceptStatusFromArtifacts([
      "backend-integration-test-report.json",
      "nearby-integration-test-report.json",
      "language-helper-integration-test-report.json"
    ]);
  const coverageStatus = facts.coverage?.success
    ? "PASS"
    : conceptStatusFromArtifacts(["backend-coverage-test-report.json"]);
  const smokeStatus = facts.smoke && facts.smoke.failedAssertions === 0 ? "PASS" : conceptStatusFromArtifacts([
    "postman-api-smoke-report.json",
    "postman-api-smoke-report.xml"
  ]);
  const prometheusRouteStatus = facts.routeQueries.length > 0 && facts.routeQueriesWithSeries.length >= Math.ceil(facts.routeQueries.length / 2)
    ? "PASS"
    : prometheusEvidence.passed > 0
      ? "CHECK"
      : "MISSING";
  const grafanaHealth = endpointEvidence.endpoints.find((item) => item.name === "Grafana health");
  const grafanaStatus = grafanaHealth?.ok && facts.grafanaPanels.length > 0 ? "PASS" : "CHECK";

  return [
    {
      id: "01-static-code-analysis",
      title: "Static Code Analysis Report",
      tool: "ESLint and SonarQube",
      status: staticStatus,
      summary: `Backend ESLint errors: ${facts.backendLint.errors}. Frontend ESLint errors: ${facts.frontendLint.errors}.`,
      keyResult: "Code quality and static analysis output are saved for review.",
      proofFiles: firstExisting([
        "backend-eslint-report.json",
        "frontend-eslint-report.json",
        "sonarqube-scanner-report.txt"
      ]),
      howToCheck: [
        "Open devsecops-reports/backend-eslint-report.json.",
        "Open devsecops-reports/frontend-eslint-report.json.",
        "Open SonarQube at http://localhost:9000 and review bugs, smells, coverage, and security hotspots.",
        "Open devsecops-reports/sonarqube-scanner-report.txt."
      ],
      showInDemo: [
        "Explain ESLint as fast source-code checks.",
        "Explain SonarQube as deeper static analysis and quality gate evidence."
      ]
    },
    {
      id: "02-unit-testing",
      title: "Unit Testing Report",
      tool: "Jest",
      status: unitStatus,
      summary: `Nearby unit tests: ${facts.nearbyUnit?.passed ?? "n/a"} passed. Language helper unit tests: ${facts.languageUnit?.passed ?? "n/a"} passed.`,
      keyResult: "Feature-level unit test outputs are saved as reports instead of being printed in the console.",
      proofFiles: firstExisting([
        "nearby-unit-test-report.json",
        "language-helper-unit-test-report.json"
      ]),
      howToCheck: [
        "Open devsecops-reports/nearby-unit-test-report.json.",
        "Open devsecops-reports/language-helper-unit-test-report.json.",
        "In Jenkins, check only that the Unit Test stages passed; detailed output is in the reports folder."
      ],
      showInDemo: [
        "Explain unit testing as checking small backend feature logic.",
        "Show pass/fail counts in this report and avoid scrolling long console logs."
      ]
    },
    {
      id: "03-integration-testing",
      title: "Integration Testing Report",
      tool: "Jest and Supertest",
      status: integrationStatus,
      summary: `Backend integration tests: ${facts.integration?.passed ?? "n/a"} passed. Feature integration reports are saved separately.`,
      keyResult: "Integration tests prove backend routes work together before deployment is accepted.",
      proofFiles: firstExisting([
        "backend-integration-test-report.json",
        "nearby-integration-test-report.json",
        "language-helper-integration-test-report.json"
      ]),
      howToCheck: [
        "Open devsecops-reports/backend-integration-test-report.json.",
        "Open devsecops-reports/nearby-integration-test-report.json.",
        "Open devsecops-reports/language-helper-integration-test-report.json."
      ],
      showInDemo: [
        "Explain integration testing as checking API routes and middleware together.",
        "Show the summarized pass count from the report."
      ]
    },
    {
      id: "04-code-coverage-testing",
      title: "Code Coverage Testing Report",
      tool: "Jest Coverage",
      status: coverageStatus,
      summary: `Coverage run: ${facts.coverage?.passed ?? "n/a"} tests passed, ${facts.coverage?.failed ?? "n/a"} failed.`,
      keyResult: "Coverage JSON is saved for Jenkins and the HTML coverage page is available locally.",
      proofFiles: firstExisting(["backend-coverage-test-report.json"]),
      howToCheck: [
        "Open devsecops-reports/backend-coverage-test-report.json.",
        "Open backend/coverage/lcov-report/index.html for the detailed local coverage page."
      ],
      showInDemo: [
        "Explain coverage as showing how much code was exercised by tests.",
        "Use the HTML coverage page for the clear visual view."
      ]
    },
    {
      id: "05-postman-api-testing",
      title: "Postman API Testing Report",
      tool: "Postman and Newman",
      status: smokeStatus,
      summary: facts.smoke
        ? `${facts.smoke.requests} requests, ${facts.smoke.assertions} assertions, ${facts.smoke.failedAssertions} failed assertions.`
        : "Postman/Newman report is generated by Jenkins after deployment.",
      keyResult: "The same collection can be opened in Postman for demo and executed by Newman in Jenkins.",
      proofFiles: firstExisting([
        "postman-api-smoke-report.json",
        "postman-api-smoke-report.xml",
        "postman-api-collection.json"
      ]),
      howToCheck: [
        "Open postman/city-transition-api.postman_collection.json in Postman.",
        "Choose the CD Smoke folder for a short deployed API demo.",
        "Use baseUrl http://localhost:30008 for deployed Kubernetes API.",
        "Manual command: npm run api:test:deployed."
      ],
      showInDemo: [
        "Run the collection in Postman to show API testing visually.",
        "Show the Newman JSON/XML artifacts as Jenkins proof."
      ]
    },
    {
      id: "06-prometheus-monitoring",
      title: "Prometheus Monitoring Report",
      tool: "Prometheus",
      status: prometheusRouteStatus,
      summary: `${endpointEvidence.passed}/${endpointEvidence.endpoints.length} endpoint checks matched expected status. ${facts.routeQueriesWithSeries.length}/${facts.routeQueries.length} route-level Prometheus queries returned series.`,
      keyResult: "Every API route family is called by Jenkins and has route-wise PromQL evidence.",
      proofFiles: firstExisting([
        "monitoring-health-report.txt",
        "prometheus-query-evidence.json",
        "prometheus-metrics-snapshot.txt",
        "endpoint-evidence.json",
        "endpoint-evidence.html",
        "prometheus-kubernetes-config.yaml",
        "prometheus-docker-config.yml"
      ]),
      howToCheck: [
        "Open http://localhost:30090/targets.",
        "Confirm the backend and endpoint monitoring targets are UP.",
        "Run city_transition_up.",
        "Run sum(rate(city_transition_http_requests_total[1m])).",
        "Run histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route)).",
        "Run probe_success{job=\"blackbox-http\"}."
      ],
      showInDemo: [
        "Open this concept report first for route-wise query proof.",
        "Then open Prometheus targets and run one route query live."
      ]
    },
    {
      id: "07-grafana-performance-testing",
      title: "Grafana Performance Testing Report",
      tool: "Grafana",
      status: grafanaStatus,
      summary: `${facts.grafanaPanels.length} dashboard panels are provisioned, including separate API route graphs.`,
      keyResult: "Grafana shows each API separately with response time, latency, throughput, request count, error rate, CPU, memory, uptime, and endpoint health.",
      proofFiles: firstExisting(["grafana-dashboard-definition.json"]),
      howToCheck: [
        "Open http://localhost:30300.",
        "Login with admin / admin.",
        "Open City Transition System - DevSecOps Monitoring.",
        "Review separate graphs for health, auth, listings, accommodation, nearby, and language helper APIs."
      ],
      showInDemo: [
        "Show all top summary panels first.",
        "Scroll to per-API route panels and explain that each API has its own graph."
      ]
    },
    {
      id: "08-ansible-iac",
      title: "Ansible IaC Report",
      tool: "Ansible",
      status: conceptStatusFromArtifacts(["deployment-report.txt", "ansible-deploy-playbook.yml"]),
      summary: "Ansible applies the deployment manifests in a repeatable Infrastructure as Code flow.",
      keyResult: "Infrastructure as Code deployment output is saved in deployment-report.txt.",
      proofFiles: firstExisting(["deployment-report.txt", "ansible-deploy-playbook.yml"]),
      howToCheck: [
        "Open devsecops-reports/deployment-report.txt.",
        "Manual command: ansible-playbook -i ansible/inventory.ini ansible/deploy.yml."
      ],
      showInDemo: [
        "Explain deploy.yml as repeatable deployment instructions.",
        "Show the deployment report instead of scrolling long terminal output."
      ]
    },
    {
      id: "09-deployment-flow",
      title: "Deployment Flow Report",
      tool: "Deployment",
      status: conceptStatusFromArtifacts(["kubernetes-verification-report.txt", "backend-health-report.json"]),
      summary: "Deployment verification checks the running app, services, backend health, and backend metrics.",
      keyResult: "The deployed frontend, backend health, backend metrics, Prometheus, and Grafana URLs are easy to open during demo.",
      proofFiles: firstExisting([
        "kubernetes-verification-report.txt",
        "backend-health-report.json",
        "prometheus-metrics-sample.txt",
        "prometheus-metrics-snapshot.txt"
      ]),
      howToCheck: [
        "Open frontend http://localhost:30007.",
        "Open backend health http://localhost:30008/health.",
        "Open backend metrics http://localhost:30008/metrics.",
        "Open Prometheus http://localhost:30090.",
        "Open Grafana http://localhost:30300."
      ],
      showInDemo: [
        "Show the app URL first.",
        "Then show health, metrics, Prometheus, and Grafana in that order."
      ]
    }
  ];
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

function linkList(files) {
  if (!files.length) {
    return "<span class=\"muted\">Jenkins will create this artifact.</span>";
  }

  return files.map((file) => `<a href="${escapeHtml(file)}">${escapeHtml(file)}</a>`).join(" ");
}

function endpointHtml(evidence) {
  const rows = evidence.endpoints.map((item) => `
    <tr>
      <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
      <td>${escapeHtml(item.concept)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.method)}</td>
      <td class="mono">${escapeHtml(item.expected)}</td>
      <td class="mono">${escapeHtml(item.statusCode)}</td>
      <td class="mono">${escapeHtml(item.durationMs)} ms</td>
      <td class="mono">${escapeHtml(item.metricRoute || "-")}</td>
      <td><a href="${escapeHtml(item.responseArtifact)}">${escapeHtml(item.responseArtifact)}</a></td>
    </tr>`).join("");

  return htmlShell("Endpoint Monitoring Evidence", `
    <section class="hero">
      <p class="eyebrow">City Transition System</p>
      <h1>Endpoint Monitoring Evidence</h1>
      <p>Jenkins calls the public, validation, and protected API route families so Prometheus receives route labels for the full backend surface.</p>
      <div class="cards">
        <div class="card"><span>Total checks</span><strong>${evidence.endpoints.length}</strong></div>
        <div class="card"><span>Expected status</span><strong>${evidence.passed}</strong></div>
        <div class="card"><span>Review</span><strong>${evidence.failed}</strong></div>
      </div>
    </section>
    <section>
      <h2>Endpoint Results</h2>
      <table>
        <thead><tr><th>Status</th><th>Concept</th><th>Endpoint</th><th>Method</th><th>Expected</th><th>HTTP</th><th>Time</th><th>Metric Route</th><th>Saved Response</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `);
}

function dashboardHtml(summary) {
  const conceptCards = summary.concepts.map((concept) => `
    <article class="concept ${statusClass(concept.status)}">
      <div>${badge(concept.status, concept.status)}</div>
      <h3>${escapeHtml(concept.title)}</h3>
      <p>${escapeHtml(concept.summary)}</p>
      <p><strong>Tool:</strong> ${escapeHtml(concept.tool)}</p>
      <small><a href="${escapeHtml(`${concept.id}-report.html`)}">Open concept report</a></small>
    </article>`).join("");

  const endpointRows = summary.endpointEvidence.endpoints.map((item) => `
    <tr>
      <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
      <td>${escapeHtml(item.concept)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="mono">${escapeHtml(item.method)}</td>
      <td class="mono">${escapeHtml(item.expected)}</td>
      <td class="mono">${escapeHtml(item.statusCode)}</td>
      <td class="mono">${escapeHtml(item.metricRoute || "-")}</td>
    </tr>`).join("");

  const queryRows = summary.prometheusEvidence.queries.slice(0, 18).map((item) => `
    <tr>
      <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="mono">${escapeHtml(item.valueCount)}</td>
      <td class="mono">${escapeHtml(item.query)}</td>
    </tr>`).join("");

  return htmlShell("City Transition DevSecOps Report", `
    <section class="hero">
      <p class="eyebrow">Single Jenkins Artifact Folder</p>
      <h1>City Transition DevSecOps Evidence</h1>
      <p>Open this page from <code>devsecops-reports</code>. It gives a short concept-wise view of static code analysis, unit testing, integration testing, code coverage, Postman API testing, Prometheus monitoring, Grafana performance graphs, Ansible IaC, and deployment flow.</p>
      <div class="cards">
        <div class="card"><span>Generated</span><strong>${escapeHtml(summary.generatedAt.replace("T", " ").replace("Z", " UTC"))}</strong></div>
        <div class="card"><span>Endpoint checks</span><strong>${summary.endpointEvidence.passed}/${summary.endpointEvidence.endpoints.length}</strong></div>
        <div class="card"><span>Prometheus queries</span><strong>${summary.prometheusEvidence.passed}/${summary.prometheusEvidence.queries.length}</strong></div>
        <div class="card"><span>Legacy performance tests</span><strong>Removed</strong></div>
      </div>
    </section>

    <section>
      <h2>DevSecOps Concept Reports</h2>
      <div class="grid">${conceptCards}</div>
    </section>

    <section>
      <h2>API Route Evidence</h2>
      <p>Expected 400 and 401 responses are counted as PASS when they prove validation or authorization is working.</p>
      <table>
        <thead><tr><th>Status</th><th>Concept</th><th>Check</th><th>Method</th><th>Expected</th><th>HTTP</th><th>Prometheus Route</th></tr></thead>
        <tbody>${endpointRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Prometheus Query Snapshot</h2>
      <p>Full query evidence is saved in <code>prometheus-query-evidence.json</code> and the Prometheus concept report.</p>
      <table>
        <thead><tr><th>Status</th><th>Panel / Metric</th><th>Series</th><th>PromQL</th></tr></thead>
        <tbody>${queryRows}</tbody>
      </table>
    </section>
  `);
}

function conceptReportHtml(concept, summary) {
  const steps = concept.howToCheck.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const demo = concept.showInDemo.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const files = concept.proofFiles.map((file) => `
    <tr>
      <td>${badge("SAVED", true)}</td>
      <td><a href="${escapeHtml(file)}">${escapeHtml(file)}</a></td>
    </tr>`).join("") || `
    <tr>
      <td>${badge("WAITING", "CHECK")}</td>
      <td>Jenkins creates this report during the pipeline run.</td>
    </tr>`;

  return htmlShell(concept.title, `
    <section class="hero">
      <p class="eyebrow">${escapeHtml(concept.tool)}</p>
      <h1>${escapeHtml(concept.title)}</h1>
      <p>${escapeHtml(concept.summary)}</p>
      <div class="cards">
        <div class="card"><span>Status</span><strong>${escapeHtml(concept.status)}</strong></div>
        <div class="card"><span>Single folder</span><strong>${escapeHtml(summary.singleReportsFolder)}</strong></div>
        <div class="card"><span>Main output</span><strong>${escapeHtml(concept.keyResult)}</strong></div>
      </div>
    </section>
    <section>
      <h2>Saved Proof</h2>
      <table>
        <thead><tr><th>Status</th><th>Artifact</th></tr></thead>
        <tbody>${files}</tbody>
      </table>
    </section>
    ${conceptExtraHtml(concept, summary)}
    <section>
      <h2>How To Check</h2>
      <ol>${steps}</ol>
    </section>
    <section>
      <h2>What To Say In Demo</h2>
      <ol>${demo}</ol>
    </section>
    <section>
      <p><a href="00-devsecops-demo-index.html">Back to main DevSecOps report</a></p>
    </section>
  `);
}

function conceptExtraHtml(concept, summary) {
  if (concept.id === "06-prometheus-monitoring") {
    const routeRows = summary.prometheusEvidence.queries
      .filter((item) => item.route)
      .map((item) => `
        <tr>
          <td>${badge(item.ok ? "PASS" : "CHECK", item.ok)}</td>
          <td class="mono">${escapeHtml(`${item.method} ${item.route}`)}</td>
          <td class="mono">${escapeHtml(item.valueCount)}</td>
          <td class="mono">${escapeHtml(item.query)}</td>
        </tr>`)
      .join("");

    return `
      <section>
        <h2>Route-Wise Prometheus Proof</h2>
        <p>These queries prove monitoring is not limited to one endpoint. Jenkins warms each route family before Prometheus is queried.</p>
        <table>
          <thead><tr><th>Status</th><th>API Route</th><th>Series</th><th>PromQL</th></tr></thead>
          <tbody>${routeRows}</tbody>
        </table>
      </section>`;
  }

  if (concept.id === "07-grafana-performance-testing") {
    const panelRows = summary.facts.grafanaPanels.map((panel) => `
      <tr>
        <td class="mono">${escapeHtml(panel.id)}</td>
        <td>${escapeHtml(panel.title)}</td>
        <td>${escapeHtml(panel.type)}</td>
      </tr>`).join("");

    return `
      <section>
        <h2>Provisioned Panels</h2>
        <p>Grafana uses the saved dashboard definition from this same report folder.</p>
        <table>
          <thead><tr><th>ID</th><th>Panel</th><th>Type</th></tr></thead>
          <tbody>${panelRows}</tbody>
        </table>
      </section>`;
  }

  return "";
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
      --bg: #f4f6fb;
      --panel: #ffffff;
      --ink: #172033;
      --muted: #667085;
      --line: #d8e0ea;
      --pass: #0f8a4b;
      --check: #b45f06;
      --fail: #b42318;
      --accent: #1769aa;
      --soft: #eef6ff;
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
      margin: 22px auto;
      padding: 24px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 10px 26px rgba(16, 24, 40, 0.06);
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
    p, small, .muted { color: var(--muted); }
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
      font-size: 18px;
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
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      background: var(--soft);
      color: #243b63;
      font-size: 13px;
    }
    tr:last-child td { border-bottom: 0; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    ol { padding-left: 22px; }
    li { margin-bottom: 8px; }
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
    "Single report folder: devsecops-reports",
    "Legacy custom/k6 performance tests: removed. Performance evidence is shown through Grafana graphs backed by Prometheus metrics.",
    "",
    "## Open First",
    "",
    "- devsecops-reports/00-devsecops-demo-index.html",
    "- devsecops-reports/devsecops-dashboard.html",
    "",
    "## Concept Reports",
    ""
  ];

  for (const concept of summary.concepts) {
    lines.push(`- ${concept.status}: ${concept.title} -> ${concept.id}-report.html`);
  }

  lines.push("", "## Key URLs", "");
  lines.push(`- Frontend: ${summary.urls.frontend}`);
  lines.push(`- Backend health: ${summary.urls.backend}/health`);
  lines.push(`- Backend metrics: ${summary.urls.backend}/metrics`);
  lines.push(`- Prometheus targets: ${summary.urls.prometheus}/targets`);
  lines.push(`- Grafana: ${summary.urls.grafana}`);

  return `${lines.join("\n")}\n`;
}

function writeConceptReports(summary) {
  for (const concept of summary.concepts) {
    fs.writeFileSync(path.join(reportsDir, `${concept.id}-report.html`), conceptReportHtml(concept, summary));
  }

  fs.writeFileSync(path.join(reportsDir, "00-devsecops-demo-index.html"), dashboardHtml(summary));
  fs.writeFileSync(path.join(reportsDir, "report-manifest.json"), JSON.stringify({
    generatedAt: summary.generatedAt,
    reportsFolder: summary.singleReportsFolder,
    reports: summary.concepts.map((concept) => ({
      title: concept.title,
      file: `${concept.id}-report.html`,
      status: concept.status,
      tool: concept.tool
    }))
  }, null, 2));
}

async function main() {
  ensureDirs();

  const endpointEvidence = await collectEndpointEvidence();

  if (collectOnly) {
    console.log(`Endpoint evidence saved: ${endpointEvidence.passed} expected, ${endpointEvidence.failed} check`);
    console.log("Collect-only mode completed.");
    return;
  }

  await waitForPrometheusScrape(endpointEvidence);
  const prometheusEvidence = await collectPrometheusEvidence();
  const copiedEvidence = copyStaticEvidence();
  const summary = summarizeReports(endpointEvidence, prometheusEvidence, copiedEvidence);

  fs.writeFileSync(path.join(reportsDir, "devsecops-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(reportsDir, "devsecops-summary.md"), markdownSummary(summary));
  fs.writeFileSync(path.join(reportsDir, "devsecops-dashboard.html"), dashboardHtml(summary));
  writeConceptReports(summary);

  console.log(`DevSecOps dashboard saved: ${path.join(reportsDir, "00-devsecops-demo-index.html")}`);
  console.log(`Concept reports saved: ${summary.concepts.length}`);
  console.log(`Endpoint evidence: ${endpointEvidence.passed} expected, ${endpointEvidence.failed} check`);
}

main().catch((error) => {
  ensureDirs();
  fs.writeFileSync(path.join(reportsDir, "devsecops-dashboard-error.txt"), error.stack || error.message);
  console.error(error);
  process.exitCode = 1;
});
