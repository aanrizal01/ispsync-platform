-- Migration: 000019 — Multi-Stage WhatsApp Reminder Templates & Isolir Notifications

INSERT INTO notification_templates (code, channel, subject, body, variables) VALUES
(
    'INVOICE_REMINDER_H3_WA',
    'WHATSAPP',
    NULL,
    'Halo Bapak/Ibu {{customer_name}},

Mengingatkan kembali bahwa tagihan internet GoGiga Net Anda nomor {{invoice_number}} sebesar *Rp {{amount}}* akan jatuh tempo dalam *3 hari* (pada tanggal {{due_date}}).

Untuk menghindari gangguan kenyamanan berinternet, silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Tautan Pembayaran Instan (QRIS / VA):
👉 {{payment_url}}

Lihat / Cetak Faktur:
📄 {{invoice_url}}

Terima kasih telah setia menggunakan layanan GoGiga Net.',
    '["customer_name", "invoice_number", "amount", "due_date", "payment_url", "invoice_url"]'::jsonb
),
(
    'INVOICE_REMINDER_H1_WA',
    'WHATSAPP',
    NULL,
    '⚠️ *PENTING: PENGINGAT JATUH TEMPO BESOK*

Halo Bapak/Ibu {{customer_name}},

Tagihan internet GoGiga Net Anda nomor {{invoice_number}} sebesar *Rp {{amount}}* akan jatuh tempo *BESOK ({{due_date}})*.

Mohon segera selesaikan pembayaran untuk mencegah isolir otomatis oleh sistem.

Bayar Sekarang (QRIS / M-Banking):
👉 {{payment_url}}

Lihat Faktur:
📄 {{invoice_url}}

Bantuan Layanan: Hubungi Tim NOC GoGiga Net.
Terima kasih.',
    '["customer_name", "invoice_number", "amount", "due_date", "payment_url", "invoice_url"]'::jsonb
),
(
    'INVOICE_DUE_TODAY_WA',
    'WHATSAPP',
    NULL,
    '🚨 *PEMBERITAHUAN: TAGIHAN JATUH TEMPO HARI INI*

Halo Bapak/Ibu {{customer_name}},

Hari ini ({{due_date}}) adalah batas akhir pembayaran tagihan internet GoGiga Net Anda nomor {{invoice_number}} sebesar *Rp {{amount}}*.

Layanan internet Anda berpotensi terisolir otomatis jika pembayaran belum diselesaikan hingga akhir hari ini.

Bayar Langsung via QRIS / VA (Aktif Otomatis):
👉 {{payment_url}}

Terima kasih atas perhatian dan kerja samanya.',
    '["customer_name", "invoice_number", "amount", "due_date", "payment_url"]'::jsonb
),
(
    'INVOICE_OVERDUE_WA',
    'WHATSAPP',
    NULL,
    '⚠️ *TAGIHAN MELEWATI JATUH TEMPO (MASA TENGGANG)*

Halo Bapak/Ibu {{customer_name}},

Tagihan internet nomor {{invoice_number}} sebesar *Rp {{amount}}* telah melewati tanggal jatuh tempo ({{due_date}}).

Saat ini layanan internet Anda berada dalam masa tenggang. Segera lakukan pelunasan agar koneksi internet tetap aktif:
👉 {{payment_url}}

Terima kasih.',
    '["customer_name", "invoice_number", "amount", "due_date", "payment_url"]'::jsonb
),
(
    'SERVICE_ISOLATED_WA',
    'WHATSAPP',
    NULL,
    '🔒 *PEMBERITAHUAN ISOLIR LAYANAN INTERNET*

Kepada Yth. Bapak/Ibu {{customer_name}},

Kami informasikan bahwa koneksi internet Anda untuk nomor tagihan {{invoice_number}} sebesar *Rp {{amount}}* telah *DIISOLIR SEMENTARA* karena melewati batas akhir masa tenggang.

Koneksi internet Anda akan *OTOMATIS AKTIF KEMBALI DALAM 1-2 MENIT* setelah pelunasan berhasil diverifikasi sistem.

Buka Isolir Sekarang (Bayar via QRIS / VA):
👉 {{payment_url}}

Konfirmasi / Bantuan: Hubungi Layanan Pelanggan GoGiga Net.',
    '["customer_name", "invoice_number", "amount", "payment_url"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = NOW();
