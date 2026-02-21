pipeline {
    agent any

    stages {

        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    bat 'docker run --rm -v "%cd%":/app -w /app node:18 npm install'
                }
            }
        }

        stage('Audit Security') {
            steps {
                dir('backend') {
                    bat 'docker run --rm -v "%cd%":/app -w /app node:18 npm audit --audit-level=high'
                }
            }
        }

    }
}