pipeline {
    agent any

    stages {

        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
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
