#!/usr/bin/env pwsh
# install-prerequisites.ps1
# Run as Administrator to install Go, Docker Desktop, and OpenSSL.
# Usage: powershell -ExecutionPolicy Bypass -File install-prerequisites.ps1

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ISP Billing Platform — Prerequisites Installer" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  Please run this script as Administrator" -ForegroundColor Red
    exit 1
}

# ── Install Winget packages ───────────────────────────────────────
$packages = @(
    @{ Id = "GoLang.Go"; Name = "Go 1.23" },
    @{ Id = "Docker.DockerDesktop"; Name = "Docker Desktop" },
    @{ Id = "ShiningLight.OpenSSL"; Name = "OpenSSL" }
)

foreach ($pkg in $packages) {
    Write-Host "`n📦 Installing $($pkg.Name)..." -ForegroundColor Yellow
    $result = winget install --id $pkg.Id --silent --accept-source-agreements --accept-package-agreements 2>&1
    if ($LASTEXITCODE -eq 0 -or $result -match "already installed") {
        Write-Host "  ✅ $($pkg.Name) installed/already present" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Could not install $($pkg.Name) via winget. Install manually." -ForegroundColor Yellow
        Write-Host "     Download: https://go.dev/dl/ (Go) or https://www.docker.com/products/docker-desktop (Docker)" -ForegroundColor Gray
    }
}

Write-Host "`n─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "After installation:" -ForegroundColor White
Write-Host "  1. Restart terminal (to pick up PATH changes)" -ForegroundColor White
Write-Host "  2. Verify: go version" -ForegroundColor White
Write-Host "  3. Verify: docker --version" -ForegroundColor White
Write-Host "  4. Start Docker Desktop" -ForegroundColor White
Write-Host "  5. Run: cd C:\Users\62811\Documents\GOGIGABILL" -ForegroundColor White
Write-Host "  6. Run: .\scripts\setup.ps1" -ForegroundColor White
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
