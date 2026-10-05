# MASTER PLATFORM REFERENCE — ISPSYNC SAAS ECOSYSTEM
> Dokumen konsolidasi penuh seluruh arsitektur, kredensial, server, dan codebase hasil migrasi dari thread `660e3bc6-df02-40cf-9e8a-65d28dc23e56`.

---

## 1. Topologi Infrastruktur Server & Cloud

| Node / Layanan | IP Address & Port | OS / Spek | Kredensial / Akses | Peran & Keterangan |
|---|---|---|---|---|
| **ISPSYNC Production & Demo** | `103.179.65.73`<br>`2001:df1:1cc0:65::73` | Ubuntu 24.04 LTS (x86_64) | User: `anri01`<br>Pass: `Poi123/.,`<br>Sudo: Yes | Host utama untuk Docker Containers + `ispsync-core.service` systemd. |
| **phpIPAM Server** | `103.179.65.69`<br>`ipam.gogiga.net.id` | Linux | SSH User: `anri01` / `root` | IP Address Management (IPAM) dengan sertifikat SSL Let's Encrypt aktif. |
| **ISP Onboarding & OLT Node** | `103.179.65.72`<br>`2001:df1:1cc0:65::72` | Linux | SSH User: `anri01` | Host onboarding lawas & interkoneksi OLT fisik. |

---

## 2. Konfigurasi Domain, DNS Authoritative & Custom Domain CNAME

* **Domain Utama**: `ispsync.id` (Registrar IDCloudHost)
* **Authoritative Private Nameserver (CoreDNS on VPS)**:
  * `ns1.ispsync.id` $\rightarrow$ `103.179.65.73` (Glue Record Registered)
  * `ns2.ispsync.id` $\rightarrow$ `103.179.65.73` (Glue Record Registered)
  * Docker Container: `ispsync-dns` (CoreDNS running with `--net=host` on public IP `103.179.65.73:53`)
  * Resolves: `ispsync.id`, `*.ispsync.id`, `*.*.ispsync.id` (multi-level subdomains bypass Cloudflare Universal SSL limitation).
* **Hierarchical Subdomain Routing (The 3-Engine Platform Architecture)**:
  * **Engine 1: CMS Billing Platform** (`cms.<tenant>.ispsync.id` & `billing.<tenant>.ispsync.id`):
    * Next.js 14 Standalone (`web:3000`) & Go REST API (`api:8080`).
    * Backoffice CRM, Billing, Invoices, Loket Kasir POS (`/admin/payments?tab=pos`) dengan kalkulator uang pas & cetak thermal 58mm/80mm, Hotspot POS Blanko Vouchers, Payment Gateway (Midtrans, Xendit, QRIS).
  * **Engine 2: ISP Onboarding & Field Portals** (`ispsync-core.service` on Port 8082):
    * `portal.<tenant>.ispsync.id` $\rightarrow$ Registrasi Mandiri & Peta GIS Leaflet ODP Terdekat (Haversine $\le 250\text{ m}$), KTP, Tanda Tangan Kontrak.
    * `sales.<tenant>.ispsync.id` $\rightarrow$ Portal Sales Lapangan & Generator Link WhatsApp Referral.
    * `teknisi.<tenant>.ispsync.id` $\rightarrow$ Surat Perintah Kerja (SPK) & BAST Digital Redaman OPM ($\ge -27\text{ dBm}$).
    * `rekan.<tenant>.ispsync.id` $\rightarrow$ Portal Rekan Mitra Jartaplok.
  * **Engine 3: FTTX NOC Command Center & Wholesale Jartaplok** (`ispsync-fttx.service` on Port 8083):
    * `fttx.<tenant>.ispsync.id` & `noc.<tenant>.ispsync.id` $\rightarrow$ FTTX NOC Command Center.
    * Visualisasi Topologi FO GIS (OLT, ODC, ODP, Rute Feeder Backbone, Waypoint Belokan Kabel, Export KML Google Earth).
    * Monitoring OLT Multi-Vendor (Huawei, ZTE, FiberHome, C-Data, VSOL/Jolink 1-Port) & Auto-Discovery SNMP / TR-069.
    * Wholesale Jartaplok Management (Billing Sewa Port, e-Faktur Pajak PPN 11%, PPh 23 2%, e-Bupot Unifikasi).
