pipeline {
    agent any

    environment {
        BACKEND_IMAGE = "aishwaryapj09/city-transition-backend"
        FRONTEND_IMAGE = "aishwaryapj09/city-transition-frontend"
        TAG = "latest"
        KUBECONFIG = "C:\\Users\\LENOVO\\.kube\\config"
        SONARQUBE_ENV = "sonarqube-server"
    }

    stages {
        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Reports Directory') {
            steps {
                bat 'if not exist devsecops-reports mkdir devsecops-reports'
            }
        }

        stage('Install Dependencies') {
            steps {
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
                dir('backend') {
                    bat 'npm run lint -- --format json --output-file ..\\devsecops-reports\\backend-eslint-report.json'
                }
                dir('frontend') {
                    bat 'npm run lint -- --format json --output-file ..\\devsecops-reports\\frontend-eslint-report.json'
                }
            }
        }

        stage('Nearby Feature Unit Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:nearby:unit -- --json --outputFile=..\\devsecops-reports\\nearby-unit-test-report.json'
                }
            }
        }

        stage('Nearby Feature Integration Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:nearby:integration -- --json --outputFile=..\\devsecops-reports\\nearby-integration-test-report.json'
                }
            }
        }

        stage('Language Helper Unit Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:language-helper:unit -- --json --outputFile=..\\devsecops-reports\\language-helper-unit-test-report.json'
                }
            }
        }

        stage('Language Helper Integration Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:language-helper:integration -- --json --outputFile=..\\devsecops-reports\\language-helper-integration-test-report.json'
                }
            }
        }

        stage('Unit Tests + Code Coverage') {
            steps {
                dir('backend') {
                    bat 'npm run coverage -- --json --outputFile=..\\devsecops-reports\\backend-coverage-test-report.json'
                    bat 'if exist coverage\\lcov.info echo Coverage report generated'
                }
                archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            }
        }

        stage('Integration Tests') {
            steps {
                dir('backend') {
                    bat 'npm run test:integration -- --json --outputFile=..\\devsecops-reports\\backend-integration-test-report.json'
                }
            }
        }

        stage('SonarQube Static Analysis') {
            steps {
                withSonarQubeEnv('sonarqube-server') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        dir('backend') {
                            bat """
                            npx sonar-scanner -Dsonar.login=%SONAR_TOKEN% > ..\\devsecops-reports\\sonarqube-scanner-report.txt 2>&1
                            set SCAN_EXIT=%ERRORLEVEL%
                            type ..\\devsecops-reports\\sonarqube-scanner-report.txt
                            exit /b %SCAN_EXIT%
                            """
                        }
                    }
                }
            }
        }

        stage('Dependency Security Scan') {
            steps {
                bat 'npm audit --omit=dev --audit-level=high --json > devsecops-reports\\root-npm-audit-report.json || exit 0'
                dir('backend') {
                    bat 'npm audit --audit-level=high --json > ..\\devsecops-reports\\backend-npm-audit-report.json || exit 0'
                }
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                bat "docker build --no-cache -t %BACKEND_IMAGE%:%TAG% ./backend"
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                bat "docker build --no-cache -t %FRONTEND_IMAGE%:%TAG% ./frontend"
            }
        }

        stage('Container Image Report') {
            steps {
                bat 'docker image inspect %BACKEND_IMAGE%:%TAG% %FRONTEND_IMAGE%:%TAG% > devsecops-reports\\docker-image-report.json'
            }
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

        stage('Deploy to Kubernetes with Ansible IaC') {
            steps {
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
                set DEPLOY_EXIT=%ERRORLEVEL%

:deploy_done
                type devsecops-reports\\deployment-report.txt
                exit /b %DEPLOY_EXIT%
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                bat """
                kubectl get deployments -o wide > devsecops-reports\\kubernetes-verification-report.txt 2>&1
                kubectl get pods -o wide >> devsecops-reports\\kubernetes-verification-report.txt 2>&1
                kubectl get services -o wide >> devsecops-reports\\kubernetes-verification-report.txt 2>&1
                curl -f http://localhost:30008/api/health > devsecops-reports\\backend-health-report.json
                curl -f http://localhost:30008/metrics > devsecops-reports\\prometheus-metrics-sample.txt
                type devsecops-reports\\kubernetes-verification-report.txt
                """
            }
        }

        stage('Postman API Smoke Tests - Newman') {
            steps {
                bat 'npm run api:test:deployed'
            }
        }

        stage('Performance Smoke Tests') {
            steps {
                bat 'npm run perf:test:deployed'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'devsecops-reports/**', allowEmptyArchive: true
                }
            }
        }

        stage('Info') {
            steps {
                echo "FULL DEVSECOPS PIPELINE ENABLED"
                echo "Nearby Essentials Finder and Local Language Helper are covered by unit, integration, coverage, lint, SonarQube, Docker, Kubernetes, Prometheus metrics, Ansible IaC deployment, Postman/Newman API smoke, and performance smoke stages"
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully'
        }
        failure {
            echo 'Pipeline failed'
        }
        always {
            archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'devsecops-reports/**', allowEmptyArchive: true
            echo 'Pipeline finished'
        }
    }
}
