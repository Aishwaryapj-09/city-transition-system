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

    stage('Lint Code') {
      steps {
        dir('backend') {
          bat 'npm run lint'
        }
      }
    }

    stage('Run Unit Tests') {
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
    success {
      echo 'CI Passed – Accommodation Feature Secured'
    }
    failure {
      echo 'CI Failed – Fix Issues'
    }
  }
}