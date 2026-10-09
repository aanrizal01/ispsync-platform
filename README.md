# ISP Billing & Network Access Management Platform

Modern ISP billing system supporting **PPPoE**, **Hotspot**, **Voucher**, **Passpoint/HS2.0**, **FreeRADIUS**, **MikroTik**, **Juniper**, payment gateway, and full customer/admin management.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.23, chi router, pgx/v5 |
| Database | PostgreSQL 16 + PostGIS |
| Cache / Queue | Redis 7 |
| Frontend Web | Next.js 16 (App Router, Turbopack, TypeScript) |
| Mobile App | React Native, Expo SDK 57 (Android & iOS) |
| UI Design System | Tailwind CSS, Linear Telco Dark Design Standard |
| AAA Engine | FreeRADIUS 3.2 (rlm_sql → PostgreSQL) |
| Reverse Proxy | Caddy v2 (On-Demand TLS Auto-SSL) |
| Container | Docker + Compose |

## Prerequisites

Install these first:

| Tool | Version | Download |
|---|---|---|
| Go | 1.23+ | https://go.dev/dl/ |
| Node.js | 22+ (already installed) | ✅ |
| Docker Desktop | Latest | https://docker.com/products/docker-desktop |
| OpenSSL | 3.x | via winget or https://slproweb.com/products/Win32OpenSSL.html |

**Quick install (run as Administrator):**
```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-prerequisites.ps1
```

## Quick Start

```powershell
# 1. Setup project (copy .env, generate JWT keys, install deps)
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

# 2. Review and update secrets
notepad .env

# 3. Start Docker Desktop, then:
docker compose up -d

# 4. Check logs
docker compose logs -f api

# 5. Test health
curl http://localhost:8080/health
```

## Services

| Service | URL | Description |
|---|---|---|
| API | http://localhost:8080 | Go REST API |
| Web | http://localhost:3000 | Next.js Admin + Portal |
| Caddy Proxy | http://localhost | Reverse proxy (dev) |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache + Queue |
| FreeRADIUS | UDP :1812, :1813 | AAA |

## API Endpoints (Current Progress)

```http
# Authentication
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
PUT  /api/v1/auth/me/password

# Customer & Subscription
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/{id}
POST   /api/v1/subscriptions
PUT    /api/v1/subscriptions/{id}/status

# Billing & Invoices
GET    /api/v1/invoices
POST   /api/v1/invoices
POST   /api/v1/invoices/{id}/issue
POST   /api/v1/invoices/{id}/void
POST   /api/v1/invoices/public/lookup      # Portal Pelanggan Mandiri
POST   /api/v1/invoices/public/pay-qris    # Dynamic QRIS Payment

# Partners & Revenue Sharing (Kemitraan Reseller / Sub-ISP)
GET    /api/v1/partners
POST   /api/v1/partners
GET    /api/v1/partners/{id}
PUT    /api/v1/partners/{id}
GET    /api/v1/partners/{id}/shares
POST   /api/v1/partners/{id}/settlements
GET    /api/v1/settlements
POST   /api/v1/settlements/{id}/approve

# Network & AAA FreeRADIUS
GET    /api/v1/devices
POST   /api/v1/devices                     # All-in-One API + RADIUS NAS registration
GET    /api/v1/devices/{id}/test-conn

# Domain & WiFi Settings (Multi-Tenant & Sub-Brand)
GET    /api/v1/settings/domain
PUT    /api/v1/settings/domain

# Hotspot, Voucher & Passpoint WiFi 2.0
GET    /api/v1/hotspot/plans
POST   /api/v1/hotspot/buy
GET    /api/v1/passpoint/profile
POST   /api/v1/passpoint/register

# Mitra Agen & Loket Kasir (Anti-Flooding Protected)
POST   /api/v1/agents/register
POST   /api/v1/agents/login
GET    /api/v1/agents/dashboard
POST   /api/v1/agents/vouchers/print

# Health
GET  /health
GET  /ready
```

## 📖 Dokumentasi & Buku Manual

