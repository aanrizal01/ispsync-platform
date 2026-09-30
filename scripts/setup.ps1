#!/usr/bin/env pwsh
# setup.ps1
# Run AFTER installing prerequisites (Go, Docker Desktop, OpenSSL).
# Sets up the project: copies .env, generates JWT keys, downloads Go deps.

Set-Location "C:\Users\62811\Documents\GOGIGABILL"

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ISP Billing Platform — Project Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# ── 1. Copy .env ──────────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "`n✅ .env created from .env.example" -ForegroundColor Green
    Write-Host "   ⚠️  Review and update secrets in .env before proceeding!" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ .env already exists" -ForegroundColor Green
}

# ── 2. Generate JWT RSA Keys ──────────────────────────────────────
Write-Host "`n📦 Generating JWT RSA-4096 key pair..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "keys" | Out-Null

if (-not (Test-Path "keys\private.pem")) {
    # Try OpenSSL
    $opensslCmd = Get-Command "openssl" -ErrorAction SilentlyContinue
    if ($opensslCmd) {
        openssl genrsa -out keys\private.pem 4096
        openssl rsa -in keys\private.pem -pubout -out keys\public.pem
        Write-Host "  ✅ JWT keys generated: keys\private.pem, keys\public.pem" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  OpenSSL not found in PATH." -ForegroundColor Yellow
        Write-Host "     Install OpenSSL or run this after restarting terminal." -ForegroundColor Gray
        Write-Host "     Alternatively: generate keys manually and place in .\keys\" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ JWT keys already exist" -ForegroundColor Green
}

# ── 3. Download Go dependencies ───────────────────────────────────
Write-Host "`n📦 Downloading Go dependencies..." -ForegroundColor Yellow
Set-Location "apps\api"

$goCmd = Get-Command "go" -ErrorAction SilentlyContinue
if ($goCmd) {
    go mod download
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Go dependencies downloaded" -ForegroundColor Green
    } else {
        Write-Host "  ❌ go mod download failed. Check your internet connection." -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Go not found in PATH. Install Go and restart terminal." -ForegroundColor Yellow
    Write-Host "     Download: https://go.dev/dl/" -ForegroundColor Gray
}

Set-Location "..\.."

# ── 4. Install Next.js dependencies ──────────────────────────────
Write-Host "`n📦 Installing Next.js dependencies..." -ForegroundColor Yellow
if (Test-Path "apps\web\package.json") {
    Set-Location "apps\web"
    npm install
    Set-Location "..\.."
    Write-Host "  ✅ Next.js dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  apps\web not found — Next.js will be created separately" -ForegroundColor Yellow
}

# ── 5. Summary ────────────────────────────────────────────────────
Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Setup Complete! Next steps:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Start Docker Desktop" -ForegroundColor White
Write-Host "  2. docker compose up -d" -ForegroundColor White
Write-Host "  3. docker compose logs -f api" -ForegroundColor White
Write-Host ""
Write-Host "  API:     http://localhost:8080" -ForegroundColor Green
Write-Host "  Web:     http://localhost:3000" -ForegroundColor Green
Write-Host "  Health:  http://localhost:8080/health" -ForegroundColor Green
Write-Host ""
Write-Host "  Test login:" -ForegroundColor White
Write-Host "  POST http://localhost:8080/api/v1/auth/login" -ForegroundColor Gray
Write-Host "  { ""email"": ""admin@isp.local"", ""password"": ""admin123456"" }" -ForegroundColor Gray
Write-Host ""
