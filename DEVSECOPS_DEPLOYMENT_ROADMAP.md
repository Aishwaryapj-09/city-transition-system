# DevSecOps Deployment Roadmap

This roadmap explains the Prometheus, Ansible IaC, continuous deployment, and Postman API testing work added for the existing City Transition System features.

## Goal

Make the project a complete DevSecOps implementation where every change is tested, scanned, containerized, deployed continuously, monitored, and validated through API smoke tests.

## Continuous Deployment Flow

1. Developer pushes code to GitHub.
2. Jenkins checks out the latest source.
3. Jenkins installs dependencies for root tooling, backend, and frontend.
4. Jenkins runs linting, unit tests, integration tests, and coverage.
5. Jenkins runs SonarQube static code analysis.
6. Jenkins runs npm audit security checks.
7. Jenkins builds backend and frontend Docker images.
8. Jenkins pushes images to Docker Hub.
9. Jenkins runs the Ansible playbook.
10. Ansible applies Kubernetes manifests and waits for rollouts.
11. Jenkins verifies health and Prometheus metrics endpoints.
12. Jenkins runs Postman/Newman smoke tests against the deployed backend.
13. Jenkins runs performance smoke tests and archives latency/throughput reports.

## Existing Features Covered

- Health API: `/api/health`
- Authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/protected`
- Verified listings: `/api/listings`
- Accommodation validation: `/api/accommodation`
- Nearby essentials validation: `/api/nearby`
- Local language helper validation: `/api/language-helper`
- Monitoring: `/metrics`
- Continuous availability: Blackbox HTTP probes
- Network reachability: Blackbox ICMP probes

## Prometheus Monitoring

Prometheus work added:

- Backend `/metrics` endpoint.
- HTTP request counters by method, route, and status.
- HTTP request duration summary.
- Backend uptime metric.
- HTTP latency histogram for p95 and p99 performance queries.
- Kubernetes Prometheus ConfigMap, Deployment, and Service.
- Backend service scrape annotations.
- Blackbox Exporter for HTTP and ICMP probing.

Prometheus UI:

```text
http://localhost:30090
```

Metrics endpoint:

```text
http://localhost:30008/metrics
```

Useful queries:

```promql
city_transition_up
city_transition_http_requests_total
city_transition_http_request_duration_seconds_bucket
city_transition_process_uptime_seconds
probe_success{job="blackbox-http"}
probe_success{job="blackbox-icmp"}
```

Packet loss style query:

```promql
100 * (1 - avg_over_time(probe_success{job="blackbox-icmp"}[5m]))
```

## Ansible IaC

Ansible work added:

- `ansible/inventory.ini`
- `ansible/deploy.yml`
- Deployment README in `ansible/README.md`

The playbook:

- Selects Kubernetes context.
- Applies all Kubernetes manifests from `k8s/`.
- Restarts backend and frontend to pull the latest Docker images.
- Waits for backend, frontend, and Prometheus rollout completion.
- Waits for Blackbox Exporter rollout completion.
- Prints service endpoints for Jenkins logs.

Run manually:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

## Postman and Newman API Testing

Postman work added:

- `postman/city-transition-api.postman_collection.json`
- `postman/local.postman_environment.json`
- Newman npm scripts in root `package.json`

Jenkins runs the stable `CD Smoke` folder after deployment:

```bash
npm run api:test:deployed
```

Local smoke test:

```bash
npm run api:test:smoke
```

Full collection:

```bash
npm run api:test
```

## Performance Testing

Performance work added:

- `tools/performance-test.js`
- `npm run perf:test`
- `npm run perf:test:deployed`
- Jenkins `Performance Smoke Tests` stage
- Archived reports in `performance-results/`

The performance report includes success rate, throughput, average latency, p95 latency, p99 latency, and max latency for health, metrics, nearby validation, language helper validation, and accommodation validation endpoints.

## Kubernetes Deployment

Kubernetes work added or improved:

- Backend readiness and liveness probes.
- Frontend readiness and liveness probes.
- CPU and memory requests/limits.
- Prometheus deployment.
- Prometheus service exposed on NodePort `30090`.
- Backend metrics exposed on NodePort backend service `30008`.
- Blackbox Exporter service for internal Prometheus probes.

## Jenkins Setup Checklist

- Install Node.js/npm on Jenkins agent.
- Install Docker and make Docker available to Jenkins.
- Install kubectl and configure cluster access.
- Install Ansible.
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

After a successful pipeline run, verify:

- Frontend opens at `http://localhost:30007`.
- Backend health returns `200 OK` at `http://localhost:30008/api/health`.
- Metrics return Prometheus text at `http://localhost:30008/metrics`.
- Prometheus opens at `http://localhost:30090`.
- Jenkins `Postman API Smoke Tests - Newman` stage passes.
- Jenkins `Performance Smoke Tests` stage passes and archives `performance-results/performance-report.json`.
