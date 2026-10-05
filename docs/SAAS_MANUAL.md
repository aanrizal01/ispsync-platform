# 🌐 Buku Panduan & Manual Operasional Portal Member SaaS ISPSYNC

Dokumen ini merupakan panduan resmi operasional bagi ISP Klien / Tenant dalam mengelola akun langganan platform **ISPSYNC SaaS (Software as a Service)** melalui portal mandiri: **`/member`** (misal: `https://ispsync.id/member` atau `https://dev.ispsync.id/member`).

---

## 📑 DAFTAR ISI

1. [Gambaran Umum Portal Member SaaS](#1-gambaran-umum-portal-member-saas)
2. [Akses & Otentikasi Akun Member](#2-akses--otentikasi-akun-member)
3. [Dashboard Utama Member SaaS](#3-dashboard-utama-member-saas)
4. [Konfigurasi Terpadu 3 Engine Telekomunikasi](#4-konfigurasi-terpadu-3-engine-telekomunikasi)
   - [4.1. Engine 1: ISPSYNC FiberGrid (Infrastruktur & FTTX)](#41-engine-1-ispsync-fibergrid-infrastruktur--fttx)
   - [4.2. Engine 2: ISPSYNC Nexus (CRM Ritel, Sales & Operasional Lapangan)](#42-engine-2-ispsync-nexus-crm-ritel-sales--operasional-lapangan)
   - [4.3. Engine 3: ISPSYNC Ledger (Billing, Loket POS & RADIUS AAA)](#43-engine-3-ispsync-ledger-billing-loket-pos--radius-aaa)
5. [Manajemen Tagihan & Invoice Langganan SaaS](#5-manajemen-tagihan--invoice-langganan-saas)
6. [Pengaturan Profil Perusahaan & Custom Domain CNAME](#6-pengaturan-profil-perusahaan--custom-domain-cname)
7. [Pusat Bantuan & Tiket Dukungan Teknis (Support)](#7-pusat-bantuan--tiket-dukungan-teknis-support)

---

## 1. Gambaran Umum Portal Member SaaS

**Portal Member SaaS ISPSYNC** (`/member`) adalah pintu gerbang terpusat bagi pimpinan ISP, Direktur, dan Manajer IT untuk mengelola seluruh aspek kemitraan platform cloud dengan PT Inovasi Sistem Pintar:
- **Kemandirian Tenant (Self-Service Tenant Control)**: Mengonfigurasi parameter teknis masing-masing engine tanpa perlu intervensi manual tim pengembang pusat.
- **Transparansi Langganan**: Memantau kapasitas aktif pelanggan, kuota ODP/ONT, masa tenggang langganan, dan tagihan invoice SaaS bulanan/tahunan.
- **Pusat Navigasi 3 Engine**: Tautan langsung berotentikasi (*Single-Click Jump*) menuju dashboard masing-masing engine yang aktif.

---

## 2. Akses & Otentikasi Akun Member

### 2.1. URL Akses
* **Portal Produksi**: `https://ispsync.id/member/login`
* **Portal Staging / Lab**: `https://dev.ispsync.id/member/login`

### 2.2. Kredensial & Autentikasi
1. Masukkan **Email Resmi Perusahaan** yang terdaftar saat onboarding kontrak.
2. Masukkan **Password** akun member.
3. Klik **"Masuk ke Portal Member"**.
4. Sistem memverifikasi token sesi melalui endpoint `/api/member/auth` dan menyimpan otentikasi aman pada browser pengguna.

> [!NOTE]
> Akun Portal Member terpisah secara hierarki dari akun staf operasional tenant (Admin/NOC/Sales/Kasir). Akun Portal Member berfungsi sebagai akun kepemilikan tenant (*Tenant Owner Level*).

---

## 3. Dashboard Utama Member SaaS

Setelah login berhasil, pimpinan ISP akan disambut oleh ringkasan eksekutif pada menu **Dashboard** (`/member/dashboard`):

### 3.1. Kartu Metrik Utama
* **Status Langganan**: Indikator status tenant (`Aktif` / `Masa Tenggang` / `Nonaktif`).
* **Hari Tersisa**: Countdown jumlah hari aktif sebelum masa perpanjangan berikutnya, lengkap dengan tanggal jatuh tempo (`Exp: YYYY-MM-DD`).
* **Kapasitas Pelanggan**: Kuota batas kapasitas pelanggan sesuai paket langganan (misal: *Paket Enterprise — Hingga 5.000 Pelanggan & 500 Tiang ODP*).
* **Invoice Terbayar**: Total akumulasi faktur langganan platform yang telah lunas.

### 3.2. Status Peringatan Pembayaran
Jika terdapat faktur langganan platform yang menunggu pembayaran, sistem menampilkan banner peringatan amber:
* Memuat Nomor Invoice, Nominal, dan Batas Jatuh Tempo.
* Tombol **"Konfirmasi Bayar"** langsung terhubung via WhatsApp resmi billing ISPSYNC untuk validasi instan.

### 3.3. Hub Tautan Langsung 3 Engine
Dashboard menyediakan panel akses langsung ke 3 engine tenant:
* **Buka FiberGrid FTTX**: Mengarah ke `https://fibergrid.{tenant}.ispsync.id`
* **Buka Nexus Retail & Field**: Mengarah ke `https://nexus.{tenant}.ispsync.id`
* **Buka Ledger Billing & POS**: Mengarah ke `https://ledger.{tenant}.ispsync.id`

---

## 4. Konfigurasi Terpadu 3 Engine Telekomunikasi

Pada sidebar navigasi **Engine Settings**, pengelola tenant dapat mengonfigurasi parameter kunci masing-masing modul:

### 4.1. Engine 1: ISPSYNC FiberGrid (Infrastruktur & FTTX)
* **URL Pengaturan**: `/member/engine/fibergrid`
* **Parameter yang Dikelola**:
  1. **Custom Domain**: Pemetaan subdomain mandiri (misal: `fttx.perusahaan.net.id`).
  2. **GenieACS URL**: URL endpoint server TR-069 Auto Configuration Server (ACS) untuk manajemen modem ONT pelanggan dari jarak jauh.
  3. **Tipe OLT Utama**: Pilihan vendor OLT yang digunakan di data center (Huawei, ZTE, FiberHome, C-Data, VSOL).
  4. **Inform Interval TR-069**: Interval pelaporan telemetry modem pelanggan (standar: 300 detik).

### 4.2. Engine 2: ISPSYNC Nexus (CRM Ritel, Sales & Operasional Lapangan)
* **URL Pengaturan**: `/member/engine/nexus`
* **Parameter yang Dikelola**:
  1. **Custom Domain**: Domain portal publik registrasi calon pelanggan (misal: `registrasi.perusahaan.net.id`).
  2. **Nama Brand Layanan**: Nama komersial internet yang dilihat pelanggan di brosur dan halaman pendaftaran.
  3. **Nomor WhatsApp Support / Helpdesk**: Nomor kontak resmi customer service untuk permohonan survei dan notifikasi instalasi.
  4. **URL Captive Portal / Landing Hotspot**: Alamat landing page Wi-Fi login untuk pelanggan ritel.

### 4.3. Engine 3: ISPSYNC Ledger (Billing, Loket POS & RADIUS AAA)
* **URL Pengaturan**: `/member/engine/ledger`
* **Parameter yang Dikelola**:
  1. **Custom Domain Billing**: Domain portal kasir dan tagihan (misal: `tagihan.perusahaan.net.id`).
  2. **RADIUS Shared Secret**: Kata sandi enkripsi komunikasi antara router MikroTik Gateway / BRAS dan FreeRADIUS Server (`radcheck` / `radreply`).
  3. **Penyedia Payment Gateway (PG Choice)**:
     - **QRIS Real-Time Dinamis** (Standar BI / ASPI)
     - **Tripay Payment Gateway** (QRIS, VA Bank Mandiri/BCA/BRI/BNI, Retail Mart)
     - **Midtrans / Xendit Gateway**

---

## 5. Manajemen Tagihan & Invoice Langganan SaaS

Pada menu **Invoices** (`/member/invoices`), pengelola dapat melihat riwayat pembayaran biaya sewa platform cloud ISPSYNC:
1. **Daftar Tagihan Berjalan**:
   - Nomor Faktur (misal: `INV-SAAS-2026-001`)
   - Periode Layanan (Bulanan / Tahunan)
   - Tanggal Terbit & Batas Jatuh Tempo
   - Total Nominal Biaya Layanan
   - Status (`Paid` / `Pending` / `Overdue`)
2. **Download Bukti Bayar / e-Receipt**:
   - Cetak atau simpan dokumen faktur resmi untuk pelaporan akuntansi perusahaan tenant.
3. **Instruksi Transfer Bank Rekening Resmi**:
   - Pembayaran biaya langganan SaaS ditransfer langsung ke Rekening Giro Perusahaan PT Inovasi Sistem Pintar.

---

## 6. Pengaturan Profil Perusahaan & Custom Domain CNAME

Pada menu **Profil** (`/member/profile`):
1. **Identitas Legalitas Perusahaan**:
   - Nama Resmi Badan Usaha (PT / CV / Koperasi)
   - Nomor Pokok Wajib Pajak (NPWP)
   - Alamat Kantor Operasional & Titik Koordinat Kantor Pusat
   - Nama & Kontak Penanggung Jawab (PIC / Direktur)
2. **Konfigurasi Subdomain & CNAME**:
   - Subdomain Default: `{slug}.ispsync.id`
   - Custom Domain Tenant (Contoh: `billing.ispku.net`):
     - Buat CNAME Record pada DNS domain Anda mengarah ke `ispsync.id`.
     - Sistem Caddy Reverse Proxy ISPSYNC akan menerbitkan sertifikat SSL Let's Encrypt secara otomatis (*Zero-Touch On-Demand TLS*).

---

## 7. Pusat Bantuan & Tiket Dukungan Teknis (Support)

Pada menu **Support** (`/member/support`):
1. **Pembuatan Tiket Gangguan (Support Ticket)**:
   - Pilih Kategori: *Infrastruktur Server*, *Database Synchronization*, *Radius CoA Disconnect*, atau *Penagihan SaaS*.
   - Tingkat Prioritas: *Low*, *Medium*, *High*, atau *Critical (Emergency 24/7)*.
2. **Pemantauan Status Tiket**:
   - Tim teknis ISPSYNC Core memproses tiket dengan jaminan respons SLA $\le 15$ menit untuk tiket berstatus kritis.
3. **Eskalasi Hotline Darurat**:
   - Akses kontak darurat teknis pimpinan NOC & Core FO PT Inovasi Sistem Pintar.
