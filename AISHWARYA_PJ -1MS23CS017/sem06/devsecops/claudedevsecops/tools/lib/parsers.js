'use strict';

/**
 * Parsers that turn raw CI artefacts (Jest JSON, ESLint JSON, lcov, Sonar,
 * Newman, kubectl) into clean structured data that the HTML dashboard
 * generator can render. Each parser:
 *   - tolerates a missing file (returns a sensible "no data" shape)
 *   - never throws (CI must never fail because parsing failed)
 *   - normalises to one canonical shape per report kind
 */

const fs = require('fs');
const path = require('path');

function safeJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return null;
    // Jest sometimes prepends warning lines. Find the first '{' or '['.
    const start = raw.search(/[\[{]/);
    if (start < 0) return null;
    return JSON.parse(raw.slice(start));
  } catch (e) {
    return null;
  }
}

function safeText(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, 'utf8');
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Jest results -> { suites, totals }
// ---------------------------------------------------------------------------
function parseJestReport(file, opts = {}) {
  const j = safeJson(file);
  if (!j || !j.testResults) {
    return { available: false, file, suites: [], totals: emptyTotals() };
  }

  const suites = j.testResults.map(suite => {
    const filename = path.basename(suite.name || suite.testFilePath || 'unknown');
    const cases = (suite.testResults || suite.assertionResults || []).map(c => ({
      name: c.title || c.fullName || 'unknown',
      ancestors: c.ancestorTitles || [],
      status: c.status,
      duration: c.duration || 0,
      failureMessage: (c.failureMessages || []).join('\n').slice(0, 600)
    }));
    return {
      file: filename,
      feature: detectFeatureFromFilename(filename),
      durationMs: suite.perfStats
        ? (suite.perfStats.end - suite.perfStats.start)
        : (suite.endTime && suite.startTime ? suite.endTime - suite.startTime : 0),
      passed: cases.filter(c => c.status === 'passed').length,
      failed: cases.filter(c => c.status === 'failed').length,
      skipped: cases.filter(c => c.status === 'pending' || c.status === 'skipped').length,
      total: cases.length,
      cases
    };
  });

  const totals = {
    suites: suites.length,
    tests: j.numTotalTests || suites.reduce((a, s) => a + s.total, 0),
    passed: j.numPassedTests || suites.reduce((a, s) => a + s.passed, 0),
    failed: j.numFailedTests || suites.reduce((a, s) => a + s.failed, 0),
    skipped: j.numPendingTests || suites.reduce((a, s) => a + s.skipped, 0),
    failedSuites: j.numFailedTestSuites || suites.filter(s => s.failed > 0).length,
    durationMs: j.startTime && j.testResults && j.testResults.length
      ? Math.max(...j.testResults.map(s => s.perfStats ? s.perfStats.end : (s.endTime || 0))) - j.startTime
      : suites.reduce((a, s) => a + s.durationMs, 0)
  };
  totals.success = totals.tests ? Math.round((totals.passed / totals.tests) * 1000) / 10 : 0;
  return { available: true, file, suites, totals };
}

function emptyTotals() {
  return { suites: 0, tests: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, success: 0 };
}

function detectFeatureFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('nearby')) return 'Nearby Services';
  if (lower.includes('language') || lower.includes('helper')) return 'Language Helper';
  if (lower.includes('accommodation')) return 'Accommodation';
  if (lower.includes('listing')) return 'Listings';
  if (lower.includes('auth') || lower.includes('role')) return 'Authentication';
  if (lower.includes('admin')) return 'Admin';
  if (lower.includes('health')) return 'Health';
  if (lower.includes('metric')) return 'Metrics';
  return 'General';
}

