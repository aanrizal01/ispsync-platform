# 📱 GOGIGA Agent Android App

Aplikasi Android resmi untuk Mitra Agen **GOGIGA NET** dengan dukungan **Direct Bluetooth Thermal Printing (ESC/POS)** dan pemindai barcode kamera terintegrasi.

---

## ✨ Fitur Unggulan

1. **Direct Bluetooth Thermal Printer SPP (ESC/POS)**:
   - Menghubungkan HP langsung ke printer thermal portabel Bluetooth via protokol SPP (Serial Port Profile).
   - Kompatibel dengan semua merk printer thermal 58mm & 80mm di Indonesia: Panda, VSC, Mini POS 5802, RPP02N, Zjiang, Blueprint, BellaV, Eppos, dll.
   - Tanpa dialog browser, sekali klik langsung mencetak dalam waktu < 1 detik.
2. **Menu Pengaturan Printer**:
   - Memilih printer Bluetooth default dari daftar perangkat yang dipasangkan (*Paired Devices*).
   - Pengaturan ukuran kertas: **58 mm (32 kolom)** atau **80 mm (48 kolom)**.
   - Tombol **"Tes Cetak Struk"** instan.
3. **Bridge JavaScript Native (`window.AndroidPrinter`)**:
   - Portal web `https://hot.gogiga.net.id/agent/dashboard` secara otomatis mendeteksi keberadaan aplikasi ini dan mengaktifkan fitur cetak native.
4. **Pemindai Kamera Barcode**:
   - Terintegrasi penuh dengan izin kamera Android untuk tembak Serial Number (SN) kartu blanko gesek secara instan.
5. **Pull-to-Refresh & Navigasi Cepat**:
   - Swipe ke bawah untuk memperbarui saldo dan data transaksi.

---

## 🚀 Cara Membangun APK (Build Instructions)

### Cara 1: Menggunakan Android Studio (Paling Mudah)
1. Buka software **Android Studio**.
2. Pilih **Open**, lalu arahkan ke folder `apps/android`.
3. Tunggu proses *Gradle Sync* selesai.
4. Hubungkan HP Android menggunakan kabel USB (atau emulator).
5. Klik menu **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
6. File APK siap digunakan di folder:
   ```
   apps/android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

### Cara 2: Menggunakan Terminal / Command Line
Pastikan JDK 17+ dan Android SDK sudah terpasang di komputer Anda:
```bash
cd apps/android
./gradlew assembleRelease
# atau untuk build debug:
./gradlew assembleDebug
```
File APK akan dihasilkan di `app/build/outputs/apk/release/app-release-unsigned.apk`.

---

## 🔒 Izin Android yang Digunakan
- `android.permission.BLUETOOTH` & `BLUETOOTH_CONNECT`: Menghubungkan ke printer Bluetooth.
- `android.permission.ACCESS_FINE_LOCATION`: Diperlukan sistem Android untuk komunikasi Bluetooth.
- `android.permission.CAMERA`: Pemindaian barcode Serial Number (SN) voucher gesek.
- `android.permission.INTERNET`: Memuat portal agen resmi `hot.gogiga.net.id`.
