pipeline {
  agent any

  environment {
    NODE_ENV = "test"
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
          bat 'npm audit --audit-level=high'
        }
      }
    }
  }

  post {
    success { echo 'Pipeline Successful!' }
    failure { echo 'Pipeline Failed!' }
  }
}