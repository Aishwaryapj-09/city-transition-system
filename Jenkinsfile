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
                    bat 'npm run lint'
                }
                dir('frontend') {
                    bat 'npm run lint'
                }
            }
        }

        stage('Nearby Feature Unit Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:nearby:unit'
                }
            }
        }

        stage('Nearby Feature Integration Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:nearby:integration'
                }
            }
        }

        stage('Language Helper Unit Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:language-helper:unit'
                }
            }
        }

        stage('Language Helper Integration Test') {
            steps {
                dir('backend') {
                    bat 'npm run test:language-helper:integration'
                }
            }
        }

        stage('Unit Tests + Code Coverage') {
            steps {
                dir('backend') {
                    bat 'npm run coverage'
                    bat 'if exist coverage\\lcov.info echo Coverage report generated'
                }
                archiveArtifacts artifacts: 'backend/coverage/**', allowEmptyArchive: true
            }
        }

        stage('Integration Tests') {
            steps {
                dir('backend') {
                    bat 'npm run test:integration'
                }
            }
        }

        stage('SonarQube Static Analysis') {
            steps {
                withSonarQubeEnv('sonarqube-server') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        dir('backend') {
                            bat """
                            npx sonar-scanner ^
                            -Dsonar.login=%SONAR_TOKEN%
                            """
                        }
                    }
                }
            }
        }

        stage('Dependency Security Scan') {
            steps {
                bat 'npm audit --omit=dev --audit-level=high || exit 0'
                dir('backend') {
                    bat 'npm audit --audit-level=high || exit 0'
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
                bat 'ansible-playbook -i ansible/inventory.ini ansible/deploy.yml'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'kubectl get deployments'
                bat 'kubectl get pods'
                bat 'kubectl get services'
                bat 'curl -f http://localhost:30008/api/health'
                bat 'curl -f http://localhost:30008/metrics'
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
                    archiveArtifacts artifacts: 'performance-results/**', allowEmptyArchive: true
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
            archiveArtifacts artifacts: 'performance-results/**', allowEmptyArchive: true
            echo 'Pipeline finished'
        }
    }
}
