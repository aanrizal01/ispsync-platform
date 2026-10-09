import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export function getDataDir(): string {
  const containerData = "/app/data";
  if (fs.existsSync(containerData)) return containerData;

  const webData = path.join(process.cwd(), "apps", "web", "data");
  if (fs.existsSync(webData)) return webData;

  const localData = path.join(process.cwd(), "data");
  if (!fs.existsSync(localData)) {
    fs.mkdirSync(localData, { recursive: true });
  }
  return localData;
}

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

export function getEmailTemplates(): EmailTemplates {
  const tplPath = path.join(getDataDir(), "email-templates.json");
  try {
    if (fs.existsSync(tplPath)) {
      const raw = fs.readFileSync(tplPath, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        otp: { ...DEFAULT_EMAIL_TEMPLATES.otp, ...(parsed.otp || {}) },
        welcome: { ...DEFAULT_EMAIL_TEMPLATES.welcome, ...(parsed.welcome || {}) },
        forgot_password: { ...DEFAULT_EMAIL_TEMPLATES.forgot_password, ...(parsed.forgot_password || {}) },
        subscription_expiring: { ...DEFAULT_EMAIL_TEMPLATES.subscription_expiring, ...(parsed.subscription_expiring || {}) },
        account_expired: { ...DEFAULT_EMAIL_TEMPLATES.account_expired, ...(parsed.account_expired || {}) },
      };
    }
  } catch (err) {
    console.error("Error reading email-templates.json:", err);
  }
  return DEFAULT_EMAIL_TEMPLATES;
}