// Merge multiple Jest reports into a single combined view
function mergeJestReports(...reports) {
  const all = reports.filter(r => r && r.available);
  if (!all.length) return { available: false, suites: [], totals: emptyTotals() };
  const suites = [];
  const seenFiles = new Set();
  for (const r of all) {
    for (const s of r.suites) {
      const key = s.file;
      if (seenFiles.has(key)) continue;
      seenFiles.add(key);
      suites.push(s);
    }
  }
  const totals = {
    suites: suites.length,
    tests: suites.reduce((a, s) => a + s.total, 0),
    passed: suites.reduce((a, s) => a + s.passed, 0),
    failed: suites.reduce((a, s) => a + s.failed, 0),
    skipped: suites.reduce((a, s) => a + s.skipped, 0),
    failedSuites: suites.filter(s => s.failed > 0).length,
    durationMs: suites.reduce((a, s) => a + s.durationMs, 0)
  };
  totals.success = totals.tests ? Math.round((totals.passed / totals.tests) * 1000) / 10 : 0;
  return { available: true, suites, totals };
}

// ---------------------------------------------------------------------------
// ESLint -> { files, totals }
// ---------------------------------------------------------------------------
function parseEslintReport(file, project) {
  const j = safeJson(file);
  if (!Array.isArray(j)) {
    return { available: false, project, files: [], totals: { errors: 0, warnings: 0, files: 0, errorFiles: 0 }, byRule: [] };
  }
  const ruleMap = new Map();
  const files = j.map(f => {
    const filename = path.basename(f.filePath || 'unknown');
    for (const msg of (f.messages || [])) {
      const rid = msg.ruleId || 'unknown';
      const entry = ruleMap.get(rid) || { rule: rid, errors: 0, warnings: 0 };
      if (msg.severity === 2) entry.errors++;
      else entry.warnings++;
      ruleMap.set(rid, entry);
    }
    return {
      file: filename,
      path: f.filePath,
      errors: f.errorCount || 0,
      warnings: f.warningCount || 0,
      fixable: (f.fixableErrorCount || 0) + (f.fixableWarningCount || 0),
      messages: (f.messages || []).slice(0, 25).map(m => ({
        rule: m.ruleId, severity: m.severity, line: m.line, column: m.column,
        message: m.message
      }))
    };
  });
  const totals = {
    files: files.length,
    errorFiles: files.filter(f => f.errors > 0).length,
    errors: files.reduce((a, f) => a + f.errors, 0),
    warnings: files.reduce((a, f) => a + f.warnings, 0)
  };
  const byRule = [...ruleMap.values()]
    .sort((a, b) => (b.errors + b.warnings) - (a.errors + a.warnings))
    .slice(0, 20);
  return { available: true, project, files, totals, byRule };
}

// ---------------------------------------------------------------------------
// LCOV -> coverage per file
// ---------------------------------------------------------------------------
function parseLcov(file) {
  const text = safeText(file);
  if (!text) return { available: false, files: [], totals: zeroCov() };
  const files = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('SF:')) current = { file: line.slice(3), lf: 0, lh: 0, ff: 0, fh: 0, bf: 0, bh: 0 };
    else if (!current) continue;
    else if (line.startsWith('LF:')) current.lf = +line.slice(3);
    else if (line.startsWith('LH:')) current.lh = +line.slice(3);
    else if (line.startsWith('FNF:')) current.ff = +line.slice(4);
    else if (line.startsWith('FNH:')) current.fh = +line.slice(4);
    else if (line.startsWith('BRF:')) current.bf = +line.slice(4);
    else if (line.startsWith('BRH:')) current.bh = +line.slice(4);
    else if (line === 'end_of_record' && current) {
      const lc = pct(current.lh, current.lf);
      const fc = pct(current.fh, current.ff);
      const bc = pct(current.bh, current.bf);
      files.push({
        file: path.basename(current.file),
        path: current.file,
        lines: { found: current.lf, hit: current.lh, pct: lc },
        functions: { found: current.ff, hit: current.fh, pct: fc },
        branches: { found: current.bf, hit: current.bh, pct: bc },
        avg: Math.round(((lc + fc + bc) / 3) * 10) / 10
      });
      current = null;
    }
  }
  const sum = (k) => files.reduce((a, f) => a + f[k].found, 0);
  const sumH = (k) => files.reduce((a, f) => a + f[k].hit, 0);
  const totals = {
    files: files.length,
    lines: { found: sum('lines'), hit: sumH('lines'), pct: pct(sumH('lines'), sum('lines')) },
    functions: { found: sum('functions'), hit: sumH('functions'), pct: pct(sumH('functions'), sum('functions')) },
    branches: { found: sum('branches'), hit: sumH('branches'), pct: pct(sumH('branches'), sum('branches')) }
  };
  return { available: true, files, totals };
}
function pct(h, f) { return f ? Math.round((h / f) * 1000) / 10 : 0; }
function zeroCov() { return { files: 0, lines: { found: 0, hit: 0, pct: 0 }, functions: { found: 0, hit: 0, pct: 0 }, branches: { found: 0, hit: 0, pct: 0 } }; }

