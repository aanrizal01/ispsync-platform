# Changelog

Semua perubahan, penambahan fitur, dan perbaikan bug pada platform ISPSYNC / GoGiga dicatat dalam dokumen ini.

---

## [2026-10-06] - Pembaruan Operasional NOC, Sinkronisasi Sesi, dan Navigasi Tabel

### Ditambahkan
1. **Fitur Pagination Tabel Registrasi / Leads (`web/index.html`):**
   - Penambahan footer navigasi tabel permohonan registrasi calon pelanggan dan pelanggan aktif.
   - Pilihan ukuran halaman (*page size*): 15, 25, 50, 100, dan Semua baris per halaman (default 25).
   - Kontrol navigasi `Sebelumnya`, indikator posisi halaman (`Hal X / Y`), dan tombol `Selanjutnya` dengan status disabled otomatis pada batas halaman.
   - Indikator rentang data dinamis (*Menampilkan X - Y dari Z data*).
   - Sinkronisasi otomatis kembali ke halaman 1 saat filter, tab status, atau kata kunci pencarian diubah.
   - Kontrol pagination disembunyikan otomatis jika hasil filter kosong.

2. **Filter Multi-Kriteria Tabel Registrasi (`web/index.html`):**
   - Toolbar filter khusus di bawah tab status registrasi.
   - Filter Status Sesi PPPoE: Semua, Online Saja, dan Offline Saja.
   - Filter Paket Layanan: Dropdown dinamis yang diisi otomatis berdasarkan paket yang terdaftar pada database registrasi cabang aktif.
   - Filter Jaringan / Kemitraan: Semua, Direct (Retail Internal), dan Mitra Jartaplok.
   - Pencarian instan teks untuk No. Registrasi, Nama, HP, ODP, Alamat, PPPoE username, dan Upstream username.
   - Tombol Reset Filter yang otomatis muncul saat terdapat filter aktif.
   - Badge counter yang menampilkan jumlah data hasil filter secara real-time.

3. **Menu Aksi Operasional Toggle Dropdown Popover (`web/index.html`):**
   - Merapikan kolom AKSI OPERASIONAL dari deretan tombol horizontal menjadi tombol utama `Detail` dan tombol toggle `Aksi`.
   - Menggunakan layer fixed popover (`z-[99999]`) dengan kalkulasi posisi otomatis (`getBoundingClientRect`) sehingga bebas clipping dari scrollbar atau container tabel.
   - Menampung seluruh aksi kontekstual pelanggan:
     - Form BAST & Aktivasi Teknisi (saat terjadwal pasang/survei).
     - Oper Order ke Mitra Jartup (kasus overdistance / non-coverage).
     - Tandai Wishlist Pelanggan.
     - Isolir Layanan & Putus Koneksi MikroTik (dengan proteksi kebijakan kontrak mitra).
     - Buka Isolir Layanan.
     - Reset / Kick Sesi PPPoE via RFC 3576 CoA Disconnect.
     - Ubah / Upgrade Paket Bandwidth.
     - Salin Ringkasan Data Teknis Pelanggan ke clipboard.
     - Hapus Data Registrasi (khusus hak akses Super User).
   - Event listener global untuk menutup menu saat klik di luar area, scroll jendela, atau resize.

4. **Integrasi SmartOLT (`internal/handler/api_handler.go`, `internal/smartoltclient`, `internal/repository`):**
   - Endpoint pengujian koneksi SmartOLT (`/api/v1/admin/clusters/smartolt-test`).
   - Endpoint sinkronisasi ONU dan status redaman optik (`/api/v1/admin/clusters/smartolt/sync`).
   - Dukungan database PostgreSQL dan SQLite untuk konfigurasi kredensial SmartOLT per klaster.

### Diperbaiki
1. **Sinkronisasi Status Sesi PPPoE RADIUS (`internal/handler/api_handler.go`, `internal/repository/postgres.go`):**
   - Perbaikan query status online agar memeriksa `radius_sessions WHERE acctstoptime IS NULL`.
   - Normalisasi pencocokan username PPPoE antara format lokal (`1400200002`) dan format domain FQDN (`1400200002@gogiga.net.id`).
   - Penyertaan header otentikasi `X-Admin-Key` pada pemanggilan endpoint `/api/v1/admin/radius/live-sessions` dari frontend.
   - Penambahan tampilan detail teknis IP address, uptime sesi, dan MAC calling-station pada baris pelanggan berstatus online.

2. **Otentikasi Endpoint Administrasi (`internal/handler/api_handler.go`):**
   - Penyesuaian otorisasi internal admin key (`X-Admin-Key: isp-onboarding-admin-key`) untuk permintaan antar-layanan dan konsol NOC.

3. **Sinkronisasi Otomatis Paket Layanan Internet Ledger (`internal/repository/postgres.go`, `web/index.html`):**
   - Penambahan auto-fallback sinkronisasi katalog paket master Ledger (`public.plans` dan `public.plan_prices`) ke tabel tenant `ispsync.plans`. Apabila suatu tenant belum memiliki entri paket pada skema `ispsync.plans`, repositori backend secara otomatis menyalin dan meng-upsert paket aktif dari master Ledger sehingga modul NOC selalu terisi untuk setiap tenant.
   - Penanganan fallback `GetPlanByID` ke tabel master Ledger menggunakan pencarian ID UUID paket.
   - Pemuatan paket asinkron pada dropdown modal "Upgrade / Ganti Paket Bandwidth" di NOC FO (`populateUpgradePlanSelect`) dengan pengelompokan "Paket Resmi Aktif (Ledger)", informasi kecepatan download/upload Mbps, dan format tarif rupiah per bulan.

4. **Validasi Input Tarif Rupiah Fleksibel (`web/index.html`, `web/kontrak.html`):**
   - Mengubah atribut validasi input HTML5 `step="5000"` menjadi `step="any"` pada modal upgrade paket (`upgrade-plan-price`), input deposit custom (`topup-custom-amount`), input paket korporat, dan kontrak sewa port.
   - Mengatasi penolakan submit validasi peramban (*Please enter a valid value*) pada nominal paket resmi non-kelipatan 5000 (contohnya Paket Gold 10M seharga Rp 183.150).

---

## Riwayat Komit Terkait (Branch `staging`)
- `b6e2c82` - fix(plans): auto sync ledger master plans to ispsync plans and populate upgrade modal with speeds and pricing
- `3af9ac1` - feat(noc): add pagination controls to registrations table
- `f99dc6f` - feat(noc): add table filters and toggle dropdown for operational actions
- `f0df0c0` - fix: include X-Admin-Key in loadAdminLiveRadiusSessions and use findLiveSession helper
- `7c78c17` - feat: sync live RADIUS PPPoE sessions to NOC lead table
- `b91d16d` - fix: allow X-Admin-Key authorization directly for admin endpoints
- `c316620` - feat: add SmartOLT integration endpoints and safe frontend parsing
