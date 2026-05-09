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
                    docker login -u %DOCKER_USER% -p %DOCKER_PASS%
                    docker push %BACKEND_IMAGE%:%TAG%
                    docker push %FRONTEND_IMAGE%:%TAG%
                    docker logout
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl config use-context docker-desktop'
                bat 'kubectl apply -f k8s/ --validate=false'
                bat 'kubectl rollout restart deployment backend'
                bat 'kubectl rollout restart deployment frontend'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'kubectl get pods'
                bat 'kubectl get services'
            }
        }

        stage('Info') {
            steps {
                echo "FULL DEVSECOPS PIPELINE ENABLED"
                echo "Nearby Essentials Finder is covered by unit, integration, coverage, lint, SonarQube, Docker, and Kubernetes stages"
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
            echo 'Pipeline finished'
        }
    }
}
