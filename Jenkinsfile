pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }

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
                echo 'CI Build Completed Successfully!'
            }
        }
    }
}
