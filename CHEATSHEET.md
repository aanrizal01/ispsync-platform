# ⚡ ISPSYNC PLATFORM — QUICK CHEATSHEET & ACCESS DIRECTORY
> *Panduan Cepat Akses URL, Subdomain 3 Engine, dan Kredensial Login Ekosistem ISPSYNC.*  
> *Terakhir diperbarui: Oktober 2026.*

---

## 🖥️ 1. Akses Server VPS & Infrastruktur

| Layanan | Host / IP | Port / Protocol | Kredensial | Keterangan |
|---|---|---|---|---|
| **VPS Utama (Docker + Services)** | `103.179.65.73` | SSH: 22 | User: `anri01`<br>Pass: `Poi123/.,`<br>Sudo: Yes | Host Docker Compose + `ispsync-core.service` |
| **phpIPAM** | `103.179.65.69` | HTTPS: 443 | User: `anri01` / `root` | IP Address Management (`ipam.gogiga.net.id`) |
| **Node OLT Fisik** | `103.179.65.72` | SSH: 22 | User: `anri01` | Host onboarding fisik & gateway OLT |
| **Database PostgreSQL 16** | `103.179.65.73` | Port 5432 | User: `isp_admin`<br>Pass: `IspsyncPgPass2026!Sec`<br>DB: `isp_billing` | Docker `isp-prod-postgres` |
| **Redis 7** | `103.179.65.73` | Port 6379 | Pass: `IspsyncRedis2026!Sec` | Docker `isp-prod-redis` |
| **FreeRADIUS 3.2** | `103.179.65.73` | UDP 1812-1814, 3799 | Secret: `IspsyncRadius2026!Sec` | Docker `isp-prod-freeradius` |

---

## 🧪 2. Lingkungan Staging & R&D Lab (`dev.ispsync.id`)

Tenant **`dev`** (*Laboratorium ISPSYNC R&D / Telecom DevLab*) digunakan untuk pengujian fitur baru, integrasi API, dan simulasi operasional.

