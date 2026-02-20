pipeline {
    agent any

    stages {

        stage('Install Dependencies using Docker') {
            steps {
                dir('backend') {
                    sh 'docker run --rm -v $PWD:/app -w /app node:18 npm install'
                }
            }
        }

        stage('Build Success') {
            steps {
                echo 'Build Successful!'
            }
        }

    }
}