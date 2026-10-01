# 🌐 Panduan Teknis CMS Admin & Dynamic Landing Page ISPSYNC

Dokumen ini memuat panduan komprehensif mengenai **Arsitektur CMS Headless Tersembunyi**, **Sinkronisasi Dinamis Tanpa Downtime (*Zero-Rebuild Realtime Sync*)**, mekanisme keamanan (*Rate Limiting & Brute-Force Shield*), serta buku manual operasional untuk pengelola konten landing page `ispsync.id`.

---

## 📑 DAFTAR ISI
1. [Ringkasan & Filosofi Arsitektur](#1-ringkasan--filosofi-arsitektur)
2. [URL Akses & Matriks Endpoint](#2-url-akses--matriks-endpoint)
3. [Arsitektur Data & Alur Sinkronisasi Dinamis](#3-arsitektur-data--alur-sinkronisasi-dinamis)
4. [Sistem Keamanan & Proteksi Rate Limiting](#4-sistem-keamanan--proteksi-rate-limiting)
5. [Struktur Model Data (`site-config.json`)](#5-struktur-model-data-site-configjson)
6. [Panduan Operasional Admin CMS (Step-by-Step)](#6-panduan-operasional-admin-cms-step-by-step)
   - 6.1. Login ke CMS Admin
   - 6.2. Mengubah Hero Section (Headline, Sub-headline, dan Tombol CTA)
   - 6.3. Mengubah Harga & Fitur Paket Langganan
   - 6.4. Mengelola Add-ons (Kapasitas Tambahan)
   - 6.5. Mengganti Password Admin CMS
7. [Troubleshooting & Pemeliharaan](#7-troubleshooting--pemeliharaan)

---

## 1. Ringkasan & Filosofi Arsitektur

Landing page utama ISPSYNC (`https://ispsync.id/id`) dirancang dengan pendekatan **Hybrid Dynamic Server-Side Rendering (SSR)** yang terhubung langsung ke **Headless File-Store Engine** (`site-config.json`):

* **Zero-Rebuild Instant Sync**: Perubahan harga, teks promosi, paket langganan, dan add-ons yang disimpan melalui CMS Admin seketika langsung aktif dan tampil di halaman depan pengunjung tanpa memerlukan kompilasi ulang Docker (`docker compose build`) maupun restart container Node.js.
* **Persistent Host Storage**: Data konfigurasi disimpan pada volume Docker yang dipetakan langsung ke filesystem host VPS (`../apps/web/data:/app/data`), menjamin data tidak akan hilang saat container web di-update.
* **Security Through Obscurity & Armor**: CMS Admin diletakkan pada URL slug acak (`/cms-9x7k2`) dan dilindungi oleh algoritma in-memory sliding window rate limiter bertingkat.

---

## 2. URL Akses & Matriks Endpoint

| Fungsi / Layanan | Path / URL | Metode | Keterangan |
|---|---|:---:|---|
| **Portal CMS Admin** | `https://ispsync.id/cms-9x7k2` | `GET` | Dashboard editor konten dengan tampilan *Split-Screen Telemetry* |
| **API Ambil Konfigurasi** | `https://ispsync.id/api/site-config` | `GET` | Mengembalikan konfigurasi publik (password di-filter otomatis) |
| **API Simpan Konfigurasi** | `https://ispsync.id/api/site-config` | `POST` | Menyimpan perubahan konfigurasi & ganti password |
| **Landing Page Publik (ID)**| `https://ispsync.id/id` | `GET` | Halaman depan dinamis membaca `site-config.json` via SSR |
| **Portal Member SaaS** | `https://ispsync.id/member/login`| `GET` | Halaman login member platform SaaS |

---

## 3. Arsitektur Data & Alur Sinkronisasi Dinamis

```mermaid
flowchart LR
    subgraph CMS_ADMIN ["Pengelola Konten"]
        Admin[Webmaster / Tim Marketing] -->|1. Edit Konten & Password| CMSPage["/cms-9x7k2 (Split-Screen UI)"]
        CMSPage -->|2. POST JSON Updates| API["/api/site-config"]
    end

    subgraph STORAGE ["Storage Layer (VPS Host)"]
        API -->|3. Atomic File Write| ConfigFile[("data/site-config.json<br/>(Docker Volume Mounted)")]
    end

    subgraph FRONTEND ["Pengunjung Publik"]
        ConfigFile -->|4. SSR Read via getSiteConfig()| Landing["Landing Page (/id)<br/>force-dynamic"]
        Visitor[Calon Klien / ISP] -->|5. Akses Web| Landing
    end
```

### Mekanisme Kerja:
1. `apps/web/app/id/page.tsx` dideklarasikan dengan:
   ```typescript
   export const dynamic = "force-dynamic";
   ```
2. Fungsi `getSiteConfig()` di `apps/web/lib/config.ts` membaca file `data/site-config.json` langsung dari disk pada setiap *request* pengunjung masuk.
3. Saat Admin menekan tombol **"Simpan Perubahan"** di `/cms-9x7k2`, API `POST /api/site-config` memvalidasi password dan langsung memperbarui berkas JSON secara atomik.
4. Pengunjung yang me-refresh halaman `/id` langsung melihat teks, harga, dan fitur terbaru secara instan.

---

## 4. Sistem Keamanan & Proteksi Rate Limiting

Endpoint `POST /api/site-config` dilengkapi sistem proteksi anti-brute-force bawaan pada level backend:

* **Maksimal Percobaan Gagal**: 5 kali kesalahan password per IP dalam kurun waktu 15 menit (`WINDOW_MS = 15 * 60 * 1000`).
* **Progressive Tarpit Delay**: Setiap kegagalan berturut-turut dikenakan jeda artifisial sebesar $\text{Delay} = 500\text{ ms} \times \text{attempt count}$ (maksimal 5.000 ms) untuk memperlambat serangan otomatis.
* **Auto-Lockout**: Jika mencapai 5 kali percobaan gagal berturut-turut:
  - IP bersangkutan diblokir total selama 15 menit.
  - Server mengembalikan status HTTP `429 Too Many Requests`.
  - Header standar `Retry-After` disertakan dalam respon.
* **Auto-Reset**: Begitu password yang dimasukkan benar, counter kesalahan IP tersebut langsung di-reset kembali ke 0.

---

## 5. Struktur Model Data (`site-config.json`)

Struktur skema berkas konfigurasi di `apps/web/data/site-config.json`:

```json
{
  "logo": {
    "type": "image",
    "text": "ISPSYNC",
    "url": "/logo-prism.png"
  },
  "navbar": {
    "brand": "ISPSYNC",
    "badge": "ENTERPRISE SAAS"
  },
  "hero": {
    "badge": "Enterprise Telecom Infrastructure & ISP Operations Orchestration Platform",
    "title": "Kuasai Seluruh Ekosistem Broadband & Operasional ISP dalam",
    "titleHighlight": "Satu Detak Sinkronisasi.",
    "description": "Dirancang untuk stabilitas skala telekomunikasi dan kepatuhan audit...",
    "ctaDemo": "Buka Portal Member",
    "ctaDemoUrl": "/member/login",
    "ctaWA": "Konsultasi Enterprise via WhatsApp",
    "ctaWAPhone": "6281100000000"
  },
  "pricing": [
    {
      "id": "starter",
      "label": "ISP Regional",
      "name": "Starter",
      "description": "Untuk ISP regional berkembang atau operator mandiri berlisensi.",
      "price": "2.500.000",
      "period": "bln",
      "capacity": "Hingga 1.500 Pelanggan Aktif",
      "engine": "Ledger (Billing & AAA) + Nexus Ritel Dasar",
      "color": "blue",
      "featured": false,
      "features": [
        "Hingga 1.500 Pelanggan Aktif",
        "2 Router BRAS / MikroTik Gateway",
        "FreeRADIUS 3.2 AAA Terintegrasi"
      ]
    }
  ],
  "addons": [
    {
      "id": "addon_users",
      "name": "Ekstra 500 Pelanggan Aktif",
      "price": "500.000",
      "period": "bln",
      "description": "Tambah kapasitas AAA RADIUS & tagihan tanpa perlu migrasi tier paket.",
      "icon": "Users"
    }
  ],
  "adminPassword": "ISPAdmin2024!"
}
```

---

## 6. Panduan Operasional Admin CMS (Step-by-Step)

### 6.1. Login ke CMS Admin
1. Buka peramban dan akses alamat `https://ispsync.id/cms-9x7k2`.
2. Antarmuka menggunakan desain *Split-Screen Telemetry* (kiri: indikator status platform, kanan: panel formulir input).
3. Masukkan password admin (Default: `ISPAdmin2024!`).

### 6.2. Mengubah Hero Section
1. Pada kartu **Hero Section**:
   - **Badge**: Teks kecil di atas headline utama.
   - **Title**: Kalimat pembuka headline tebal.
   - **Title Highlight**: Kata/kalimat yang diberi warna gradien biru (*accent highlight*).
   - **Deskripsi**: Penjelasan pengantar solusi platform.
   - **Teks & Link Tombol CTA**: Label tombol demo dan nomor tujuan WhatsApp resmi.
2. Klik tombol **"Simpan Perubahan"** di sudut kanan atas.

### 6.3. Mengubah Harga & Fitur Paket Langganan
1. Masuk ke kartu **Paket Harga**:
   - Pilih paket yang ingin diubah (**Starter**, **Professional**, **Enterprise**, atau **Private Telco**).
   - Ubah nominal harga (contoh: ubah dari `2.500.000` menjadi `2.750.000`).
   - Ubah daftar poin fitur (satu baris mewakili satu poin ceklis).
2. Klik tombol **"Simpan Perubahan"**.

### 6.4. Mengelola Add-ons (Kapasitas Tambahan)
1. Pada kartu **Add-ons Tambahan**:
   - Tersedia modul penambahan kapasitas pelanggan, OLT, titik ODP GIS, dan akun staf lapangan.
   - Sesuaikan tarif bulanan dan deskripsi add-on.
2. Klik tombol **"Simpan Perubahan"**.

### 6.5. Mengganti Password Admin CMS
1. Pada bagian formulir bawah **Ganti Password Admin**:
   - Masukkan **Password Baru** yang kuat.
   - Masukkan **Konfirmasi Password Baru**.
2. Masukkan password saat ini pada field verifikasi.
3. Klik tombol **"Simpan Perubahan"**. Sistem akan mengunci sesi lama dan menerapkan password baru secara permanen.

---

## 7. Troubleshooting & Pemeliharaan

#### Q: Mengapa perubahan di CMS belum muncul di halaman depan?
1. Pastikan tombol **"Simpan Perubahan"** telah diklik dan memunculkan notifikasi hijau *"Konfigurasi berhasil disimpan"*.
2. Lakukan *hard-refresh* browser pada halaman `https://ispsync.id/id` dengan menekan `Ctrl + F5` (atau `Cmd + Shift + R`) untuk membersihkan cache lokal browser.

#### Q: Terkunci dengan pesan "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
Sistem mendeteksi 5 kali kegagalan input password berturut-turut dari IP Anda. Tunggu masa jeda 15 menit berakhir, atau jika mendesak, restart container web melalui server terminal SSH:
```bash
docker restart isp-prod-web
```
Hal ini akan membersihkan memori rate limiter sementara tanpa menghapus isi `site-config.json`.

---
*Dokumen ini diterbitkan oleh Tim Pengembang Platform ISPSYNC sebagai panduan teknis resmi operasional CMS.*
