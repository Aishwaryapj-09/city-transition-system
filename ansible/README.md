# Ansible IaC Deployment

This folder contains the Infrastructure-as-Code deployment step for the City Transition System DevSecOps pipeline.

## What it does

- Selects the `docker-desktop` Kubernetes context.
- Applies all manifests in `k8s/`.
- Restarts backend and frontend deployments after Jenkins pushes fresh Docker images.
- Waits for backend, frontend, Prometheus, and Blackbox Exporter rollouts.
- Prints Kubernetes services so the deployed URLs are visible in Jenkins logs.

## Run locally

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

Use a different cluster context when needed:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml -e kube_context=minikube
```

## Deployed endpoints

- Frontend: `http://localhost:30007`
- Backend API: `http://localhost:30008`
- Prometheus: `http://localhost:30090`
- Backend metrics: `http://localhost:30008/metrics`
- Monitoring guide: `MONITORING_AND_OUTPUTS.md`
