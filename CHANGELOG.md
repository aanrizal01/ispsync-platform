# Changelog

Semua perubahan, penambahan fitur, dan perbaikan bug pada platform ISPSYNC / GoGiga dicatat dalam dokumen ini.

---

## [2026-10-11] - Pembaruan Trouble Ticketing, Asisten Virtual Diagnosa Mandiri & Penugasan Teknisi SPK WhatsApp

### Ditambahkan & Ditingkatkan
1. **Asisten Virtual / Chatbot Diagnosa Mandiri Tiket (`apps/api/cmd/api/tickets_handler.go`, `apps/web/app/ticket/[id]/page.tsx`):**
   - Implementasi logika asisten virtual bot pada endpoint pesan tiket (`generateBotReply`).
   - Fitur *Quick Action Chips* di antarmuka portal tiket pelanggan: Cek Koneksi, Cek Tagihan, Restart Modem, dan Eskalasi Teknisi.
   - Pengecekan status langganan aktif dan tunggakan invoice belum lunas (`UNPAID`) langsung ke basis data PostgreSQL secara real-time.
   - Deteksi permohonan kunjungan fisik teknisi dengan eskalasi otomatis tiket ke prioritas `HIGH` dan status `IN_PROGRESS`.
   - Standarisasi tampilan bot menggunakan *soft slate light theme* dengan pemformatan teks tebal (*bold markdown*) yang rapi dan bebas polusi emoji.

2. **Penugasan Teknisi & Dispatcher SPK WhatsApp (`apps/web/app/admin/tickets/page.tsx`):**
   - Penambahan selector penugasan teknisi (*Assigned Technician*) pada modal pembuatan tiket baru dan modal detail tiket admin NOC.
   - Integrasi daftar staf teknisi aktif via `usersApi.getUsers()`.
   - Fitur **"Kirim SPK WhatsApp"** satu-klik yang menyusun dokumen Surat Perintah Kerja (SPK) formal lengkap (Nomor Tiket, Tanggal, Nama Pelanggan, Nomor Kontak, Alamat, Kategori, Prioritas, dan Deskripsi Keluhan) dan langsung membuka WhatsApp ke nomor teknisi bersangkutan.
   - Tombol **"Salin Format SPK"** untuk integrasi manual ke aplikasi internal.
   - Tampilan badge teknisi penanggung jawab pada tabel data tiket di Helpdesk Admin.

3. **Kebijakan Keamanan & Penguncian Chat Tiket (`apps/api/cmd/api/tickets_handler.go`, `apps/web/app/ticket/[id]/page.tsx`):**
   - Validasi backend: Penolakan pengiriman pesan baru (`HTTP 400 Bad Request`) apabila status tiket telah berada pada tahap `CLOSED` atau `RESOLVED`.
   - Antarmuka pelanggan otomatis menyembunyikan input form chat dan menampilkan banner pengarsipan tiket dengan opsi cepat **"Buka Tiket Baru"**.

---

## [2026-10-09] - Phase 11: Juniper BNG Adapter (Junos REST API / RFC 3576 CoA PoD)

### Ditambahkan & Ditingkatkan
1. **Mesin Protokol RFC 3576 / RFC 5176 RADIUS Dynamic Authorization (`apps/api/internal/radius/rfc3576.go`, `apps/api/internal/network/rfc3576.go`):**
   - Implementasi native Go binary packet generator untuk Disconnect-Request (Code 40) dan Dynamic Authorization.
   - Perhitungan MD5 Request Authenticator standar RFC 3576 Section 2.1: `MD5(Code + Identifier + Length + 16 zero octets + Attributes + Shared Secret)`.
   - Penyusunan atribut standar `User-Name` (1), `Acct-Session-Id` (44), `Framed-IP-Address` (8), dan `Event-Timestamp` (55).
   - Pengiriman paket biner UDP langsung ke port `3799` router gateway/BNG dengan timeout dan error handling ACK/NAK.

2. **Juniper Junos BNG Adapter (`apps/api/internal/network/juniper_adapter.go`):**
   - Mendukung router Juniper MX Series (MX104, MX204, MX480, MX960) dan SRX Services Gateway via Junos REST XML-RPC API (`/rpc`) dan RFC 3576 CoA.
   - `Ping`: Probe konektivitas ganda TCP socket port API dan HTTP RPC `get-system-information`.
   - `GetSystemInfo`: Parser data JSON Junos OS (`hardware-model`, `os-version`, telemetri `cpu-idle`, buffer memori, dan uptime dari Routing Engine).
   - `SyncPPPoEProfile`: Injeksi dynamic-profiles subscriber PPPoE dan hierarchical firewall policers.
   - `ProvisionPPPoEUser` & `DeprovisionPPPoEUser`: Konfigurasi basis data subscriber Junos access profile.
   - `SetSimpleQueue` & `RemoveSimpleQueue`: Manajemen firewall filter policer (`bandwidth-limit` & `burst-size-limit`).
   - `AddWalledGarden`: Pendaftaran term filter `ALLOW_<dst_host>` ke firewall filter `WALLED_GARDEN_FILTER`.
   - `DisconnectActiveSession` (Dual-Mode Disconnect): Eksekusi pemutusan sesi kombinasi pengiriman paket RFC 3576 PoD UDP 3799 dan RPC Junos `clear-subscribers-session`.
   - Ekstraksi `radius_secret` dan `coa_port` dinamis dari metadata perangkat (`device.Metadata`) di `network.Service.GetAdapter`.

