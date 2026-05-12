# Changes Applied

What was changed in this iteration, mapped to each of the 10 demo steps.

## Goals

1. **Old custom performance testing removed** (no `performance-test.js`, no k6).
2. **Every report goes into one folder**: `devsecops-reports/`.
3. **Simpler, summarised report UI** instead of a wall of text.
4. **Prometheus monitoring covers every API endpoint**, not just one.
5. Clean project structure with redundant docs removed.

---

## File-by-file changes

### Removed
| Path                                  | Why |
| ------------------------------------- | --- |
| `performance-results/`                | Leftover from removed performance/k6 stages. |
| `DEVSECOPS_DEPLOYMENT_ROADMAP.md`     | Folded into the new `README.md`. |
| `DEVSECOPS_LANGUAGE_HELPER_FEATURE.md`| Folded into the new `README.md`. |
| `DEVSECOPS_NEARBY_FEATURE.md`         | Folded into the new `README.md`. |
| `MONITORING_AND_OUTPUTS.md`           | Folded into the new `README.md` and the dashboard. |
| Old `node_modules`, `.git`, build/coverage caches | Strip-down for a clean zip. |

### Rewritten
| Path                              | What changed |
| --------------------------------- | ------------ |
| `Jenkinsfile`                     | Slimmed stage names to match the demo checklist exactly. Copies `backend/coverage/` into `devsecops-reports/coverage-html/` so it's all in one folder. New `Hit Every Endpoint` stage seeds route labels in Prometheus. New monitoring stage verifies the backend `up` gauge, request count, latency histogram, error counter, CPU, memory **and** route labels for every endpoint, plus pulls `probe_success{job="blackbox-http"}` from Prometheus to evidence per-endpoint uptime. |
| `tools/devsecops-dashboard.js`    | Cleaner, more summarised single-page HTML. New section *Prometheus Blackbox: per endpoint* (one row per probed URL, UP/DOWN). New report file `prometheus-endpoints.json`. Pipeline-stage cards renamed to match the demo checklist (1..10). |
| `README.md`                       | Now organised as the user's 10-step checklist with copy-pasteable commands. |

### Untouched but worth knowing
| Path                                  | Note |
| ------------------------------------- | ---- |
| `backend/middleware/metrics.middleware.js` | Already exposes `city_transition_*` metrics with `route` labels. Drives the Grafana dashboard. |
| `k8s/prometheus-configmap.yaml`       | Already configured to scrape backend, cadvisor, node-exporter, and to run blackbox probes against **every** public endpoint. |
| `monitoring/prometheus/prometheus-docker.yml` | Same scrape strategy for the docker-compose path. |
| `monitoring/grafana/dashboards/city-transition-dashboard.json` | Panels for response time, latency, throughput, request count, 4xx/5xx, CPU, memory, container usage, uptime, endpoint health - already complete. |

---

## Changes mapped to the 10-step demo

### 1. CI/CD Pipeline
*Jenkinsfile* stage names now match the checklist verbatim: `Checkout`,
`Install Dependencies`, `ESLint`, `Unit Tests + Coverage`, `Integration Tests`,
`SonarQube`, `npm audit`, `Docker Build`, `Docker Push`,
`Ansible / Kubernetes Deploy`, `Postman Smoke Tests`,
`Prometheus and Grafana Monitoring Check`. Easier to point to in the console.

### 2. Static Code Analysis
Reports always land in `devsecops-reports/`:
`backend-eslint-report.json`, `frontend-eslint-report.json`,
`sonarqube-scanner-report.txt`.

### 3. Testing and Coverage
HTML coverage is now copied into the single folder at
`devsecops-reports/coverage-html/index.html`. Used to live in
`backend/coverage/lcov-report/`; now it's where the rest of the proof is.

### 4. Dependency Security
Three audit JSONs (root, backend, frontend) all in `devsecops-reports/`.
`|| exit 0` is preserved so a vulnerable transitive dep doesn't kill the
build; the report itself is the evidence.

### 5. Docker Containerisation
`docker-image-report.json` from `docker image inspect` is still produced and
saved in the single folder.

### 6. Kubernetes Deployment
`kubernetes-verification-report.txt` aggregates `kubectl get deployments
/ pods / services / daemonsets`. NodePorts unchanged (30007 frontend,
30008 backend, 30090 Prometheus, 30300 Grafana).

### 7. Ansible IaC
`deployment-report.txt` shows whether Ansible (preferred) or kubectl
(fallback) ran. Same Ansible playbook as before.

### 8. API Smoke Tests
`postman-api-smoke-report.json` and `.xml` via `npm run api:test:deployed`
(Newman + the Postman collection in `postman/`).

### 9. Prometheus Monitoring (the main fix)
- The new Jenkins monitoring stage queries Prometheus for
  `probe_success{job="blackbox-http"}` and saves the raw response in
  `devsecops-reports/prometheus-endpoints-raw.json`.
- `tools/devsecops-dashboard.js` parses the same query and emits a
  per-endpoint table in `devsecops-reports/prometheus-endpoints.json`
  and in the HTML dashboard. The HTML now has a section labelled
  *"Prometheus Blackbox: per endpoint"* with one UP/DOWN row per probed URL.
- The monitoring stage also confirms that **every** route
  (`/health`, `/api/listings`, `/api/accommodation`, `/api/nearby`,
  `/api/language-helper`) shows up as a label in
  `city_transition_http_requests_total`.

### 10. Grafana Dashboard
Provisioning and the dashboard JSON were already complete and remain
unchanged. The dashboard URL is in `README.md` step 10. The visual
dashboard at `devsecops-reports/devsecops-dashboard.html` deep-links to
Grafana.

---

## How to view all of this

After a Jenkins build:

1. Open **Jenkins -> Build Artifacts -> devsecops-reports/**.
2. Open `devsecops-dashboard.html` -> overall pass/fail + per-stage cards.
3. Open `coverage-html/index.html` -> line/branch coverage.
4. Open `prometheus-endpoints.json` -> machine-readable per-endpoint probe state.
5. Open Prometheus at <http://localhost:30090/targets> and Grafana at
   <http://localhost:30300> for the live view.
