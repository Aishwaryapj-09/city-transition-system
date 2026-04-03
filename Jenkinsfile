pipeline {
agent any

environment {
NODE_ENV = "test"
IMAGE_NAME = "your-dockerhub-username/accommodation-app"
TAG = "${env.BUILD_NUMBER}"
}

stages {

```
stage('Checkout') {
  steps {
    checkout scm
  }
}

stage('Install Dependencies') {
  steps {
    dir('backend') {
      sh 'npm install'
    }
  }
}

stage('Lint Code') {
  steps {
    dir('backend') {
      sh 'npm run lint || true'
    }
  }
}

stage('Run Tests') {
  steps {
    dir('backend') {
      sh 'npm test'
    }
  }
}

stage('Security Audit') {
  steps {
    dir('backend') {
      sh 'npm audit --audit-level=high || true'
    }
  }
}

stage('Build Docker Image') {
  steps {
    sh 'docker build -t $IMAGE_NAME:$TAG .'
  }
}

stage('Push Docker Image') {
  steps {
    withCredentials([string(credentialsId: 'dockerhub-pass', variable: 'PASS')]) {
      sh '''
      echo $PASS | docker login -u your-dockerhub-username --password-stdin
      docker push $IMAGE_NAME:$TAG
      '''
    }
  }
}

stage('Deploy to Kubernetes') {
  steps {
    sh 'kubectl apply -f k8s/'
  }
}
```

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
