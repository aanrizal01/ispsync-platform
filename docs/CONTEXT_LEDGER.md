# 💳 ISPSYNC Ledger — Context & Reference Blueprint

## 1. Identitas Engine
* **Nama Resmi**: ISPSYNC Ledger
* **Peran Arsitektur**: Engine 3 (Financial, Invoicing, Billing & AAA)
* **Port Standar**: `8080` (API Backend) & `3000` (Next.js Frontend)
* **Subdomain Template**: `billing.{tenant}.ispsync.id`, `ledger.{tenant}.ispsync.id`, `wifi.{tenant}.ispsync.id`
* **Policy Subdomain**: Subdomain single-level tanpa nama tenant (`billing.ispsync.id`, `ledger.ispsync.id`, `cms.ispsync.id`, `wifi.ispsync.id`) resmi **dinonaktifkan & diblokir** (HTTP 404 & ditolak On-Demand TLS). Seluruh operasional wajib menggunakan format `{tenant}` aktif.
* **Domain Staging**: `https://billing.dev.ispsync.id` & `https://ledger.dev.ispsync.id`
* **Target Pengguna**: Bagian Keuangan/Finance, Kasir Loket Resmi, Superadmin Billing.

---

## 2. Referensi Proyek Utama
* **Source Reference**: Proyek `GOGIGABILL` (sekarang berada di `apps/api` dan `apps/web` di repo `ispsync-platform`).
* **Lokasi Kode Lokal**: `C:\Users\62811\Downloads\ISPSYNC\apps`
* **Lokasi Server VPS**: `/home/anri01/ispsync` (Docker Compose Stack `isp-prod-*`)
* **Database Engine**: Central PostgreSQL 16 + PostGIS (`isp_billing`)
* **Cache & Session**: Redis 7
* **AAA Engine**: FreeRADIUS 3.2 (`radusergroup`, `radcheck`, `radacct`)

---

## 3. Tanggung Jawab & Lingkup Fitur (Zero Overlap)
1. **Otomasi Invoicing & Penagihan**:
   - Worker otomatis tanggal 1 tiap bulan (H-7 dan H-1 reminder WhatsApp).
   - Jatuh tempo tanggal 20.
2. **Payment Gateway Integration**:
   - Integrasi Tripay / Midtrans / Xendit (QRIS Realtime, Virtual Account BCA/Mandiri/BRI, Gerai Retail).
3. **FreeRADIUS, MikroTik & Juniper BNG CoA Auto-Isolir**:
   - Tanggal 21 pukul 00:05 WIB: Otomatis isolir (pindah grup FreeRADIUS ke `ISOLIR`).
   - Tembak paket RFC 3576 CoA Disconnect ke gateway MikroTik RouterOS dan Juniper MX BNG Router (UDP 3799 / Junos REST API dual-mode).
   - Auto-Restore instan begitu tagihan lunas via webhook perbankan/QRIS.
4. **Member Portal SaaS & Tenant Billing**:
   - Pengelolaan langganan ISP di `ispsync.id/member` (`members.json`).
5. **Jartaplok Settlement**:
   - Rekonsiliasi bagi hasil dan komisi mitra Jartaplok (`jartaplok_partners`, `partner_settlements`).
6. **Loket Kasir POS & Keamanan Peran Kasir (Cashier Role)**:
   - Antarmuka register loket cepat di menu Pembayaran (`/admin/payments?tab=pos`) dengan pencarian barcode, kalkulator kembalian, dan cetak struk thermal 58mm/80mm & kwitansi A4.
   - Hak akses peran Kasir (`payments:read`, `payments:write`) terisolasi aman dengan pembatasan menu berprinsip *Least Privilege*.
7. **Modul Trouble Ticketing, Asisten Virtual & Dispatcher SPK Teknisi**:
   - **Portal Tiket Mandiri Pelanggan (`/ticket/[id]`)**: Ruang komunikasi dua arah interaktif antara pelanggan dan Helpdesk NOC.
   - **Asisten Virtual (Chatbot Diagnosa Mandiri)**: Memandu pelanggan melakukan verifikasi koneksi, status tagihan live di database, prosedur restart modem ONT, dan eskalasi otomatis ke prioritas `HIGH` bila membutuhkan kunjungan fisik.
   - **Helpdesk Admin NOC (`/admin/tickets`)**: Manajemen antrean tiket, penugasan teknisi (*assigned technician*), dan satu klik **"Kirim SPK WhatsApp"** yang membuka chat WhatsApp ke teknisi lengkap dengan format formal Surat Perintah Kerja (SPK).
   - **Proteksi Status Tiket Selesai**: Penguncian otomatis kolom kirim pesan saat status tiket `CLOSED` atau `RESOLVED` dengan banner informatif dan opsi pembukaan tiket baru.

---

## 4. Kredensial Default Staging
* **URL Billing Admin**: `https://billing.dev.ispsync.id` (User: `private@ispsync.id` / `RahasiaAan2026!`)
* **Portal Member SaaS**: `https://dev.ispsync.id/member` (User: `admin@dev.ispsync.id` / `DevLab2026!`)
