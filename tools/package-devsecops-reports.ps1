$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReportsDir = Join-Path $ProjectRoot "devsecops-reports"
$ZipPath = Join-Path $ProjectRoot "devsecops-reports.zip"

if (-not (Test-Path -LiteralPath $ReportsDir)) {
  throw "Report folder not found: $ReportsDir"
}

if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $ReportsDir "*") -DestinationPath $ZipPath -Force
Write-Host "Saved report bundle: $ZipPath"