// ---------------------------------------------------------------------------
// Newman -> { runs, totals, requests }
// ---------------------------------------------------------------------------
function parseNewmanReport(file) {
  const j = safeJson(file);
  if (!j || !j.run) return { available: false, file, requests: [], totals: { iterations: 0, requests: 0, assertions: 0, failures: 0, durationMs: 0 } };

  const executions = j.run.executions || [];
  const requests = executions.map(ex => {
    const r = ex.request || {};
    const res = ex.response || {};
    const url = (typeof r.url === 'string') ? r.url : (r.url && r.url.raw) || '';
    const assertions = ex.assertions || [];
    const failed = assertions.filter(a => a.error).length;
    return {
      name: (ex.item && ex.item.name) || 'request',
      folder: (ex.item && ex.item.parent && ex.item.parent.name) || '',
      method: r.method || 'GET',
      url: url.replace(/^https?:\/\/[^/]+/, '') || url,
      fullUrl: url,
      status: res.code || 0,
      statusText: res.status || '',
      responseTimeMs: res.responseTime || 0,
      assertions: assertions.length,
      failedAssertions: failed,
      passed: failed === 0 && (res.code || 0) >= 200 && (res.code || 0) < 400
    };
  });
  const totals = {
    iterations: (j.run.stats && j.run.stats.iterations && j.run.stats.iterations.total) || 1,
    requests: requests.length,
    assertions: requests.reduce((a, r) => a + r.assertions, 0),
    failures: requests.reduce((a, r) => a + r.failedAssertions, 0) + requests.filter(r => !r.passed).length,
    passed: requests.filter(r => r.passed).length,
    durationMs: (j.run.timings && (j.run.timings.completed - j.run.timings.started)) || 0,
    avgResponseTime: requests.length ? Math.round(requests.reduce((a, r) => a + r.responseTimeMs, 0) / requests.length) : 0
  };
  totals.success = totals.requests ? Math.round((totals.passed / totals.requests) * 1000) / 10 : 0;
  return { available: true, file, requests, totals };
}

// ---------------------------------------------------------------------------
// Sonar — parse scanner log to surface metrics; if not present, leave blanks
// ---------------------------------------------------------------------------
function parseSonarLog(file) {
  const text = safeText(file);
  if (!text) return { available: false };
  const out = { available: true };
  const grab = (re) => { const m = text.match(re); return m ? m[1] : null; };
  out.serverUrl = grab(/Sonar(?:Qube)? server\s+([^\s]+)/i) || grab(/sonar\.host\.url=([^\s]+)/i);
  out.projectKey = grab(/sonar\.projectKey=([^\s]+)/i);
  out.qualityGate = /Quality Gate.*PASS/i.test(text) ? 'PASSED'
                  : /Quality Gate.*FAIL/i.test(text) ? 'FAILED' : null;
  out.taskUrl = grab(/More about the report processing.*?:\s*(https?:\/\/\S+)/i);
  out.success = /EXECUTION SUCCESS/i.test(text);
  return out;
}

