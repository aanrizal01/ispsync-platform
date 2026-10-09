# 🌐 ISPSYNC Web Frontend (`apps/web`)

Frontend aplikasi web modern berbasis **Next.js 16 (App Router)** dan **Tailwind CSS v4** dengan arsitektur **Multi-Tenant Terisolasi** dan bahasa desain **Linear Telco Dark**.

---

## 🎨 Design System: Linear Telco Dark

Mengikuti standar antarmuka carrier-grade telekomunikasi yang ditetapkan pada [`GEMINI.md`](../../GEMINI.md):
- **Deep Slate Canvas:** `bg-slate-950` (`#020617`), `via-slate-900`, `to-cyan-950/40`.
- **Aurora Radial Glows:** Efek pencahayaan cyan/blue blur 3xl di sudut kanvas.
- **Accents:** Electric Cyan (`#06b6d4`), Royal Blue (`#3b82f6`), Emerald Green (`#10b981`).
- **Corporate Micro-Badges:** Label minimalis bergaris batas tajam tanpa capsule animasi gimmick (`animate-pulse`).

---

## 🏢 Arsitektur Multi-Tenant

Frontend secara dinamis menyesuaikan branding, identitas tenant, rute API, dan hak akses berdasarkan subdomain HTTP request:
1. **Subdomain Parsing:**
   - 4 segmen (`ledger.ispmu.ispsync.id`): Tenant slug adalah segmen ke-2 (`ispmu`).
   - 3 segmen (`ispmu.ispsync.id`): Tenant slug adalah segmen ke-1 (`ispmu`).
   - Root SaaS (`ispsync.id`, `member.ispsync.id`): Mode platform pusat.
2. **Page Title Overrides:**
   - Halaman tenant menggunakan `title: { absolute: "..." }` untuk mencegah template parent menyisipkan duplikasi branding `| ISPSYNC`.
3. **Pemisahan Domain Publik vs Terisolasi:**
   - `wifi.{tenant}.ispsync.id`: Captive portal voucher (`/hotspot/buy`, `/hotspot/login`), Passpoint WiFi (`/passpoint`), dan loket pendaftaran agen mitra (`/agent/*`).
   - `ledger.{tenant}.ispsync.id`: Backoffice admin internal ISP (`/admin/*`) dan login terenkripsi RS256.

---

## 🚀 Menjalankan Secara Lokal

```bash
# Pindah ke direktori web
cd apps/web

# Install dependensi
npm install

# Jalankan server development Turbopack
npm run dev
```

Akses portal lokal pada [http://localhost:3000](http://localhost:3000).

---

## 📦 Membangun untuk Produksi

```bash
# Build standalone Next.js binary
npm run build

# Menjalankan hasil build
npm run start
```

---

## 📑 Struktur Halaman Utama (`app/`)

- `app/(auth)/login/`: Halaman login multi-tenant (Username atau Email).
- `app/admin/`: Backoffice ISP (Dashboard, Tagihan/Invoices, Pelanggan, Jaringan & Router, Loket Kasir POS, Passpoint, Settings).
- `app/billing/check/`: Portal mandiri pelanggan untuk cek & bayar tagihan via QRIS Dinamis.
- `app/hotspot/`: Portal voucher hotspot ritel mandiri.
- `app/passpoint/`: Installer profil Wi-Fi roaming Passpoint (Hotspot 2.0).
- `app/agent/`: Pendaftaran mitra agen (Auto-kompres foto 97% & proteksi anti-spam bot) dan dashboard loket kasir.
- `app/member/`: Portal Member SaaS langganan platform ISP.
