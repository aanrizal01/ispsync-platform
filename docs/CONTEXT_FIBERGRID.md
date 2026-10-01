# 📡 ISPSYNC FiberGrid — Context & Reference Blueprint

## 1. Identitas Engine
* **Nama Resmi**: ISPSYNC FiberGrid
* **Peran Arsitektur**: Engine 1 (Physical, Infrastructure & Wholesale B2B)
* **Port Standar**: `8082`
* **Subdomain Template**: `fttx.{tenant}.ispsync.id`, `noc.{tenant}.ispsync.id`
* **Domain Staging**: `https://fttx.dev.ispsync.id`
* **Target Pengguna**: Core Fiber Engineering, Splicer FO, Admin Wholesale Jartaplok.

---

## 2. Referensi Proyek Utama
* **Source Reference**: Proyek `FTTX` / `ispsync-fttx`
* **Lokasi Server VPS**: `/home/anri01/ispsync-fttx`
* **Service Systemd**: `ispsync-fttx.service` (Port 8082)
* **Database Engine**: Central PostgreSQL 16 + PostGIS (Port `5432`, Host: `127.0.0.1`, Database: `ispsync` / `isp_billing` - `fttx_olt_devices`, `fttx_odc_nodes`, `fttx_odp_nodes`, `fttx_fiber_routes`, `wholesale_contracts`, `fttx_acs_cpe_data`)
* **Koneksi Antar-Engine**: Terhubung ke Nexus di `ISP_BASE_URL=http://127.0.0.1:8081`

---

## 3. Tanggung Jawab & Lingkup Fitur (Zero Overlap)
1. **Manajemen Aset Fisik & Optik**:
   - Master OLT (ZTE, Huawei, BDCOM), ODC, dan tiang ODP (kapasitas 8 port).
   - Pemetaan rute kabel Feeder (24/48 Core) & Distribusi (12/24 Core) berbasis GIS PostGIS.
   - Fitur Ekspor file KML untuk perizinan instansi daerah/PUPR.
2. **SNMP Poller & Optical Threshold**:
   - Daemon poller otomatis membaca redaman optik dBm per 5 menit:
     - 🟢 Normal: -15.0 dBm s/d -23.9 dBm
     - 🟡 Warning: -24.0 dBm s/d -26.9 dBm
     - 🔴 Critical: $\le$ -27.0 dBm
     - ⚫ LOS (Loss of Signal): $\le$ -35.0 dBm
3. **TR-069 ACS (Zero-Touch Provisioning)**:
   - Remote Wi-Fi management (SSID/Password), monitoring sinyal RSSI pelanggan dari jarak jauh.
4. **Wholesale Jartaplok B2B**:
   - Manajemen sewa port optik pasif untuk ISP partner (kalkulasi prorata & kontrak aktif).

---

## 4. Kredensial Default Staging
* **URL**: `https://fttx.dev.ispsync.id`
* **VLAN Staging**: `669`
