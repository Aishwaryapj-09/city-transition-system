# City Transition System - DevSecOps Demo

Full DevSecOps pipeline for a city-relocation app (accommodation, owner listings,
admin verification, nearby services, language helper). Monitoring is continuous
via **Prometheus + Grafana**. The old custom `performance-test.js` and `k6`
load-test stages are removed.

**One folder for every report:** `devsecops-reports/`
**One visual summary:** `devsecops-reports/devsecops-dashboard.html`

---

## 10-Step Demo Checklist

### 1. CI/CD Pipeline
Open the Jenkins job:

```
Jenkins -> Your Job -> Latest Build -> Console Output
```

Stages (in order):

```
Checkout -> Install Dependencies -> ESLint
-> Unit Tests + Coverage -> Integration Tests
-> SonarQube -> npm audit
-> Docker Build -> Docker Push
-> Ansible / Kubernetes Deploy -> Verify Kubernetes Resources
-> Postman Smoke Tests
-> Hit Every Endpoint (creates route metrics)
-> Prometheus and Grafana Monitoring Check
-> Generate Visual DevSecOps Report
```

Main proof:

```
Jenkins -> Build Artifacts -> devsecops-reports/
```

### 2. Static Code Analysis
ESLint:

```
devsecops-reports/backend-eslint-report.json
devsecops-reports/frontend-eslint-report.json
```

SonarQube UI: <http://localhost:9000>
SonarQube scanner log: `devsecops-reports/sonarqube-scanner-report.txt`

### 3. Testing and Coverage
Jest results:

```
devsecops-reports/backend-coverage-test-report.json
devsecops-reports/backend-integration-test-report.json
```

HTML coverage (copied into the single folder by Jenkins):

```
devsecops-reports/coverage-html/index.html
```

### 4. Dependency Security
`npm audit` JSON for root, backend, and frontend:

```
devsecops-reports/root-npm-audit-report.json
devsecops-reports/backend-npm-audit-report.json
devsecops-reports/frontend-npm-audit-report.json
```

### 5. Docker Containerisation
List images:

```
docker images
```

Expected:

```
aishwaryapj09/city-transition-backend
aishwaryapj09/city-transition-frontend
```

Jenkins proof: `devsecops-reports/docker-image-report.json`

### 6. Kubernetes Deployment
```
kubectl get deployments
kubectl get pods -o wide
kubectl get services
kubectl get daemonsets
```

Deployed services:

| Service     | URL                                |
| ----------- | ---------------------------------- |
| Frontend    | http://localhost:30007             |
| Backend     | http://localhost:30008             |
| Health      | http://localhost:30008/health      |
| Metrics     | http://localhost:30008/metrics     |
| Prometheus  | http://localhost:30090             |
| Grafana     | http://localhost:30300             |

Jenkins proof: `devsecops-reports/kubernetes-verification-report.txt`

### 7. Ansible IaC
Jenkins proof: `devsecops-reports/deployment-report.txt`
Manual run:

```
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

### 8. API Smoke Tests (Postman / Newman)
Jenkins proof:

```
devsecops-reports/postman-api-smoke-report.json
devsecops-reports/postman-api-smoke-report.xml
```

Manual:

```
npm run api:test:deployed
```

### 9. Prometheus Monitoring
Open <http://localhost:30090/targets>. These jobs must be UP:

```
city-transition-backend
prometheus
blackbox-http      <-- one entry per public endpoint
cadvisor
node-exporter
```

Useful PromQL:

```
city_transition_up
sum(rate(city_transition_http_requests_total[1m]))
histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route))
city_transition_process_resident_memory_bytes
rate(city_transition_process_cpu_seconds_total[5m])
probe_success{job="blackbox-http"}
```

Per-endpoint probe evidence saved by Jenkins: `devsecops-reports/prometheus-endpoints.json`
(plus the raw query `prometheus-endpoints-raw.json`).

### 10. Grafana Dashboard
Open <http://localhost:30300> -> login `admin / admin` ->
dashboard **City Transition System - DevSecOps Monitoring**.

Panels:

* Response time / latency (p95 by route)
* Throughput / HTTP request count
* 4xx / 5xx error rate
* CPU usage (backend, container, node)
* Memory usage (backend, container, node)
* Application uptime
* Per-endpoint health (Blackbox)

---

## One-Page Visual Summary

After a Jenkins build:

```
devsecops-reports/devsecops-dashboard.html
```

Open it in a browser. It shows:

* overall PASS / REVIEW badge
* one card per pipeline stage with status
* a table of every API endpoint (live HTTP call)
* a table of every Blackbox probe (per-endpoint UP/DOWN)
* a table of every Grafana-powering Prometheus metric
* direct links to Frontend, Backend, Prometheus, Grafana

---

## Local stack (without Jenkins)

```
docker-compose up -d --build       # backend, frontend, prometheus, grafana, blackbox, cadvisor
npm install
npm run reports:dashboard          # generates devsecops-reports/devsecops-dashboard.html
```

Or on a Kubernetes cluster:

```
kubectl apply -f k8s/
```

---

## Project layout

```
backend/                 Express API + prom-client metrics
frontend/                React UI
k8s/                     All Kubernetes manifests
ansible/                 IaC playbook (deploys k8s/)
monitoring/
  prometheus/            scrape config for docker-compose
  grafana/               provisioned datasource + dashboards
postman/                 API smoke-test collection (Newman)
tools/                   devsecops-dashboard.js (report generator)
Jenkinsfile              full pipeline
devsecops-reports/       (generated) every report in one folder
```
