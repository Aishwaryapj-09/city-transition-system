const startedAt = Date.now();
const httpMetrics = new Map();
const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function escapeLabel(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');
}

function formatLabels(labels) {
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(",");
}

function normalizeRoute(req) {
  const rawPath = (req.originalUrl || req.url || req.path || "/").split("?")[0] || "/";

  return rawPath
    .replace(/[0-9a-fA-F]{24}/g, ":id")
    .replace(/\b\d+\b/g, ":id")
    .replace(/\/+/g, "/");
}

function getMetric(labels) {
  const key = JSON.stringify(labels);

  if (!httpMetrics.has(key)) {
    httpMetrics.set(key, {
      labels,
      count: 0,
      durationSeconds: 0,
      buckets: durationBuckets.map(() => 0)
    });
  }

  return httpMetrics.get(key);
}

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const metric = getMetric({
      method: req.method,
      route: normalizeRoute(req),
      status: String(res.statusCode)
    });

    metric.count += 1;
    metric.durationSeconds += elapsedSeconds;

    durationBuckets.forEach((bucket, index) => {
      if (elapsedSeconds <= bucket) {
        metric.buckets[index] += 1;
      }
    });
  });

  next();
}

function renderMetrics() {
  const uptimeSeconds = (Date.now() - startedAt) / 1000;
  const lines = [
    "# HELP city_transition_up City Transition backend availability.",
    "# TYPE city_transition_up gauge",
    "city_transition_up 1",
    "# HELP city_transition_process_uptime_seconds Backend process uptime in seconds.",
    "# TYPE city_transition_process_uptime_seconds gauge",
    `city_transition_process_uptime_seconds ${uptimeSeconds.toFixed(3)}`,
    "# HELP city_transition_http_requests_total Total HTTP requests handled by the backend.",
    "# TYPE city_transition_http_requests_total counter"
  ];

  Array.from(httpMetrics.values())
    .sort((a, b) => JSON.stringify(a.labels).localeCompare(JSON.stringify(b.labels)))
    .forEach((metric) => {
      const labels = formatLabels(metric.labels);

      lines.push(`city_transition_http_requests_total{${labels}} ${metric.count}`);
    });

  lines.push(
    "# HELP city_transition_http_request_duration_seconds HTTP request duration histogram in seconds.",
    "# TYPE city_transition_http_request_duration_seconds histogram"
  );

  Array.from(httpMetrics.values())
    .sort((a, b) => JSON.stringify(a.labels).localeCompare(JSON.stringify(b.labels)))
    .forEach((metric) => {
      const labels = formatLabels(metric.labels);

      durationBuckets.forEach((bucket, index) => {
        lines.push(
          `city_transition_http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${metric.buckets[index]}`
        );
      });

      lines.push(`city_transition_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${metric.count}`);
      lines.push(`city_transition_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds.toFixed(6)}`);
      lines.push(`city_transition_http_request_duration_seconds_count{${labels}} ${metric.count}`);
    });

  return `${lines.join("\n")}\n`;
}

function metricsHandler(req, res) {
  res
    .status(200)
    .set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
    .send(renderMetrics());
}

module.exports = {
  metricsHandler,
  metricsMiddleware
};
