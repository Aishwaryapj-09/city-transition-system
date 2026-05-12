'use strict';

/**
 * Shared shell + design tokens for every City Transition DevSecOps dashboard.
 * Every page consumes the same CSS so reports look like one product.
 */

const SHELL_CSS = `
:root {
  --bg: #0b1020;
  --bg-2: #0f1530;
  --surface: #151b3a;
  --surface-2: #1a2147;
  --border: #2a335c;
  --text: #e7ecff;
  --text-muted: #9aa3c7;
  --text-dim: #6b73a0;
  --primary: #6366f1;
  --primary-2: #8b5cf6;
  --success: #10b981;
  --success-2: #34d399;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;
  --accent: #06b6d4;
  --grad-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --grad-success: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  --grad-warning: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  --grad-danger: linear-gradient(135deg, #ef4444 0%, #ec4899 100%);
  --grad-info: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  --shadow-sm: 0 1px 3px rgba(0,0,0,.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,.35);
  --shadow-lg: 0 12px 40px rgba(0,0,0,.4);
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  background-image:
    radial-gradient(at 12% 8%, rgba(99,102,241,.18) 0, transparent 45%),
    radial-gradient(at 88% 92%, rgba(139,92,246,.18) 0, transparent 45%),
    radial-gradient(at 50% 50%, rgba(6,182,212,.06) 0, transparent 55%);
  color: var(--text);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.55;
}

.layout { display: flex; min-height: 100vh; }

/* ---------- Sidebar ---------- */
.sidebar {
  width: 260px;
  background: rgba(15, 21, 48, 0.85);
  backdrop-filter: blur(10px);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  flex-shrink: 0;
}
.sidebar .brand {
  display: flex; align-items: center; gap: 10px;
  padding: 0 8px 20px; margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.sidebar .brand .logo {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--grad-primary);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; color: #fff; font-size: 16px;
  box-shadow: 0 4px 14px rgba(99,102,241,.4);
}
.sidebar .brand .name { font-weight: 700; font-size: 14px; }
.sidebar .brand .sub { font-size: 11px; color: var(--text-muted); }
.nav-section { margin-top: 18px; }
.nav-section .label {
  text-transform: uppercase; letter-spacing: 1px;
  color: var(--text-dim); font-size: 10px; font-weight: 700;
  padding: 0 10px 8px;
}
.nav-link {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  color: var(--text-muted); text-decoration: none;
  font-size: 13px; font-weight: 500;
  transition: all .15s ease;
  margin-bottom: 2px;
}
.nav-link:hover { background: rgba(99,102,241,.10); color: var(--text); }
.nav-link.active {
  background: var(--grad-primary); color: #fff;
  box-shadow: 0 4px 14px rgba(99,102,241,.35);
}
.nav-link .ico { width: 18px; text-align: center; opacity: .9; }

/* ---------- Main ---------- */
.main { flex: 1; padding: 28px 36px 60px; min-width: 0; }
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 28px;
}
.topbar h1 { font-size: 22px; margin: 0; font-weight: 700; }
.topbar .crumb { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
.topbar .meta { color: var(--text-muted); font-size: 12px; text-align: right; }
.topbar .meta b { color: var(--text); font-weight: 600; }

/* ---------- Cards ---------- */
.grid { display: grid; gap: 18px; }
.grid.cols-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
.grid.cols-3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
.grid.cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
.grid.cols-6 { grid-template-columns: repeat(6, minmax(0,1fr)); }
@media (max-width: 1100px) {
  .grid.cols-4, .grid.cols-6 { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .grid.cols-3 { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 720px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: relative; }
  .main { padding: 20px; }
  .grid.cols-2, .grid.cols-3, .grid.cols-4, .grid.cols-6 { grid-template-columns: 1fr; }
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.card.glow { box-shadow: var(--shadow-md), 0 0 0 1px rgba(99,102,241,.15); }
.card h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; color: var(--text); }
.card .sub { color: var(--text-muted); font-size: 12px; margin-top: -8px; margin-bottom: 12px; }

/* KPI card */
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
}
.kpi::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--grad-primary);
}
.kpi.success::before { background: var(--grad-success); }
.kpi.warning::before { background: var(--grad-warning); }
.kpi.danger::before  { background: var(--grad-danger); }
.kpi.info::before    { background: var(--grad-info); }
.kpi .label {
  color: var(--text-muted); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .8px;
}
.kpi .value {
  font-size: 30px; font-weight: 700; margin-top: 8px;
  font-variant-numeric: tabular-nums; letter-spacing: -.5px;
}
.kpi .delta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.kpi .delta.up { color: var(--success); }
.kpi .delta.down { color: var(--danger); }

/* ---------- Badges ---------- */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 600;
  border: 1px solid transparent;
}
.badge.success { background: rgba(16,185,129,.15); color: var(--success-2); border-color: rgba(16,185,129,.3); }
.badge.danger  { background: rgba(239,68,68,.15);  color: #fca5a5;          border-color: rgba(239,68,68,.3); }
.badge.warning { background: rgba(245,158,11,.15); color: #fcd34d;          border-color: rgba(245,158,11,.3); }
.badge.info    { background: rgba(59,130,246,.15); color: #93c5fd;          border-color: rgba(59,130,246,.3); }
.badge.neutral { background: rgba(154,163,199,.12); color: var(--text-muted); border-color: var(--border); }

/* ---------- Progress ---------- */
.bar { height: 10px; background: var(--bg-2); border-radius: 999px; overflow: hidden; }
.bar > span { display: block; height: 100%; border-radius: 999px; background: var(--grad-primary); transition: width .6s ease; }
.bar.success > span { background: var(--grad-success); }
.bar.warning > span { background: var(--grad-warning); }
.bar.danger > span  { background: var(--grad-danger); }
.bar-row { display: grid; grid-template-columns: 180px 1fr 60px; gap: 12px; align-items: center; margin: 8px 0; font-size: 13px; }
.bar-row .name { color: var(--text); font-weight: 500; }
.bar-row .pct { text-align: right; color: var(--text-muted); font-variant-numeric: tabular-nums; }

/* ---------- Tables ---------- */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th, .tbl td {
  padding: 11px 14px; text-align: left;
  border-bottom: 1px solid var(--border);
}
.tbl th {
  font-weight: 600; color: var(--text-muted); font-size: 11px;
  text-transform: uppercase; letter-spacing: .6px;
  background: rgba(255,255,255,0.02);
}
.tbl tr:hover td { background: rgba(99,102,241,.04); }
.tbl tr:last-child td { border-bottom: none; }
.tbl .mono { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 12px; }
.tbl .endpoint { color: var(--accent); }

/* ---------- Misc ---------- */
.hero {
  background: linear-gradient(135deg, rgba(99,102,241,.16) 0%, rgba(139,92,246,.10) 100%);
  border: 1px solid rgba(99,102,241,.3);
  border-radius: var(--radius-lg); padding: 24px 28px; margin-bottom: 24px;
}
.hero h2 { margin: 0 0 8px; font-size: 20px; }
.hero p  { margin: 0; color: var(--text-muted); max-width: 80ch; }

.section-title {
  display: flex; align-items: center; justify-content: space-between;
  margin: 26px 0 14px;
}
.section-title h2 { margin: 0; font-size: 16px; font-weight: 600; }
.section-title .desc { color: var(--text-muted); font-size: 12px; }

.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }

.empty {
  padding: 28px; text-align: center; color: var(--text-muted);
  border: 1px dashed var(--border); border-radius: var(--radius);
}
.empty h4 { margin: 0 0 6px; color: var(--text); }

footer {
  margin-top: 40px; padding-top: 18px;
  border-top: 1px solid var(--border);
  color: var(--text-dim); font-size: 11px; text-align: center;
}
.chart-wrap { position: relative; height: 280px; }
.chart-wrap.tall { height: 360px; }
.chart-wrap.short { height: 200px; }
`;

