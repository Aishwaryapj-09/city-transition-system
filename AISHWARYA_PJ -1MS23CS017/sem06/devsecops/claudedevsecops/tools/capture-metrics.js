#!/usr/bin/env node
/**
 * Capture Prometheus metrics snapshot from the running backend.
 *
 * Tries (in order):
 *   1. http://localhost:30008/metrics  (Kubernetes NodePort)
 *   2. http://localhost:5000/metrics   (Local / Docker)
 *
 * Writes the response body to devsecops-reports/prometheus-metrics-snapshot.txt.
 * Never fails the build — if no endpoint is reachable, writes a
 * placeholder so the downstream dashboard generator can render a
 * graceful "no data" page.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(process.cwd(), 'devsecops-reports');
const OUT_FILE = path.join(OUT_DIR, 'prometheus-metrics-snapshot.txt');

const CANDIDATES = [
  { host: '127.0.0.1', port: 30008, label: 'kubernetes-nodeport' },
  { host: '127.0.0.1', port: 5000,  label: 'local-or-docker'     },
];

function ensureDir(d) {
  try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
}

function fetchMetrics({ host, port }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: '/metrics', method: 'GET', timeout: 4000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`status ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  ensureDir(OUT_DIR);
  for (const target of CANDIDATES) {
    try {
      console.log(`[capture-metrics] trying ${target.label} (${target.host}:${target.port})`);
      const body = await fetchMetrics(target);
      fs.writeFileSync(OUT_FILE, body, 'utf8');
      console.log(`[capture-metrics] OK from ${target.label}, ${body.length} bytes -> ${OUT_FILE}`);
      return;
    } catch (e) {
      console.log(`[capture-metrics] ${target.label} failed: ${e.message}`);
    }
  }
  const placeholder = `# Backend /metrics endpoint was not reachable when this snapshot was captured.
# This file is intentionally written so that the dashboard generator
# produces a graceful "no data" page instead of failing.
`;
  fs.writeFileSync(OUT_FILE, placeholder, 'utf8');
  console.log('[capture-metrics] wrote placeholder snapshot');
}

main().catch((e) => {
  console.error('[capture-metrics] unexpected:', e);
  process.exit(0); // never fail the build
});