export function saveEmailTemplates(tpl: Partial<EmailTemplates>): boolean {
  const tplPath = path.join(getDataDir(), "email-templates.json");
  try {
    const current = getEmailTemplates();
    const updated: EmailTemplates = {
      otp: { ...current.otp, ...(tpl.otp || {}) },
      welcome: { ...current.welcome, ...(tpl.welcome || {}) },
      forgot_password: { ...current.forgot_password, ...(tpl.forgot_password || {}) },
      subscription_expiring: { ...current.subscription_expiring, ...(tpl.subscription_expiring || {}) },
      account_expired: { ...current.account_expired, ...(tpl.account_expired || {}) },
    };
    fs.writeFileSync(tplPath, JSON.stringify(updated, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving email-templates.json:", err);
    return false;
  }
}

export function formatTemplate(text: string, vars: Record<string, string>): string {
  let res = text || "";
  for (const [k, v] of Object.entries(vars)) {
    res = res.replace(new RegExp(`{${k}}`, "g"), v);
  }
  return res;
}

export function getSmtpConfig() {
  const cfgPath = path.join(getDataDir(), "smtp-config.json");
  try {
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading smtp-config.json:", err);
  }

  // Fallback to process.env or defaults
  return {
    smtp_host: process.env.SMTP_HOST || "smtp.gmail.com",
    smtp_port: parseInt(process.env.SMTP_PORT || "587", 10),
    smtp_user: process.env.SMTP_USER || "cloud@ispsync.id",
    smtp_pass: process.env.SMTP_PASS || "",
    smtp_from: process.env.SMTP_FROM || "ISPSYNC Platform <cloud@ispsync.id>",
    provider: "google_workspace",
    is_active: true,
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const cfg = getSmtpConfig();
  const host = (cfg.smtp_host || "smtp.gmail.com").trim();
  const port = parseInt(cfg.smtp_port || "587", 10);
  const user = (cfg.smtp_user || "").trim();
  const pass = (cfg.smtp_pass || "").trim();
  const from = (cfg.smtp_from || `ISPSYNC Platform <${user}>`).trim();

  if (!user || !pass) {
    throw new Error("SMTP credentials belum dikonfigurasi di server.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
  });

  return await transporter.sendMail({
    from,
    to: to.trim(),
    subject,
    text: text || html.replace(/<[^>]+>/g, " "),
    html,
  });
}

// 1. SEND OTP EMAIL
export async function sendOtpEmail({
  to,
  name,
  otpCode,
}: {
  to: string;
  name: string;
  otpCode: string;
}) {
  const tpl = getEmailTemplates().otp;
  const vars = {
    name: name || "Rekan ISP",
    otp_code: otpCode,
  };

  const subject = formatTemplate(tpl.subject, vars);
  const headerTitle = formatTemplate(tpl.header_title, vars);
  const headerSubtitle = formatTemplate(tpl.header_subtitle, vars);
  const greeting = formatTemplate(tpl.greeting, vars);
  const bodyMessage = formatTemplate(tpl.body_message, vars);
  const otpBoxLabel = formatTemplate(tpl.otp_box_label, vars);
  const expiryNotice = formatTemplate(tpl.expiry_notice, vars);
  const ignoreNotice = formatTemplate(tpl.ignore_notice, vars);
  const securityNote = formatTemplate(tpl.security_note, vars);
  const footerCopyright = formatTemplate(tpl.footer_copyright, vars);
  const style = tpl.model_style || "executive";

  let headerHtml = "";
  if (style === "modern") {
    headerHtml = `
      <tr>
        <td style="padding: 28px 32px; background-color: #ffffff; border-top: 4px solid #0284c7; border-bottom: 1px solid #e2e8f0; text-align: left;">
          <h1 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${headerTitle}</h1>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">${headerSubtitle}</p>
        </td>
      </tr>
    `;
  } else if (style === "alert") {
    headerHtml = `
      <tr>
        <td style="padding: 24px 32px; background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); text-align: center;">
          <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;">VERIFIKASI SISTEM</span>
          <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">${headerTitle}</h1>
          <p style="margin: 4px 0 0 0; color: #e0f2fe; font-size: 12px;">${headerSubtitle}</p>
        </td>
      </tr>
    `;
  } else {
    // executive (default)
    headerHtml = `
      <tr>
        <td style="padding: 28px 32px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${headerTitle}</h1>
          <p style="margin: 6px 0 0 0; color: #bae6fd; font-size: 13px; font-weight: 500;">${headerSubtitle}</p>
        </td>
      </tr>
    `;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    ${headerHtml}
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 700;">${greeting}</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          ${bodyMessage}
        </p>

        <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">${otpBoxLabel}</span>
          <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0284c7; display: inline-block;">${otpCode}</span>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 8px;">${expiryNotice}</span>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
          ${ignoreNotice}
        </p>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          <p style="margin: 0 0 4px 0;"><strong>${securityNote}</strong></p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        ${footerCopyright}<br/>
        Layanan resmi otomatisasi ISP &middot; <a href="https://ispsync.id" style="color: #0284c7; text-decoration: none;">ispsync.id</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail({ to, subject, html });
}

// 2. SEND WELCOME EMAIL
export async function sendWelcomeEmail({
  to,
  name,
  company,
  subdomain,
}: {
  to: string;
  name: string;
  company: string;
  subdomain: string;
}) {
  const tpl = getEmailTemplates().welcome;
  const vars = {
    name: name || "Rekan ISP",
    company: company || "Perusahaan ISP",
    subdomain: subdomain || "tenant",
  };

  const subject = formatTemplate(tpl.subject, vars);
  const headerTitle = formatTemplate(tpl.header_title, vars);
  const badgeText = formatTemplate(tpl.badge_text, vars);
  const greetingMessage = formatTemplate(tpl.greeting_message, vars);
  const supportNote = formatTemplate(tpl.support_note, vars);
  const footerCopyright = formatTemplate(tpl.footer_copyright, vars);
  const style = tpl.model_style || "executive";

  let headerBg = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
  let badgeClass = "background-color: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);";
  if (style === "modern") {
    headerBg = "#ffffff; border-top: 4px solid #0284c7; border-bottom: 1px solid #e2e8f0;";
    badgeClass = "background-color: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;";
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 32px; background: ${headerBg}; text-align: center;">
        <span style="display: inline-block; ${badgeClass} font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; text-transform: uppercase;">
          ${badgeText}
        </span>
        <h1 style="margin: 0; color: ${style === "modern" ? "#0f172a" : "#ffffff"}; font-size: 24px; font-weight: 800;">${headerTitle}</h1>
        <p style="margin: 6px 0 0 0; color: ${style === "modern" ? "#64748b" : "#94a3b8"}; font-size: 13px;">${company}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          ${greetingMessage}
        </p>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <strong style="color: #0284c7; font-size: 13px; display: block; margin-bottom: 4px;">1. Billing &amp; RADIUS Ledger</strong>
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 8px;">Manajemen invoice, isolasi pembayaran, paket internet, dan sinkronisasi MikroTik AAA.</span>
              <a href="https://ledger.${subdomain}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #0284c7; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka Ledger &rarr;</a>
            </td>
          </tr>
          <tr><td style="height: 10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <strong style="color: #4f46e5; font-size: 13px; display: block; margin-bottom: 4px;">2. NOC &amp; Customer Portal Nexus</strong>
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 8px;">Selfcare pelanggan, portal aduan tiket, notifikasi WhatsApp Gateway, dan monitoring.</span>
              <a href="https://nexus.${subdomain}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #4f46e5; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka Nexus &rarr;</a>
            </td>
          </tr>
          <tr><td style="height: 10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <strong style="color: #059669; font-size: 13px; display: block; margin-bottom: 4px;">3. FTTX OLT &amp; CWMP FiberGrid</strong>
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 8px;">Auto-provisioning ONT TR-069, peta ODC/ODP interaktif, redaman fiber optic live.</span>
              <a href="https://fibergrid.${subdomain}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #059669; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka FiberGrid &rarr;</a>
            </td>
          </tr>
        </table>

        <div style="background-color: #f1f5f9; border-radius: 10px; padding: 16px; margin: 24px 0; font-size: 12px; color: #475569;">
          <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Portal Manajemen SaaS Member:</strong>
          <span style="display: block; margin-bottom: 4px;">Kelola langganan, DNS zone kustom, tiket bantuan, dan profil perusahaan Anda melalui:</span>
          <a href="https://member.ispsync.id" style="color: #0284c7; font-weight: bold; text-decoration: underline;">https://member.ispsync.id</a>
        </div>

        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
          ${supportNote}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        ${footerCopyright}<br/>
        Layanan resmi otomatisasi ISP &middot; <a href="https://ispsync.id" style="color: #0284c7; text-decoration: none;">ispsync.id</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail({ to, subject, html });
}

// 3. SEND FORGOT PASSWORD EMAIL
export async function sendForgotPasswordEmail({
  to,
  name,
  resetLink,
  resetToken,
}: {
  to: string;
  name: string;
  resetLink?: string;
  resetToken?: string;
}) {
  const tpl = getEmailTemplates().forgot_password;
  const link = resetLink || `https://member.ispsync.id/member/reset-password?token=${resetToken || "sample-token"}`;
  const vars = {
    name: name || "Pengguna ISPSYNC",
    email: to,
    reset_link: link,
    token: resetToken || "839401",
  };

  const subject = formatTemplate(tpl.subject, vars);
  const headerTitle = formatTemplate(tpl.header_title, vars);
  const headerSubtitle = formatTemplate(tpl.header_subtitle, vars);
  const greeting = formatTemplate(tpl.greeting, vars);
  const bodyMessage = formatTemplate(tpl.body_message, vars);
  const actionButtonText = formatTemplate(tpl.action_button_text, vars);
  const resetCodeLabel = formatTemplate(tpl.reset_code_label, vars);
  const expiryNotice = formatTemplate(tpl.expiry_notice, vars);
  const securityNote = formatTemplate(tpl.security_note, vars);
  const footerCopyright = formatTemplate(tpl.footer_copyright, vars);
  const style = tpl.model_style || "executive";

  let headerBg = "linear-gradient(135deg, #1e293b 0%, #334155 100%)";
  if (style === "modern") {
    headerBg = "#ffffff; border-top: 4px solid #3b82f6; border-bottom: 1px solid #e2e8f0;";
  } else if (style === "alert") {
    headerBg = "linear-gradient(135deg, #475569 0%, #1e293b 100%)";
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 28px 32px; background: ${headerBg}; text-align: center;">
        <h1 style="margin: 0; color: ${style === "modern" ? "#0f172a" : "#ffffff"}; font-size: 24px; font-weight: 800;">${headerTitle}</h1>
        <p style="margin: 6px 0 0 0; color: ${style === "modern" ? "#64748b" : "#94a3b8"}; font-size: 13px;">${headerSubtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 700;">${greeting}</h2>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          ${bodyMessage}
        </p>

        <!-- Primary Reset Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
            ${actionButtonText} &rarr;
          </a>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 10px;">${expiryNotice}</span>
        </div>

        <!-- Token Box -->
        ${
          resetToken
            ? `
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">${resetCodeLabel}</span>
          <span style="font-family: monospace; font-size: 26px; font-weight: 800; letter-spacing: 6px; color: #0284c7;">${resetToken}</span>
        </div>
        `
            : ""
        }

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          <p style="margin: 0;"><strong>${securityNote}</strong></p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        ${footerCopyright}<br/>
        Layanan resmi otomatisasi ISP &middot; <a href="https://ispsync.id" style="color: #0284c7; text-decoration: none;">ispsync.id</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail({ to, subject, html });
}

// 4. SEND SUBSCRIPTION EXPIRING EMAIL
export async function sendSubscriptionExpiringEmail({
  to,
  name,
  company,
  expiryDate,
  daysLeft,
  paymentLink,
}: {
  to: string;
  name: string;
  company: string;
  expiryDate: string;
  daysLeft: number;
  paymentLink?: string;
}) {
  const tpl = getEmailTemplates().subscription_expiring;
  const link = paymentLink || "https://member.ispsync.id/member/invoices";
  const vars = {
    name: name || "Pengelola ISP",
    company: company || "Perusahaan ISP",
    expiry_date: expiryDate || "31 Oktober 2026",
    days_left: String(daysLeft || 3),
    payment_link: link,
  };

  const subject = formatTemplate(tpl.subject, vars);
  const headerTitle = formatTemplate(tpl.header_title, vars);
  const headerSubtitle = formatTemplate(tpl.header_subtitle, vars);
  const badgeText = formatTemplate(tpl.badge_text, vars);
  const greeting = formatTemplate(tpl.greeting, vars);
  const bodyMessage = formatTemplate(tpl.body_message, vars);
  const invoiceBoxTitle = formatTemplate(tpl.invoice_box_title, vars);
  const actionButtonText = formatTemplate(tpl.action_button_text, vars);
  const consequenceNotice = formatTemplate(tpl.consequence_notice, vars);
  const footerCopyright = formatTemplate(tpl.footer_copyright, vars);
  const style = tpl.model_style || "alert";

  let headerBg = "linear-gradient(135deg, #d97706 0%, #b45309 100%)";
  let badgeStyle = "background-color: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid rgba(255,255,255,0.4);";
  if (style === "modern") {
    headerBg = "#ffffff; border-top: 4px solid #f59e0b; border-bottom: 1px solid #e2e8f0;";
    badgeStyle = "background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a;";
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 28px 32px; background: ${headerBg}; text-align: center;">
        <span style="display: inline-block; ${badgeStyle} font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 8px;">
          ${badgeText}
        </span>
        <h1 style="margin: 0; color: ${style === "modern" ? "#0f172a" : "#ffffff"}; font-size: 22px; font-weight: 800;">${headerTitle}</h1>
        <p style="margin: 4px 0 0 0; color: ${style === "modern" ? "#64748b" : "#fef3c7"}; font-size: 13px;">${headerSubtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: 700;">${greeting}</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          ${bodyMessage}
        </p>

        <!-- Invoice Details Box -->
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <span style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">${invoiceBoxTitle}</span>
          <table width="100%" style="font-size: 13px; color: #78350f;">
            <tr>
              <td style="padding: 4px 0; color: #92400e;">Tenant:</td>
              <td style="padding: 4px 0; font-weight: bold; text-align: right;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #92400e;">Tanggal Jatuh Tempo:</td>
              <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #b91c1c;">${vars.expiry_date}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #92400e;">Sisa Waktu:</td>
              <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #b45309;">${vars.days_left} Hari Lagi</td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 26px 0;">
          <a href="${link}" style="display: inline-block; background-color: #d97706; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(217,119,6,0.25);">
            ${actionButtonText} &rarr;
          </a>
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px;">
          ${consequenceNotice}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        ${footerCopyright}<br/>
        Layanan resmi otomatisasi ISP &middot; <a href="https://ispsync.id" style="color: #0284c7; text-decoration: none;">ispsync.id</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail({ to, subject, html });
}

// 5. SEND ACCOUNT EXPIRED (SUSPENDED) EMAIL
export async function sendAccountExpiredEmail({
  to,
  name,
  company,
  expiryDate,
  reactivationLink,
}: {
  to: string;
  name: string;
  company: string;
  expiryDate: string;
  reactivationLink?: string;
}) {
  const tpl = getEmailTemplates().account_expired;
  const link = reactivationLink || "https://member.ispsync.id/member/invoices";
  const vars = {
    name: name || "Pengelola ISP",
    company: company || "Perusahaan ISP",
    expiry_date: expiryDate || "Hari Ini",
    reactivation_link: link,
  };

  const subject = formatTemplate(tpl.subject, vars);
  const headerTitle = formatTemplate(tpl.header_title, vars);
  const headerSubtitle = formatTemplate(tpl.header_subtitle, vars);
  const badgeText = formatTemplate(tpl.badge_text, vars);
  const greeting = formatTemplate(tpl.greeting, vars);
  const bodyMessage = formatTemplate(tpl.body_message, vars);
  const actionButtonText = formatTemplate(tpl.action_button_text, vars);
  const retentionNotice = formatTemplate(tpl.retention_notice, vars);
  const supportNote = formatTemplate(tpl.support_note, vars);
  const footerCopyright = formatTemplate(tpl.footer_copyright, vars);
  const style = tpl.model_style || "alert";

  let headerBg = "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)";
  let badgeStyle = "background-color: rgba(255,255,255,0.25); color: #ffffff; border: 1px solid rgba(255,255,255,0.4);";
  if (style === "modern") {
    headerBg = "#ffffff; border-top: 4px solid #ef4444; border-bottom: 1px solid #e2e8f0;";
    badgeStyle = "background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;";
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 28px 32px; background: ${headerBg}; text-align: center;">
        <span style="display: inline-block; ${badgeStyle} font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 8px;">
          ${badgeText}
        </span>
        <h1 style="margin: 0; color: ${style === "modern" ? "#0f172a" : "#ffffff"}; font-size: 22px; font-weight: 800;">${headerTitle}</h1>
        <p style="margin: 4px 0 0 0; color: ${style === "modern" ? "#64748b" : "#fecaca"}; font-size: 13px;">${headerSubtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: 700;">${greeting}</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          ${bodyMessage}
        </p>

        <!-- Reactivation Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${link}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(220,38,38,0.25);">
            ${actionButtonText} &rarr;
          </a>
        </div>

        <div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #475569; margin: 20px 0;">
          <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Perlindungan Database &amp; Data Jaringan:</strong>
          ${retentionNotice}
        </div>

        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
          ${supportNote}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        ${footerCopyright}<br/>
        Layanan resmi otomatisasi ISP &middot; <a href="https://ispsync.id" style="color: #0284c7; text-decoration: none;">ispsync.id</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail({ to, subject, html });
}
