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

        // ✅ 1. CHECKOUT
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ✅ 2. INSTALL DEPENDENCIES
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

        // ✅ 3. LINT
        stage('Lint') {
            steps {
                dir('backend') {
                    bat 'npm run lint || exit 0'
                }
            }
        }

        // ✅ 4. UNIT TEST + COVERAGE
        stage('Unit Tests + Coverage') {
            steps {
                dir('backend') {
                    bat 'npm run coverage'
                }
            }
        }

        // ✅ 5. INTEGRATION TESTS
        stage('Integration Tests') {
            steps {
                dir('backend') {
                    bat 'npm run test:integration'
                }
            }
        }

        // ✅ 6. SONARQUBE ANALYSIS
        stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('sonarqube-server') {
            dir('backend') {
                bat """
                npx sonar-scanner ^
                -Dsonar.projectKey=city-transition ^
                -Dsonar.sources=. ^
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                """
            }
        }
    }
}

        // ✅ 7. SECURITY SCAN
        stage('Security Scan') {
            steps {
                dir('backend') {
                    bat 'npm audit --audit-level=high'
                }
            }
        }

        // ✅ 8. BUILD BACKEND
        stage('Build Backend') {
            steps {
                bat "docker build --no-cache -t %BACKEND_IMAGE%:%TAG% ./backend"
            }
        }

        // ✅ 9. BUILD FRONTEND
        stage('Build Frontend') {
            steps {
                bat "docker build --no-cache -t %FRONTEND_IMAGE%:%TAG% ./frontend"
            }
        }

        // ✅ 10. PUSH IMAGES
        stage('Push Images') {
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

        // ✅ 11. DEPLOY TO KUBERNETES
        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl config use-context docker-desktop'
                bat 'kubectl apply -f k8s/ --validate=false'
                bat 'kubectl rollout restart deployment backend'
                bat 'kubectl rollout restart deployment frontend'
            }
        }

        // ✅ 12. VERIFY DEPLOYMENT
        stage('Verify Deployment') {
            steps {
                bat 'kubectl get pods'
                bat 'kubectl get services'
            }
        }

        stage('Info') {
            steps {
                echo "----------------------------------"
                echo "FULL DEVSECOPS PIPELINE ENABLED"
                echo "----------------------------------"
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully'
        }
        failure {
            echo '❌ Pipeline failed'
        }
        always {
            echo '🏁 Pipeline finished'
        }
    }
}