# 👥 ISPSYNC Nexus — Context & Reference Blueprint

## 1. Identitas Engine
* **Nama Resmi**: ISPSYNC Nexus
* **Peran Arsitektur**: Engine 2 (Retail Operations, Field & CRM)
* **Port Standar**: `8081`
* **Canonical Gateway**: `https://nexus.ispsync.id`
* **Subdomain Template**: `nexus.{tenant}.ispsync.id` (Operasional Internal Staf & Mitra) & `portal.{tenant}.ispsync.id` (Registrasi Mandiri Publik)
* **Domain Staging**: `https://nexus.dev.ispsync.id` & `https://portal.dev.ispsync.id`
* **Target Pengguna**: Calon Pelanggan Ritel, Tim Sales (AE), Teknisi Lapangan, Staff NOC.

---

## 2. Referensi Proyek Utama
* **Source Reference**: Proyek `ISPENGINE` (sebelumnya `GOGIGA-ISP` / `onboarding`).
* **Lokasi Kode Lokal**: `C:\Users\62811\Documents\ISP` & `C:\Users\62811\Downloads\ISPSYNC\cmd`
* **Lokasi Server VPS**: `/home/anri01/ispsync-core`
* **Service Systemd**: `ispsync-core.service` (Port 8081)
* **Database Engine**: Central PostgreSQL 16 + PostGIS (Port `5432`, Database: `ispsync`, Schema: `public` - `tenants`, `users`, `plans`, `odps`, `subscribers`, `work_orders`, `jartaplok_agreements`)

---

## 3. Tanggung Jawab & Lingkup Fitur (Zero Overlap)
1. **Registrasi Mandiri & Coverage**:
   - Geolocation GPS pelanggan, kalkulasi jarak ke ODP terdekat (Radius toleransi $\le 250\text{ m}$).
2. **SPK & BAST Digital**:
   - Penerbitan Surat Perintah Kerja (SPK) untuk teknisi.
   - Pengisian form redaman OPM dan tanda tangan digital pelanggan di layar HP saat pemasangan selesai.
3. **Sales & Referral**:
   - Link referral tim marketing (komisi Rp 50.000/pelanggan aktif).
4. **Live NOC Monitor**:
   - Dashboard monitoring sesi PPPoE online/offline dan trigger reset sesi.
5. **Jartaplok Collaboration**:
   - Manajemen perjanjian kerjasama sewa port ODP antar-ISP (`jartaplok_agreements`).
6. **Autentikasi & Akun Owner Tunggal**:
   - 1 Akun Owner tunggal per tenant (role `OWNER` / `SUPER_ADMIN`).
   - Autentikasi fleksibel: login dapat menggunakan Username maupun Email resmi tanpa duplikasi data pengguna di database.
7. **Wilayah Operasional & Cabang Dinamis**:
   - Zero hardcoded branches di UI. Dropdown wilayah disusun secara dinamis mengikuti staf terdaftar dan klaster jaringan aktif milik tenant.

---

## 4. Kredensial Default Staging
* **URL**: `https://portal.dev.ispsync.id`
* **User**: `owner` / `noc` / `sales` / `teknisi`
* **Password**: `DevLab2026!`
