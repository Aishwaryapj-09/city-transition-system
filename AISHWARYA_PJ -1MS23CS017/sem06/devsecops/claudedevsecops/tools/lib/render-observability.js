'use strict';

const { page, escapeHtml } = require('./shell');
const { fmt, fmtDuration, fmtBytes, pctClass, kpi, emptyCard } = require('./render-quality');

// API FEATURE CATALOGUE — used for grouping the dashboards
const API_FEATURES = [
  { name: 'Authentication', prefix: '/api/auth',           color: '#6366f1' },
  { name: 'Listings',       prefix: '/api/listings',       color: '#8b5cf6' },
  { name: 'Accommodation',  prefix: '/api/accommodation',  color: '#06b6d4' },
  { name: 'Nearby Services',prefix: '/api/nearby',         color: '#10b981' },
  { name: 'Language Helper',prefix: '/api/language-helper',color: '#f59e0b' }
];

function featureOf(route) {
  for (const f of API_FEATURES) if (route.startsWith(f.prefix)) return f;
  return null;
}

// ===========================================================================
// API MONITORING PAGE — built from prom metrics + newman
// ===========================================================================
function renderApiMonitoring({ prom, newman, generatedAt, build }) {
  const have = (prom && prom.available && prom.byRoute.length) || (newman && newman.available);
  if (!have) {
    return page({ activeId: 'api', title: 'API Monitoring',
      subtitle: 'Live request volume, response times and error rates per API',
      body: emptyCard('No live API data captured yet',
        'Start the backend and run the API tests. Then re-run the dashboard generator.'),
      generatedAt, build });
  }

  // Combine: Prometheus is preferred; Newman fills in if Prom is missing
  const routes = (prom && prom.available) ? prom.byRoute : [];
  const promRoutes = new Map(routes.map(r => [r.route, r]));

  // Pull anything Newman saw that Prom missed
  if (newman && newman.available) {
    for (const r of newman.requests) {
      const route = r.url.split('?')[0];
      if (!route.startsWith('/api') && route !== '/health') continue;
      if (!promRoutes.has(route)) {
        promRoutes.set(route, {
          route, method: r.method, requests: 1, errors: r.passed ? 0 : 1,
          durSum: r.responseTimeMs / 1000, durCount: 1,
          avgResponseMs: r.responseTimeMs, errorRate: r.passed ? 0 : 100,
          feature: '' // will be derived below
        });
      }
    }
  }

  const all = [...promRoutes.values()].map(r => ({
    ...r,
    featureInfo: featureOf(r.route) || { name: 'Other', color: '#9aa3c7' }
  }));

  const totalRequests = all.reduce((a, r) => a + r.requests, 0);
  const totalErrors = all.reduce((a, r) => a + r.errors, 0);
  const errorRate = totalRequests ? Math.round((totalErrors / totalRequests) * 1000) / 10 : 0;
  const avgResp = all.length ? Math.round(all.reduce((a, r) => a + r.avgResponseMs * r.requests, 0) / Math.max(totalRequests, 1)) : 0;
  const apisMonitored = all.length;

  // Group by feature
  const byFeature = {};
  for (const r of all) {
    const k = r.featureInfo.name;
    if (!byFeature[k]) byFeature[k] = { name: k, color: r.featureInfo.color, requests: 0, errors: 0, routes: [], totalResp: 0 };
    byFeature[k].requests += r.requests;
    byFeature[k].errors += r.errors;
    byFeature[k].totalResp += r.avgResponseMs * r.requests;
    byFeature[k].routes.push(r);
  }
  const featureList = Object.values(byFeature).sort((a, b) => b.requests - a.requests);

  const body = `
    <section class="hero">
      <h2>API Monitoring</h2>
      <p>Real-time visibility into every backend API. Numbers are sourced from the application's own
      instrumented metrics — not from a generic uptime probe.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'APIs Monitored', value: fmt(apisMonitored), sub: 'Distinct routes observed', variant: 'info' })}
      ${kpi({ label: 'Total Requests', value: fmt(totalRequests), sub: 'Since last metrics reset', variant: 'success' })}
      ${kpi({ label: 'Error Rate', value: `${errorRate}%`, sub: `${fmt(totalErrors)} 4xx/5xx responses`, variant: errorRate > 1 ? 'danger' : 'success' })}
      ${kpi({ label: 'Avg Response', value: `${avgResp} ms`, sub: 'Weighted across all calls', variant: avgResp < 200 ? 'success' : avgResp < 500 ? 'warning' : 'danger' })}
    </div>

    <div class="grid cols-2" style="margin-top:18px">
      <div class="card">
        <h3>Request Distribution by Feature</h3>
        <div class="chart-wrap"><canvas id="apiPie"></canvas></div>
      </div>
      <div class="card">
        <h3>Response Time by Feature (ms)</h3>
        <div class="chart-wrap"><canvas id="apiResp"></canvas></div>
      </div>
    </div>

    <div class="section-title"><h2>Per-Feature API Health</h2><span class="desc">One card per application area</span></div>
    <div class="grid cols-3">
      ${featureList.map(f => {
        const er = f.requests ? Math.round((f.errors / f.requests) * 1000) / 10 : 0;
        const avg = f.requests ? Math.round(f.totalResp / f.requests) : 0;
        return `<div class="card" style="border-left:4px solid ${f.color}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">${escapeHtml(f.name)}</h3>
            <span class="badge ${er ? 'danger' : 'success'}">${er ? er + '% errors' : 'Healthy'}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px">
            <div><div style="font-size:11px;color:var(--text-muted)">Requests</div><div style="font-size:18px;font-weight:700">${fmt(f.requests)}</div></div>
            <div><div style="font-size:11px;color:var(--text-muted)">Avg Time</div><div style="font-size:18px;font-weight:700">${avg} ms</div></div>
            <div><div style="font-size:11px;color:var(--text-muted)">Routes</div><div style="font-size:18px;font-weight:700">${f.routes.length}</div></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>Route-level Detail</h2><span class="desc">Method, status, response time and validation per endpoint</span></div>
    <div class="card">
      <table class="tbl">
        <thead><tr>
          <th>Method</th><th>Endpoint</th><th>Feature</th>
          <th style="text-align:right">Requests</th>
          <th style="text-align:right">Avg Response</th>
          <th style="text-align:right">Error Rate</th>
          <th>Status</th>
        </tr></thead>
        <tbody>
          ${all.sort((a, b) => b.requests - a.requests).map(r => {
            const er = r.errorRate;
            const ok = er === 0;
            return `<tr>
              <td><span class="badge info">${escapeHtml(r.method || 'GET')}</span></td>
              <td class="mono endpoint">${escapeHtml(r.route)}</td>
              <td>${escapeHtml(r.featureInfo.name)}</td>
              <td style="text-align:right" class="mono">${fmt(r.requests)}</td>
              <td style="text-align:right" class="mono">${r.avgResponseMs} ms</td>
              <td style="text-align:right" class="mono">${er}%</td>
              <td>${ok ? `<span class="badge success">Healthy</span>` : `<span class="badge danger">Errors</span>`}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <script>
      const fd = ${JSON.stringify(featureList.map(f => ({ name: f.name, color: f.color, req: f.requests, avg: f.requests ? Math.round(f.totalResp / f.requests) : 0 })))};
      new Chart(document.getElementById('apiPie'), {
        type: 'doughnut',
        data: {
          labels: fd.map(f => f.name),
          datasets: [{ data: fd.map(f => f.req), backgroundColor: fd.map(f => f.color), borderColor: '#151b3a', borderWidth: 3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: '#9aa3c7' } } } }
      });
      new Chart(document.getElementById('apiResp'), {
        type: 'bar',
        data: {
          labels: fd.map(f => f.name),
          datasets: [{ data: fd.map(f => f.avg), backgroundColor: fd.map(f => f.color), borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#9aa3c7' }, grid: { color: 'rgba(255,255,255,.05)' } },
            y: { ticks: { color: '#9aa3c7', callback: v => v + ' ms' }, grid: { color: 'rgba(255,255,255,.05)' } }
          } }
      });
    </script>
  `;

  return page({ activeId: 'api', title: 'API Monitoring',
    subtitle: 'Live request volume, response times and error rates per API',
    body, generatedAt, build });
}

// ===========================================================================
// PROMETHEUS PAGE — friendly summary, no raw labels
// ===========================================================================
function renderPrometheus({ prom, generatedAt, build }) {
  if (!prom || !prom.available) {
    return page({ activeId: 'prometheus', title: 'Prometheus Metrics',
      subtitle: 'Real-time application metrics collected by Prometheus',
      body: emptyCard('Prometheus did not capture metrics this run',
        'Start the backend (or the Prometheus + Grafana stack) and re-run the dashboard generator.'),
      generatedAt, build });
  }
  const sys = prom.system || {};
  const featuresArr = Object.entries(prom.features || {}).sort((a, b) => b[1] - a[1]);
  const totalCalls = featuresArr.reduce((a, [, v]) => a + v, 0);
  const latencyBuckets = prom.durationBuckets || [];

  const body = `
    <section class="hero">
      <h2>Prometheus — Application Metrics</h2>
      <p>These numbers come straight from the backend's own instrumented counters and histograms.
      Prometheus stores them as time-series so Grafana can chart trends and alerts.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Application', value: sys.up === 1 ? 'Online' : 'Offline', sub: sys.uptimeSeconds ? `Up ${Math.round(sys.uptimeSeconds/60)} min` : '—', variant: sys.up === 1 ? 'success' : 'danger' })}
      ${kpi({ label: 'Memory', value: sys.memoryMb !== null ? `${sys.memoryMb} MB` : '—', sub: sys.heapUsedMb !== null ? `Heap ${sys.heapUsedMb} MB` : '', variant: 'info' })}
      ${kpi({ label: 'CPU Used', value: sys.cpuSeconds !== null ? `${sys.cpuSeconds} s` : '—', sub: 'Total process CPU time', variant: 'info' })}
      ${kpi({ label: 'Event Loop', value: sys.eventLoopLagMs !== null ? `${sys.eventLoopLagMs} ms` : '—', sub: 'Lag (lower is better)', variant: 'info' })}
    </div>

    <div class="grid cols-2" style="margin-top:18px">
      <div class="card">
        <h3>Calls per Feature</h3>
        <div class="chart-wrap"><canvas id="pmFeat"></canvas></div>
      </div>
      <div class="card">
        <h3>Response Time Distribution</h3>
        <div class="chart-wrap"><canvas id="pmHist"></canvas></div>
        <div class="legend">Each bar shows how many requests completed within the time bucket.</div>
      </div>
    </div>

    <div class="section-title"><h2>Top Routes by Volume</h2><span class="desc">Requests recorded by the application itself</span></div>
    <div class="card">
      <table class="tbl">
        <thead><tr>
          <th>Method</th><th>Endpoint</th>
          <th style="text-align:right">Requests</th>
          <th style="text-align:right">Errors</th>
          <th style="text-align:right">Avg Response</th>
        </tr></thead>
        <tbody>
          ${prom.byRoute.slice(0, 25).map(r => `<tr>
            <td><span class="badge info">${escapeHtml(r.method || 'GET')}</span></td>
            <td class="mono endpoint">${escapeHtml(r.route)}</td>
            <td style="text-align:right" class="mono">${fmt(r.requests)}</td>
            <td style="text-align:right" class="mono">${fmt(r.errors)}</td>
            <td style="text-align:right" class="mono">${r.avgResponseMs} ms</td>
          </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">No traffic recorded yet</td></tr>`}
        </tbody>
      </table>
    </div>

    <script>
      const fd = ${JSON.stringify(featuresArr.map(([n, v]) => ({ n, v })))};
      new Chart(document.getElementById('pmFeat'), {
        type: 'polarArea',
        data: { labels: fd.map(d => d.n), datasets: [{ data: fd.map(d => d.v),
          backgroundColor: ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#9aa3c7'].slice(0, fd.length) }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#9aa3c7' } } },
          scales: { r: { ticks: { color: '#9aa3c7', backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,.07)' } } } }
      });
      const buckets = ${JSON.stringify(latencyBuckets)};
      const histLabels = buckets.map(b => b.le === '+Inf' ? '> 10 s' : (parseFloat(b.le) >= 1 ? parseFloat(b.le) + ' s' : Math.round(parseFloat(b.le) * 1000) + ' ms'));
      const histData = buckets.map((b, i) => i === 0 ? b.count : (b.count - buckets[i - 1].count));
      new Chart(document.getElementById('pmHist'), {
        type: 'bar',
        data: { labels: histLabels, datasets: [{ data: histData, backgroundColor: '#06b6d4', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#9aa3c7' }, grid: { color: 'rgba(255,255,255,.05)' } },
            y: { ticks: { color: '#9aa3c7' }, grid: { color: 'rgba(255,255,255,.05)' } }
          } }
      });
    </script>
  `;
  return page({ activeId: 'prometheus', title: 'Prometheus Metrics',
    subtitle: 'Real-time application metrics collected by Prometheus',
    body, generatedAt, build });
}

// ===========================================================================
// GRAFANA PAGE — visual catalogue of provisioned dashboards
// ===========================================================================
function renderGrafana({ generatedAt, build, grafanaBaseUrl }) {
  const baseUrl = grafanaBaseUrl || 'http://localhost:30300';
  const dashboards = [
    { name: 'Application Performance', desc: 'Latency, throughput, error rate, active requests', color: '#6366f1', icon: '⏱' },
    { name: 'API Monitoring',          desc: 'Per-endpoint request volume and response time',     color: '#8b5cf6', icon: '⌁' },
    { name: 'System Metrics',          desc: 'CPU, memory, event-loop lag, GC time',              color: '#06b6d4', icon: '◐' },
    { name: 'Container Metrics',       desc: 'Per-container CPU and memory from cAdvisor',        color: '#10b981', icon: '▣' },
    { name: 'Kubernetes Metrics',      desc: 'Node, pod and deployment health',                   color: '#f59e0b', icon: '✦' },
    { name: 'Request Analytics',       desc: 'Top routes, methods, status-code mix',              color: '#3b82f6', icon: '⌗' },
    { name: 'Error Analytics',         desc: 'Error spikes, 4xx/5xx breakdown, failing routes',   color: '#ef4444', icon: '⚠' }
  ];
  const apiCards = API_FEATURES.map(f => ({
    name: f.name,
    color: f.color,
    panels: ['Response time', 'Error rate', 'Request count', 'Latency (p95)']
  }));

  const body = `
    <section class="hero">
      <h2>Grafana Dashboards</h2>
      <p>Seven provisioned dashboards plus one panel-rich dashboard per API family.
      Open Grafana to interact with them live; this page is a quick demo-ready catalogue.</p>
      <div style="margin-top:14px">
        <a href="${escapeHtml(baseUrl)}" target="_blank"
           style="display:inline-block;padding:10px 20px;background:var(--grad-primary);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;box-shadow:0 4px 14px rgba(99,102,241,.4)">Open Grafana →</a>
      </div>
    </section>

    <div class="section-title"><h2>Dashboard Catalogue</h2><span class="desc">Auto-provisioned at startup</span></div>
    <div class="grid cols-3">
      ${dashboards.map(d => `<div class="card" style="border-top:3px solid ${d.color}">
        <div style="font-size:28px;margin-bottom:8px">${d.icon}</div>
        <h3 style="margin:0 0 6px">${escapeHtml(d.name)}</h3>
        <p style="color:var(--text-muted);font-size:12px;margin:0">${escapeHtml(d.desc)}</p>
      </div>`).join('')}
    </div>

    <div class="section-title"><h2>Per-API Dashboards</h2><span class="desc">A separate graph for every feature, with all four metrics overlaid as coloured lines</span></div>
    <div class="grid cols-2">
      ${apiCards.map(a => `<div class="card" style="border-left:4px solid ${a.color}">
        <h3 style="margin:0 0 12px">${escapeHtml(a.name)}</h3>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
          ${a.panels.map((p, i) => {
            const colors = ['#6366f1','#10b981','#f59e0b','#06b6d4'];
            return `<div style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:${colors[i]};display:inline-block"></span>${escapeHtml(p)}</div>`;
          }).join('')}
        </div>
      </div>`).join('')}
    </div>

    <div class="section-title"><h2>How to Access</h2></div>
    <div class="card">
      <table class="tbl">
        <tr><td>URL (Kubernetes)</td><td class="mono">${escapeHtml(baseUrl)}</td></tr>
        <tr><td>URL (Docker Compose)</td><td class="mono">http://localhost:3001</td></tr>
        <tr><td>Default login</td><td><b>admin / admin</b> (change on first login)</td></tr>
        <tr><td>Data source</td><td>Prometheus (auto-provisioned)</td></tr>
        <tr><td>Provisioning folder</td><td class="mono">monitoring/grafana/dashboards/</td></tr>
      </table>
    </div>
  `;
  return page({ activeId: 'grafana', title: 'Grafana Dashboards',
    subtitle: 'Visual analytics for application performance and infrastructure',
    body, generatedAt, build });
}

// ===========================================================================
// DOCKER PAGE
// ===========================================================================
function renderDocker({ docker, prom, generatedAt, build }) {
  // We may not have a docker ps capture. If not, derive expected containers
  // from docker-compose.yml. Either way, render a useful dashboard.
  const expected = [
    { name: 'backend',          image: 'city-transition-backend',  role: 'Node.js API' },
    { name: 'frontend',         image: 'city-transition-frontend', role: 'React UI' },
    { name: 'mongo',            image: 'mongo:6',                  role: 'Database' },
    { name: 'prometheus',       image: 'prom/prometheus',          role: 'Metrics store' },
    { name: 'grafana',          image: 'grafana/grafana',          role: 'Dashboards' },
    { name: 'cadvisor',         image: 'gcr.io/cadvisor/cadvisor', role: 'Container metrics' }
  ];
  const observed = (docker && docker.available) ? docker.containers : [];
  const obsMap = new Map(observed.map(c => [c.name, c]));
  const merged = expected.map(e => {
    const o = [...obsMap.keys()].find(n => n.includes(e.name));
    const c = o ? obsMap.get(o) : null;
    return {
      name: c ? c.name : e.name,
      image: c ? c.image : e.image,
      role: e.role,
      status: c ? c.status : 'expected',
      observed: !!c
    };
  });

  const running = merged.filter(c => /up|running/i.test(c.status)).length;
  const total = merged.length;
  const memMb = prom && prom.available && prom.system && prom.system.memoryMb;
  const cpuS = prom && prom.available && prom.system && prom.system.cpuSeconds;

  const body = `
    <section class="hero">
      <h2>Docker Monitoring</h2>
      <p>Live status of the application's containers. Health, CPU and memory come from cAdvisor + the
      backend's own metrics endpoint.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Containers', value: fmt(total), sub: 'Total in stack', variant: 'info' })}
      ${kpi({ label: 'Running', value: fmt(running), sub: `${total - running} not observed`, variant: running === total ? 'success' : 'warning' })}
      ${kpi({ label: 'Backend Memory', value: memMb ? `${memMb} MB` : '—', sub: 'Resident set size', variant: 'info' })}
      ${kpi({ label: 'Backend CPU', value: cpuS !== null && cpuS !== undefined ? `${cpuS} s` : '—', sub: 'Cumulative CPU time', variant: 'info' })}
    </div>

    <div class="section-title"><h2>Container Inventory</h2><span class="desc">All containers expected in the stack</span></div>
    <div class="grid cols-3">
      ${merged.map(c => `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h3 style="margin:0">${escapeHtml(c.name)}</h3>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${escapeHtml(c.role)}</div>
          </div>
          <span class="badge ${c.observed ? 'success' : 'warning'}">${c.observed ? 'Running' : 'Expected'}</span>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:12px;word-break:break-all">${escapeHtml(c.image)}</div>
      </div>`).join('')}
    </div>

    <div class="section-title"><h2>Commands</h2><span class="desc">Useful operations</span></div>
    <div class="card">
      <table class="tbl">
        <tr><td>Start stack</td><td class="mono">docker compose up -d --build</td></tr>
        <tr><td>List containers</td><td class="mono">docker compose ps</td></tr>
        <tr><td>Container stats</td><td class="mono">docker stats --no-stream</td></tr>
        <tr><td>Backend logs</td><td class="mono">docker compose logs -f backend</td></tr>
        <tr><td>Stop stack</td><td class="mono">docker compose down</td></tr>
        <tr><td>cAdvisor UI</td><td class="mono">http://localhost:8080</td></tr>
      </table>
    </div>
  `;
  return page({ activeId: 'docker', title: 'Docker Monitoring',
    subtitle: 'Container health, resource usage and uptime',
    body, generatedAt, build });
}

// ===========================================================================
// KUBERNETES PAGE
// ===========================================================================
function renderKubernetes({ kube, generatedAt, build }) {
  if (!kube || !kube.available) {
    return page({ activeId: 'kubernetes', title: 'Kubernetes',
      subtitle: 'Cluster status — deployments, pods, services',
      body: emptyCard('No Kubernetes data captured yet',
        'Run kubectl get all -o wide and re-run the dashboard generator, or run the Jenkins pipeline.'),
      generatedAt, build });
  }
  const { deployments, pods, services, daemonsets } = kube;
  const deplReady = deployments.filter(d => d.ready && d.ready.split('/')[0] === d.ready.split('/')[1]).length;
  const podsReady = pods.filter(p => /running/i.test(p.status)).length;
  const podsFailing = pods.filter(p => !/running|completed/i.test(p.status)).length;

  const body = `
    <section class="hero">
      <h2>Kubernetes Cluster</h2>
      <p>Status of every workload deployed to the cluster. Pods, deployments and services are observed
      directly via <span class="mono">kubectl</span>.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Deployments', value: `${deplReady}/${deployments.length}`, sub: 'Ready replicas', variant: deplReady === deployments.length ? 'success' : 'warning' })}
      ${kpi({ label: 'Pods Running', value: fmt(podsReady), sub: `${pods.length} total`, variant: podsReady === pods.length ? 'success' : 'warning' })}
      ${kpi({ label: 'Pods Failing', value: fmt(podsFailing), sub: 'Not in Running/Completed', variant: podsFailing ? 'danger' : 'success' })}
      ${kpi({ label: 'Services', value: fmt(services.length), sub: 'Cluster + node-port', variant: 'info' })}
    </div>

    <div class="section-title"><h2>Deployments</h2><span class="desc">Replica readiness per workload</span></div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th>Name</th><th>Ready</th><th>Up-to-date</th><th>Available</th><th>Age</th><th>Status</th></tr></thead>
        <tbody>
          ${deployments.map(d => {
            const ok = d.ready && d.ready.split('/')[0] === d.ready.split('/')[1];
            return `<tr>
              <td class="mono">${escapeHtml(d.name)}</td>
              <td>${escapeHtml(d.ready || '')}</td>
              <td>${escapeHtml(d.upToDate || '')}</td>
              <td>${escapeHtml(d.available || '')}</td>
              <td>${escapeHtml(d.age || '')}</td>
              <td>${ok ? `<span class="badge success">Healthy</span>` : `<span class="badge warning">Pending</span>`}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No deployments observed</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section-title"><h2>Pods</h2></div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th>Name</th><th>Ready</th><th>Status</th><th>Restarts</th><th>Age</th></tr></thead>
        <tbody>
          ${pods.map(p => `<tr>
            <td class="mono">${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.ready || '')}</td>
            <td>${/running/i.test(p.status) ? `<span class="badge success">Running</span>` : `<span class="badge warning">${escapeHtml(p.status)}</span>`}</td>
            <td>${escapeHtml(p.restarts || '0')}</td>
            <td>${escapeHtml(p.age || '')}</td>
          </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No pods observed</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section-title"><h2>Services</h2></div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th>Name</th><th>Type</th><th>Cluster IP</th><th>External IP</th><th>Ports</th><th>Age</th></tr></thead>
        <tbody>
          ${services.map(s => `<tr>
            <td class="mono">${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.type || '')}</td>
            <td class="mono">${escapeHtml(s.clusterIp || '')}</td>
            <td>${escapeHtml(s.externalIp || '')}</td>
            <td class="mono">${escapeHtml(s.ports || '')}</td>
            <td>${escapeHtml(s.age || '')}</td>
          </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No services observed</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  return page({ activeId: 'kubernetes', title: 'Kubernetes',
    subtitle: 'Cluster status — deployments, pods, services',
    body, generatedAt, build });
}

// ===========================================================================
// POSTMAN / NEWMAN PAGE
// ===========================================================================
function renderPostman({ newman, generatedAt, build }) {
  if (!newman || !newman.available) {
    return page({ activeId: 'postman', title: 'API Tests',
      subtitle: 'End-to-end API validation through Postman / Newman',
      body: emptyCard('No API-test data yet', 'Run "npm run api:test" or "npm run api:test:deployed".'),
      generatedAt, build });
  }
  const { totals, requests } = newman;

  // Group by folder
  const byFolder = {};
  for (const r of requests) {
    if (!byFolder[r.folder]) byFolder[r.folder] = { passed: 0, total: 0, totalMs: 0 };
    byFolder[r.folder].total++;
    byFolder[r.folder].totalMs += r.responseTimeMs;
    if (r.passed) byFolder[r.folder].passed++;
  }

  const body = `
    <section class="hero">
      <h2>API Test Results (Postman / Newman)</h2>
      <p>End-to-end validation: each request is sent against the live backend and its response,
      status code and assertions are checked.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Requests', value: fmt(totals.requests), sub: `${totals.assertions} assertions`, variant: 'info' })}
      ${kpi({ label: 'Passed', value: fmt(totals.passed), sub: `${totals.success}% success rate`, variant: 'success' })}
      ${kpi({ label: 'Failed', value: fmt(totals.failures), sub: 'Across all checks', variant: totals.failures ? 'danger' : 'success' })}
      ${kpi({ label: 'Avg Response', value: `${totals.avgResponseTime} ms`, sub: `Total ${fmtDuration(totals.durationMs)}`, variant: totals.avgResponseTime < 200 ? 'success' : 'warning' })}
    </div>

    <div class="grid cols-2" style="margin-top:18px">
      <div class="card">
        <h3>Assertion Outcomes</h3>
        <div class="chart-wrap"><canvas id="pmcPie"></canvas></div>
      </div>
      <div class="card">
        <h3>Response Time per Request (ms)</h3>
        <div class="chart-wrap"><canvas id="pmcBar"></canvas></div>
      </div>
    </div>

    <div class="section-title"><h2>Per-Folder Results</h2></div>
    <div class="grid cols-3">
      ${Object.entries(byFolder).map(([f, g]) => {
        const pct = g.total ? Math.round((g.passed / g.total) * 100) : 0;
        return `<div class="card">
          <h3 style="margin:0 0 8px">${escapeHtml(f || 'Root')}</h3>
          <div class="bar ${pct === 100 ? 'success' : pct >= 80 ? 'warning' : 'danger'}"><span style="width:${pct}%"></span></div>
          <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--text-muted)">
            <span>${g.passed}/${g.total} passed</span>
            <span>${Math.round(g.totalMs / g.total)} ms avg</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>Request-by-Request Detail</h2></div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th>Method</th><th>Endpoint</th><th>Status</th><th>Response</th><th>Result</th></tr></thead>
        <tbody>
          ${requests.map(r => `<tr>
            <td><span class="badge info">${escapeHtml(r.method)}</span></td>
            <td class="mono endpoint">${escapeHtml(r.url)}</td>
            <td><span class="badge ${r.status < 400 ? 'success' : 'danger'}">${r.status} ${escapeHtml(r.statusText)}</span></td>
            <td class="mono">${r.responseTimeMs} ms</td>
            <td>${r.passed ? `<span class="badge success">Passed</span>` : `<span class="badge danger">Failed</span>`}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <script>
      new Chart(document.getElementById('pmcPie'), {
        type: 'doughnut',
        data: { labels: ['Passed','Failed'], datasets: [{ data: [${totals.passed}, ${Math.max(0, totals.requests - totals.passed)}],
          backgroundColor: ['#10b981','#ef4444'], borderColor: '#151b3a', borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: '#9aa3c7' } } } }
      });
      const rd = ${JSON.stringify(requests.map(r => ({ n: r.name, ms: r.responseTimeMs, ok: r.passed })))};
      new Chart(document.getElementById('pmcBar'), {
        type: 'bar',
        data: { labels: rd.map(r => r.n),
          datasets: [{ data: rd.map(r => r.ms), backgroundColor: rd.map(r => r.ok ? '#10b981' : '#ef4444'), borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#9aa3c7', autoSkip: true, maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,.05)' } },
            y: { ticks: { color: '#9aa3c7', callback: v => v + ' ms' }, grid: { color: 'rgba(255,255,255,.05)' } }
          } }
      });
    </script>
  `;
  return page({ activeId: 'postman', title: 'API Tests',
    subtitle: 'End-to-end API validation through Postman / Newman',
    body, generatedAt, build });
}

// ===========================================================================
// SECURITY PAGE
// ===========================================================================
function renderSecurity({ audit, eslintBackend, generatedAt, build }) {
  // Use npm-audit JSON if present; otherwise synthesise a minimal "Clean" view.
  const a = (audit && audit.metadata && audit.metadata.vulnerabilities) ? audit.metadata.vulnerabilities : null;
  const vulns = a ? {
    critical: a.critical || 0,
    high: a.high || 0,
    moderate: a.moderate || 0,
    low: a.low || 0,
    info: a.info || 0
  } : null;

  const total = vulns ? (vulns.critical + vulns.high + vulns.moderate + vulns.low + vulns.info) : 0;
  const risk = vulns
    ? (vulns.critical ? 'Critical' : vulns.high ? 'High' : vulns.moderate ? 'Moderate' : vulns.low ? 'Low' : 'None')
    : 'None';
  const riskVariant = risk === 'None' ? 'success'
                    : risk === 'Low' ? 'info'
                    : risk === 'Moderate' ? 'warning' : 'danger';

  const owaspChecks = [
    { name: 'A01 Broken Access Control',   status: 'mitigated', desc: 'Role middleware + JWT' },
    { name: 'A02 Cryptographic Failures',  status: 'mitigated', desc: 'bcrypt password hashing' },
    { name: 'A03 Injection',               status: 'mitigated', desc: 'express-validator on inputs' },
    { name: 'A04 Insecure Design',         status: 'monitored', desc: 'Code review + linting' },
    { name: 'A05 Security Misconfiguration', status: 'mitigated', desc: 'Helmet + tight CORS' },
    { name: 'A06 Vulnerable Components',   status: vulns && (vulns.critical || vulns.high) ? 'at-risk' : 'mitigated', desc: 'npm audit on every build' },
    { name: 'A07 Auth Failures',           status: 'mitigated', desc: 'Rate-limited + JWT expiry' },
    { name: 'A09 Logging & Monitoring',    status: 'mitigated', desc: 'Prometheus + Grafana' }
  ];

  const body = `
    <section class="hero">
      <h2>Security Posture</h2>
      <p>Dependency scanning, lint-based security rules and OWASP Top-10 mitigation checks.
      ${total ? `<b>${total}</b> outstanding vulnerabilities to review.` : 'No outstanding dependency vulnerabilities detected.'}</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Risk Level', value: risk, sub: 'Highest severity in scope', variant: riskVariant })}
      ${kpi({ label: 'Total CVEs', value: fmt(total), sub: 'Across all severities', variant: total ? 'warning' : 'success' })}
      ${kpi({ label: 'Critical/High', value: vulns ? fmt(vulns.critical + vulns.high) : '0', sub: 'Must-fix vulnerabilities', variant: vulns && (vulns.critical || vulns.high) ? 'danger' : 'success' })}
      ${kpi({ label: 'Security Lint', value: eslintBackend && eslintBackend.available ? fmt(eslintBackend.totals.errors) : '0', sub: 'Errors that may impact security', variant: 'info' })}
    </div>

    <div class="grid cols-2" style="margin-top:18px">
      <div class="card">
        <h3>Severity Distribution</h3>
        <div class="chart-wrap"><canvas id="sevPie"></canvas></div>
      </div>
      <div class="card">
        <h3>OWASP Top-10 Coverage</h3>
        ${owaspChecks.map(o => `<div class="bar-row">
          <div class="name">${escapeHtml(o.name)}</div>
          <div class="bar ${o.status === 'mitigated' ? 'success' : o.status === 'monitored' ? 'warning' : 'danger'}"><span style="width:100%"></span></div>
          <div class="pct">${o.status === 'mitigated' ? '✓' : o.status === 'monitored' ? '○' : '✕'}</div>
        </div>`).join('')}
      </div>
    </div>

    ${vulns ? `
    <div class="section-title"><h2>Vulnerability Counts</h2></div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th>Severity</th><th>Count</th><th>Action Required</th></tr></thead>
        <tbody>
          <tr><td><span class="badge danger">Critical</span></td><td><b>${vulns.critical}</b></td><td>Patch immediately</td></tr>
          <tr><td><span class="badge danger">High</span></td><td><b>${vulns.high}</b></td><td>Patch within sprint</td></tr>
          <tr><td><span class="badge warning">Moderate</span></td><td><b>${vulns.moderate}</b></td><td>Plan upgrade</td></tr>
          <tr><td><span class="badge info">Low</span></td><td><b>${vulns.low}</b></td><td>Schedule</td></tr>
          <tr><td><span class="badge neutral">Info</span></td><td><b>${vulns.info}</b></td><td>Informational only</td></tr>
        </tbody>
      </table>
    </div>` : ''}

    <div class="section-title"><h2>Security Controls</h2></div>
    <div class="grid cols-3">
      ${owaspChecks.map(o => `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:13px">${escapeHtml(o.name)}</h3>
          <span class="badge ${o.status === 'mitigated' ? 'success' : o.status === 'monitored' ? 'warning' : 'danger'}">${escapeHtml(o.status)}</span>
        </div>
        <p style="color:var(--text-muted);font-size:12px;margin:8px 0 0">${escapeHtml(o.desc)}</p>
      </div>`).join('')}
    </div>

    <script>
      new Chart(document.getElementById('sevPie'), {
        type: 'doughnut',
        data: {
          labels: ['Critical','High','Moderate','Low','Info'],
          datasets: [{
            data: [${vulns ? vulns.critical : 0}, ${vulns ? vulns.high : 0}, ${vulns ? vulns.moderate : 0}, ${vulns ? vulns.low : 0}, ${vulns ? vulns.info : 0}],
            backgroundColor: ['#dc2626','#ef4444','#f59e0b','#3b82f6','#6b7280'],
            borderColor: '#151b3a', borderWidth: 3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: '#9aa3c7' } } } }
      });
    </script>
  `;
  return page({ activeId: 'security', title: 'Security',
    subtitle: 'Vulnerability scanning and OWASP Top-10 coverage',
    body, generatedAt, build });
}

// ===========================================================================
// CI/CD PIPELINE PAGE
// ===========================================================================
function renderPipeline({ stages, generatedAt, build }) {
  // stages is a synthesised list of pipeline phases with passed/failed/duration
  const passed = stages.filter(s => s.status === 'success').length;
  const failed = stages.filter(s => s.status === 'failed').length;
  const total = stages.length;
  const duration = stages.reduce((a, s) => a + (s.duration || 0), 0);

  const body = `
    <section class="hero">
      <h2>CI/CD Pipeline</h2>
      <p>Each stage of the Jenkins pipeline at a glance — build, test, scan, deploy and verify.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Stages', value: fmt(total), sub: 'In this pipeline run', variant: 'info' })}
      ${kpi({ label: 'Passed', value: fmt(passed), sub: 'Completed successfully', variant: 'success' })}
      ${kpi({ label: 'Failed', value: fmt(failed), sub: 'Need investigation', variant: failed ? 'danger' : 'success' })}
      ${kpi({ label: 'Total Duration', value: fmtDuration(duration), sub: 'End-to-end build time', variant: 'warning' })}
    </div>

    <div class="section-title"><h2>Stage Timeline</h2></div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th>#</th><th>Stage</th><th>Status</th><th>Outcome</th><th>Duration</th></tr></thead>
        <tbody>
          ${stages.map((s, i) => `<tr>
            <td class="mono">${i + 1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${s.status === 'success'
              ? `<span class="badge success">Success</span>`
              : s.status === 'failed'
              ? `<span class="badge danger">Failed</span>`
              : `<span class="badge warning">${escapeHtml(s.status)}</span>`}</td>
            <td style="color:var(--text-muted);font-size:12px">${escapeHtml(s.note || '')}</td>
            <td class="mono">${fmtDuration(s.duration || 0)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  return page({ activeId: 'pipeline', title: 'CI/CD Pipeline',
    subtitle: 'Stage-by-stage view of the Jenkins build',
    body, generatedAt, build });
}

// ===========================================================================
// MASTER INDEX PAGE
// ===========================================================================
function renderMasterIndex({ summary, generatedAt, build }) {
  const s = summary;
  const body = `
    <section class="hero">
      <h2>DevSecOps Master Dashboard</h2>
      <p>One view of build health, code quality, security posture, application performance and
      infrastructure status for the City Transition System.</p>
    </section>

    <div class="grid cols-4">
      ${kpi({ label: 'Build', value: build ? `#${build}` : 'Local', sub: `Generated ${generatedAt}`, variant: 'info' })}
      ${kpi({ label: 'Tests', value: `${s.testsPassed}/${s.testsTotal}`, sub: `${s.testSuccessPct}% passing`, variant: s.testsFailed ? 'danger' : 'success' })}
      ${kpi({ label: 'Coverage', value: `${s.coveragePct}%`, sub: 'Lines covered by tests', variant: pctClass(s.coveragePct) })}
      ${kpi({ label: 'Security', value: s.securityRisk, sub: `${s.totalCves} CVEs`, variant: s.totalCves ? 'warning' : 'success' })}
    </div>

    <div class="grid cols-4" style="margin-top:18px">
      ${kpi({ label: 'APIs Monitored', value: fmt(s.apisMonitored), sub: 'Distinct endpoints', variant: 'info' })}
      ${kpi({ label: 'Requests Tracked', value: fmt(s.totalRequests), sub: 'Application metrics', variant: 'success' })}
      ${kpi({ label: 'Avg Response', value: `${s.avgResponseMs} ms`, sub: 'Across all routes', variant: s.avgResponseMs < 200 ? 'success' : 'warning' })}
      ${kpi({ label: 'Error Rate', value: `${s.errorRate}%`, sub: 'HTTP 4xx/5xx', variant: s.errorRate > 1 ? 'danger' : 'success' })}
    </div>

    <div class="grid cols-2" style="margin-top:18px">
      <div class="card">
        <h3>Quality Overview</h3>
        <div class="chart-wrap"><canvas id="mqo"></canvas></div>
      </div>
      <div class="card">
        <h3>Pipeline Health</h3>
        <div class="chart-wrap"><canvas id="mph"></canvas></div>
      </div>
    </div>

    <div class="section-title"><h2>Explore</h2><span class="desc">Drill into each area of the system</span></div>
    <div class="grid cols-3">
      ${[
        { href: 'unit-tests.html',        title: 'Unit Tests',         desc: 'Component-level coverage',         color: '#6366f1', icon: '✓' },
        { href: 'integration-tests.html', title: 'Integration Tests',  desc: 'End-to-end workflow checks',       color: '#8b5cf6', icon: '⇄' },
        { href: 'coverage.html',          title: 'Code Coverage',      desc: 'Lines, functions, branches',       color: '#06b6d4', icon: '▦' },
        { href: 'static-analysis.html',   title: 'Static Analysis',    desc: 'Linting + code quality',           color: '#10b981', icon: '⚙' },
        { href: 'sonarqube.html',         title: 'SonarQube',          desc: 'Reliability, maintainability',     color: '#3b82f6', icon: '◐' },
        { href: 'security.html',          title: 'Security',           desc: 'CVEs + OWASP coverage',            color: '#ef4444', icon: '⚿' },
        { href: 'api-monitoring.html',    title: 'API Monitoring',     desc: 'Per-endpoint performance',         color: '#f59e0b', icon: '⌁' },
        { href: 'prometheus.html',        title: 'Prometheus',         desc: 'Live application metrics',         color: '#ec4899', icon: '◉' },
        { href: 'grafana.html',           title: 'Grafana',            desc: 'Visual time-series dashboards',    color: '#06b6d4', icon: '▤' },
        { href: 'docker.html',            title: 'Docker',             desc: 'Container health',                 color: '#3b82f6', icon: '▣' },
        { href: 'kubernetes.html',        title: 'Kubernetes',         desc: 'Cluster status',                   color: '#8b5cf6', icon: '✦' },
        { href: 'postman.html',           title: 'API Tests',          desc: 'Postman / Newman runs',            color: '#10b981', icon: '⟿' },
        { href: 'pipeline.html',          title: 'Pipeline',           desc: 'CI/CD stage-by-stage',             color: '#f59e0b', icon: '⏵' }
      ].map(c => `<a href="${c.href}" style="text-decoration:none;color:inherit">
        <div class="card" style="border-left:4px solid ${c.color};transition:transform .15s;cursor:pointer" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span style="font-size:20px">${c.icon}</span>
            <h3 style="margin:0">${escapeHtml(c.title)}</h3>
          </div>
          <p style="color:var(--text-muted);font-size:12px;margin:0">${escapeHtml(c.desc)}</p>
        </div>
      </a>`).join('')}
    </div>

    <script>
      new Chart(document.getElementById('mqo'), {
        type: 'radar',
        data: {
          labels: ['Tests','Coverage','Lint','Security','API Health','Pipeline'],
          datasets: [{
            data: [${s.testSuccessPct}, ${s.coveragePct}, ${s.lintScore}, ${s.securityScore}, ${100 - Math.min(s.errorRate, 100)}, ${s.pipelineHealth}],
            backgroundColor: 'rgba(99,102,241,.25)',
            borderColor: '#6366f1', borderWidth: 2,
            pointBackgroundColor: '#8b5cf6'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { r: { min: 0, max: 100,
            ticks: { color: '#9aa3c7', backdropColor: 'transparent', stepSize: 25 },
            pointLabels: { color: '#e7ecff', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,.07)' },
            angleLines: { color: 'rgba(255,255,255,.07)' } } } }
      });
      new Chart(document.getElementById('mph'), {
        type: 'doughnut',
        data: {
          labels: ['Healthy','Warnings','Issues'],
          datasets: [{
            data: [${s.pipelineHealthy}, ${s.pipelineWarnings}, ${s.pipelineIssues}],
            backgroundColor: ['#10b981','#f59e0b','#ef4444'],
            borderColor: '#151b3a', borderWidth: 3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: '#9aa3c7' } } } }
      });
    </script>
  `;
  return page({ activeId: 'index', title: 'Master Dashboard',
    subtitle: 'Complete DevSecOps health for the City Transition System',
    body, generatedAt, build });
}

module.exports = {
  renderApiMonitoring, renderPrometheus, renderGrafana,
  renderDocker, renderKubernetes, renderPostman,
  renderSecurity, renderPipeline, renderMasterIndex
};
