param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Run-Step {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  Push-Location $WorkingDirectory
  try {
    Invoke-Expression $Command
  } finally {
    Pop-Location
  }
}

Run-Step -Name "Server Jest suite" -WorkingDirectory (Join-Path $repoRoot "Server") -Command "npm test"
Run-Step -Name "Client Jest suite" -WorkingDirectory (Join-Path $repoRoot "Client") -Command "npm test"

if (-not $SkipBuild) {
  Run-Step -Name "Client production build" -WorkingDirectory (Join-Path $repoRoot "Client") -Command "npm run build"
}

Write-Host ""
Write-Host "Project verification completed successfully." -ForegroundColor Green
