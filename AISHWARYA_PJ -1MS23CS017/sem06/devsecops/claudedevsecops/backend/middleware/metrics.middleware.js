'use strict';

/**
 * Application metrics middleware (prom-client)
 * --------------------------------------------
 * Real, route-wise application metrics for the City Transition System.
 * Every metric here is something Grafana plots per API:
 *   - response time (histogram, p50/p95/p99 derivable)
 *   - request count & throughput
 *   - error rate (4xx, 5xx)
 *   - active in-flight requests
 *   - per-API hits (counter, labelled by feature group)
 *   - CPU, memory, uptime, event-loop lag (default Node.js metrics)
 *
 * No blackbox / probe / external-exporter labels are produced here.
 * The dashboards & HTML reports read these series directly.
 */

const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'city_transition_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ---------------------------------------------------------------------------
// Core HTTP metrics (route-aware)
// ---------------------------------------------------------------------------
const httpRequestDuration = new client.Histogram({
  name: 'city_transition_http_request_duration_seconds',
  help: 'HTTP request duration in seconds (response time / latency)',
  labelNames: ['method', 'route', 'status_code', 'feature'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: 'city_transition_http_requests_total',
  help: 'Total HTTP requests served',
  labelNames: ['method', 'route', 'status_code', 'feature'],
  registers: [register]
});

const httpErrorsTotal = new client.Counter({
  name: 'city_transition_http_errors_total',
  help: 'Total HTTP responses with status >= 400',
  labelNames: ['method', 'route', 'status_code', 'feature'],
  registers: [register]
});

const httpActiveRequests = new client.Gauge({
  name: 'city_transition_http_active_requests',
  help: 'In-flight HTTP requests currently being processed',
  labelNames: ['feature'],
  registers: [register]
});

const apiCallsByFeature = new client.Counter({
  name: 'city_transition_feature_calls_total',
  help: 'Total API calls per application feature',
  labelNames: ['feature'],
  registers: [register]
});

const appUp = new client.Gauge({
  name: 'city_transition_up',
  help: 'Application availability (1 = running)',
  registers: [register]
});

const appUptime = new client.Gauge({
  name: 'city_transition_process_uptime_seconds',
  help: 'Seconds since backend process started',
  registers: [register]
});

function refreshHealthGauges() {
  appUp.set(1);
  appUptime.set(process.uptime());
}

refreshHealthGauges();
const uptimeInterval = setInterval(refreshHealthGauges, 10_000);
if (typeof uptimeInterval.unref === 'function') uptimeInterval.unref();

// ---------------------------------------------------------------------------
// Route normalisation + feature grouping
// ---------------------------------------------------------------------------
function normalizeRoute(req) {
  // Prefer the Express matched route template (e.g. "/api/listings/:id") because
  // that gives stable, low-cardinality labels for Prometheus.
  const matched = req.route && req.baseUrl
    ? `${req.baseUrl}${req.route.path === '/' ? '' : req.route.path}`
    : null;

  const fallback = (req.originalUrl || req.url || '/').split('?')[0] || '/';

  return (matched || fallback)
    .replace(/[0-9a-fA-F]{24}/g, ':id')
    .replace(/\b\d+\b/g, ':id')
    .replace(/\/+/g, '/');
}

function featureFromRoute(route) {
  if (route.startsWith('/api/auth')) return 'authentication';
  if (route.startsWith('/api/listings')) return 'listings';
  if (route.startsWith('/api/accommodation')) return 'accommodation';
  if (route.startsWith('/api/nearby')) return 'nearby';
  if (route.startsWith('/api/language-helper')) return 'language-helper';
  if (route === '/health' || route === '/api/health') return 'health';
  if (route === '/metrics') return 'metrics';
  return 'other';
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();

  const start = process.hrtime.bigint();

  // We don't know the matched route until the handler runs, so the feature
  // label is finalised in res.finish.
  res.once('finish', () => {
    const route = normalizeRoute(req);
    const feature = featureFromRoute(route);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
      feature
    };

    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
    apiCallsByFeature.inc({ feature });
    if (res.statusCode >= 400) httpErrorsTotal.inc(labels);
    httpActiveRequests.dec({ feature });
  });

  // increment in-flight gauge with a best-guess feature derived from URL prefix
  const guessedRoute = (req.originalUrl || req.url || '/').split('?')[0];
  httpActiveRequests.inc({ feature: featureFromRoute(guessedRoute) });

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
  register,
  // Exported for tests / scripts that want to seed values
  _internal: {
    httpRequestDuration,
    httpRequestsTotal,
    httpErrorsTotal,
    httpActiveRequests,
    apiCallsByFeature,
    appUp,
    appUptime
  }
};
