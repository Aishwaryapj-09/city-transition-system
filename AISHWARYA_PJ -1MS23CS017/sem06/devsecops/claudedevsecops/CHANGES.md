# Files to remove from the existing project when applying this patch.
# These are obsolete: blackbox exporter, legacy dashboard generator, raw-JSON
# report style. Run the matching delete commands shown in SETUP.txt before
# (or after) overlaying the new files.

# Legacy dashboard generator (replaced by tools/generate-dashboards.js)
tools/devsecops-dashboard.js
tools/package-devsecops-reports.ps1

# Blackbox exporter — entirely removed
monitoring/blackbox/
k8s/blackbox-configmap.yaml
k8s/blackbox-deployment.yaml
k8s/blackbox-service.yaml

# Old Grafana dashboard JSON (a fresh set is provisioned by this patch)
monitoring/grafana/dashboards/city-transition-dashboard.json

# Old generated reports (a clean set will be produced on the next build)
devsecops-reports/
devsecops-reports.zip
