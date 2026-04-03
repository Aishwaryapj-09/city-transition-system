pipeline {
    agent any

    environment {
        NODE_ENV = "test"
        IMAGE_NAME = "aishwaryapj09/city-transition-sys"
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
        withCredentials([usernamePassword(
            credentialsId: 'dockerhub-pass',
            usernameVariable: 'USER',
            passwordVariable: 'PASS'
        )]) {
            bat """
                echo %PASS% | docker login -u %USER% --password-stdin
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