3. **Integrasi CoA Disconnect di Layanan RADIUS (`apps/api/internal/radius/service.go`):**
   - `DisconnectSession`: Otomatis mencari NAS Shared Secret di database (`GetNASByIP`) dan memicu paket RFC 3576 PoD asli ke UDP 3799.
   - Unit tests komprehensif pada `apps/api/internal/network/juniper_adapter_test.go` dan `apps/api/internal/radius/rfc3576_test.go` (100% PASS).

---

## [2026-10-09] - Pembaruan Isolasi Multi-Tenant, Unifikasi Akun Owner & Wilayah Operasional Dinamis

### Ditambahkan & Ditingkatkan
1. **Unifikasi Akun Owner & Autentikasi Fleksibel (`internal/repository/postgres.go`, `internal/repository/sqlite.go`, `apps/api/cmd/api/main.go`):**
   - Mendukung login menggunakan **Username** ATAU **Email** (`WHERE tenant_id = $1 AND (LOWER(username) = LOWER($2) OR LOWER(email) = LOWER($2))`) dengan penataan prioritas username.
   - Menghapus duplikasi row akun Owner pada saat onboarding tenant baru di `apps/api`.
   - Mengeliminasi duplikat akun Owner di seluruh tenant yang tersisa sehingga setiap tenant hanya memiliki 1 akun Owner resmi tanpa kehilangan fleksibilitas login via email.
   - Sinkronisasi endpoint reset password (`ResetUserPassword`) agar mendukung identifikasi username atau email.

2. **Wilayah Operasional & Kantor Cabang Dinamis Antar-Tenant (`web/index.html`):**
   - Menghapus opsi statis/hardcoded *"Kantor Cabang Payakumbuh (PYK)"* pada 5 elemen selector (`global-branch-selector`, `admin-sidebar-branch-selector`, `admin-table-branch-selector`, `staff-table-branch-filter`, dan modal `add-staff-branch`).
   - Implementasi fungsi `syncTenantBranchOptions()` yang secara dinamis menyusun daftar cabang berdasarkan:
     - Cabang penempatan staf terdaftar (`users.branch_code`).
     - Klaster jaringan ODP aktif milik tenant (`window.adminClustersData`).
     - Kantor Pusat (`HQ`) dan Semua Wilayah (`ALL`).
   - Auto-reset nilai filter cabang lokal (`selected_branch_filter`) ke `'ALL'` apabila filter tersimpan sebelumnya tidak valid untuk tenant yang bersangkutan.

3. **Isolasi Hierarkis & Profil Multi-Tenant FiberGrid (`deploy/caddy/Caddyfile.prod`, `apps/api/cmd/api/main.go`):**
   - Integrasi otomatis pembuatan profil legalitas `ispsync_fibergrid.fttx_jartaplok_profile` saat pendaftaran tenant baru (`company_name`, `brand_name`, `website`, dan domain kustom).
   - Penegakan isolasi pohon jaringan FiberGrid (OLT $\rightarrow$ ODC $\rightarrow$ ODP $\rightarrow$ Rute Fiber $\rightarrow$ ONT) agar aset fisik tenant terisolasi penuh secara multi-tenant.
   - Pengecekan status isolasi lintas-tenant dan verifikasi bahwa hak akses non-superuser tidak dapat mengakses aset fisik tenant lain.

4. **Klaster Jaringan & Provider Dinamis (`internal/handler/api_handler.go`):**
   - Mengubah fallback provider klaster in-house di `PublicClusters` dari statis `"GOGIGA In-House FO"` menjadi dinamis mengikuti nama dan slug tenant aktif (`t.Name + " In-House FO"`).

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

5. **Sinkronisasi Dua Arah Paket Pelanggan Aktif Ledger & NOC (`internal/repository/postgres.go`):**
   - Mengintegrasikan pembaruan data pelanggan operasional NOC (`ispsync.subscribers`) secara otomatis dari langganan aktif di Ledger (`public.subscriptions` dan `public.plans`).
   - Mengoreksi inkonsistensi nama paket di mana Nexus sebelumnya menampilkan draf pendaftaran awal (*Penawaran Khusus Sales* pada Sri Rahayu, atau *Paket Gold* tanpa kapasitas), sedangkan di Ledger telah ditetapkan ke paket resmi (*Paket Gold (10M)* Rp 183.150).
   - Mengotomatisasi penambahan pelanggan yang dibuat langsung di Ledger (seperti Nando `CUS-2026-10019`) ke tabel operasional NOC.
   - Menambahkan propagasi balik perubahan paket dari NOC ke tabel langganan Ledger (`public.subscriptions`).

---

## Riwayat Komit Terkait (Branch `staging`)
- `b6e2c82` - fix(plans): auto sync ledger master plans to ispsync plans and populate upgrade modal with speeds and pricing
- `3af9ac1` - feat(noc): add pagination controls to registrations table
- `f99dc6f` - feat(noc): add table filters and toggle dropdown for operational actions
- `f0df0c0` - fix: include X-Admin-Key in loadAdminLiveRadiusSessions and use findLiveSession helper
- `7c78c17` - feat: sync live RADIUS PPPoE sessions to NOC lead table
- `b91d16d` - fix: allow X-Admin-Key authorization directly for admin endpoints
- `c316620` - feat: add SmartOLT integration endpoints and safe frontend parsing