* **Custom Domain / CNAME Support**:
  * Tenant dapat memetakan domain sendiri (contoh: `billing.ispku.net` CNAME $\rightarrow$ `ispsync.id`).
  * **Zero-Touch On-Demand TLS**: Caddy Web Server mengonfirmasi kepemilikan domain via webhook `GET http://172.18.0.1:8082/api/v1/caddy/ask?domain={domain}`.
* **Policy Subdomain Tunggal Tanpa Tenant (DEPRECATED & NON-AKTIF)**:
  * Subdomain single-level tanpa nama tenant (`cms.ispsync.id`, `portal.ispsync.id`, `sales.ispsync.id`, `teknisi.ispsync.id`, `billing.ispsync.id`, `noc.ispsync.id`, `fttx.ispsync.id`) telah **resmi dinonaktifkan & diblokir** (HTTP 404 & On-Demand TLS ditolak otomatis via webhook ask).
  * Seluruh operasional wajib menggunakan format multi-tenant: `{modul}.{tenant}.ispsync.id` atau `{tenant}.ispsync.id`.

---


## 3. Layanan Berjalan di VPS `103.179.65.73`

### A. Docker Stack (`/home/anri01/ispsync/deploy/docker-compose.prod.yml`)
1. **`isp-prod-caddy`** (Port 80, 443): Reverse Proxy & SSL Automation.
2. **`isp-prod-web`** (Port 3000): Frontend Next.js 14 Standalone SaaS Showcase & Web Portal.
3. **`isp-prod-api`** (Port 8080): Go REST API Backend Core.
4. **`isp-prod-worker`**: Worker pemrosesan invoice & webhook antrean Redis.
5. **`isp-prod-freeradius`** (UDP 1812-1814, 3799): AAA Engine FreeRADIUS 3.2.
6. **`isp-prod-redis`** (Port 6379): Cache & Queue session.
7. **`isp-prod-postgres`** (Port 5432): Database PostgreSQL 16 + PostGIS untuk spasial ODP.

### B. Systemd Native Services
1. **`ispsync-core.service`** (Port 8082):
   * Path binary: `/home/anri01/ispsync-core/ispsync`
   * Database: `/home/anri01/ispsync-core/ispsync.db` (SQLite WAL mode)
   * Melayani Portal Registrasi Pelanggan GIS, Sales, Teknisi SPK/BAST, dan Broker Jartaplok.
2. **`ispsync-fttx.service`** (Port 8083):
   * Path binary: `/home/anri01/ispsync-fttx/fttx`
   * Database: `/home/anri01/ispsync-fttx/fttx.db` (SQLite WAL mode)
   * Melayani FTTX NOC Command Center, Monitoring OLT/ONT, Topologi Fiber Map GIS, dan Wholesale Jartaplok Pajak B2B.

---

## 4. Kredensial Database & Default Login

* **Database PostgreSQL (Docker)**:
  * Database: `isp_billing`
  * User: `isp_admin`
  * Password: `IspsyncPgPass2026!Sec`
