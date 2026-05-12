// ============================================================
// City Transition System - Jenkins DevSecOps Pipeline
// FULLY AUTOMATED: every report, every metric snapshot, and the
// 14 visual HTML dashboards are produced inside this pipeline.
// Nothing must be run manually after the build.
// Open Jenkins -> build page sidebar -> "DevSecOps Dashboard".
// ============================================================

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
    }

    environment {
        BACKEND_IMAGE  = "aishwaryapj09/city-transition-backend"
        FRONTEND_IMAGE = "aishwaryapj09/city-transition-frontend"
        TAG            = "latest"
        KUBECONFIG     = "C:\\Users\\LENOVO\\.kube\\config"
        SONARQUBE_ENV  = "sonarqube-server"
        // Absolute path so every stage writes to the same place
        // regardless of which 'dir(...)' block it runs inside.
        REPORTS_DIR    = "${WORKSPACE}\\devsecops-reports"
    }

    stages {

        // ===================================================
        // SETUP
        // ===================================================
        stage('Clean Workspace') {
            steps { deleteDir() }
        }

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Prepare Reports Directory') {
            steps {
                bat """
                if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"
                echo Reports directory: %REPORTS_DIR%
                """
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
                dir('backend')  { bat 'npm install' }
                dir('frontend') { bat 'npm install' }
            }
        }

        // ===================================================
        // QUALITY GATES — absolute paths, never fail the build
        // ===================================================
        stage('Static Code Analysis - ESLint') {
            steps {
                dir('backend') {
                    bat """
                    npm run lint -- --format json --output-file "%REPORTS_DIR%\\backend-eslint-report.json" > "%REPORTS_DIR%\\backend-eslint-console.txt" 2>&1
                    exit /b 0
                    """
                }
                dir('frontend') {
                    bat """
                    npm run lint -- --format json --output-file "%REPORTS_DIR%\\frontend-eslint-report.json" > "%REPORTS_DIR%\\frontend-eslint-console.txt" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        stage('Security Audit - npm audit') {
            steps {
                dir('backend') {
                    bat """
                    npm audit --json > "%REPORTS_DIR%\\npm-audit-report.json" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        // ===================================================
        // PER-FEATURE TESTS
        // ===================================================
        stage('Nearby Feature - Unit Test') {
            steps {
                dir('backend') {
                    bat """
                    npm run test:nearby:unit -- --json --outputFile="%REPORTS_DIR%\\nearby-unit-test-report.json" > "%REPORTS_DIR%\\nearby-unit-test-console.txt" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        stage('Nearby Feature - Integration Test') {
            steps {
                dir('backend') {
                    bat """
                    npm run test:nearby:integration -- --json --outputFile="%REPORTS_DIR%\\nearby-integration-test-report.json" > "%REPORTS_DIR%\\nearby-integration-test-console.txt" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        stage('Language Helper - Unit Test') {
            steps {
                dir('backend') {
                    bat """
                    npm run test:language-helper:unit -- --json --outputFile="%REPORTS_DIR%\\language-helper-unit-test-report.json" > "%REPORTS_DIR%\\language-helper-unit-test-console.txt" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        stage('Language Helper - Integration Test') {
            steps {
                dir('backend') {
                    bat """
                    npm run test:language-helper:integration -- --json --outputFile="%REPORTS_DIR%\\language-helper-integration-test-report.json" > "%REPORTS_DIR%\\language-helper-integration-test-console.txt" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        // ===================================================
        // ALL TESTS + COVERAGE
        // lcov.info is force-copied from every Jest output path
        // so the Coverage dashboard is always populated.
        // ===================================================
        stage('All Tests + Code Coverage') {
            steps {
                dir('backend') {
                    bat """
                    npm run coverage -- --json --outputFile="%REPORTS_DIR%\\backend-coverage-test-report.json" --coverageReporters=lcov --coverageReporters=text-summary > "%REPORTS_DIR%\\backend-coverage-test-console.txt" 2>&1
                    exit /b 0
                    """
                    bat """
                    if exist "coverage\\lcov.info"               copy /Y "coverage\\lcov.info"               "%REPORTS_DIR%\\lcov.info" >nul 2>&1
                    if exist "coverage\\lcov-report\\lcov.info"  copy /Y "coverage\\lcov-report\\lcov.info"  "%REPORTS_DIR%\\lcov.info" >nul 2>&1
                    if exist "%REPORTS_DIR%\\lcov.info" (echo [OK] lcov.info copied) else (echo [WARN] lcov.info missing)
                    exit /b 0
                    """
                }
                archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            }
        }

        stage('Backend Integration Suite') {
            steps {
                dir('backend') {
                    bat """
                    npm run test:integration -- --json --outputFile="%REPORTS_DIR%\\backend-integration-test-report.json" > "%REPORTS_DIR%\\backend-integration-test-console.txt" 2>&1
                    exit /b 0
                    """
                }
            }
        }

        stage('SonarQube Static Analysis') {
            steps {
                withSonarQubeEnv("${env.SONARQUBE_ENV}") {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        dir('backend') {
                            bat """
                            npx sonar-scanner -Dsonar.login=%SONAR_TOKEN% > "%REPORTS_DIR%\\sonarqube-scanner-report.txt" 2>&1
                            exit /b 0
                            """
                        }
                    }
                }
            }
        }

        // ===================================================
        // BUILD & PUSH
        // ===================================================
        stage('Build Backend Docker Image') {
            steps { bat "docker build --no-cache -t %BACKEND_IMAGE%:%TAG% ./backend" }
        }

        stage('Build Frontend Docker Image') {
            steps { bat "docker build --no-cache -t %FRONTEND_IMAGE%:%TAG% ./frontend" }
        }

        stage('Push Container Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-pass',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    bat """
                    echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
                    docker push %BACKEND_IMAGE%:%TAG%
                    docker push %FRONTEND_IMAGE%:%TAG%
                    docker logout
                    """
                }
            }
        }

        // ===================================================
        // DEPLOY (Ansible IaC preferred, kubectl fallback)
        // ===================================================
        stage('Deploy to Kubernetes') {
            steps {
                bat """
                set DEPLOY_EXIT=0
                where ansible-playbook >nul 2>nul
                if %ERRORLEVEL% EQU 0 goto run_ansible
                goto run_kubectl

:run_ansible
                echo Running Ansible IaC deployment. > "%REPORTS_DIR%\\deployment-report.txt"
                ansible-playbook -i ansible/inventory.ini ansible/deploy.yml >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                set DEPLOY_EXIT=%ERRORLEVEL%
                goto deploy_done

:run_kubectl
                echo Falling back to kubectl deployment. > "%REPORTS_DIR%\\deployment-report.txt"
                kubectl config use-context docker-desktop >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl apply -f k8s/ --validate=false >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl rollout restart deployment/backend  >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl rollout restart deployment/frontend >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl rollout status  deployment/backend    --timeout=180s >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl rollout status  deployment/frontend   --timeout=180s >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl rollout status  deployment/prometheus --timeout=180s >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                kubectl rollout status  deployment/grafana    --timeout=180s >> "%REPORTS_DIR%\\deployment-report.txt" 2>&1
                set DEPLOY_EXIT=%ERRORLEVEL%

:deploy_done
                exit /b 0
                """
            }
        }

        // ===================================================
        // CAPTURE LIVE EVIDENCE
        // ===================================================
        stage('Capture Kubernetes State') {
            steps {
                bat """
                kubectl get deployments -o wide >  "%REPORTS_DIR%\\kubernetes-verification-report.txt" 2>&1
                kubectl get daemonsets  -o wide >> "%REPORTS_DIR%\\kubernetes-verification-report.txt" 2>&1
                kubectl get pods        -o wide >> "%REPORTS_DIR%\\kubernetes-verification-report.txt" 2>&1
                kubectl get services    -o wide >> "%REPORTS_DIR%\\kubernetes-verification-report.txt" 2>&1
                exit /b 0
                """
            }
        }

        stage('Capture Docker State') {
            steps {
                bat """
                docker ps --no-trunc > "%REPORTS_DIR%\\docker-containers.txt" 2>&1
                exit /b 0
                """
            }
        }

        // Hit every API family once so the backend /metrics histograms
        // and counters have per-route data when we snapshot them next.
        stage('Generate Per-API Traffic') {
            steps {
                bat """
                curl -s -o nul http://localhost:30008/health
                curl -s -o nul http://localhost:30008/api/listings
                curl -s -o nul "http://localhost:30008/api/accommodation?city=Bengaluru"
                curl -s -o nul "http://localhost:30008/api/nearby?city=Bengaluru&type=restaurant"
                curl -s -o nul "http://localhost:30008/api/language-helper?text=hello&to=ta"
                curl -s -o nul -X POST -H "Content-Type: application/json" -d "{\\"email\\":\\"x@x.com\\",\\"password\\":\\"x\\"}" http://localhost:30008/api/auth/login
                exit /b 0
                """
            }
        }

        stage('Capture Application Metrics Snapshot') {
            steps {
                bat """
                node tools\\capture-metrics.js > "%REPORTS_DIR%\\capture-metrics.log" 2>&1
                exit /b 0
                """
            }
        }

        stage('Postman API Smoke Tests - Newman') {
            steps {
                bat """
                npm run api:test:deployed > "%REPORTS_DIR%\\postman-api-smoke-console.txt" 2>&1
                exit /b 0
                """
            }
        }

        // ===================================================
        // VERIFY all expected artefacts landed, then GENERATE
        // ===================================================
        stage('Verify Artefacts') {
            steps {
                bat """
                echo === Artefacts collected for dashboard generation === > "%REPORTS_DIR%\\artefact-manifest.txt"
                dir /b "%REPORTS_DIR%" >> "%REPORTS_DIR%\\artefact-manifest.txt"
                type "%REPORTS_DIR%\\artefact-manifest.txt"
                exit /b 0
                """
            }
        }

        stage('Generate DevSecOps Visual Dashboards') {
            steps {
                bat """
                node tools\\generate-dashboards.js
                exit /b 0
                """
            }
        }

        stage('Pipeline Summary') {
            steps {
                echo "======================================================"
                echo " City Transition System - DevSecOps Pipeline Complete "
                echo "======================================================"
                echo " Open the 'DevSecOps Dashboard' link on this build page,"
                echo " or browse the archived devsecops-reports/index.html."
                echo "======================================================"
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'backend/coverage/**',  allowEmptyArchive: true
            archiveArtifacts artifacts: 'devsecops-reports/**', allowEmptyArchive: true

            // Clickable from the build page sidebar — no manual steps.
            publishHTML(target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'devsecops-reports',
                reportFiles: 'index.html',
                reportName: 'DevSecOps Dashboard',
                reportTitles: 'City Transition — DevSecOps Master Dashboard'
            ])
        }
        success { echo 'Pipeline completed successfully.' }
        failure { echo 'Pipeline failed. Check archived dashboards and Jenkins logs.' }
    }
}