- [Buku Manual Aplikasi Mobile Universal (Android & iOS)](docs/MANUAL_APLIKASI_MOBILE_UNIVERSAL.md) — Panduan integrasi aliansi multi-tenant, koneksi printer thermal Bluetooth ESC/POS (58mm & 80mm), Passpoint Hotspot 2.0 auto-connect, dan pengujian via Expo SDK 57.
- [Buku Master SOP Ekosistem Digital 3 Engine](docs/MASTER_SOP_EKOSISTEM_3_ENGINE_ISPSYNC.md) — Standar Operasional Prosedur terpadu untuk FiberGrid (Infrastruktur GIS FO), Nexus (Sales & Lapangan), dan Ledger (Billing, Keuangan & AAA).
- [Perjanjian Kerjasama (PKS) Kemitraan Agen & Loket](docs/PKS_KEMITRAAN_AGEN_ISPSYNC.md) — Perjanjian resmi kemitraan agen loket, skema komisi bagi hasil, dan perlindungan anti-fraud.
- [Buku Manual Billing & Panduan Operasional ISP](docs/BILLING_MANUAL.md) — Panduan komprehensif arsitektur billing, siklus faktur, kalkulasi PPN/proration, modul kemitraan bagi hasil, dan integrasi router/isolir.
- [Panduan Standar Desain Linear Telco](GEMINI.md) — Design system standar carrier-grade, palet warna slate-950/cyan, serta larangan anti-pattern capsule gimmicks.

## Project Structure

```
ISPSYNC/
├── apps/
│   ├── api/                # Go 1.23 REST API Backend
│   │   ├── cmd/api/        # API server entrypoint
│   │   ├── cmd/worker/     # Background worker entrypoint
│   │   ├── internal/       # Domain packages (auth, agent, billing, settings...)
│   │   ├── migrations/     # SQL migrations
│   │   └── pkg/            # Reusable packages (money, crypto)
│   ├── web/                # Next.js 16 Web Frontend (Turbopack)
│   │   ├── app/            # App Router (admin backoffice, hotspot, agent, passpoint)
│   │   ├── components/     # UI components (Linear Telco Dark)
│   │   └── lib/            # API client, auth, utils (smart image compressor)
│   └── mobile/             # Universal Mobile App (Expo SDK 57, React Native 0.86)
│       ├── App.tsx         # Root entry point with tenant switcher
│       ├── assets/         # App icons & splash screens
│       └── src/            # Screens (TenantSelect, MainPortal, PrinterSettings)
├── config/                 # Caddy, FreeRADIUS configs
├── deploy/                 # Docker Compose production & Caddyfile configs
├── docs/                   # Buku manual operasional, SOP, dan PKS resmi
├── scripts/                # Setup + utility deployment scripts
└── docker-compose.yml
```

## Development Workflow

```powershell
# Start all services with hot-reload
docker compose up -d

# Watch API logs
docker compose logs -f api

# Open DB shell
docker compose exec postgres psql -U postgres -d isp_billing

# Open Redis CLI
docker compose exec redis redis-cli -a <password>

# Run Go tests
cd apps/api && go test ./...

# Format Go code
cd apps/api && gofmt -s -w .
```

## Default Credentials (Development Only)

After running migrations and seed:
- **Email:** admin@isp.local
- **Password:** *(set using `go run ./scripts/seed_hash/main.go -password 'YourPassword'`)*

⚠️ **Always change default credentials before any production deployment.**

