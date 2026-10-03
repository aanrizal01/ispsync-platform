# 📱 ISPSYNC Connect — Universal Mobile App (Android & iOS)

Aplikasi mobile aliansi multi-tenant untuk ekosistem ISP di Indonesia yang tergabung di dalam platform **ISPSYNC**.

Satu aplikasi resmi di Google Play Store & Apple App Store yang dapat digunakan oleh seluruh pelanggan dan mitra loket dari berbagai ISP anggota (misal: *GOGIGA NET*, *ISPMU FIBER*, dan ISP lokal lainnya).

---

## ✨ Fitur Unggulan

### 1. Dual-Mode Interface:
* **Mode Pelanggan & Hotspot WiFi:**
  * Auto-Connect profil WiFi Passpoint (Hotspot 2.0).
  * Pembelian voucher internet online via QRIS mandiri.
  * Cek kuota, FUP, dan status tagihan bulanan FTTH / PPPoE.
  * Uji kecepatan internet lokal (Speedtest).
* **Mode Mitra Loket Kasir (Agent POS):**
  * Direct Bluetooth Thermal Printing (ESC/POS 58mm & 80mm).
  * Cetak nota dan voucher instan tanpa popup browser.
  * Pemindai kamera barcode Serial Number (SN) voucher gesek.
  * Top-up saldo loket dan pencatatan komisi bagi hasil.

### 2. Tenant Discovery Engine (Otomatis & Fleksibel):
* **Pindai QR Router:** Arahkan kamera ke stiker modem ONT atau lembar tagihan untuk mengunci ISP terkait.
* **Auto-Discovery SSID:** Otomatis mendeteksi saat HP terhubung ke jaringan WiFi hotspot milik ISP aliansi.
* **Katalog ISP Nasional:** Memilih ISP dari direktori anggota resmi ISPSYNC.

### 3. Native Bridge JavaScript:
Menyediakan bridge `window.AndroidPrinter` & `window.ISPSYNC_MOBILE` sehingga modul web portal tidak perlu diubah dan langsung kompatibel dengan printer native.

---

## 🚀 Panduan Menjalankan Aplikasi (Local Dev)

### Persyaratan:
* Node.js v18+ / v20+ / v24+
* Aplikasi **Expo Go** terpasang di HP Android atau iPhone Anda (unduh gratis di Play Store / App Store).

### Menjalankan Development Server:
```bash
cd apps/mobile
npm install
npx expo start
```
1. Buka aplikasi **Expo Go** di HP Anda.
2. Pindai QR Code yang muncul di terminal terminal Anda.
3. Aplikasi akan langsung berjalan di layar HP Anda!

---

## 📦 Panduan Build APK & iOS (EAS Build)

Untuk menghasilkan file installer `.apk` (Android) atau rilis ke **Google Play Store** dan **Apple TestFlight**:

```bash
# Pasang EAS CLI
npm install -g eas-cli

# Login akun Expo
eas login

# Konfigurasi build
eas build:configure

# Build APK Android (dapat diinstall langsung di HP tanpa store):
eas build --platform android --profile preview

# Build untuk Google Play Store (AAB):
eas build --platform android --profile production

# Build untuk Apple App Store / TestFlight (iOS):
eas build --platform ios --profile production
```

---

## 🔒 Izin Sistem (Permissions)
* **Kamera (`CAMERA`):** Pindai QR code tagihan & barcode kartu voucher.
* **Bluetooth (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`):** Koneksi ke printer thermal kasir.
* **WiFi State (`ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`):** Auto-connect ke hotspot Passpoint.
* **Lokasi Kasar/Halus (`ACCESS_FINE_LOCATION`):** Diperlukan OS Android & iOS untuk scanning perangkat Bluetooth dan jaringan WiFi lokal.
