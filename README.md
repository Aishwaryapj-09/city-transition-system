# City Transition System

A full-stack DevSecOps web application that helps newcomers find accommodation,
verified rental listings, nearby essentials, and local language support while
moving to a new city.

## Application Features

- Accommodation finder.
- Admin verification system.
- Owner property listing.
- Nearby services feature.
- Local language helper for newcomers.
- City transition assistance platform.

## Tech Stack

- Frontend: React, Axios, React Router.
- Backend: Node.js, Express.js, MongoDB, Mongoose.
- Testing: Jest, Supertest, Postman collection, Newman.
- Security: bcrypt, JWT, Helmet, express-rate-limit, SonarQube.
- DevOps: Jenkins, Docker, Docker Hub, Kubernetes, Ansible IaC.
- Monitoring: Prometheus, Grafana, Blackbox Exporter, cAdvisor, Node Exporter.

## DevSecOps Pipeline

The Jenkins pipeline runs:

1. Checkout source code.
2. Install root, backend, and frontend dependencies.
3. Run ESLint.
4. Run unit tests, integration tests, and coverage.
5. Run SonarQube static analysis.
6. Build and publish deployment images.
7. Deploy through Ansible IaC or deployment fallback.
8. Verify deployed services, backend health, and backend metrics.
9. Run Postman/Newman smoke tests against the deployed backend.
10. Call API routes and save endpoint-wise monitoring evidence.
11. Verify Prometheus and Grafana monitoring health.
12. Generate visual concept-wise DevSecOps reports.

Standalone performance testing with k6 or custom scripts has been removed.
Application performance is monitored continuously through Prometheus and Grafana.

## Monitoring

The backend exposes Prometheus metrics at `/metrics`.

Main metrics:

- API response time and latency.
- Request throughput.
- HTTP request count.
- 4xx and 5xx error rate.
- Backend CPU and memory usage.
- Application uptime and health.
- Kubernetes pod health.
- Container CPU and memory usage.
- HTTP uptime probes.

Useful endpoints after Kubernetes deployment:

- Frontend: `http://localhost:30007`
- Backend API: `http://localhost:30008`
- Backend health: `http://localhost:30008/health`
- Backend metrics: `http://localhost:30008/metrics`
- Prometheus UI: `http://localhost:30090`
- Prometheus targets: `http://localhost:30090/targets`
- Grafana UI: `http://localhost:30300`

Grafana demo login:

```text
Username: admin
Password: admin
```

See `MONITORING_AND_OUTPUTS.md` for Prometheus queries, Grafana panels,
architecture explanation, Docker setup, Kubernetes setup, and viva notes.

Human-readable Jenkins reports:

```text
devsecops-reports/00-devsecops-demo-index.html
devsecops-reports/01-static-code-analysis-report.html
devsecops-reports/02-unit-testing-report.html
devsecops-reports/03-integration-testing-report.html
devsecops-reports/04-code-coverage-testing-report.html
devsecops-reports/05-postman-api-testing-report.html
devsecops-reports/06-prometheus-monitoring-report.html
devsecops-reports/07-grafana-performance-testing-report.html
devsecops-reports/08-ansible-iac-report.html
devsecops-reports/09-deployment-flow-report.html
```

These reports are the easiest viva output because they stay focused on static
code analysis, unit tests, integration tests, code coverage, Postman API
testing, Prometheus monitoring, Grafana performance graphs, Ansible IaC, and
deployment flow.

## Run Locally with Docker Monitoring

```bash
docker-compose up --build
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/health`
- Backend metrics: `http://localhost:5000/metrics`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- cAdvisor: `http://localhost:8080`

## Run Backend Tests

```bash
cd backend
npm test
npm run coverage
```

Run Postman/Newman smoke tests locally after starting the backend:

```bash
npm install
npm run api:test:smoke
```

Run the full API regression collection:

```bash
npm run api:test
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

## Jenkins Credentials Needed

- `dockerhub-pass`: Docker Hub username/password credential.
- `sonar-token`: SonarQube token.
- Jenkins agent tools: Node.js/npm, Docker, kubectl, Ansible, curl.

Create the image pull secret:

```bash
kubectl create secret docker-registry dockerhub-secret \
  --docker-username=<dockerhub-user> \
  --docker-password=<dockerhub-password> \
  --docker-email=<email>
```

## Project Structure

```text
backend/      Express API, routes, middleware, metrics, Jest tests
frontend/     React application
k8s/          Kubernetes app and monitoring manifests
monitoring/   Docker Prometheus, Blackbox, and Grafana setup
ansible/      IaC deployment playbook and inventory
postman/      Postman collection and local environment for Newman
Jenkinsfile   CI/CD pipeline with monitoring verification
```
