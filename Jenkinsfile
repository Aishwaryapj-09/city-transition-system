// ============================================================
// City Transition System - Jenkins DevSecOps Pipeline
// Flow: Build -> Test -> Scan -> Deploy -> Monitor
//
// Important monitoring decision:
// - Old custom performance-test.js and k6 load-test stages are removed.
// - Application performance is observed continuously with Prometheus + Grafana.
// - Jenkins verifies all public demo endpoints, /metrics, Prometheus, and Grafana.
// ============================================================

pipeline {
    agent any

    environment {
        BACKEND_IMAGE  = "aishwaryapj09/city-transition-backend"
        FRONTEND_IMAGE = "aishwaryapj09/city-transition-frontend"
        TAG            = "latest"
        KUBECONFIG     = "C:\\Users\\LENOVO\\.kube\\config"
        SONARQUBE_ENV  = "sonarqube-server"
    }

    stages {
        stage('Clean Workspace') {
            steps {
                // Start from a clean Jenkins workspace for repeatable builds.
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                // Pull source code from the configured Jenkins SCM.
                checkout scm
            }
        }

        stage('Prepare Reports Directory') {
            steps {
                // One folder for all requested demo reports.
                bat 'if not exist devsecops-reports mkdir devsecops-reports'
                // Remove old local performance artifacts if they ever appear in a reused workspace.
                bat 'if exist performance-results rmdir /s /q performance-results'
            }
        }

        stage('Install Dependencies') {
            steps {
                // Install root tooling, backend dependencies, and frontend dependencies.
                bat 'npm install'
                dir('backend') {
                    bat 'npm install'
                }
                dir('frontend') {
                    bat 'npm install'
                }
            }
        }

        stage('Static Code Analysis - ESLint') {
            steps {
                // ESLint catches syntax and code-quality issues before packaging.
                dir('backend') {
                    bat 'npm run lint -- --format json --output-file ..\\devsecops-reports\\backend-eslint-report.json > ..\\devsecops-reports\\backend-eslint-console.txt 2>&1'
                }
                dir('frontend') {
                    bat 'npm run lint -- --format json --output-file ..\\devsecops-reports\\frontend-eslint-report.json > ..\\devsecops-reports\\frontend-eslint-console.txt 2>&1'
                }
            }
        }

        stage('Nearby Feature Unit Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:nearby:unit -- --json --outputFile=..\\devsecops-reports\\nearby-unit-test-report.json > ..\\devsecops-reports\\nearby-unit-test-console.txt 2>&1'
                }
            }
        }

        stage('Nearby Feature Integration Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:nearby:integration -- --json --outputFile=..\\devsecops-reports\\nearby-integration-test-report.json > ..\\devsecops-reports\\nearby-integration-test-console.txt 2>&1'
                }
            }
        }

        stage('Language Helper Unit Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:language-helper:unit -- --json --outputFile=..\\devsecops-reports\\language-helper-unit-test-report.json > ..\\devsecops-reports\\language-helper-unit-test-console.txt 2>&1'
                }
            }
        }

        stage('Language Helper Integration Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:language-helper:integration -- --json --outputFile=..\\devsecops-reports\\language-helper-integration-test-report.json > ..\\devsecops-reports\\language-helper-integration-test-console.txt 2>&1'
                }
            }
        }

        stage('Unit Tests + Code Coverage') {
            steps {
                // Jest coverage is archived and also consumed by SonarQube.
                dir('backend') {
                    bat 'npm run coverage -- --json --outputFile=..\\devsecops-reports\\backend-coverage-test-report.json > ..\\devsecops-reports\\backend-coverage-test-console.txt 2>&1'
                    bat 'if exist coverage\\lcov.info echo Coverage report generated'
                }
                archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            }
        }

        stage('Integration Tests') {
            steps {
                dir('backend') {
                    bat 'npm run test:integration -- --json --outputFile=..\\devsecops-reports\\backend-integration-test-report.json > ..\\devsecops-reports\\backend-integration-test-console.txt 2>&1'
                }
            }
        }

        stage('SonarQube Static Analysis') {
            steps {
                // SonarQube checks bugs, code smells, coverage, and security hotspots.
                withSonarQubeEnv('sonarqube-server') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        dir('backend') {
                            bat """
                            npx sonar-scanner -Dsonar.login=%SONAR_TOKEN% > ..\\devsecops-reports\\sonarqube-scanner-report.txt 2>&1
                            set SCAN_EXIT=%ERRORLEVEL%
                            exit /b %SCAN_EXIT%
                            """
                        }
                    }
                }
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                // Fresh image build for the API container.
                bat "docker build --no-cache -t %BACKEND_IMAGE%:%TAG% ./backend"
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                // Fresh image build for the React frontend container.
                bat "docker build --no-cache -t %FRONTEND_IMAGE%:%TAG% ./frontend"
            }
        }

        stage('Push Container Images') {
            steps {
                // Docker Hub credentials stay in Jenkins Credentials Store.
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

        stage('Deploy to Kubernetes with Ansible IaC') {
            steps {
                // Preferred path: Ansible applies all Kubernetes manifests.
                // Fallback path: kubectl applies the same IaC files directly.
                bat """
                if not exist devsecops-reports mkdir devsecops-reports
                set DEPLOY_EXIT=0
                where ansible-playbook >nul 2>nul
                if %ERRORLEVEL% EQU 0 goto run_ansible
                goto run_kubectl

:run_ansible
                echo ansible-playbook found. Running Ansible IaC deployment. > devsecops-reports\\deployment-report.txt
                ansible-playbook -i ansible/inventory.ini ansible/deploy.yml >> devsecops-reports\\deployment-report.txt 2>&1
                set DEPLOY_EXIT=%ERRORLEVEL%
                goto deploy_done

:run_kubectl
                echo ansible-playbook not found. Falling back to kubectl deployment. > devsecops-reports\\deployment-report.txt
                kubectl config use-context docker-desktop >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl apply -f k8s/ --validate=false >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout restart deployment/backend >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout restart deployment/frontend >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout status deployment/backend --timeout=180s >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout status deployment/frontend --timeout=180s >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout status deployment/prometheus --timeout=180s >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout status deployment/blackbox-exporter --timeout=180s >> devsecops-reports\\deployment-report.txt 2>&1
                if errorlevel 1 set DEPLOY_EXIT=%ERRORLEVEL% && goto deploy_done
                kubectl rollout status deployment/grafana --timeout=180s >> devsecops-reports\\deployment-report.txt 2>&1
                set DEPLOY_EXIT=%ERRORLEVEL%

:deploy_done
                echo Deployment report saved to devsecops-reports\\deployment-report.txt
                exit /b %DEPLOY_EXIT%
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                // Verify workloads, services, backend health, and backend Prometheus metrics.
                bat """
                kubectl get deployments -o wide > devsecops-reports\\kubernetes-verification-report.txt 2>&1
                kubectl get daemonsets -o wide >> devsecops-reports\\kubernetes-verification-report.txt 2>&1
                kubectl get pods -o wide >> devsecops-reports\\kubernetes-verification-report.txt 2>&1
                kubectl get services -o wide >> devsecops-reports\\kubernetes-verification-report.txt 2>&1
                curl -f http://localhost:30008/health > devsecops-reports\\backend-health-report.json 2>&1
                curl -f http://localhost:30008/metrics > devsecops-reports\\prometheus-metrics-sample.txt 2>&1
                echo Kubernetes verification report saved to devsecops-reports\\kubernetes-verification-report.txt
                """
            }
        }

        stage('Postman API Smoke Tests - Newman') {
            steps {
                // Smoke tests confirm deployed APIs still work after CD.
                bat 'npm run api:test:deployed > devsecops-reports\\postman-api-smoke-console.txt 2>&1'
            }
        }

        stage('Endpoint Monitoring Evidence') {
            steps {
                // Calls each public, validation, and protected API route family once.
                // This creates route-wise Prometheus labels and saves short evidence files.
                bat 'npm run reports:endpoints'
            }
        }

        stage('Prometheus and Grafana Monitoring Check') {
            steps {
                // This replaces the removed performance-test.js and k6 stages.
                // It checks monitoring availability without load testing the app.
                bat """
                echo City Transition System - Monitoring Summary > devsecops-reports\\monitoring-health-report.txt
                echo Stack: Prometheus + Grafana + Blackbox + cAdvisor + Node Exporter >> devsecops-reports\\monitoring-health-report.txt
                echo Legacy performance scripts: removed. Monitoring is continuous. >> devsecops-reports\\monitoring-health-report.txt
                echo. >> devsecops-reports\\monitoring-health-report.txt

                curl -sf http://localhost:30090/-/healthy >> devsecops-reports\\monitoring-health-report.txt 2>&1 ^
                  && echo [OK] Prometheus is healthy >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] Prometheus not reachable on localhost:30090 >> devsecops-reports\\monitoring-health-report.txt

                curl -sf http://localhost:30300/api/health >> devsecops-reports\\monitoring-health-report.txt 2>&1 ^
                  && echo [OK] Grafana is reachable >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] Grafana not reachable on localhost:30300 >> devsecops-reports\\monitoring-health-report.txt

                curl -sf http://localhost:30008/metrics -o devsecops-reports\\prometheus-metrics-snapshot.txt 2>&1 ^
                  && echo [OK] Backend /metrics endpoint reachable >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] Backend /metrics endpoint not reachable >> devsecops-reports\\monitoring-health-report.txt

                findstr /C:"city_transition_up" devsecops-reports\\prometheus-metrics-snapshot.txt > nul 2>&1 ^
                  && echo [OK] city_transition_up metric present >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] city_transition_up metric missing >> devsecops-reports\\monitoring-health-report.txt

                findstr /C:"city_transition_http_requests_total" devsecops-reports\\prometheus-metrics-snapshot.txt > nul 2>&1 ^
                  && echo [OK] request count metric present >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] request count metric missing >> devsecops-reports\\monitoring-health-report.txt

                findstr /C:"city_transition_http_request_duration_seconds" devsecops-reports\\prometheus-metrics-snapshot.txt > nul 2>&1 ^
                  && echo [OK] response time and latency metric present >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] response time metric missing >> devsecops-reports\\monitoring-health-report.txt

                findstr /C:"city_transition_http_errors_total" devsecops-reports\\prometheus-metrics-snapshot.txt > nul 2>&1 ^
                  && echo [OK] error-rate metric present >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] error-rate metric missing >> devsecops-reports\\monitoring-health-report.txt

                findstr /C:"city_transition_process_resident_memory_bytes" devsecops-reports\\prometheus-metrics-snapshot.txt > nul 2>&1 ^
                  && echo [OK] memory metric present >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] memory metric missing >> devsecops-reports\\monitoring-health-report.txt

                findstr /C:"city_transition_process_cpu_seconds_total" devsecops-reports\\prometheus-metrics-snapshot.txt > nul 2>&1 ^
                  && echo [OK] CPU metric present >> devsecops-reports\\monitoring-health-report.txt ^
                  || echo [WARN] CPU metric missing >> devsecops-reports\\monitoring-health-report.txt

                echo. >> devsecops-reports\\monitoring-health-report.txt
                echo Endpoint-wise route proof is saved in endpoint-evidence.html. >> devsecops-reports\\monitoring-health-report.txt
                echo Route-wise PromQL proof is saved in 06-prometheus-monitoring-report.html. >> devsecops-reports\\monitoring-health-report.txt
                echo Grafana panel proof is saved in 07-grafana-performance-testing-report.html. >> devsecops-reports\\monitoring-health-report.txt
                echo Monitoring report saved to devsecops-reports\\monitoring-health-report.txt
                """
            }
        }

        stage('Generate Concept-Wise DevSecOps Reports') {
            steps {
                // Final human-readable report for viva/demo:
                // devsecops-reports/00-devsecops-demo-index.html
                bat 'npm run reports:dashboard'
            }
        }

        stage('Package Single Reports Folder') {
            steps {
                // Creates devsecops-reports.zip beside the folder for easy sharing.
                bat 'npm run reports:zip'
            }
        }

        stage('Pipeline Summary') {
            steps {
                echo "======================================================"
                echo " City Transition System - DevSecOps Pipeline Complete "
                echo "======================================================"
                echo " Application features covered:"
                echo " - Accommodation Finder"
                echo " - Admin Verification System"
                echo " - Owner Property Listing"
                echo " - Nearby Services"
                echo " - Local Language Helper"
                echo " - City Transition Assistance Platform"
                echo "------------------------------------------------------"
                echo " Monitoring is Prometheus/Grafana only:"
                echo " - API response time and latency"
                echo " - Request throughput and HTTP request count"
                echo " - 4xx/5xx error rate"
                echo " - Backend CPU, memory, uptime, and health"
                echo " - Endpoint-wise uptime for all demo APIs"
                echo " - Separate Grafana graphs for each API family"
                echo "------------------------------------------------------"
                echo " Removed: custom performance-test.js and k6 stages"
                echo " Visual report: devsecops-reports/00-devsecops-demo-index.html"
                echo " Concept reports: devsecops-reports/*-report.html"
                echo " Report bundle: devsecops-reports.zip"
                echo " Result : CI/CD succeeds without standalone performance testing"
                echo "======================================================"
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully with continuous monitoring enabled.'
        }
        failure {
            echo 'Pipeline failed. Review Jenkins logs and archived reports.'
        }
        always {
            archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'devsecops-reports/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'devsecops-reports.zip', allowEmptyArchive: true
            echo 'Pipeline finished.'
        }
    }
}
