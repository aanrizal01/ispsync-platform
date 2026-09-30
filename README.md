# ISP Billing & Network Access Management Platform

Modern ISP billing system supporting **PPPoE**, **Hotspot**, **Voucher**, **Passpoint/HS2.0**, **FreeRADIUS**, **MikroTik**, **Juniper**, payment gateway, and full customer/admin management.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.23, chi router, pgx/v5 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Frontend | Next.js 14 (App Router, TypeScript) |
| UI | Tailwind CSS, shadcn/ui |
| AAA | FreeRADIUS 3.2 (rlm_sql → PostgreSQL) |
| Reverse Proxy | Caddy v2 |
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

# Health
GET  /health
GET  /ready
```

## 📖 Dokumentasi & Buku Manual

- [Buku Manual Billing & Panduan Operasional ISP](docs/BILLING_MANUAL.md) — Panduan komprehensif arsitektur billing, siklus faktur, kalkulasi PPN/proration, modul kemitraan bagi hasil, dan integrasi router/isolir.


## Project Structure

```
GOGIGABILL/
├── apps/
│   ├── api/                # Go backend
│   │   ├── cmd/api/        # API server entrypoint
│   │   ├── cmd/worker/     # Background worker entrypoint
│   │   ├── internal/       # Domain packages (auth, customer, billing...)
│   │   ├── migrations/     # SQL migrations
│   │   └── pkg/            # Reusable packages (money, crypto)
│   └── web/                # Next.js frontend
│       ├── app/            # App Router pages
│       ├── components/     # UI components
│       ├── features/       # Feature modules
│       └── lib/            # API client, auth, utils
├── config/                 # Caddy, FreeRADIUS configs
├── docker/                 # Docker build contexts
├── keys/                   # JWT RSA keys (gitignored)
├── scripts/                # Setup + utility scripts
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
| 9 | 📋 Planned | Passpoint / Hotspot 2.0 Integration |
| 10 | ✅ Done | MikroTik Adapter (RouterOS API port 8728 + FreeRADIUS NAS Auto-Attachment) |
| 11 | 🔄 In Progress | Juniper BNG Adapter (Junos REST API / RFC 3576 CoA PoD) |
| 12 | ✅ Done | **Partnership & Revenue Sharing Module** (Reseller/Sub-ISP, Split Rules, Settlement) |
| 13 | 📋 Planned | Notification Dispatcher (WhatsApp Gateway & Email Alerts) |
| 14 | 📋 Planned | Financial Reporting & Ledger Export |
| 15 | 📋 Planned | Production Hardening & High Availability Deployment |
| 16 | 📋 Planned | **SmartOLT Integration & Jartaplok Bridge** (Live Optical Telemetry, ONU Lifecycle, Wholesale Port Auto-COGS) |
| 17 | 📋 Planned | **Blank Scratch Voucher & On-Demand Quota Injection** (Telco-Grade Blank Card Stock, Barcode/Camera Scan, Real-Time Agent Balance Debit) |

## Security Notes

- JWT uses RS256 (asymmetric) — public key can be shared safely
- Passwords hashed with bcrypt (cost=12)
- Refresh tokens revoked in Redis on logout
- All monetary values stored as integers (no float)
- `audit_logs` table is append-only (no UPDATE/DELETE for app user)
- Never commit `.env` or `keys/` to version control

## License

Proprietary — All rights reserved.
