const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

if (typeof fetch !== "function") {
  console.error("Performance test requires Node.js 18 or newer because it uses the built-in fetch API.");
  process.exit(1);
}

const baseUrl = (process.argv[2] || process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const totalRequests = Number(process.env.PERF_REQUESTS || 80);
const concurrency = Number(process.env.PERF_CONCURRENCY || 8);
const timeoutMs = Number(process.env.PERF_TIMEOUT_MS || 10000);
const maxP95Ms = Number(process.env.PERF_MAX_P95_MS || 2000);
const minSuccessRate = Number(process.env.PERF_MIN_SUCCESS_RATE || 99);
const outputDir = path.join(process.cwd(), process.env.PERF_OUTPUT_DIR || "devsecops-reports");

const endpoints = [
  {
    name: "health",
    path: "/api/health",
    expectedStatus: 200
  },
  {
    name: "metrics",
    path: "/metrics",
    expectedStatus: 200
  },
  {
    name: "nearby-validation",
    path: "/api/nearby?lat=12.9716&lng=77.5946&type=mall",
    expectedStatus: 400
  },
  {
    name: "language-helper-validation",
    path: "/api/language-helper",
    expectedStatus: 400
  },
  {
    name: "accommodation-validation",
    path: "/api/accommodation",
    expectedStatus: 400
  }
];

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function hitEndpoint(endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const startedAt = performance.now();

  try {
    const response = await fetchWithTimeout(url);
    await response.arrayBuffer();

    return {
      ok: response.status === endpoint.expectedStatus,
      status: response.status,
      durationMs: performance.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: performance.now() - startedAt,
      error: error.message
    };
  }
}

async function runEndpoint(endpoint) {
  const results = [];
  let currentIndex = 0;
  const startedAt = performance.now();

  async function worker() {
    while (currentIndex < totalRequests) {
      currentIndex += 1;
      results.push(await hitEndpoint(endpoint));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker())
  );

  const durationMs = performance.now() - startedAt;
  const latencies = results.map((result) => result.durationMs);
  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  const successRate = Number(((passed / results.length) * 100).toFixed(2));
  const throughputPerSecond = Number((results.length / (durationMs / 1000)).toFixed(2));
  const p95Ms = Number(percentile(latencies, 95).toFixed(2));

  return {
    name: endpoint.name,
    path: endpoint.path,
    expectedStatus: endpoint.expectedStatus,
    requests: results.length,
    passed,
    failed,
    successRate,
    throughputPerSecond,
    latencyMs: {
      min: Number(Math.min(...latencies).toFixed(2)),
      avg: Number((latencies.reduce((total, value) => total + value, 0) / latencies.length).toFixed(2)),
      p95: p95Ms,
      p99: Number(percentile(latencies, 99).toFixed(2)),
      max: Number(Math.max(...latencies).toFixed(2))
    },
    thresholdPassed: successRate >= minSuccessRate && p95Ms <= maxP95Ms,
    errors: results
      .filter((result) => result.error)
      .slice(0, 5)
      .map((result) => result.error)
  };
}

async function main() {
  const startedAt = new Date();
  const results = [];

  for (const endpoint of endpoints) {
    results.push(await runEndpoint(endpoint));
  }

  const report = {
    generatedAt: startedAt.toISOString(),
    baseUrl,
    thresholds: {
      maxP95Ms,
      minSuccessRate
    },
    config: {
      totalRequests,
      concurrency,
      timeoutMs
    },
    results
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "performance-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  const summary = results.map((result) => (
    `${result.name}: success=${result.successRate}% p95=${result.latencyMs.p95}ms throughput=${result.throughputPerSecond}/s`
  ));

  fs.writeFileSync(path.join(outputDir, "performance-summary.txt"), `${summary.join("\n")}\n`);

  console.log(summary.join("\n"));

  const failedThresholds = results.filter((result) => !result.thresholdPassed);

  if (failedThresholds.length > 0) {
    console.error("Performance thresholds failed for:", failedThresholds.map((result) => result.name).join(", "));
    process.exit(1);
  }
}

main();
