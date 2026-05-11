# DevSecOps Deployment Roadmap

This roadmap explains the DevSecOps flow for the City Transition System after
removing standalone performance testing and moving to continuous monitoring.

## Goal

Build, test, scan, containerize, deploy, and monitor the application in a way
that is professional enough for a live demo and simple enough to explain in a
college viva.

## Continuous Deployment Flow

1. Developer pushes code to GitHub.
2. Jenkins checks out the source code.
3. Jenkins installs dependencies for root tooling, backend, and frontend.
4. Jenkins runs ESLint, unit tests, integration tests, and coverage.
5. Jenkins runs SonarQube static code analysis.
6. Jenkins runs npm audit security checks.
7. Jenkins builds backend and frontend Docker images.
8. Jenkins pushes images to Docker Hub.
9. Jenkins runs the Ansible playbook or kubectl fallback.
10. Kubernetes deploys the app and monitoring stack.
11. Jenkins verifies `/health` and `/metrics`.
12. Jenkins runs Postman/Newman API smoke tests.
13. Jenkins checks Prometheus and Grafana monitoring health.

There is no k6 stage and no custom `performance-test.js` stage.

## Existing Features Covered

- Health API: `/health` and `/api/health`
- Authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/protected`
- Verified listings: `/api/listings`
- Accommodation finder: `/api/accommodation`
- Nearby essentials finder: `/api/nearby`
- Local language helper: `/api/language-helper`
- Prometheus metrics: `/metrics`

## Monitoring Work Added

- Backend `/metrics` endpoint using `prom-client`.
- HTTP request count by method, route, and status code.
- HTTP request duration histogram for average and p95 latency.
- HTTP error counter for 4xx and 5xx error rate.
- Backend uptime and health gauges.
- Node.js CPU and memory metrics.
- Prometheus deployment and scrape configuration.
- Grafana datasource and dashboard provisioning.
- Blackbox Exporter for uptime checks.
- cAdvisor for container resource monitoring.
- Node Exporter for infrastructure monitoring.
- Kubernetes readiness and liveness probes.

## Prometheus and Grafana URLs

Kubernetes:

```text
Backend metrics: http://localhost:30008/metrics
Prometheus:      http://localhost:30090
Grafana:         http://localhost:30300
```

Docker Compose:

```text
Backend metrics: http://localhost:5000/metrics
Prometheus:      http://localhost:9090
Grafana:         http://localhost:3001
```

## Important Prometheus Queries

```promql
city_transition_up
city_transition_process_uptime_seconds
sum(rate(city_transition_http_requests_total[1m]))
sum(city_transition_http_requests_total) by (route, status_code)
histogram_quantile(0.95, sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route))
100 * sum(rate(city_transition_http_errors_total[5m])) / clamp_min(sum(rate(city_transition_http_requests_total[5m])), 1)
rate(city_transition_process_cpu_seconds_total[5m])
city_transition_process_resident_memory_bytes
probe_success{job="blackbox-http"}
probe_duration_seconds{job="blackbox-http"}
```

## Ansible IaC

The playbook:

- Selects the Kubernetes context.
- Applies all manifests from `k8s/`.
- Restarts backend and frontend deployments after Jenkins pushes images.
- Waits for backend, frontend, Prometheus, Blackbox Exporter, and Grafana.
- Prints service endpoints for Jenkins logs.

Run manually:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

## Kubernetes Deployment

Kubernetes includes:

- Backend deployment and service.
- Frontend deployment and service.
- Prometheus ConfigMap, deployment, and service.
- Grafana Secret, ConfigMaps, deployment, and service.
- Blackbox Exporter ConfigMap, deployment, and service.
- Node Exporter DaemonSet and service.
- cAdvisor DaemonSet and service.

## Jenkins Setup Checklist

- Install Node.js/npm on the Jenkins agent.
- Install Docker and make Docker available to Jenkins.
- Install kubectl and configure cluster access.
- Install Ansible, or let the Jenkinsfile use kubectl fallback.
- Configure SonarQube server name as `sonarqube-server`.
- Add Jenkins credential `sonar-token`.
- Add Jenkins credential `dockerhub-pass`.
- Create Kubernetes image pull secret:

```bash
kubectl create secret docker-registry dockerhub-secret \
  --docker-username=<dockerhub-user> \
  --docker-password=<dockerhub-password> \
  --docker-email=<email>
```

## Final Verification

After a successful pipeline run:

- Frontend opens at `http://localhost:30007`.
- Backend health returns `200 OK` at `http://localhost:30008/health`.
- Backend metrics return Prometheus text at `http://localhost:30008/metrics`.
- Prometheus opens at `http://localhost:30090`.
- Grafana opens at `http://localhost:30300`.
- Prometheus targets show backend, Blackbox Exporter, cAdvisor, and Node Exporter.
- Jenkins archives `monitoring-health-report.txt`.
- The pipeline has no standalone performance test stage.
