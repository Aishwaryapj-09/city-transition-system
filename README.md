# City Transition System

A full-stack DevSecOps web application that helps users find accommodation, verified rental listings, nearby essentials, and local language support while relocating to a new city.

## Existing Features

- User authentication with JWT and role-based access.
- Verified rental listings for users, owners, and admins.
- Accommodation finder.
- Nearby essentials finder.
- Local language helper.
- Secure Express backend with Helmet, rate limiting, validation, and environment-based secrets.

## Tech Stack

- Frontend: React, Axios, React Router.
- Backend: Node.js, Express.js, MongoDB, Mongoose.
- Testing: Jest, Supertest, Postman collection, Newman, performance smoke tests.
- Security: bcrypt, JWT, Helmet, express-rate-limit, npm audit, SonarQube.
- DevOps: Jenkins, Docker, Docker Hub, Kubernetes, Ansible IaC, Prometheus, Blackbox Exporter.

## DevSecOps Pipeline

The Jenkins pipeline now runs a continuous deployment flow:

1. Checkout source code.
2. Install root, backend, and frontend dependencies.
3. Run ESLint for backend and frontend.
4. Run unit, integration, and coverage tests for existing features.
5. Run SonarQube static analysis.
6. Run npm dependency security checks.
7. Build backend and frontend Docker images.
8. Push Docker images to Docker Hub.
9. Deploy Kubernetes manifests through Ansible IaC.
10. Verify Kubernetes deployments, services, health, and Prometheus metrics.
11. Run Postman/Newman API smoke tests against the deployed backend.
12. Run performance smoke tests and archive latency/throughput reports.

## Deployment Endpoints

After Kubernetes deployment:

- Frontend: `http://localhost:30007`
- Backend API: `http://localhost:30008`
- Backend health: `http://localhost:30008/api/health`
- Backend Prometheus metrics: `http://localhost:30008/metrics`
- Prometheus UI: `http://localhost:30090`

## Run Locally

```bash
docker-compose up --build
```

Backend API runs on `http://localhost:5000` and frontend runs on `http://localhost:3000`.

## Run Tests

```bash
cd backend
npm test
npm run coverage
```

Run Postman/Newman tests locally after starting the backend:

```bash
npm install
npm run api:test:smoke
```

Run the full API regression collection:

```bash
npm run api:test
```

Run deployed performance smoke tests:

```bash
npm run perf:test:deployed
```

## Deploy with Ansible IaC

Prerequisites:

- Docker Desktop Kubernetes or another Kubernetes cluster.
- `kubectl` configured with the target context.
- Ansible installed on the Jenkins agent or local deployment machine.
- Docker Hub pull secret named `dockerhub-secret` in the Kubernetes namespace.

Deploy:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

Use a different Kubernetes context:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml -e kube_context=minikube
```

## Monitoring with Prometheus

The backend exposes Prometheus metrics at `/metrics`. Kubernetes deploys Prometheus using manifests in `k8s/` and scrapes the backend service every 15 seconds. Blackbox Exporter also checks HTTP availability and ICMP reachability for network-related monitoring.

Useful Prometheus queries:

```promql
city_transition_up
city_transition_http_requests_total
city_transition_http_request_duration_seconds_bucket
city_transition_process_uptime_seconds
probe_success{job="blackbox-http"}
probe_success{job="blackbox-icmp"}
```

See `MONITORING_AND_OUTPUTS.md` for exact Prometheus queries, packet-loss style checks, Jenkins artifacts, and output locations.

## Jenkins Credentials Needed

- `dockerhub-pass`: Docker Hub username/password credential.
- `sonar-token`: SonarQube token.
- Jenkins agent tools: Node.js/npm, Docker, kubectl, Ansible, curl.

## Project Structure

```text
backend/      Express API, models, routes, middleware, Jest tests
frontend/     React application
k8s/          Kubernetes manifests for app and Prometheus
ansible/      IaC deployment playbook and inventory
postman/      Postman collection and local environment for Newman
tools/        Performance smoke test runner
Jenkinsfile   CI/CD pipeline
```