## Development Phases & Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Architecture Blueprint & Tech Stack |
| 2 | ✅ Done | Authentication & Foundation (Go REST, Next.js, Docker, JWT RS256) |
| 3 | ✅ Done | Customer Management, Service Plans & Subscription Lifecycle |
| 4 | ✅ Done | Automated Billing Engine (Proration, PPN Basis Points, Due Date Scheduler) |
| 5 | ✅ Done | Payment Gateway & Dynamic QRIS Customer Portal (`/billing/check`) |
| 6 | ✅ Done | Voucher System & Hotspot Bandwidth Profiles |
| 7 | ✅ Done | FreeRADIUS AAA Integration (rlm_sql, radcheck, radreply, radusergroup) |
| 8 | ✅ Done | Captive Portal & Walled Garden Isolation Engine |
| 9 | ✅ Done | **Passpoint / Hotspot 2.0 Integration** (EAP-SIM / TTLS, `.mobileconfig` Auto-Installer) |
| 10 | ✅ Done | MikroTik Adapter (RouterOS API port 8728 + FreeRADIUS NAS Auto-Attachment) |
| 11 | ✅ Done | Juniper BNG Adapter (Junos REST API / RFC 3576 CoA PoD) |
| 12 | ✅ Done | **Partnership & Revenue Sharing Module** (Reseller/Sub-ISP, Split Rules, Settlement) |
| 13 | ✅ Done | Notification Dispatcher (WhatsApp Gateway & Automated Invoice Reminders) |
| 14 | ✅ Done | Financial Reporting, Ledger & Date-Range Export with Print |
| 15 | ✅ Done | Production Hardening, Caddy On-Demand TLS & Multi-Tenant VPS Deployment |
| 16 | 📋 Planned | **SmartOLT Integration & Jartaplok Bridge** (Live Optical Telemetry, ONU Lifecycle, Wholesale Port Auto-COGS) |
| 17 | ✅ Done | **Mitra Agen & Blank Scratch Voucher POS** (Smart Client Compression 97%, Anti-Spam Honeypot, ESC/POS Bluetooth Print) |
| 18 | ✅ Done | **Subdomain Isolation & Domain Engine** (`wifi.*` / `hotspot.*` vs `ledger.*`, Zero-Config Auto-SSL) |
| 19 | ✅ Done | **Universal Mobile App Aliansi Bersama** (Expo SDK 57, React Native 0.86, Android & iOS Dual-Mode) |

## Security Notes

- JWT uses RS256 (asymmetric) — public key can be shared safely
- Passwords hashed with bcrypt (cost=12)
- Refresh tokens revoked in Redis on logout
- All monetary values stored as integers (no float)
- `audit_logs` table is append-only (no UPDATE/DELETE for app user)
- Never commit `.env` or `keys/` to version control

## Official Documentation

| Document | Description |
|---|---|
| [**Master Platform Reference**](MASTER_PLATFORM_REFERENCE.md) | Konsolidasi arsitektur, database, 3 engine telekomunikasi, kredensial, dan model data. |
| [**Quick Cheatsheet & Directory**](CHEATSHEET.md) | Panduan cepat akses IP host VPS, port protocol, URL tenant demo, dan perintah deploy. |
| [**Portal Member SaaS Manual**](docs/SAAS_MANUAL.md) | Panduan lengkap pengelolaan tenant, konfigurasi 3 engine mandiri, invoice SaaS & tiket support di `/member`. |
| [**Billing & POS Cashier Manual**](docs/BILLING_MANUAL.md) | Panduan operasional billing, siklus faktur, Loket Kasir POS (`/admin/payments?tab=pos`), router MikroTik/Juniper, dan peran Kasir. |
| [**Master SOP Ekosistem 3 Engine**](docs/MASTER_SOP_EKOSISTEM_3_ENGINE_ISPSYNC.md) | Dokumen master SOP telekomunikasi terpadu (FiberGrid, Nexus, Ledger). |
| [**Universal Mobile App Manual**](docs/MANUAL_APLIKASI_MOBILE_UNIVERSAL.md) | Panduan aplikasi mobile pelanggan & teknisi aliansi bersama (React Native / Expo). |
| [**PKS Kemitraan Agen & Loket**](docs/PKS_KEMITRAAN_AGEN_ISPSYNC.md) | Perjanjian kerjasama kemitraan penjualan voucher, passpoint, dan loket pembayaran. |
| [**FiberGrid API Blueprint**](docs/FIBERGRID_API_BLUEPRINT.md) | Arsitektur FTTX, OLT SNMP, dan pemetaan rute kabel optik GIS. |
| [**CMS & Landing Page Guide**](docs/CMS_AND_LANDING_PAGE_GUIDE.md) | Panduan visual landing page, branding tenant, dan konten dinamis. |

## License

Proprietary — All rights reserved.