// ---------------------------------------------------------------------------
// Kubernetes verification text -> structured
// ---------------------------------------------------------------------------
function parseKubectlText(file) {
  const text = safeText(file);
  if (!text) return { available: false, deployments: [], pods: [], services: [], daemonsets: [] };
  const split = (header) => {
    const re = new RegExp(`(^|\\n)\\s*NAME\\s+.*${header}.*\\n([\\s\\S]*?)(\\n\\s*NAME\\s+|$)`, 'i');
    const m = text.match(re);
    if (!m) return [];
    return m[2].split('\n').filter(Boolean).map(line => line.trim());
  };
  const parseRow = (line) => line.split(/\s{2,}|\t+/).map(s => s.trim()).filter(Boolean);

  // Lightweight: find blocks beginning with "NAME"
  const blocks = text.split(/(?=^NAME\s+)/m);
  const deployments = [];
  const pods = [];
  const services = [];
  const daemonsets = [];
  for (const block of blocks) {
    if (!/^NAME\s+/.test(block)) continue;
    const lines = block.split('\n').filter(l => l.trim());
    if (!lines.length) continue;
    const header = lines[0].split(/\s{2,}|\t+/).map(h => h.trim());
    const rows = lines.slice(1).map(parseRow).filter(r => r.length >= 2);
    // Detect block type by header
    if (header.includes('READY') && header.includes('UP-TO-DATE')) {
      for (const r of rows) deployments.push({
        name: r[0], ready: r[1], upToDate: r[2], available: r[3], age: r[4]
      });
    } else if (header.includes('READY') && header.includes('STATUS')) {
      for (const r of rows) pods.push({
        name: r[0], ready: r[1], status: r[2], restarts: r[3], age: r[4]
      });
    } else if (header.includes('TYPE') && header.includes('CLUSTER-IP')) {
      for (const r of rows) services.push({
        name: r[0], type: r[1], clusterIp: r[2], externalIp: r[3], ports: r[4], age: r[5]
      });
    } else if (header.includes('DESIRED') && header.includes('CURRENT')) {
      for (const r of rows) daemonsets.push({
        name: r[0], desired: r[1], current: r[2], ready: r[3], upToDate: r[4]
      });
    }
  }
  return { available: true, deployments, pods, services, daemonsets };
}

function parseDockerText(file) {
  const text = safeText(file);
  if (!text) return { available: false, containers: [] };
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !/^CONTAINER\s+/.test(l));
  const containers = lines.map(line => {
    const parts = line.split(/\s{2,}|\t+/);
    return { name: parts[0], image: parts[1], status: parts[2], ports: parts.slice(3).join(' ') };
  });
  return { available: true, containers };
}

