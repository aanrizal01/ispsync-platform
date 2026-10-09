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

import {
  TemplateModelStyle,
  EmailTemplates,
  DEFAULT_EMAIL_TEMPLATES,
} from "./email-types";

export type { TemplateModelStyle, EmailTemplates };
export { DEFAULT_EMAIL_TEMPLATES };

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
    res = res.split(`{${k}}`).join(v ?? "");
  }
  return res;
}

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Substitute variables, then HTML-escape the whole result (template text + user input). */
function fmtHtml(text: string, vars: Record<string, string>): string {
  return esc(formatTemplate(text, vars));
}

/** Subjects are plain text: strip CR/LF to prevent header injection. */
function formatSubject(text: string, vars: Record<string, string>): string {
  return formatTemplate(text, vars).replace(/[\r\n]+/g, " ").trim();
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
}, override?: Partial<EmailTemplates>) {
  const tpl = { ...getEmailTemplates().otp, ...((override?.otp as any) || {}) };
  const vars = {
    name: name || "Rekan ISP",
    otp_code: otpCode,
  };

  const subject = formatSubject(tpl.subject, vars);
  const headerTitle = fmtHtml(tpl.header_title, vars);
  const headerSubtitle = fmtHtml(tpl.header_subtitle, vars);
  const greeting = fmtHtml(tpl.greeting, vars);
  const bodyMessage = fmtHtml(tpl.body_message, vars);
  const otpBoxLabel = fmtHtml(tpl.otp_box_label, vars);
  const expiryNotice = fmtHtml(tpl.expiry_notice, vars);
  const ignoreNotice = fmtHtml(tpl.ignore_notice, vars);
  const securityNote = fmtHtml(tpl.security_note, vars);
  const footerCopyright = fmtHtml(tpl.footer_copyright, vars);
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
          <span style="font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0284c7; display: inline-block;">${esc(otpCode)}</span>
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
}, override?: Partial<EmailTemplates>) {
  const tpl = { ...getEmailTemplates().welcome, ...((override?.welcome as any) || {}) };
  const vars = {
    name: name || "Rekan ISP",
    company: company || "Perusahaan ISP",
    subdomain: subdomain || "tenant",
  };

  const subject = formatSubject(tpl.subject, vars);
  const headerTitle = fmtHtml(tpl.header_title, vars);
  const badgeText = fmtHtml(tpl.badge_text, vars);
  const greetingMessage = fmtHtml(tpl.greeting_message, vars);
  const supportNote = fmtHtml(tpl.support_note, vars);
  const footerCopyright = fmtHtml(tpl.footer_copyright, vars);
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
        <p style="margin: 6px 0 0 0; color: ${style === "modern" ? "#64748b" : "#94a3b8"}; font-size: 13px;">${esc(company)}</p>
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
              <a href="https://ledger.${esc(String(subdomain).replace(/[^a-z0-9-]/gi, ""))}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #0284c7; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka Ledger &rarr;</a>
            </td>
          </tr>
          <tr><td style="height: 10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <strong style="color: #4f46e5; font-size: 13px; display: block; margin-bottom: 4px;">2. NOC &amp; Customer Portal Nexus</strong>
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 8px;">Selfcare pelanggan, portal aduan tiket, notifikasi WhatsApp Gateway, dan monitoring.</span>
              <a href="https://nexus.${esc(String(subdomain).replace(/[^a-z0-9-]/gi, ""))}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #4f46e5; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka Nexus &rarr;</a>
            </td>
          </tr>
          <tr><td style="height: 10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <strong style="color: #059669; font-size: 13px; display: block; margin-bottom: 4px;">3. FTTX OLT &amp; CWMP FiberGrid</strong>
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 8px;">Auto-provisioning ONT TR-069, peta ODC/ODP interaktif, redaman fiber optic live.</span>
              <a href="https://fibergrid.${esc(String(subdomain).replace(/[^a-z0-9-]/gi, ""))}.ispsync.id" style="display: inline-block; font-size: 12px; color: #ffffff; background-color: #059669; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600;">Buka FiberGrid &rarr;</a>
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
}, override?: Partial<EmailTemplates>) {
  const tpl = { ...getEmailTemplates().forgot_password, ...((override?.forgot_password as any) || {}) };
  const link = resetLink || `https://member.ispsync.id/member/reset-password?token=${resetToken || "sample-token"}`;
  const vars = {
    name: name || "Pengguna ISPSYNC",
    email: to,
    reset_link: link,
    token: resetToken || "839401",
  };

  const subject = formatSubject(tpl.subject, vars);
  const headerTitle = fmtHtml(tpl.header_title, vars);
  const headerSubtitle = fmtHtml(tpl.header_subtitle, vars);
  const greeting = fmtHtml(tpl.greeting, vars);
  const bodyMessage = fmtHtml(tpl.body_message, vars);
  const actionButtonText = fmtHtml(tpl.action_button_text, vars);
  const resetCodeLabel = fmtHtml(tpl.reset_code_label, vars);
  const expiryNotice = fmtHtml(tpl.expiry_notice, vars);
  const securityNote = fmtHtml(tpl.security_note, vars);
  const footerCopyright = fmtHtml(tpl.footer_copyright, vars);
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
          <a href="${esc(link)}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
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
          <span style="font-family: monospace; font-size: 26px; font-weight: 800; letter-spacing: 6px; color: #0284c7;">${esc(resetToken)}</span>
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
}, override?: Partial<EmailTemplates>) {
  const tpl = { ...getEmailTemplates().subscription_expiring, ...((override?.subscription_expiring as any) || {}) };
  const link = paymentLink || "https://member.ispsync.id/member/invoices";
  const vars = {
    name: name || "Pengelola ISP",
    company: company || "Perusahaan ISP",
    expiry_date: expiryDate || "31 Oktober 2026",
    days_left: String(daysLeft || 3),
    payment_link: link,
  };

  const subject = formatSubject(tpl.subject, vars);
  const headerTitle = fmtHtml(tpl.header_title, vars);
  const headerSubtitle = fmtHtml(tpl.header_subtitle, vars);
  const badgeText = fmtHtml(tpl.badge_text, vars);
  const greeting = fmtHtml(tpl.greeting, vars);
  const bodyMessage = fmtHtml(tpl.body_message, vars);
  const invoiceBoxTitle = fmtHtml(tpl.invoice_box_title, vars);
  const actionButtonText = fmtHtml(tpl.action_button_text, vars);
  const consequenceNotice = fmtHtml(tpl.consequence_notice, vars);
  const footerCopyright = fmtHtml(tpl.footer_copyright, vars);
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
              <td style="padding: 4px 0; font-weight: bold; text-align: right;">${esc(company)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #92400e;">Tanggal Jatuh Tempo:</td>
              <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #b91c1c;">${esc(vars.expiry_date)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #92400e;">Sisa Waktu:</td>
              <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #b45309;">${esc(vars.days_left)} Hari Lagi</td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 26px 0;">
          <a href="${esc(link)}" style="display: inline-block; background-color: #d97706; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(217,119,6,0.25);">
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
}, override?: Partial<EmailTemplates>) {
  const tpl = { ...getEmailTemplates().account_expired, ...((override?.account_expired as any) || {}) };
  const link = reactivationLink || "https://member.ispsync.id/member/invoices";
  const vars = {
    name: name || "Pengelola ISP",
    company: company || "Perusahaan ISP",
    expiry_date: expiryDate || "Hari Ini",
    reactivation_link: link,
  };

  const subject = formatSubject(tpl.subject, vars);
  const headerTitle = fmtHtml(tpl.header_title, vars);
  const headerSubtitle = fmtHtml(tpl.header_subtitle, vars);
  const badgeText = fmtHtml(tpl.badge_text, vars);
  const greeting = fmtHtml(tpl.greeting, vars);
  const bodyMessage = fmtHtml(tpl.body_message, vars);
  const actionButtonText = fmtHtml(tpl.action_button_text, vars);
  const retentionNotice = fmtHtml(tpl.retention_notice, vars);
  const supportNote = fmtHtml(tpl.support_note, vars);
  const footerCopyright = fmtHtml(tpl.footer_copyright, vars);
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
          <a href="${esc(link)}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(220,38,38,0.25);">
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
