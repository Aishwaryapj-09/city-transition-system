# Continuous Monitoring and Output Guide

This guide shows what was added for continuous monitoring, performance testing, and where to view each output.

## Is Prometheus Done?

Yes. Prometheus monitoring is added for this app.

Implemented monitoring:

- Backend Prometheus metrics endpoint: `/metrics`
- HTTP request count by route/status/method
- HTTP request duration histogram for p95/p99 latency
- Backend uptime metric
- Prometheus Kubernetes deployment
- Blackbox HTTP probes for frontend and backend availability
- Blackbox ICMP probes for network reachability style checks
- Jenkins verification of `/api/health` and `/metrics`

## Is Continuous Deployment Done?

Yes. The Jenkinsfile has a continuous deployment path:

```text
Checkout -> Install -> Lint -> Unit/Integration Tests -> Coverage -> SonarQube
-> npm audit -> Docker build -> Docker push -> Ansible Kubernetes deploy
-> Health/Metrics verify -> Postman/Newman smoke -> Performance smoke
```

The deployment stage is:

```text
Deploy to Kubernetes with Ansible IaC
```

Important: Jenkins agent must have `ansible-playbook`, `kubectl`, Docker, Node.js/npm, and curl installed. If Ansible is not installed, the CD stage will fail before deployment.

## How to View Prometheus Output

After Jenkins deployment or manual Ansible deployment, open:

```text
http://localhost:30090
```

Check scrape status:

```text
http://localhost:30090/targets
```

Expected Prometheus targets:

- `city-transition-backend`
- `prometheus`
- `blackbox-http`
- `blackbox-icmp`

## Application Metrics Queries

Backend up:

```promql
city_transition_up
```

Backend uptime:

```promql
city_transition_process_uptime_seconds
```

Requests per second by route/status:

```promql
sum(rate(city_transition_http_requests_total[5m])) by (route, status)
```

Average API latency by route:

```promql
sum(rate(city_transition_http_request_duration_seconds_sum[5m])) by (route)
/
sum(rate(city_transition_http_request_duration_seconds_count[5m])) by (route)
```

P95 API latency by route:

```promql
histogram_quantile(
  0.95,
  sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route)
)
```

P99 API latency by route:

```promql
histogram_quantile(
  0.99,
  sum(rate(city_transition_http_request_duration_seconds_bucket[5m])) by (le, route)
)
```

Server error rate:

```promql
100 *
sum(rate(city_transition_http_requests_total{status=~"5.."}[5m]))
/
sum(rate(city_transition_http_requests_total[5m]))
```

## HTTP Availability Monitoring

Blackbox HTTP probe success:

```promql
probe_success{job="blackbox-http"}
```

HTTP response time:

```promql
probe_duration_seconds{job="blackbox-http"}
```

HTTP status code:

```promql
probe_http_status_code{job="blackbox-http"}
```

Availability percentage over 10 minutes:

```promql
100 * avg_over_time(probe_success{job="blackbox-http"}[10m])
```

## Network and Packet Loss Related Monitoring

For this web app, packet-level capture is not part of the application itself. The applicable continuous network check is ICMP reachability through Blackbox Exporter.

ICMP probe success:

```promql
probe_success{job="blackbox-icmp"}
```

Approximate probe loss percentage over 5 minutes:

```promql
100 * (1 - avg_over_time(probe_success{job="blackbox-icmp"}[5m]))
```

ICMP probe latency:

```promql
avg_over_time(probe_duration_seconds{job="blackbox-icmp"}[5m])
```

Note: This shows probe failure/loss from Prometheus to Kubernetes services. For true packet-level loss on every node/interface, add infrastructure monitoring such as node exporter, CNI metrics, or eBPF/network plugin metrics.

## Performance Testing Output

Jenkins stage:

```text
Performance Smoke Tests
```

Artifacts archived by Jenkins:

```text
performance-results/performance-report.json
performance-results/performance-summary.txt
```

Local deployed performance test:

```bash
npm run perf:test:deployed
```

Local backend performance test:

```bash
npm run perf:test
```

Tune test load:

```bash
set PERF_REQUESTS=200
set PERF_CONCURRENCY=20
set PERF_MAX_P95_MS=1500
npm run perf:test:deployed
```

Performance report includes:

- Total requests
- Passed and failed requests
- Success rate
- Throughput per second
- Min latency
- Average latency
- P95 latency
- P99 latency
- Max latency

## API Testing Output

Jenkins stage:

```text
Postman API Smoke Tests - Newman
```

Manual deployed API smoke:

```bash
npm run api:test:deployed
```

Manual local API smoke:

```bash
npm run api:test:smoke
```

Full Postman collection:

```bash
npm run api:test
```

## Kubernetes Output Commands

View deployments:

```bash
kubectl get deployments
```

View pods:

```bash
kubectl get pods
```

View services and NodePorts:

```bash
kubectl get services
```

View rollout status:

```bash
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend
kubectl rollout status deployment/prometheus
kubectl rollout status deployment/blackbox-exporter
```
