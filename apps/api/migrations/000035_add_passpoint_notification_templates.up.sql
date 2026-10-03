-- Migration: 000035 — Add Passpoint WhatsApp Notification Templates

INSERT INTO notification_templates (code, channel, subject, body, variables) VALUES
(
    'PASSPOINT_PURCHASE_WA',
    'WHATSAPP',
    'Registrasi Passpoint Berhasil',
    'REGISTRASI AKUN WI-FI PASSPOINT BERHASIL

Halo {{customer_name}},
Paket Wi-Fi Passpoint Anda telah aktif dan siap digunakan.

Detail Layanan:
- Paket: {{package_name}} ({{duration_days}} Hari)
- Berlaku Hingga: {{expiry_date}}
- Username EAP: {{username}}
- Kata Sandi: {{password}}
- Realm: {{realm}}

Unduh Profil Otomatis (iPhone / Mac / Windows):
👉 {{profile_url}}

Panduan Pengaturan Android (EAP-TTLS):
1. Pilih Wi-Fi Passpoint / Hotspot 2.0
2. Metode EAP: TTLS
3. Otentikasi Tahap 2: MSCHAPv2
4. Sertifikat CA: Gunakan sertifikat sistem / Jangan validasi
5. Domain: {{domain}}
6. Identitas: {{username}}
7. Kata Sandi: {{password}}

Periksa Status Mandiri:
👉 {{status_url}}

Simpan pesan ini sebagai bukti pendaftaran resmi.',
    '["customer_name", "package_name", "duration_days", "expiry_date", "username", "password", "realm", "domain", "status_url", "profile_url"]'::jsonb
),
(
    'PASSPOINT_RENEWAL_WA',
    'WHATSAPP',
    'Perpanjangan Passpoint Berhasil',
    'PERPANJANGAN PASSPOINT BERHASIL

Halo {{customer_name}},
Masa aktif paket Wi-Fi Passpoint Anda telah berhasil diperpanjang.

Detail Perpanjangan:
- Paket: {{package_name}}
- Tambahan Durasi: {{duration_days}} Hari
- Berlaku Hingga: {{expiry_date}}
- Username EAP: {{username}}

Profil di smartphone Anda tetap aktif dan tersambung otomatis ke jaringan Wi-Fi tanpa perlu pengaturan ulang.

Periksa Status Mandiri:
👉 {{status_url}}

Terima kasih atas kepercayaannya menggunakan layanan kami.',
    '["customer_name", "package_name", "duration_days", "expiry_date", "username", "status_url"]'::jsonb
),
(
    'PASSPOINT_RECEIPT_WA',
    'WHATSAPP',
    'Struk Pembelian Wi-Fi Passpoint',
    'STRUK PEMBELIAN WI-FI PASSPOINT (LOKET KASIR)

Halo {{customer_name}},
Terima kasih telah melakukan pembelian paket Wi-Fi Passpoint di loket kasir kami.

Detail Transaksi:
- Paket: {{package_name}} ({{duration_days}} Hari)
- Total Biaya: Rp {{price}}
- Pembayaran: {{payment_method}}
- Petugas Loket: {{cashier_name}}

Periksa Status Mandiri:
👉 {{status_url}}

Simpan pesan ini sebagai bukti transaksi resmi.',
    '["customer_name", "package_name", "duration_days", "price", "payment_method", "cashier_name", "status_url"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = NOW();
