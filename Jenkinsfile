pipeline {
    agent any

    environment {
        NODE_ENV = "test"
        IMAGE_NAME = "your-dockerhub-username/accommodation-app"
        TAG = "${BUILD_NUMBER}"
    }

    stages {

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
            }
        }

        stage('Lint Code') {
            steps {
                dir('backend') {
                    bat 'npm run lint || exit 0'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('backend') {
                    bat 'npm test'
                }
            }
        }

        stage('Security Audit') {
            steps {
                dir('backend') {
                    bat 'npm audit --audit-level=high || exit 0'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t %IMAGE_NAME%:%TAG% ."
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([string(credentialsId: 'dockerhub-pass', variable: 'PASS')]) {
                    bat """
                        echo %PASS% | docker login -u your-dockerhub-username --password-stdin
                        docker push %IMAGE_NAME%:%TAG%
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl apply -f k8s\\'
            }
        }
    }

    post {
        success {
            echo '✅ Full CI/CD Pipeline Passed'
        }
        failure {
            echo '❌ Pipeline Failed'
        }
    }
}