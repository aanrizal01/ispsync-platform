-- Migration: 000036 — Add Registration WhatsApp Notification Templates

INSERT INTO notification_templates (code, channel, subject, body, variables) VALUES
(
    'REGISTRATION_SUBMITTED_WA',
    'WHATSAPP',
    'Pendaftaran Pasang Baru Berhasil',
    'Halo Bapak/Ibu {{customer_name}},

Terima kasih telah mendaftar layanan internet fiber {{company_name}}!
Permohonan pasang baru Anda telah berhasil kami terima.

📋 Detail Pendaftaran:
- No. Registrasi: {{registration_no}}
- Paket Pilihan: {{plan_name}}
- Titik Distribusi Terdekat: {{nearest_odp}} (Estimasi Jarak: {{distance}} meter)

🔍 Pantau progres verifikasi & instalasi teknisi secara mandiri di:
👉 {{tracking_url}}

Tim teknisi kami akan segera menghubungi nomor WhatsApp ini untuk konfirmasi jadwal survei lapangan. Terima kasih!',
    '["customer_name", "registration_no", "plan_name", "nearest_odp", "distance", "company_name", "tracking_url"]'::jsonb
),
(
    'REGISTRATION_ALERT_NOC_WA',
    'WHATSAPP',
    'Alert Pendaftaran Pasang Baru (NOC/Sales)',
    '🚨 ALERT: PENDAFTARAN PASANG BARU MASUK

Telah masuk permohonan pasang baru internet fiber di portal Nexus:

📋 Detail Pelanggan:
- Nama: {{customer_name}}
- No. WhatsApp: {{customer_phone}}
- No. Registrasi: {{registration_no}}
- Paket: {{plan_name}}
- Alamat: {{address}}
- ODP Terdekat: {{nearest_odp}} (Jarak: {{distance}} meter)

Silakan tindak lanjuti melalui Panel NOC Command Center.',
    '["customer_name", "customer_phone", "registration_no", "plan_name", "address", "nearest_odp", "distance"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = NOW();
