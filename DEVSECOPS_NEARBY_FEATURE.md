# Nearby Essentials Finder - DevSecOps Coverage

## Feature

- Frontend page: `frontend/src/pages/NearbyEssentials.jsx`
- Visitor route: `/nearby-essentials`
- Backend route: `GET /api/nearby?lat=&lng=&type=&radius=`
- Backend files:
  - `backend/routes/nearby.routes.js`
  - `backend/controllers/nearby.controller.js`
  - `backend/services/nearby.service.js`

## Unit Testing

- Test file: `backend/tests/unit/nearby.service.test.js`
- Command:

```bash
cd backend
npm run test:nearby:unit
```

This verifies validation, Overpass query creation, and response mapping.

## Integration Testing

- Test file: `backend/tests/integration/nearby.test.js`
- Command:

```bash
cd backend
npm run test:nearby:integration
```

This verifies the `/api/nearby` endpoint using a mocked Overpass API response.

## Code Coverage Testing

- All backend coverage:

```bash
cd backend
npm run coverage
```

- Nearby feature coverage:

```bash
cd backend
npm run coverage:nearby
```

Coverage output is generated in `backend/coverage/` as terminal, LCOV, and HTML reports.

## Static Code Analysis

- ESLint:

```bash
cd backend
npm run lint
```

- Frontend ESLint:

```bash
cd frontend
npm run lint
```

- SonarQube:
  - Config: `backend/sonar-project.properties`
  - Coverage file: `backend/coverage/lcov.info`

## Security Testing

```bash
cd backend
npm audit --audit-level=high
```

The Jenkins pipeline includes this as the dependency security scan stage.

## Containerization

- Backend Dockerfile: `backend/Dockerfile`
- Frontend Dockerfile: `frontend/Dockerfile`
- Compose file: `docker-compose.yml`

```bash
docker compose up --build
```

## CI/CD Pipeline

- Pipeline file: `Jenkinsfile`
- Stages:
  - Install dependencies
  - Static code analysis
  - Nearby feature unit test
  - Nearby feature integration test
  - Full unit tests with coverage
  - Full integration tests
  - SonarQube static analysis
  - Dependency security scan
  - Backend Docker image creation
  - Frontend Docker image creation
  - DockerHub image push
  - Kubernetes deployment
  - Deployment verification

## Kubernetes Deployment

- Backend deployment/service: `k8s/backend-deployment.yaml`, `k8s/backend-service.yaml`
- Frontend deployment/service: `k8s/frontend-deployment.yaml`, `k8s/frontend-service.yaml`

When Jenkins builds and deploys the new backend image, `/api/nearby` is available in the deployed app.
