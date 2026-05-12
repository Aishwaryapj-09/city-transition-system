# Ansible IaC Deployment

This folder contains the Infrastructure-as-Code deployment step for the City
Transition System DevSecOps pipeline.

## What It Does

- Selects the `docker-desktop` Kubernetes context by default.
- Applies every manifest in `k8s/`.
- Restarts backend and frontend deployments after Jenkins pushes fresh images.
- Waits for backend, frontend, Prometheus, Blackbox Exporter, and Grafana.
- Prints Kubernetes services so deployed URLs are visible in Jenkins logs.

## Run Locally

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

Use a different cluster context:

```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml -e kube_context=minikube
```

## Deployed Endpoints

- Frontend: `http://localhost:30007`
- Backend API: `http://localhost:30008`
- Backend metrics: `http://localhost:30008/metrics`
- Prometheus: `http://localhost:30090`
- Grafana: `http://localhost:30300`
- Monitoring guide: `MONITORING_AND_OUTPUTS.md`