### A. Engine 3: ISPSYNC Ledger (Backoffice Terisolasi ISP)
* **URL Login Backoffice**: [https://ledger.dev.ispsync.id/login](https://ledger.dev.ispsync.id/login)
  * **Email**: `private@ispsync.id` *(atau `admin@dev.ispsync.id`)*
  * **Password**: `RahasiaAan2026!` *(atau `DevLab2026!`)*
* **Pengaturan Domain & Sub-Brand WiFi**: [https://ledger.dev.ispsync.id/admin/settings](https://ledger.dev.ispsync.id/admin/settings) (Tab: *Domain & Sub-Brand WiFi*)
* **Pusat Kredensial Passpoint**: [https://ledger.dev.ispsync.id/admin/passpoint](https://ledger.dev.ispsync.id/admin/passpoint)

### B. Portal Publik Hotspot, Voucher, Passpoint & Mitra Loket (`wifi.dev.ispsync.id`)
* **Beli Voucher Mandiri (QRIS)**: [https://wifi.dev.ispsync.id/hotspot/buy](https://wifi.dev.ispsync.id/hotspot/buy) *(atau `https://hotspot.gowifi.id/hotspot/buy`)*
* **Captive Portal Login Hotspot**: [https://wifi.dev.ispsync.id/hotspot/login](https://wifi.dev.ispsync.id/hotspot/login)
* **Passpoint Hotspot 2.0 (Unduh Profil WiFi)**: [https://wifi.dev.ispsync.id/passpoint](https://wifi.dev.ispsync.id/passpoint)
* **Pendaftaran Mitra Agen (Auto-Kompres 97% & Anti-Spam)**: [https://wifi.dev.ispsync.id/agent/register](https://wifi.dev.ispsync.id/agent/register)
* **Dashboard Kasir Loket Agen**: [https://wifi.dev.ispsync.id/agent/dashboard](https://wifi.dev.ispsync.id/agent/dashboard) *(atau `/agent/login`)*

### C. Engine 1: ISPSYNC Nexus (Operasional NOC, Portal & Lapangan)
* **URL Login**: [https://nexus.dev.ispsync.id](https://nexus.dev.ispsync.id)
* **Kredensial User Lab Dev**:
  * **Lead / Owner**: `admin` / `DevLab2026!` *(Role: OWNER)*
  * **NOC Specialist**: `noc` / `DevLab2026!` *(Role: NOC)*
  * **Sales Lapangan**: `sales` / `DevLab2026!` *(Role: SALES)*
  * **Teknisi Lapangan**: `teknisi` / `DevLab2026!` *(Role: TECHNICIAN)*

### D. Engine 2: ISPSYNC FiberGrid (Infrastruktur Fiber & GIS)
* **URL**: [https://fttx.dev.ispsync.id](https://fttx.dev.ispsync.id)
* Pemetaan rute kabel FO, ODC, ODP testbed, dan monitoring OLT lab.

### E. Member Portal SaaS (Langganan Platform ISPSYNC)
* **URL**: [https://dev.ispsync.id/member](https://dev.ispsync.id/member) *(atau `https://ispsync.id/member`)*
  * **Email**: `admin@dev.ispsync.id`
  * **Password**: `DevLab2026!`

### F. Aplikasi Mobile Universal (Android & iOS — Expo SDK 57)
* **Source Code**: `apps/mobile/`
* **Jalankan Lokal**: `cd apps/mobile && npx.cmd expo start`
* **URL Expo Go**: `exp://192.168.223.75:8081` (Akun Expo: `anri01`)
* **Dokumentasi Lengkap**: [`docs/MANUAL_APLIKASI_MOBILE_UNIVERSAL.md`](docs/MANUAL_APLIKASI_MOBILE_UNIVERSAL.md)

---

## 🏢 3. Tenant Demo Resmi (Multi-Tenant Production)

### A. Tenant `ispku` — PT. ISP Kita Nusantara
* **Billing & Finance**: [https://billing.ispku.ispsync.id](https://billing.ispku.ispsync.id)
* **NOC & Portal Operasional**: [https://nexus.ispku.ispsync.id](https://nexus.ispku.ispsync.id)
* **Portal Registrasi Pelanggan GIS**: [https://portal.ispku.ispsync.id](https://portal.ispku.ispsync.id)
* **Portal Sales**: [https://sales.ispku.ispsync.id](https://sales.ispku.ispsync.id)
* **Portal Teknisi (SPK & BAST)**: [https://teknisi.ispku.ispsync.id](https://teknisi.ispku.ispsync.id)
* **FTTX Command Center**: [https://fttx.ispku.ispsync.id](https://fttx.ispku.ispsync.id)
* **Loket Agen**: [https://billing.ispku.ispsync.id/agent](https://billing.ispku.ispsync.id/agent)
* **Portal Passpoint Wi-Fi**: [https://billing.ispku.ispsync.id/passpoint](https://billing.ispku.ispsync.id/passpoint)
* **Akun Login (`ispku`)**:
  * `owner` / `Password@123`
  * `noc` / `Password@123`
  * `sales` / `Password@123`
  * `teknisi` / `Password@123`
  * `admin@ispku.ispsync.id` / `Ispku2026!` *(Member Portal)*

### B. Tenant `ispmu` — PT. Mitra Usaha Data
* **Billing & Finance**: [https://billing.ispmu.ispsync.id](https://billing.ispmu.ispsync.id)
* **NOC & Portal Operasional**: [https://nexus.ispmu.ispsync.id](https://nexus.ispmu.ispsync.id)
* **Portal Registrasi Pelanggan GIS**: [https://portal.ispmu.ispsync.id](https://portal.ispmu.ispsync.id)
* **Portal Sales**: [https://sales.ispmu.ispsync.id](https://sales.ispmu.ispsync.id)
* **Portal Teknisi (SPK & BAST)**: [https://teknisi.ispmu.ispsync.id](https://teknisi.ispmu.ispsync.id)
* **FTTX Command Center**: [https://fttx.ispmu.ispsync.id](https://fttx.ispmu.ispsync.id)
* **Loket Agen**: [https://billing.ispmu.ispsync.id/agent](https://billing.ispmu.ispsync.id/agent)
* **Portal Passpoint Wi-Fi**: [https://billing.ispmu.ispsync.id/passpoint](https://billing.ispmu.ispsync.id/passpoint)
* **Akun Login (`ispmu`)**:
  * `owner` / `Password@123`
  * `noc` / `Password@123`
  * `sales` / `Password@123`
  * `teknisi` / `Password@123`
  * `admin@ispmu.ispsync.id` / `Ispmu2026!` *(Member Portal)*

---

## 🚀 4. Perintah Cepat Git & Deploy VPS

```bash
# 1. Update ke branch staging
git add .
git commit -m "feat/fix: deskripsi perubahan"
git push origin staging

# 2. Deploy Next.js Web Service di VPS
ssh anri01@103.179.65.73 "cd /home/anri01/ispsync && git pull origin staging && docker compose -f deploy/docker-compose.prod.yml build web && docker compose -f deploy/docker-compose.prod.yml up -d web"

# 3. Deploy Go API Core Service di VPS
ssh anri01@103.179.65.73 "cd /home/anri01/ispsync && git pull origin staging && docker compose -f deploy/docker-compose.prod.yml build api && docker compose -f deploy/docker-compose.prod.yml up -d api"

# 4. Update Web Static Templates ke Go ispsync-core
ssh anri01@103.179.65.73 "cp -r /home/anri01/ispsync/web/* /home/anri01/ispsync-core/web/ && sudo systemctl restart ispsync-core"

# 5. Cek Log Container Web
ssh anri01@103.179.65.73 "docker logs -f --tail 50 isp-prod-web"
```
