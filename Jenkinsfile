pipeline {
  agent any

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

    stage('Run Tests') {
      steps {
        dir('backend') {
          bat 'npm test'
        }
      }
    }
  }

  post {
    success {
      echo 'Build Successful!'
    }
    failure {
      echo 'Build Failed!'
    }
  }
}