// ---------------------------------------------------------------------------
// Prometheus metrics text -> selected app metrics
// ---------------------------------------------------------------------------
function parsePromMetricsText(file) {
  const text = safeText(file);
  if (!text) return { available: false, byRoute: [], features: {}, system: {} };

  // Series we care about (only application metrics — no blackbox / probe).
  const series = parsePromText(text);
  const filtered = series.filter(s => s.name.startsWith('city_transition_'));

  const requestsTotal = filtered.filter(s => s.name === 'city_transition_http_requests_total');
  const errorsTotal = filtered.filter(s => s.name === 'city_transition_http_errors_total');
  const durBuckets = filtered.filter(s => s.name === 'city_transition_http_request_duration_seconds_bucket');
  const durSum = filtered.filter(s => s.name === 'city_transition_http_request_duration_seconds_sum');
  const durCount = filtered.filter(s => s.name === 'city_transition_http_request_duration_seconds_count');
  const features = filtered.filter(s => s.name === 'city_transition_feature_calls_total');
  const upGauge = filtered.find(s => s.name === 'city_transition_up');
  const uptime = filtered.find(s => s.name === 'city_transition_process_uptime_seconds');
  const memBytes = filtered.find(s => s.name === 'city_transition_process_resident_memory_bytes');
  const cpuSec = filtered.find(s => s.name === 'city_transition_process_cpu_seconds_total');
  const eventLoopLag = filtered.find(s => s.name === 'city_transition_nodejs_eventloop_lag_seconds');
  const heapUsed = filtered.find(s => s.name === 'city_transition_nodejs_heap_size_used_bytes');

  // Aggregate per route
  const routeMap = new Map();
  for (const s of requestsTotal) {
    const route = s.labels.route;
    if (!route || route === '/metrics') continue;
    const e = routeMap.get(route) || { route, method: s.labels.method, requests: 0, errors: 0, durSum: 0, durCount: 0, feature: s.labels.feature || '' };
    e.requests += s.value;
    routeMap.set(route, e);
  }
  for (const s of errorsTotal) {
    const e = routeMap.get(s.labels.route);
    if (e) e.errors += s.value;
  }
  for (const s of durSum) {
    const e = routeMap.get(s.labels.route);
    if (e) e.durSum += s.value;
  }
  for (const s of durCount) {
    const e = routeMap.get(s.labels.route);
    if (e) e.durCount += s.value;
  }
  const byRoute = [...routeMap.values()].map(e => ({
    ...e,
    avgResponseMs: e.durCount ? Math.round((e.durSum / e.durCount) * 1000 * 10) / 10 : 0,
    errorRate: e.requests ? Math.round((e.errors / e.requests) * 1000) / 10 : 0
  })).sort((a, b) => b.requests - a.requests);

  const featureMap = {};
  for (const s of features) featureMap[s.labels.feature] = (featureMap[s.labels.feature] || 0) + s.value;

  return {
    available: true,
    byRoute,
    features: featureMap,
    system: {
      up: upGauge ? upGauge.value : null,
      uptimeSeconds: uptime ? uptime.value : null,
      memoryMb: memBytes ? Math.round(memBytes.value / 1024 / 1024 * 10) / 10 : null,
      cpuSeconds: cpuSec ? Math.round(cpuSec.value * 100) / 100 : null,
      eventLoopLagMs: eventLoopLag ? Math.round(eventLoopLag.value * 1000 * 100) / 100 : null,
      heapUsedMb: heapUsed ? Math.round(heapUsed.value / 1024 / 1024 * 10) / 10 : null
    },
    durationBuckets: aggregateBuckets(durBuckets)
  };
}

function parsePromText(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([0-9eE+\-.naif]+)/);
    if (!m) continue;
    const labels = {};
    if (m[3]) {
      for (const kv of splitLabels(m[3])) {
        const eq = kv.indexOf('=');
        if (eq < 0) continue;
        const k = kv.slice(0, eq).trim();
        let v = kv.slice(eq + 1).trim();
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        labels[k] = v;
      }
    }
    const val = parseFloat(m[4]);
    if (!Number.isFinite(val)) continue;
    out.push({ name: m[1], labels, value: val });
  }
  return out;
}
function splitLabels(s) {
  const parts = []; let buf = ''; let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i-1] !== '\\') inStr = !inStr;
    if (c === ',' && !inStr) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  if (buf) parts.push(buf);
  return parts;
}
function aggregateBuckets(samples) {
  const bucketAgg = new Map();
  for (const s of samples) {
    const le = s.labels.le;
    if (le === undefined) continue;
    bucketAgg.set(le, (bucketAgg.get(le) || 0) + s.value);
  }
  const entries = [...bucketAgg.entries()]
    .map(([le, count]) => ({ le, count }))
    .sort((a, b) => parseFloat(a.le) - parseFloat(b.le));
  return entries;
}

module.exports = {
  safeJson,
  safeText,
  parseJestReport,
  mergeJestReports,
  parseEslintReport,
  parseLcov,
  parseNewmanReport,
  parseSonarLog,
  parseKubectlText,
  parseDockerText,
  parsePromMetricsText
};
