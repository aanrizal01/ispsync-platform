import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import {
  getEmailTemplates,
  saveEmailTemplates,
  DEFAULT_EMAIL_TEMPLATES,
  sendOtpEmail,
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendSubscriptionExpiringEmail,
  sendAccountExpiredEmail,
  type EmailTemplates,
} from "@/lib/mailer";
import { requireMember } from "@/lib/member-auth";

function getDataDir(): string {
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

const SMTP_CONFIG_PATH = path.join(getDataDir(), "smtp-config.json");
const ENV_PROD_PATH = fs.existsSync("/app/.env.production")
  ? "/app/.env.production"
  : path.join(process.cwd(), "..", "..", ".env.production");

function readEnvFile(): { [k: string]: string } {
  try {
    if (fs.existsSync(ENV_PROD_PATH)) {
      const content = fs.readFileSync(ENV_PROD_PATH, "utf-8");
      const lines = content.split("\n");
      const env: { [k: string]: string } = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.slice(1, -1);
          }
          env[key] = val;
        }
      }
      return env;
    }
  } catch (err) {
    console.error("Error reading env file:", err);
  }
  return {};
}

function updateEnvFile(newValues: { [k: string]: string }): boolean {
  try {
    if (!fs.existsSync(ENV_PROD_PATH)) return false;
    let content = fs.readFileSync(ENV_PROD_PATH, "utf-8");
    for (const [key, val] of Object.entries(newValues)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      const formattedVal = val.includes(" ") ? `'${val}'` : val;
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${formattedVal}`);
      } else {
        content += `\n${key}=${formattedVal}`;
      }
    }
    fs.writeFileSync(ENV_PROD_PATH, content, "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to update env file:", err);
    return false;
  }
}

function getSmtpConfig() {
  try {
    if (fs.existsSync(SMTP_CONFIG_PATH)) {
      const raw = fs.readFileSync(SMTP_CONFIG_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading smtp-config.json:", err);
  }

  // Fallback to .env values
  const env = readEnvFile();
  const defaultConfig = {
    smtp_host: env.SMTP_HOST || "smtp.gmail.com",
    smtp_port: parseInt(env.SMTP_PORT || "587", 10),
    smtp_user: env.SMTP_USER || "admin@ispsync.id",
    smtp_pass: env.SMTP_PASS || "",
    smtp_from: env.SMTP_FROM || "ISPSYNC Platform <admin@ispsync.id>",
    provider: env.SMTP_HOST?.includes("gmail") ? "google_workspace" : "custom",
    is_active: Boolean(env.SMTP_USER && env.SMTP_PASS),
    last_tested_at: null,
    last_test_status: null,
    last_test_message: null
  };

  saveSmtpConfig(defaultConfig);
  return defaultConfig;
}

function saveSmtpConfig(cfg: any): boolean {
  try {
    fs.writeFileSync(SMTP_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write smtp-config.json:", err);
    return false;
  }
}

function maskSmtp(cfg: any) {
  const { smtp_pass, ...rest } = cfg || {};
  return { ...rest, smtp_pass: "", has_password: Boolean(smtp_pass) };
}

export async function GET(req: NextRequest) {
  const auth = requireMember(req, ["SUPERADMIN"]);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  try {
    const smtp = getSmtpConfig();
    const emailTemplates = getEmailTemplates();
    return NextResponse.json({
      success: true,
      smtp: maskSmtp(smtp),
      email_templates: emailTemplates,
      default_templates: DEFAULT_EMAIL_TEMPLATES,
      max_saas_tenants: parseInt(process.env.MAX_SAAS_TENANTS || readEnvFile()["MAX_SAAS_TENANTS"] || "50", 10),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireMember(req, ["SUPERADMIN"]);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const { action } = body;

    // 1. UPDATE SMTP SETTINGS
    if (action === "update_smtp") {
      let { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, provider, is_active } = body;

      if (!smtp_host || !smtp_user) {
        return NextResponse.json({
          success: false,
          error: "Host SMTP dan Username / Email SMTP wajib diisi."
        }, { status: 400 });
      }

      const current = getSmtpConfig();
      const newPass = typeof smtp_pass === "string" ? smtp_pass.trim() : "";
      const updated = {
        ...current,
        smtp_host: smtp_host.trim(),
        smtp_port: parseInt(smtp_port, 10) || 587,
        smtp_user: smtp_user.trim(),
        // Empty field = keep the stored password (it is never sent to the browser)
        smtp_pass: newPass || current.smtp_pass,
        smtp_from: smtp_from ? smtp_from.trim() : `ISPSYNC Platform <${smtp_user.trim()}>`,
        provider: provider || (smtp_host.includes("gmail") ? "google_workspace" : "custom"),
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        updated_at: new Date().toISOString(),
        updated_by: auth.member.email,
      };

      saveSmtpConfig(updated);

      // Sync to .env.production file on host
      updateEnvFile({
        SMTP_HOST: updated.smtp_host,
        SMTP_PORT: String(updated.smtp_port),
        SMTP_USER: updated.smtp_user,
        SMTP_PASS: updated.smtp_pass,
        SMTP_FROM: updated.smtp_from
      });

      return NextResponse.json({
        success: true,
        message: "Pengaturan SMTP Platform berhasil disimpan dan disinkronkan ke server.",
        smtp: maskSmtp(updated)
      });
    }

    // 1b. UPDATE SAAS CONFIG
    if (action === "update_saas") {
      const { max_saas_tenants } = body;
      const num = parseInt(max_saas_tenants, 10) || 50;
      updateEnvFile({
        MAX_SAAS_TENANTS: String(num)
      });
      return NextResponse.json({
        success: true,
        message: "Konfigurasi kuota SaaS berhasil disimpan dan disinkronkan ke server.",
        max_saas_tenants: num
      });
    }

    // 2. TEST SEND EMAIL
    if (action === "test_email") {
      const { to_email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = body;

      if (!to_email || !to_email.includes("@")) {
        return NextResponse.json({
          success: false,
          error: "Alamat email tujuan pengujian wajib diisi dan valid."
        }, { status: 400 });
      }

      const cfg = getSmtpConfig();
      const host = (smtp_host || cfg.smtp_host || "").trim();
      const port = parseInt(smtp_port || cfg.smtp_port || "587", 10);
      const user = (smtp_user || cfg.smtp_user || "").trim();
      const typedPass = typeof smtp_pass === "string" ? smtp_pass.trim() : "";
      // Never forward the stored password to a host/user other than the saved one
      if (!typedPass && (host !== (cfg.smtp_host || "").trim() || user !== (cfg.smtp_user || "").trim())) {
        return NextResponse.json({
          success: false,
          error: "Host atau username berbeda dari yang tersimpan. Isi kolom password untuk menguji kredensial baru."
        }, { status: 400 });
      }
      const pass = typedPass || (cfg.smtp_pass || "").trim();
      const from = (smtp_from || cfg.smtp_from || `ISPSYNC Platform <${user}>`).trim();


      if (!host || !user || !pass) {
        return NextResponse.json({
          success: false,
          error: "Host, Username, dan Password SMTP wajib terisi untuk mengirim email pengujian."
        }, { status: 400 });
      }

      const startTime = Date.now();
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 12000
        });

        // 1. Verify handshake
        await transporter.verify();

        // 2. Send email
        const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        const info = await transporter.sendMail({
          from,
          to: to_email.trim(),
          subject: "[TEST] Verifikasi Pengaturan SMTP Platform ISPSYNC",
          text: `Halo,\n\nIni adalah email uji coba dari Platform ISPSYNC.\n\nKonfigurasi SMTP berhasil terhubung ke server ${host}:${port}.\n\nWaktu pengiriman: ${nowStr} WIB\n\nSalam,\nTim Platform ISPSYNC`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">Platform ISPSYNC</h2>
                <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 6px; border: 1px solid #a7f3d0;">
                  UJI KONEKSI SMTP BERHASIL
                </span>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px; font-size: 13px; color: #334155;">
                <p style="margin: 0 0 10px 0;">Halo Administrator,</p>
                <p style="margin: 0 0 14px 0;">Email ini membuktikan bahwa konfigurasi <strong>Mail Server SMTP Platform ISPSYNC</strong> Anda telah berhasil terhubung dan dapat mengirimkan email secara normal.</p>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 130px;">Host SMTP:</td>
                    <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0284c7;">${host}:${port}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Username Pengirim:</td>
                    <td style="padding: 4px 0; font-family: monospace; color: #334155;">${user}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Waktu Pengiriman:</td>
                    <td style="padding: 4px 0; color: #334155;">${nowStr} WIB</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                &copy; 2026 ISPSYNC Platform &mdash; PT. Inovasi Sistem Pintar. Seluruh hak cipta dilindungi undang-undang.
              </div>
            </div>
          `
        });

        const latencyMs = Date.now() - startTime;

        // Record successful test
        cfg.last_tested_at = new Date().toISOString();
        cfg.last_test_status = "SUCCESS";
        cfg.last_test_message = `Terkirim ke ${to_email} (${latencyMs}ms)`;
        saveSmtpConfig(cfg);

        return NextResponse.json({
          success: true,
          latencyMs,
          messageId: info.messageId,
          message: `Email percobaan berhasil dikirim ke ${to_email} dalam ${latencyMs}ms!`
        });
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        let userFriendlyMsg = err.message || "Gagal menghubungkan ke server SMTP.";

        if (err.message && err.message.includes("535-5.7.8")) {
          userFriendlyMsg = "Autentikasi gagal (535-5.7.8). Untuk Google Workspace/Gmail, wajib gunakan 'Sandi Aplikasi' (Google App Password 16 karakter), bukan password akun biasa.";
        } else if (err.code === "ETIMEDOUT" || err.message.includes("timeout")) {
          userFriendlyMsg = `Koneksi timeout ke ${host}:${port}. Pastikan port tidak diblokir firewall (gunakan port 587 atau 465).`;
        }

        cfg.last_tested_at = new Date().toISOString();
        cfg.last_test_status = "FAILED";
        cfg.last_test_message = userFriendlyMsg;
        saveSmtpConfig(cfg);

        return NextResponse.json({
          success: false,
          latencyMs,
          error: userFriendlyMsg
        }, { status: 400 });
      }
    }

    // 3. SAVE EMAIL TEMPLATES
    if (action === "save_email_templates") {
      const { templates } = body;
      if (!templates || typeof templates !== "object") {
        return NextResponse.json({ success: false, error: "Format data template email tidak valid." }, { status: 400 });
      }
      const ok = saveEmailTemplates(templates);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Gagal menyimpan berkas template email ke sistem." }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: "Template email berhasil disimpan dan diterapkan pada sistem.",
        email_templates: getEmailTemplates()
      });
    }

    // 4. RESET EMAIL TEMPLATES TO DEFAULT
    if (action === "reset_email_templates") {
      const { template_type } = body;
      let current = getEmailTemplates();
      if (template_type === "otp") {
        current.otp = { ...DEFAULT_EMAIL_TEMPLATES.otp };
      } else if (template_type === "welcome") {
        current.welcome = { ...DEFAULT_EMAIL_TEMPLATES.welcome };
      } else if (template_type === "forgot_password") {
        current.forgot_password = { ...DEFAULT_EMAIL_TEMPLATES.forgot_password };
      } else if (template_type === "subscription_expiring") {
        current.subscription_expiring = { ...DEFAULT_EMAIL_TEMPLATES.subscription_expiring };
      } else if (template_type === "account_expired") {
        current.account_expired = { ...DEFAULT_EMAIL_TEMPLATES.account_expired };
      } else {
        current = {
          otp: { ...DEFAULT_EMAIL_TEMPLATES.otp },
          welcome: { ...DEFAULT_EMAIL_TEMPLATES.welcome },
          forgot_password: { ...DEFAULT_EMAIL_TEMPLATES.forgot_password },
          subscription_expiring: { ...DEFAULT_EMAIL_TEMPLATES.subscription_expiring },
          account_expired: { ...DEFAULT_EMAIL_TEMPLATES.account_expired },
        };
      }
      saveEmailTemplates(current);
      return NextResponse.json({
        success: true,
        message: template_type
          ? `Template ${template_type.toUpperCase()} berhasil dikembalikan ke format standar.`
          : "Semua template email berhasil dikembalikan ke format standar sistem.",
        email_templates: getEmailTemplates()
      });
    }

    // 5. TEST PREVIEW EMAIL WITH TEMPLATE
    if (action === "test_template_email") {
      const { template_type, to_email, templates } = body;
      if (!to_email || !to_email.includes("@")) {
        return NextResponse.json({ success: false, error: "Alamat email tujuan pengujian wajib valid." }, { status: 400 });
      }

      // Render the unsaved draft for this test only; never persist it here.
      const draft: Partial<EmailTemplates> | undefined =
        templates && typeof templates === "object" ? templates : undefined;

      const cfg = getSmtpConfig();
      if (!cfg.smtp_user || !cfg.smtp_pass) {
        return NextResponse.json({
          success: false,
          error: "Server SMTP belum dikonfigurasi. Atur kredensial SMTP terlebih dahulu di tab Pengaturan SMTP."
        }, { status: 400 });
      }

      try {
        if (template_type === "otp") {
          await sendOtpEmail({
            to: to_email.trim(),
            name: "Administrator ISP (Pratinjau)",
            otpCode: "849201"
          }, draft);
          return NextResponse.json({
            success: true,
            message: `Email pratinjau OTP berhasil dikirim ke ${to_email}!`
          });
        } else if (template_type === "welcome") {
          await sendWelcomeEmail({
            to: to_email.trim(),
            name: "Administrator ISP (Pratinjau)",
            company: "PT Solusi Jaringan Nusantara",
            subdomain: "demo"
          }, draft);
          return NextResponse.json({
            success: true,
            message: `Email pratinjau Sambutan & Onboarding berhasil dikirim ke ${to_email}!`
          });
        } else if (template_type === "forgot_password") {
          await sendForgotPasswordEmail({
            to: to_email.trim(),
            name: "Administrator ISP (Pratinjau)",
            resetLink: "https://member.ispsync.id/member/reset-password?token=sample-reset-token-99",
            resetToken: "482019"
          }, draft);
          return NextResponse.json({
            success: true,
            message: `Email pratinjau Reset Kata Sandi berhasil dikirim ke ${to_email}!`
          });
        } else if (template_type === "subscription_expiring") {
          await sendSubscriptionExpiringEmail({
            to: to_email.trim(),
            name: "Administrator ISP (Pratinjau)",
            company: "PT Solusi Jaringan Nusantara",
            expiryDate: "31 Oktober 2026",
            daysLeft: 3,
            paymentLink: "https://member.ispsync.id/member/invoices"
          }, draft);
          return NextResponse.json({
            success: true,
            message: `Email pratinjau Peringatan Jatuh Tempo berhasil dikirim ke ${to_email}!`
          });
        } else if (template_type === "account_expired") {
          await sendAccountExpiredEmail({
            to: to_email.trim(),
            name: "Administrator ISP (Pratinjau)",
            company: "PT Solusi Jaringan Nusantara",
            expiryDate: "10 Oktober 2026",
            reactivationLink: "https://member.ispsync.id/member/invoices"
          }, draft);
          return NextResponse.json({
            success: true,
            message: `Email pratinjau Akun Suspended / Kedaluwarsa berhasil dikirim ke ${to_email}!`
          });
        } else {
          return NextResponse.json({ success: false, error: "Tipe template email tidak valid." }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: "Gagal mengirim email pengujian: " + (err.message || String(err))
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
