'use strict';

// Prometheus client for Node.js. It creates counters, gauges, and histograms
// that Prometheus can scrape from the /metrics endpoint.
const client = require('prom-client');

const Registry = client.Registry;
const register = new Registry();

// Default metrics cover Node.js runtime health:
// city_transition_process_cpu_seconds_total      -> backend CPU time
// city_transition_process_resident_memory_bytes  -> backend memory usage
// city_transition_nodejs_eventloop_lag_seconds   -> event-loop latency
// city_transition_nodejs_heap_size_used_bytes    -> heap memory usage
client.collectDefaultMetrics({
  register,
  prefix: 'city_transition_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Main application metrics used by the Grafana dashboard and Jenkins check.
const httpRequestDurationHistogram = new client.Histogram({
  name: 'city_transition_http_request_duration_seconds',
  help: 'HTTP request duration in seconds for API latency and response time',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const httpRequestsCounter = new client.Counter({
  name: 'city_transition_http_requests_total',
  help: 'Total HTTP requests by method, route, and status code',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpErrorsCounter = new client.Counter({
  name: 'city_transition_http_errors_total',
  help: 'Total HTTP responses with 4xx or 5xx status codes',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeRequestsGauge = new client.Gauge({
  name: 'city_transition_http_active_requests',
  help: 'Number of HTTP requests currently being processed',
  registers: [register]
});

const appUpGauge = new client.Gauge({
  name: 'city_transition_up',
  help: 'Application availability flag. 1 means the backend process is running.',
  registers: [register]
});

const uptimeGauge = new client.Gauge({
  name: 'city_transition_process_uptime_seconds',
  help: 'Number of seconds the City Transition backend process has been running',
  registers: [register]
});

function refreshHealthGauges() {
  appUpGauge.set(1);
  uptimeGauge.set(process.uptime());
}

refreshHealthGauges();

const uptimeInterval = setInterval(refreshHealthGauges, 10_000);
if (typeof uptimeInterval.unref === 'function') {
  uptimeInterval.unref();
}

function normalizeRoute(req) {
  const rawPath = (req.originalUrl || req.url || '/').split('?')[0] || '/';

  return rawPath
    .replace(/[0-9a-fA-F]{24}/g, ':id')
    .replace(/\b\d+\b/g, ':id')
    .replace(/\/+/g, '/');
}

function metricsMiddleware(req, res, next) {
  // Do not include Prometheus scrape traffic in application workload metrics.
  if (req.path === '/metrics') {
    return next();
  }

  activeRequestsGauge.inc();
  const endTimer = httpRequestDurationHistogram.startTimer();

  res.once('finish', () => {
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode)
    };

    endTimer(labels);
    httpRequestsCounter.inc(labels);

    if (res.statusCode >= 400) {
      httpErrorsCounter.inc(labels);
    }

    activeRequestsGauge.dec();
  });

  return next();
}

async function metricsHandler(req, res) {
  try {
    refreshHealthGauges();

    res
      .status(200)
      .set('Content-Type', register.contentType)
      .send(await register.metrics());
  } catch (err) {
    res.status(500).send(`Error collecting metrics: ${err.message}`);
  }
}

module.exports = {
  metricsHandler,
  metricsMiddleware,
  register
};
