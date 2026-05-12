# Local Language Helper - DevSecOps Coverage

## Feature

- Frontend page: `frontend/src/pages/LocalLanguageHelper.jsx`
- Visitor route: `/local-language-helper`
- Backend route: `GET /api/language-helper?place=Whitefield`
- Translation route: `POST /api/language-helper/translate`
- Backend files:
  - `backend/routes/language-helper.routes.js`
  - `backend/controllers/languageHelper.controller.js`
  - `backend/services/languageHelper.service.js`
  - `backend/data/languageHelper.data.js`

## Unit Testing

- Test file: `backend/tests/unit/languageHelper.service.test.js`
- Command:

```bash
cd backend
npm run test:language-helper:unit
```

This verifies OpenStreetMap/Nominatim place detection, predefined locality fallback detection, state/language mapping, phrase loading, and unknown-place errors.

## Integration Testing

- Test file: `backend/tests/integration/languageHelper.test.js`
- Command:

```bash
cd backend
npm run test:language-helper:integration
```

This verifies the `/api/language-helper` endpoint returns detected city, state, language, categories, and phrase cards.

## Location and Language Detection Approach

This feature does not use AI for detection.

1. The frontend sends the entered place to `GET /api/language-helper?place=<place>`.
2. The backend calls OpenStreetMap Nominatim geocoding through `geo.service.js`.
3. Nominatim returns structured address details such as city, town, suburb, road, and state.
4. The backend maps the detected state to its primary local language using `STATE_LANGUAGE_MAPPINGS`.
5. If Nominatim is unavailable during local testing, a small predefined locality list handles common demo areas such as Whitefield, Electronic City, Tambaram, and Gachibowli.
6. The phrase cards are loaded from the app's curated phrase dataset for that language.
7. If the user enters their own English sentence, the backend first checks the curated phrasebook for an exact phrase match.
8. If it is not a known phrase, the backend sends the English text to a translation API for the detected language.

The app is built as a city transition helper: a newcomer can enter an area or landmark, see the state and local language, use ready survival phrases, and translate their own English sentence into the detected local language.

The place detection does not use AI. Location detection comes from OpenStreetMap/Nominatim, while language mapping and ready phrase cards are curated in the project so first-time movers get predictable emergency, transport, shopping, and basic conversation phrases. Custom sentence translation uses a translation API; by default the code calls MyMemory, and it can be pointed to LibreTranslate or another compatible service with `TRANSLATION_API_URL` and `TRANSLATION_API_KEY`.

## Code Coverage Testing

- All backend coverage:

```bash
cd backend
npm run coverage
```

- Local Language Helper coverage:

```bash
cd backend
npm run coverage:language-helper
```

Coverage output is generated in `backend/coverage/` as terminal, LCOV, and HTML reports.

## Static Code Analysis

- Backend ESLint:

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
  - The language helper controller, route, service, and data files are included through the existing backend `controllers`, `routes`, and `services` source scan.

## Security Testing

```bash
cd backend
npm audit --audit-level=high
```

The Jenkins pipeline includes this as the dependency security scan stage.

## Accessibility

- Search inputs use visible labels.
- Status messages use `role="status"` and `aria-live="polite"`.
- Category filters use tab semantics with `role="tablist"`, `role="tab"`, and `aria-selected`.
- Phrase cards are keyboard focusable and have labelled article content.
- Save buttons expose `aria-pressed`.
- Local language text uses language tags where supported.
- Keyboard users get a skip link and visible focus outlines.

## Containerization

- Backend Dockerfile: `backend/Dockerfile`
- Frontend Dockerfile: `frontend/Dockerfile`
- Compose file: `docker-compose.yml`

```bash
docker compose up --build
```

## CI/CD Pipeline

- Pipeline file: `Jenkinsfile`
- Added stages:
  - Language Helper Unit Test
  - Language Helper Integration Test
- Existing stages also cover:
  - Install dependencies
  - Static code analysis
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

When Jenkins builds and deploys the new backend image, `/api/language-helper` is available in the deployed app.
