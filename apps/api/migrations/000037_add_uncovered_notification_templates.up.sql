-- Migration: 000037 — Add Uncovered Wishlist & Cancelled Notification Templates

INSERT INTO notification_templates (code, channel, subject, body, variables) VALUES
(
    'UNCOVERED_WISHLIST_WA',
    'WHATSAPP',
    'Prioritas Perluasan Jaringan Fiber',
    'Halo Bapak/Ibu {{customer_name}},

Terima kasih atas minat Anda berlangganan internet fiber {{company_name}} (No. Reg: {{registration_no}}).

Berdasarkan hasil survei tim teknis kami, saat ini lokasi rumah Anda belum terjangkau jalur distribusi kabel Fiber Optik kami dalam batas jarak aman.

Data permohonan Anda telah kami simpan ke dalam *Daftar Prioritas Perluasan Jaringan (Wishlist)* {{company_name}}. Kami akan segera menghubungi Anda kembali begitu tiang/jalur distribusi baru resmi dibuka di wilayah Anda.

Salam hormat,
Tim Layanan Pelanggan {{company_name}}',
    '["customer_name", "registration_no", "company_name"]'::jsonb
),
(
    'UNCOVERED_CANCELLED_WA',
    'WHATSAPP',
    'Pemberitahuan Status Permohonan Pasang Baru',
    'Halo Bapak/Ibu {{customer_name}},

Terima kasih atas minat Anda berlangganan internet fiber {{company_name}} (No. Reg: {{registration_no}}).

Setelah dilakukan pengecekan teknis mendalam, mohon maaf permohonan pasang baru saat ini belum dapat kami proses karena lokasi berada di luar batas jangkauan infrastruktur fiber optik kami.

Terima kasih banyak atas pengertian Anda.

Salam hormat,
Tim Layanan Pelanggan {{company_name}}',
    '["customer_name", "registration_no", "company_name"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = NOW();
