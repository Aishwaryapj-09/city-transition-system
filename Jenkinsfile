pipeline {
    agent any

    stages {

        stage('Install Backend Dependencies using Docker') {
            steps {
                dir('backend') {
                    bat 'docker run --rm -v "%cd%":/app -w /app node:18 npm install'
                }
            }
        }

        stage('Build Successful') {
            steps {
                echo 'Docker-based CI Successful'
            }
        }

    }
}