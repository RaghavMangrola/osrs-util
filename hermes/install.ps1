$ErrorActionPreference = 'Stop'

$msi = "src-tauri\target\release\bundle\msi\hermes_0.2.0_x64_en-US.msi"

if (-not (Test-Path $msi)) {
    Write-Host "MSI not found at $msi — run 'npm run tauri build' first." -ForegroundColor Red
    exit 1
}

Write-Host "Installing Hermes..." -ForegroundColor Cyan
Start-Process msiexec.exe -ArgumentList '/i', (Resolve-Path $msi), '/quiet', '/norestart' -Wait
Write-Host "Done." -ForegroundColor Green
