# 📱 BUKU PANDUAN PENGGUNAAN & PENGEMBANGAN APLIKASI MOBILE UNIVERSAL ISPSYNC
> **Platform Aliansi Bersama Seluruh ISP (Android & iPhone / iOS)**  
> *Versi 1.0 — Edisi Resmi ISPSYNC Platform*

---

## 📌 DAFTAR ISI
1. [Latar Belakang & Konsep Aliansi Bersama](#1-latar-belakang--konsep-aliansi-bersama)
2. [Panduan untuk Pelanggan (Consumer & WiFi Roaming)](#2-panduan-untuk-pelanggan-consumer--wifi-roaming)
3. [Panduan untuk Mitra Agen / Loket Kasir Warung](#3-panduan-untuk-mitra-agen--loket-kasir-warung)
4. [Panduan untuk Manajemen ISP (Pengaturan di Ledger Backoffice)](#4-panduan-untuk-manajemen-isp-pengaturan-di-ledger-backoffice)
5. [Panduan Teknis Developer: Uji Coba Lokal (Expo Go)](#5-panduan-teknis-developer-uji-coba-lokal-expo-go)
6. [Panduan Teknis Developer: Build APK, Play Store & App Store](#6-panduan-teknis-developer-build-apk-play-store--app-store)
7. [Troubleshooting & Solusi Kendala Lapangan](#7-troubleshooting--solusi-kendala-lapangan)

---

## 1. Latar Belakang & Konsep Aliansi Bersama

### Mengapa 1 Aplikasi untuk Banyak ISP?
Biasanya, setiap ISP harus membuat aplikasi sendiri, membayar biaya pendaftaran toko aplikasi Google Play ($25) dan Apple Developer ($99/tahun), serta mengurus sertifikasi badan hukum yang rumit. Selain itu, **Apple App Store sangat melarang** penerbitan aplikasi yang sama berkali-kali untuk klien yang berbeda (*Apple Guideline 4.2.6 - White Label App Spam*).

**Solusi ISPSYNC Connect:**
* Menggunakan konsep **Aliansi Jaringan Bersama** (mirip jaringan *ATM Bersama* atau *@wifi.id GO*).
* Cukup **1 Aplikasi Resmi di Play Store & App Store**.
* Seluruh ISP lokal yang berlangganan platform ISPSYNC langsung memiliki fasilitas aplikasi mobile canggih untuk pelanggan dan mitranya secara instan.
* Dilengkapi **Dynamic Tenant Branding Engine**: aplikasi otomatis berubah warna, logo, dan rute server sesuai ISP yang sedang digunakan oleh pelanggan.

---

## 2. Panduan untuk Pelanggan (Consumer & WiFi Roaming)

### A. Cara Menghubungkan Aplikasi ke ISP Lokal Anda
Saat pertama kali membuka aplikasi:
1. **Cara 1 (Pindai QR Router):**
   * Klik tombol **"📷 Pindai QR di Router ONT / Faktur"**.
   * Arahkan kamera HP ke stiker barcode/QR yang tertempel di modem router rumah atau lembar kuitansi tagihan Anda.
   * Aplikasi langsung terkunci ke profil ISP Anda.
2. **Cara 2 (Pilih dari Katalog):**
   * Pilih nama ISP lokal Anda dari daftar (contoh: *GOGIGA NET*, *ISPMU FIBER*, dll).
3. **Cara 3 (Ketik Nama / Domain):**
   * Jika ISP Anda baru bergabung, masukkan kode ISP atau domain (misal: `hotspot.gowifi.id` atau `wifi.namaisp.id`) pada kolom pencarian, lalu klik **Buka**.

### B. Beli Paket Voucher Hotspot & Bayar Tagihan
1. Pastikan Anda berada pada mode **"Pelanggan & WiFi"**.
2. Pilih paket internet yang diinginkan (contoh: 2 Jam, 24 Jam, Mingguan, atau Bulanan).
3. Masukkan nomor WhatsApp Anda (bukti pembelian & kode voucher cadangan otomatis dikirim via WA).
4. Pilih metode pembayaran **QRIS Dinamis** (bisa dibayar pakai BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay, dsb).
5. Begitu pembayaran sukses, HP akan otomatis terhubung ke internet tanpa perlu ketik username/password!

### C. Pasang Profil Passpoint (Hotspot 2.0 WiFi)
1. Buka menu **Passpoint WiFi**.
2. Klik tombol **"Pasang Profil WiFi Otomatis"**.
3. Di iPhone / Android akan muncul konfirmasi izin penambahan profil jaringan WiFi aman.
4. Klik **Izinkan / Install**.
5. Setelah terpasang, saat Anda berada di kafe, taman, atau lokasi mana pun yang ada sinyal WiFi aliansi ISPSYNC, HP Anda akan **otomatis tersambung (auto-connect)** secara aman seperti sinyal seluler.

---

## 3. Panduan untuk Mitra Agen / Loket Kasir Warung

Aplikasi ini dilengkapi antarmuka khusus kasir warung/loket agen untuk menjual voucher dan menerima pembayaran tagihan tetangga.

### A. Mengaktifkan Mode Mitra Loket
1. Pada halaman pemilihan, pilih tab **"Mitra Loket Kasir"**.
2. Masukkan nomor HP/username dan PIN loket Anda.

### B. Menghubungkan Printer Bluetooth Thermal Kasir
Aplikasi mendukung seluruh printer thermal portabel ukuran 58mm dan 80mm di pasaran (Panda, Blueprint, VSC, MiniPOS 5802, BellaV, Eppos, dll):
1. Nyalakan Printer Bluetooth Thermal Anda.
2. Di HP Anda, masuk ke menu **Bluetooth Settings**, lalu pasangkan (*Pair*) printer (biasanya PIN default: `0000` atau `1234`).
3. Kembali ke aplikasi ISPSYNC, klik ikon **Printer (🖨️)** di pojok kanan atas.
4. Pilih ukuran kertas struk Anda:
   * **58 mm:** Standar printer saku kasir mini.
   * **80 mm:** Printer kasir besar / desktop.
5. Klik **"🖨️ Tes Cetak Struk Contoh"**. Jika kertas struk keluar, printer siap digunakan!

### C. Menjual & Mencetak Voucher Sekali Klik
1. Pilih nominal voucher yang dibeli pelanggan (misal: Rp 5.000 / 24 Jam).
2. Klik tombol **"Cetak Struk"**.
3. Printer thermal Bluetooth akan langsung mencetak struk voucher fisik dengan kode besar yang mudah dibaca dalam waktu kurang dari 1 detik tanpa perlu membuka dialog browser.
4. Anda juga bisa membagikan kode voucher via WhatsApp jika pelanggan tidak ingin struk kertas.

---

## 4. Panduan untuk Manajemen ISP (Pengaturan di Ledger Backoffice)

Sebagai pemilik ISP, Anda dapat mengatur bagaimana brand Anda tampil di aplikasi mobile bersama melalui menu Backoffice Ledger:

1. Buka portal manajemen ISP Anda di: `https://ledger.[namaisp].ispsync.id/admin/settings`
2. Klik tab **"Domain & Sub-Brand WiFi"**.
3. Atur parameter berikut:
   * **Nama Sub-Brand WiFi:** Masukkan nama brand hotspot Anda (misal: `@gowifi`, `@wifi.id`, `@mitragiga`). Nama ini otomatis tercetak di header struk kasir dan judul aplikasi.
   * **Domain WiFi Hotspot & Mitra Loket (Publik):** Masukkan domain akses publik (misal: `hotspot.gowifi.id` atau `wifi.namaisp.id`).
   * **Domain Backoffice Ledger (Terisolasi):** Domain untuk internal admin ISP (misal: `ledger.namaisp.id`).
4. Klik tombol **"Simpan Pengaturan"** di kanan atas.
5. Aplikasi mobile secara otomatis akan mengambil data terbaru ini secara real-time.

---

## 5. Panduan Teknis Developer: Uji Coba Lokal (Expo Go)

Untuk menguji aplikasi langsung di HP Android atau iPhone Anda menggunakan komputer:

### Langkah 1: Persiapan di Komputer
Pastikan Node.js v18+ sudah terpasang.
Buka terminal dan masuk ke folder `apps/mobile`:
```bash
cd apps/mobile
npm install
```

### Langkah 2: Jalankan Server Expo
```bash
npx expo start
```
Terminal akan menampilkan **QR Code besar**.

### Langkah 3: Buka di HP Fisik
1. **Di HP Android:** Buka aplikasi **Expo Go** (download dari Play Store) > klik **Scan QR Code** > sorot ke layar laptop.
2. **Di iPhone (iOS):** Buka aplikasi **Kamera bawaan iPhone** > sorot QR Code > klik notifikasi kuning bertuliskan **Open in Expo Go**.
3. Aplikasi akan langsung ter-compile dan berjalan di HP Anda dengan kemampuan live-reload (setiap ada perubahan kode, layar HP langsung ter-update otomatis).

---

## 6. Panduan Teknis Developer: Build APK, Play Store & App Store

Proses kompilasi menjadi file mandiri menggunakan **EAS (Expo Application Services) Cloud Build**, sehingga Anda tidak perlu laptop Mac untuk membuat aplikasi iPhone.

### Langkah 1: Pasang EAS CLI & Login
```bash
npm install -g eas-cli
eas login
```
*(Daftar akun gratis di [expo.dev](https://expo.dev) jika belum memiliki akun).*

### Langkah 2: Inisialisasi Proyek Build
```bash
cd apps/mobile
eas build:configure
```

### Langkah 3: Kompilasi APK Android Mandiri (Bisa Langsung Di-Share via WA/Web)
Untuk membuat file installer `.apk` yang bisa langsung dibagikan ke teknisi, agen, dan pelanggan tanpa menunggu verifikasi Play Store:
```bash
eas build --platform android --profile preview
```
Setelah proses cloud selesai (sekitar 5-10 menit), Anda akan diberikan link unduh file `.apk`.

### Langkah 4: Kompilasi Rilis Resmi Toko Aplikasi
* **Untuk Google Play Store (Format Android App Bundle / `.aab`):**
  ```bash
  eas build --platform android --profile production
  ```
* **Untuk Apple App Store / TestFlight (Format `.ipa`):**
  ```bash
  eas build --platform ios --profile production
  ```

---

## 7. Troubleshooting & Solusi Kendala Lapangan

| Kendala | Penyebab | Solusi |
| :--- | :--- | :--- |
| **Printer Bluetooth tidak terdeteksi di aplikasi** | Printer belum dipasangkan (*paired*) di OS HP. | Buka menu Bluetooth di pengaturan HP, lakukan *Pair* ke printer (masukkan PIN `0000` atau `1234`), lalu buka kembali aplikasi. |
| **Tampilan webview putih / blank saat ganti ISP** | Domain ISP salah ketik atau DNS belum mengarah ke IP VPS. | Pastikan DNS A-Record domain ISP tersebut sudah mengarah ke IP Server `103.179.65.73`. |
| **Hasil cetak thermal terpotong di pinggir** | Ukuran kertas tidak sesuai. | Buka ikon printer di aplikasi, ganti dari format `80mm` ke `58mm` sesuai lebar kertas printer mini Anda. |
| **Kamera scanner tidak mau terbuka** | Izin kamera ditolak oleh pengguna saat pertama kali install. | Buka Pengaturan HP > Aplikasi > ISPSYNC Connect > Izin (*Permissions*) > Aktifkan Kamera. |

---

*Dokumen ini diterbitkan oleh Tim Pengembang Platform ISPSYNC — Standar Sistem Telekomunikasi Multi-Tenant 2026.*
