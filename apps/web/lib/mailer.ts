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
  const subject = `[ISPSYNC] Kode Verifikasi Pendaftaran: ${otpCode}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kode Verifikasi Pendaftaran</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 28px 32px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ISPSYNC Platform</h1>
        <p style="margin: 6px 0 0 0; color: #bae6fd; font-size: 13px; font-weight: 500;">Carrier-Grade ISP Automation &amp; Network Ledger</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 700;">Halo, ${name || "Rekan ISP"}!</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          Terima kasih telah mendaftar di <strong>Platform ISPSYNC</strong>. Gunakan kode verifikasi (OTP) berikut untuk menyelesaikan pendaftaran akun SaaS Anda:
        </p>

        <!-- OTP Code Box -->
        <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Kode Verifikasi OTP Anda</span>
          <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0284c7; display: inline-block;">${otpCode}</span>
          <span style="display: block; font-size: 12px; color: #64748b; margin-top: 8px;">Berlaku selama 15 menit</span>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
          Jika Anda tidak merasa melakukan pendaftaran akun di platform ISPSYNC, Anda dapat mengabaikan email ini dengan aman.
        </p>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          <p style="margin: 0 0 4px 0;"><strong>Keamanan Akun:</strong> Jangan pernah memberikan kode OTP ini kepada siapa pun termasuk staf ISPSYNC.</p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 ISPSYNC Platform &mdash; PT. Inovasi Sistem Pintar. Seluruh hak cipta dilindungi undang-undang.<br/>
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
  const subject = `[ISPSYNC] Selamat Datang! Akun Cloud SaaS Anda Telah Aktif`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Akun ISPSYNC Anda Telah Aktif</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: center;">
        <span style="display: inline-block; background-color: rgba(6, 182, 212, 0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 12px; text-transform: uppercase;">
          TRIAL ENTERPRISE AKTIF (14 HARI)
        </span>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Selamat Datang di ISPSYNC</h1>
        <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">${company}</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          Halo <strong>${name}</strong>, akun cloud enterprise ISPSYNC Anda telah berhasil diverifikasi dan aktif. Lingkungan SaaS terisolasi Anda telah dipersiapkan dengan 3 engine utama:
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
          Jika Anda memerlukan bantuan konfigurasi awal (RADIUS, WhatsApp Gateway, atau OLT bridge), silakan balas email ini atau hubungi tim teknis kami.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 ISPSYNC Platform &mdash; PT. Inovasi Sistem Pintar. Seluruh hak cipta dilindungi undang-undang.<br/>
        Layanan resmi otomatisasi ISP &middot; <a href="https://ispsync.id" style="color: #0284c7; text-decoration: none;">ispsync.id</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail({ to, subject, html });
}