* **Redis**: Password: `IspsyncRedis2026!Sec`
* **FreeRADIUS**: Secret: `IspsyncRadius2026!Sec`
* **Demo Platform Admin Login**:
  * URL: [https://ispsync.id/login](https://ispsync.id/login)
  * Email: `admin@isp.local`
  * Password: `Admin123456!`
* **Tenant Default Login (`ispku`) — PT. ISP Kita Nusantara**:
  * Pimpinan / Owner: `owner` / `Password@123`
  * NOC Core: `noc` / `Password@123`
  * Sales: `sales` / `Password@123`
  * Teknisi Lapangan: `teknisi` / `Password@123`
  * Kasir Loket POS: `kasir` / `Password@123` (Hak akses: `payments:read`, `payments:write`)
* **Tenant Default Login (`ispmu`) — PT. ISP Mitra Utama**:
  * Pimpinan / Owner: `owner` / `Password@123`
  * NOC Core: `noc` / `Password@123`
  * Sales: `sales` / `Password@123`
  * Teknisi Lapangan: `teknisi` / `Password@123`
  * Kasir Loket POS: `kasir` / `Password@123` (Hak akses: `payments:read`, `payments:write`)
* **Tenant Staging & R&D Lab Login (`dev`) — Laboratorium ISPSYNC R&D**:
  * Engine 3 Ledger / Billing: `https://billing.dev.ispsync.id/login` (`private@ispsync.id` / `RahasiaAan2026!` atau `admin@dev.ispsync.id` / `DevLab2026!`)
  * Engine 1 Nexus / Portals: `https://nexus.dev.ispsync.id` (`admin`, `noc`, `sales`, `teknisi` / `DevLab2026!`)
  * Engine 2 FiberGrid GIS: `https://fttx.dev.ispsync.id`
  * Member SaaS Portal: `https://dev.ispsync.id/member` (`admin@dev.ispsync.id` / `DevLab2026!`)
  * Loket Kasir Agen: `https://billing.dev.ispsync.id/agent`
  * Passpoint Wi-Fi 2.0: `https://billing.dev.ispsync.id/passpoint` (Admin: `/admin/passpoint`)

---

## 5. Ekosistem Jartaplok (Wholesale Infrastructure Sharing)

* **Konsep Bisnis**: Kolaborasi antar-ISP lokal untuk berbagi jaringan kabel optik & ODP (Open Access Passive Infrastructure Sharing) guna menekan Capex penarikan kabel ganda dan mempercepat ekspansi jangkauan pelanggan.
* **Perjanjian Demo Aktif**: `JARTAPLOK-PYK-2026-01`
  * **Provider Tenant**: `ispku` (PT. ISP Kita Nusantara)
  * **Client Tenant**: `ispmu` (PT. ISP Mitra Utama)
  * **Cakupan Wilayah**: Payakumbuh Metro
  * **Shared ODPs**:
    * `ODP-PYK-001` (Simpang Benteng, Payakumbuh — 8 Port, 1 Terpakai, 7 Tersedia)
    * `ODP-PYK-002` (Pasar Ibuh Barat, Payakumbuh — 8 Port, 0 Terpakai, 8 Tersedia)
  * **Alokasi Port**: 16 Port
  * **Tarif Sewa Port (Monthly Settlement)**: Rp 25.000 / port aktif / bulan
  * **Fitur Otomasi Sistem**:
    * Saat calon pelanggan mendaftar di `portal.ispmu.ispsync.id` dengan koordinat Payakumbuh (`-0.2238, 100.6312`), sistem secara otomatis mendeteksi ODP terdekat `[JARTAPLOK ISPKU] ODP Simpang Benteng` (jarak ~40 meter) meskipun `ispmu` tidak memiliki OLT/ODP fisik sendiri di Payakumbuh.
    * Prefix pelanggan tetap mengikuti tenant penyewa (`ISPMU-2026-XXXX`).
    * Settlement card & port utilization terpantau real-time di CMS Backoffice (`cms.ispku.ispsync.id` & `cms.ispmu.ispsync.id`).

---

## 6. Hubungan Kode di Komputer Lokal

1. **`c:\Users\62811\Downloads\ISPSYNC`** (Workspace Utama Saat Ini):
   * Monorepo lengkap: Go Core REST API (`apps/api`), Next.js 16 Web (`apps/web`), Universal Mobile App (`apps/mobile`), Docker configs, Caddyfile, dan database migrations.
2. **`c:\Users\62811\Documents\GOGIGABILL`**:
   * Repository arsip migrasi awal.
3. **`c:\Users\62811\Documents\ISP`**:
   * Data registrasi lama, KML ODP Payakumbuh/Harau, formulir KPI.
4. **`c:\Users\62811\Documents\FTTX`**:
   * Driver OMCI OLT (Huawei, ZTE C320, FiberHome, VSOL/Jolink 1-Port) & CWMP TR-069.

---

## 7. Arsitektur Isolasi Subdomain & Sub-Brand WiFi (Carrier-Grade)

Sistem menerapkan pemisahan domain secara ketat antara **Akses Publik** dan **Internal ISP**:

| Wilayah Akses | Format Domain Standar | Contoh Custom Domain | Rute & Peruntukan Layanan |
|---|---|---|---|
| **Publik (Hotspot & Mitra)** | `wifi.{tenant}.ispsync.id` | `hotspot.gowifi.id` | `/hotspot/buy`, `/hotspot/login`, `/passpoint`, `/agent/register`, `/agent/login`, `/agent/dashboard` |
| **Terisolasi (Backoffice ISP)** | `ledger.{tenant}.ispsync.id` | `ledger.gogiga.net.id` | `/login`, `/admin/*` (CRM, Billing, Keuangan, NOC, Konfigurasi Router, Audit Logs) |
| **Pelanggan Rumahan (FTTH)** | `portal.{tenant}.ispsync.id` | `member.gogiga.net.id` | Cek faktur bulanan PPPoE, riwayat pemakaian & bukti bayar mandiri |

### Mekanisme Keamanan:
* Pelanggan voucher publik yang mengakses captive portal tidak akan pernah melihat ataupun dapat melakukan probing terhadap form login backoffice internal ISP.
* Didukung **Zero-Configuration On-Demand TLS**: Caddy secara otomatis menerbitkan sertifikat Let's Encrypt HTTPS instan saat custom domain sub-brand (seperti `hotspot.gowifi.id`) pertama kali diarahkan ke IP VPS `103.179.65.73`.

---

## 8. Modul Pengaturan Domain & Sub-Brand di Ledger (`/admin/settings`)

Menu konfigurasi visual di Backoffice Ledger:
1. **Identitas Sub-Brand Hotspot:** Pengaturan nama brand khusus publik (misal `@gowifi`, `@wifi.id`) yang otomatis tampil di captive portal, struk thermal, dan Passpoint.
2. **Pemetaan Domain Publik & Terisolasi:** Form input dinamis untuk `wifi_domain`, `ledger_domain`, `portal_domain`, dan `primary_domain`.
3. **Panduan DNS A-Record Real-time:** Menampilkan IP target server VPS (`103.179.65.73`).
4. **1-Click MikroTik Walled Garden Generator:** Script otomatis yang mencantumkan domain WiFi + Payment Gateway (Midtrans, Duitku, Xendit, Tripay) siap salin ke terminal RouterOS.
5. **Live Quick Links:** Tautan instan untuk pengujian rute publik dan backoffice.

---

## 9. Sistem Pendaftaran Mitra Agen Berkinerja Tinggi & Anti-Spam

Untuk mencegah kelebihan beban server (*form flooding*) dan menghemat kapasitas disk storage:
1. **Smart Client-Side Image Compression ([image-compressor.ts](apps/web/lib/utils/image-compressor.ts)):**
   * Menggunakan kanvas HTML5 di browser pendaftar sebelum foto dikirim ke server.
   * Resolusi dibatasi maksimal 1280px dan kompresi JPEG 0.8.
   * Foto kamera HP resolusi tinggi (8-15 MB) terkompresi otomatis menjadi **150-250 KB** (menghemat **~97% bandwidth dan kapasitas disk VPS**).
   * Badge indikator visual: `✓ Auto-Kompresi Gambar Aktif (Hemat 97%)`.
2. **Anti-Flooding & Honeypot Protection:**
   * **Honeypot Trap:** Input perangkap tersembunyi yang langsung membatalkan kiriman bot/script otomatis.
   * **Durasi Pengisian Minimal:** Menolak kiriman form yang terisi dalam waktu kurang dari 2.5 detik.
   * **Submission Cooldown:** Batas waktu kirim ulang 60 detik per sesi peramban.
   * **IP Rate Limiter In-Memory:** Maksimal 5 registrasi per 10 menit per IP address.
   * **Cek Duplikasi NIK & Nomor HP:** Memastikan tidak ada data ganda di database PostgreSQL.
   * **Auto-Fill Referral Code:** Otomatis mengisi kode referral agen dari parameter URL (`?ref=`, `?agent=`, `?sales=`, `?promo=`).

---

## 10. Aplikasi Mobile Universal Aliansi Bersama (`apps/mobile`)

Satu aplikasi resmi untuk Android & iPhone (iOS) yang dapat digunakan bersama oleh seluruh ISP mitra aliansi:
* **Teknologi:** React Native + Expo SDK 57 (React 19, React Native 0.86).
* **Multi-Tenant Discovery:**
  * Pindai QR di stiker modem router ONT atau faktur tagihan pelanggan.
  * Auto-detect SSID / gateway IP saat HP terhubung ke hotspot WiFi ISP.
  * Pencarian katalog direktori ISP nasional.
* **Dual-Mode:**
  * **Pelanggan:** Beli voucher QRIS, pasang profil WiFi Passpoint 2.0 (Hotspot 2.0), cek kuota & tagihan FTTH.
  * **Mitra Loket:** Kasir warung, jual voucher, scan barcode SN, dan cetak langsung (*direct print*) ke printer thermal Bluetooth ESC/POS (58mm & 80mm) untuk Android (SPP) dan iOS (BLE) tanpa dialog browser.
* **Native JavaScript Bridge:** Menyediakan `window.AndroidPrinter` & `window.ISPSYNC_MOBILE` sehingga modul web portal loket kasir langsung kompatibel.
* **Panduan Penggunaan Lengkap:** Tersedia di [`docs/MANUAL_APLIKASI_MOBILE_UNIVERSAL.md`](docs/MANUAL_APLIKASI_MOBILE_UNIVERSAL.md).

