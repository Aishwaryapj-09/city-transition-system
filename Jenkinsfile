pipeline {
    agent any

    environment {
        BACKEND_IMAGE = "aishwaryapj09/city-transition-backend"
        FRONTEND_IMAGE = "aishwaryapj09/city-transition-frontend"
        TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                bat "docker build -t %BACKEND_IMAGE%:%TAG% ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                bat "docker build -t %FRONTEND_IMAGE%:%TAG% ./frontend"
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-pass',
                    usernameVariable: 'USER',
                    passwordVariable: 'PASS'
                )]) {
                    bat """
                        echo %PASS% | docker login -u %USER% --password-stdin
                        docker push %BACKEND_IMAGE%:%TAG%
                        docker push %FRONTEND_IMAGE%:%TAG%
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl apply -f k8s/'
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline Success'
        }
        failure {
            echo '❌ Pipeline Failed'
        }
    }
}