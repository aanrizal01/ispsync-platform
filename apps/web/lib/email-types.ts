export type TemplateModelStyle = "executive" | "modern" | "alert";

export type EmailTemplates = {
  otp: {
    model_style: TemplateModelStyle;
    subject: string;
    header_title: string;
    header_subtitle: string;
    greeting: string;
    body_message: string;
    otp_box_label: string;
    expiry_notice: string;
    ignore_notice: string;
    security_note: string;
    footer_copyright: string;
  };
  welcome: {
    model_style: TemplateModelStyle;
    subject: string;
    header_title: string;
    badge_text: string;
    greeting_message: string;
    support_note: string;
    footer_copyright: string;
  };
  forgot_password: {
    model_style: TemplateModelStyle;
    subject: string;
    header_title: string;
    header_subtitle: string;
    greeting: string;
    body_message: string;
    action_button_text: string;
    action_url: string;
    reset_code_label: string;
    expiry_notice: string;
    security_note: string;
    footer_copyright: string;
  };
  subscription_expiring: {
    model_style: TemplateModelStyle;
    subject: string;
    header_title: string;
    header_subtitle: string;
    badge_text: string;
    greeting: string;
    body_message: string;
    invoice_box_title: string;
    action_button_text: string;
    action_url: string;
    consequence_notice: string;
    footer_copyright: string;
  };
  account_expired: {
    model_style: TemplateModelStyle;
    subject: string;
    header_title: string;
    header_subtitle: string;
    badge_text: string;
    greeting: string;
    body_message: string;
    action_button_text: string;
    action_url: string;
    retention_notice: string;
    support_note: string;
    footer_copyright: string;
  };
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  otp: {
    model_style: "executive",
    subject: "[ISPSYNC] Kode Verifikasi Pendaftaran: {otp_code}",
    header_title: "ISPSYNC Platform",
    header_subtitle: "Carrier-Grade ISP Automation & Network Ledger",
    greeting: "Halo, {name}!",
    body_message: "Terima kasih telah mendaftar di Platform ISPSYNC. Gunakan kode verifikasi (OTP) berikut untuk menyelesaikan pendaftaran akun Anda:",
    otp_box_label: "KODE VERIFIKASI OTP ANDA",
    expiry_notice: "Berlaku selama 15 menit",
    ignore_notice: "Jika Anda tidak merasa melakukan pendaftaran akun di platform ISPSYNC, Anda dapat mengabaikan email ini dengan aman.",
    security_note: "Keamanan Akun: Jangan pernah memberikan kode OTP ini kepada siapa pun termasuk staf ISPSYNC.",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
  welcome: {
    model_style: "executive",
    subject: "[ISPSYNC] Selamat Datang! Akun Cloud Anda Telah Aktif",
    header_title: "Selamat Datang di ISPSYNC",
    badge_text: "TRIAL ENTERPRISE AKTIF (14 HARI)",
    greeting_message: "Halo {name}, akun cloud enterprise ISPSYNC Anda untuk {company} telah berhasil diverifikasi dan aktif. Lingkungan terisolasi Anda telah dipersiapkan dengan 3 engine utama:",
    support_note: "Jika Anda memerlukan bantuan konfigurasi awal (RADIUS, WhatsApp Gateway, atau OLT bridge), silakan balas email ini atau hubungi tim teknis kami.",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
  forgot_password: {
    model_style: "executive",
    subject: "[ISPSYNC] Permintaan Atur Ulang Kata Sandi Akun",
    header_title: "Atur Ulang Kata Sandi",
    header_subtitle: "Pusat Keamanan & Autentikasi ISPSYNC",
    greeting: "Halo, {name}!",
    body_message: "Kami menerima permintaan pengaturan ulang kata sandi untuk akun ISPSYNC Anda ({email}). Klik tombol di bawah ini atau masukkan kode token verifikasi untuk membuat kata sandi baru:",
    action_button_text: "Atur Ulang Kata Sandi Sekarang",
    action_url: "{reset_link}",
    reset_code_label: "KODE TOKEN VERIFIKASI ALTERNATIF",
    expiry_notice: "Tautan dan kode token ini hanya berlaku selama 30 menit.",
    security_note: "Keamanan Akun: Jika Anda tidak meminta perubahan kata sandi, abaikan email ini. Akun Anda tetap aman dan sandi lama tidak berubah.",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
  subscription_expiring: {
    model_style: "alert",
    subject: "[PENTING] Masa Aktif Layanan ISPSYNC Berakhir dalam {days_left} Hari",
    header_title: "Peringatan Jatuh Tempo Layanan",
    header_subtitle: "Perpanjangan Masa Aktif Lisensi Cloud ISP",
    badge_text: "JATUH TEMPO DALAM {days_left} HARI",
    greeting: "Yth. Manajemen {company} ({name}),",
    body_message: "Kami informasikan bahwa masa aktif lisensi ISPSYNC Cloud untuk tenant Anda akan berakhir pada tanggal {expiry_date}. Agar operasional jaringan, billing RADIUS MikroTik, dan selfcare pelanggan tidak terganggu, mohon segera melakukan pembayaran perpanjangan.",
    invoice_box_title: "DETAIL TAGIHAN & PERPANJANGAN LISENSI",
    action_button_text: "Bayar Tagihan & Perpanjang Sekarang",
    action_url: "{payment_link}",
    consequence_notice: "Pemberitahuan Sistem: Apabila pembayaran belum diselesaikan hingga tanggal jatuh tempo, sistem otomatis beralih ke status Suspended (isolasi sementara).",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
  account_expired: {
    model_style: "alert",
    subject: "[ISOLASI] Masa Aktif Layanan ISPSYNC untuk {company} Telah Berakhir",
    header_title: "Layanan Ditangguhkan Sementara",
    header_subtitle: "Masa Berlaku Berlangganan Telah Habis",
    badge_text: "STATUS: SUSPENDED",
    greeting: "Yth. Manajemen {company} ({name}),",
    body_message: "Masa aktif langganan platform ISPSYNC Anda telah berakhir per tanggal {expiry_date}. Akses ke engine Billing Ledger, NOC Nexus, dan FiberGrid saat ini telah ditangguhkan secara otomatis oleh sistem.",
    action_button_text: "Aktifkan Kembali Layanan (Reaktivasi)",
    action_url: "{reactivation_link}",
    retention_notice: "Seluruh database pelanggan, data radius AAA, dan topologi jaringan ODP Anda tetap tersimpan dengan aman selama masa tenggang 30 hari.",
    support_note: "Untuk konfirmasi transfer instan atau permohonan masa tenggang teknis darurat, silakan hubungi tim Helpdesk di billing@ispsync.id atau WhatsApp tim support.",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
};
