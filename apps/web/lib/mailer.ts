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

export type EmailTemplates = {
  otp: {
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
    subject: string;
    header_title: string;
    badge_text: string;
    greeting_message: string;
    support_note: string;
    footer_copyright: string;
  };
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  otp: {
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
    subject: "[ISPSYNC] Selamat Datang! Akun Cloud Anda Telah Aktif",
    header_title: "Selamat Datang di ISPSYNC",
    badge_text: "TRIAL ENTERPRISE AKTIF (14 HARI)",
    greeting_message: "Halo {name}, akun cloud enterprise ISPSYNC Anda untuk {company} telah berhasil diverifikasi dan aktif. Lingkungan terisolasi Anda telah dipersiapkan dengan 3 engine utama:",
    support_note: "Jika Anda memerlukan bantuan konfigurasi awal (RADIUS, WhatsApp Gateway, atau OLT bridge), silakan balas email ini atau hubungi tim teknis kami.",
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
    const updated = {
      otp: { ...current.otp, ...(tpl.otp || {}) },
      welcome: { ...current.welcome, ...(tpl.welcome || {}) },
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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 28px 32px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${headerTitle}</h1>
        <p style="margin: 6px 0 0 0; color: #bae6fd; font-size: 13px; font-weight: 500;">${headerSubtitle}</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 700;">${greeting}</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          ${bodyMessage}
        </p>

        <!-- OTP Code Box -->
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

    <!-- Footer -->
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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: center;">
        <span style="display: inline-block; background-color: rgba(6, 182, 212, 0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 12px; text-transform: uppercase;">
          ${badgeText}
        </span>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">${headerTitle}</h1>
        <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">${company}</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          ${greetingMessage}
        </p>

        <!-- Engine Cards -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px;">
              <strong style="color: #0284c7; font-size: 13px; display: block; margin-bottom: 4px;">1. Billing &amp; RADIUS Ledger</strong>
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 8px;">Manajemen invoice, isolasi pembayaran, paket internet, dan sinkronisasi MikroTik AAA.</span>
              <a href="https://ledger.${subdomain}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #0284c7; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka Ledger &rarr;</a>
            </td>
          </tr>
          <tr><td style="height: 10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px;">
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

        <!-- SaaS Portal Member Access -->
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

    <!-- Footer -->
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
