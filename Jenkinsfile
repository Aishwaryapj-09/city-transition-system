
pipeline {
    agent any

    environment {
        BACKEND_IMAGE = "aishwaryapj09/city-transition-backend"
        FRONTEND_IMAGE = "aishwaryapj09/city-transition-frontend"
        TAG = "latest"
        KUBECONFIG = "C:\\Users\\LENOVO\\.kube\\config"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                bat "docker build --no-cache -t %BACKEND_IMAGE%:%TAG% ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                bat "docker build --no-cache -t %FRONTEND_IMAGE%:%TAG% ./frontend"
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

        // 🔥 ALWAYS DEPLOY (AUTO CONTAINER CREATION)
        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl config use-context docker-desktop'
                bat 'kubectl apply -f k8s/ --validate=false'
                bat 'kubectl rollout restart deployment backend'
                bat 'kubectl rollout restart deployment frontend'
            }
        }

        stage('Info') {
            steps {
                echo "----------------------------------"
                echo "AUTO DEPLOY ENABLED"
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