const NAV_ITEMS = [
  { id: 'index',       href: 'index.html',           label: 'Master Dashboard',  ico: '◆', section: 'Overview' },
  { id: 'unit',        href: 'unit-tests.html',      label: 'Unit Testing',      ico: '✓', section: 'Quality' },
  { id: 'integration', href: 'integration-tests.html', label: 'Integration Testing', ico: '⇄', section: 'Quality' },
  { id: 'coverage',    href: 'coverage.html',        label: 'Code Coverage',     ico: '▦', section: 'Quality' },
  { id: 'eslint',      href: 'static-analysis.html', label: 'Static Analysis',   ico: '⚙', section: 'Quality' },
  { id: 'sonar',       href: 'sonarqube.html',       label: 'SonarQube',         ico: '◐', section: 'Quality' },
  { id: 'security',    href: 'security.html',        label: 'Security',          ico: '⚿', section: 'Security' },
  { id: 'api',         href: 'api-monitoring.html',  label: 'API Monitoring',    ico: '⌁', section: 'Observability' },
  { id: 'prometheus',  href: 'prometheus.html',      label: 'Prometheus Metrics',ico: '◉', section: 'Observability' },
  { id: 'grafana',     href: 'grafana.html',         label: 'Grafana Dashboards',ico: '▤', section: 'Observability' },
  { id: 'docker',      href: 'docker.html',          label: 'Docker',            ico: '▣', section: 'Infrastructure' },
  { id: 'kubernetes',  href: 'kubernetes.html',      label: 'Kubernetes',        ico: '✦', section: 'Infrastructure' },
  { id: 'postman',     href: 'postman.html',         label: 'API Tests (Postman)', ico: '⟿', section: 'Infrastructure' },
  { id: 'pipeline',    href: 'pipeline.html',        label: 'CI/CD Pipeline',    ico: '⏵', section: 'Delivery' }
];

function renderSidebar(activeId) {
  const sections = {};
  for (const item of NAV_ITEMS) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }
  let html = `
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">CT</div>
        <div>
          <div class="name">City Transition</div>
          <div class="sub">DevSecOps Hub</div>
        </div>
      </div>
  `;
  for (const [section, items] of Object.entries(sections)) {
    html += `<div class="nav-section"><div class="label">${section}</div>`;
    for (const it of items) {
      const cls = it.id === activeId ? 'nav-link active' : 'nav-link';
      html += `<a class="${cls}" href="${it.href}"><span class="ico">${it.ico}</span><span>${it.label}</span></a>`;
    }
    html += `</div>`;
  }
  html += `</aside>`;
  return html;
}

function page({ activeId, title, subtitle, body, generatedAt, build }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} — City Transition DevSecOps</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<style>${SHELL_CSS}</style>
</head>
<body>
<div class="layout">
  ${renderSidebar(activeId)}
  <main class="main">
    <header class="topbar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="crumb">${escapeHtml(subtitle || '')}</div>
      </div>
      <div class="meta">
        <div>Generated <b>${escapeHtml(generatedAt)}</b></div>
        ${build ? `<div>Build <b>#${escapeHtml(String(build))}</b></div>` : ''}
      </div>
    </header>
    ${body}
    <footer>
      City Transition System • DevSecOps Reporting & Observability • Built with the project's own data
    </footer>
  </main>
</div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { page, escapeHtml, NAV_ITEMS };
