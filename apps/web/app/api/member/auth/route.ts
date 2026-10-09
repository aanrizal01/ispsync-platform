import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDataDir, sendOtpEmail, sendWelcomeEmail } from "@/lib/mailer";

function getMembersPath(): string {
  const p0 = path.join(getDataDir(), "members.json");
  if (fs.existsSync(p0)) return p0;
  const p1 = path.join(process.cwd(), "data", "members.json");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "apps", "web", "data", "members.json");
  if (fs.existsSync(p2)) return p2;
  return p0;
}

function getMembers() {
  try {
    return JSON.parse(fs.readFileSync(getMembersPath(), "utf-8"));
  } catch {
    return { members: [] };
  }
}

function saveMembers(data: any): boolean {
  try {
    fs.writeFileSync(getMembersPath(), JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save members.json:", err);
    return false;
  }
}

function getPendingPath(): string {
  return path.join(getDataDir(), "pending-registrations.json");
}

function getPendingRegistrations(): Record<string, any> {
  try {
    const p = getPendingPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading pending-registrations.json:", err);
  }
  return {};
}

function savePendingRegistrations(data: Record<string, any>): boolean {
  try {
    fs.writeFileSync(getPendingPath(), JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save pending-registrations.json:", err);
    return false;
  }
}

// Reserved subdomains that tenants cannot take
const RESERVED_SUBDOMAINS = new Set([
  "api", "admin", "member", "app", "core", "billing", "ns1", "ns2", "portal",
  "mail", "email", "test", "dev", "staging", "demo", "cloud", "dns", "support",
  "help", "status", "auth", "login", "register", "hotspot", "wifi", "passpoint",
  "ispsync", "isp", "noc", "fiber", "fibergrid", "nexus", "ledger", "radius"
]);

// Secret key for HMAC token signing (persists across container restarts)
const SESSION_SECRET = process.env.SESSION_SECRET || "ispsync-member-auth-secret-key-2026-carrier-grade";

// Simple in-memory fallback sessions
const sessions = new Map<string, { memberId: string; expiresAt: number }>();

// Rate limiting for member auth
const authAttempts = new Map<string, { count: number; blockedUntil: number }>();

function signToken(memberId: string): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days session
  const data = `${memberId}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}:${sig}`;
}

function verifySessionToken(token: string): string | null {
  if (!token) return null;

  // Check HMAC format: memberId:expiresAt:signature
  if (token.includes(":")) {
    const parts = token.split(":");
    if (parts.length === 3) {
      const [memberId, expStr, sig] = parts;
      const exp = parseInt(expStr, 10);
      if (!isNaN(exp) && exp > Date.now()) {
        const expected = crypto.createHmac("sha256", SESSION_SECRET).update(`${memberId}:${expStr}`).digest("hex");
        if (sig === expected) return memberId;
      }
    }
  }

  // Fallback to in-memory session map
  const session = sessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.memberId;
  }

  return null;
}

function getClientIP(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const rec = authAttempts.get(ip);
  if (!rec) return true;
  if (rec.blockedUntil > now) return false;
  if (rec.count >= 10) {
    rec.blockedUntil = now + 15 * 60 * 1000;
    return false;
  }
  return true;
}

function recordFail(ip: string) {
  const now = Date.now();
  const rec = authAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= 10) rec.blockedUntil = now + 15 * 60 * 1000;
  authAttempts.set(ip, rec);
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, { status: 429 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const { action, email, password, token } = body;

  // 1. LOGIN
  if (action === "login") {
    const db = getMembers();
    const member = db.members.find(
      (m: any) =>
        m.email.toLowerCase() === (email || "").trim().toLowerCase() &&
        m.password === password
    );

    if (!member) {
      recordFail(ip);
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    authAttempts.delete(ip);
    const sessionToken = signToken(member.id);
    sessions.set(sessionToken, { memberId: member.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    const safeMember = {
      id: member.id,
      email: member.email,
      company: member.company,
      picName: member.picName,
      role: member.role || (member.email === "admin@ispsync.id" ? "SUPERADMIN" : "TENANT"),
    };

    return NextResponse.json({ success: true, token: sessionToken, member: safeMember });
  }

  // 2. VERIFY SESSION TOKEN
  if (action === "verify") {
    if (!token) return NextResponse.json({ error: "No token provided" }, { status: 401 });

    const memberId = verifySessionToken(token);
    if (!memberId) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const db = getMembers();
    const member = db.members.find((m: any) => m.id === memberId);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { password: _, ...safeMember } = member;
    return NextResponse.json({ success: true, member: safeMember });
  }

  // 3. REGISTER REQUEST (Request OTP code to email)
  if (action === "register_request") {
    const { company, picName, email: regEmail, phone, password: regPassword, subdomain } = body;

    if (!company || !picName || !regEmail || !phone || !regPassword || !subdomain) {
      return NextResponse.json({ error: "Seluruh kolom formulir pendaftaran wajib diisi." }, { status: 400 });
    }

    const cleanEmail = String(regEmail).trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json({ error: "Format alamat email tidak valid." }, { status: 400 });
    }

    if (String(regPassword).length < 6) {
      return NextResponse.json({ error: "Kata sandi minimal 6 karakter." }, { status: 400 });
    }

    const cleanSubdomain = String(subdomain).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(cleanSubdomain)) {
      return NextResponse.json({
        error: "Subdomain hanya boleh berupa huruf kecil, angka, atau tanda hubung (3-30 karakter) tanpa spasi."
      }, { status: 400 });
    }

    if (RESERVED_SUBDOMAINS.has(cleanSubdomain)) {
      return NextResponse.json({
        error: `Subdomain '${cleanSubdomain}' dicadangkan untuk infrastruktur internal. Silakan gunakan nama/singkatan brand ISP Anda.`
      }, { status: 400 });
    }

    const db = getMembers();
    const membersList = db.members || [];

    // Check if email already registered
    const emailExists = membersList.some((m: any) => (m.email || "").toLowerCase() === cleanEmail);
    if (emailExists) {
      return NextResponse.json({
        error: "Alamat email ini sudah terdaftar. Silakan langsung masuk di halaman Login."
      }, { status: 400 });
    }

    // Check if subdomain already used
    const subExists = membersList.some((m: any) => {
      const d = (m.domain || "").toLowerCase();
      const ld = (m.engines?.ledger?.customDomain || "").toLowerCase();
      return d.startsWith(`${cleanSubdomain}.`) || ld.includes(`.${cleanSubdomain}.`);
    });
    if (subExists) {
      return NextResponse.json({
        error: `Subdomain '${cleanSubdomain}' sudah digunakan oleh ISP lain. Silakan pilih subdomain lain.`
      }, { status: 400 });
    }

    // Rate limit check for OTP request
    const pending = getPendingRegistrations();
    const now = Date.now();

    // Clean up expired registrations
    for (const key of Object.keys(pending)) {
      if (pending[key].expiresAt < now) {
        delete pending[key];
      }
    }

    const existing = pending[cleanEmail];
    if (existing && (now - (existing.lastSentAt || 0) < 45000)) {
      const waitSec = Math.ceil((45000 - (now - existing.lastSentAt)) / 1000);
      return NextResponse.json({
        error: `Mohon tunggu ${waitSec} detik sebelum meminta kode OTP kembali.`
      }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Send OTP via configured Google Workspace SMTP
    try {
      await sendOtpEmail({
        to: cleanEmail,
        name: String(picName).trim(),
        otpCode,
      });
    } catch (mailErr: any) {
      console.error("Failed to send OTP email:", mailErr);
      return NextResponse.json({
        error: `Gagal mengirimkan kode OTP ke email: ${mailErr?.message || "Kesalahan koneksi SMTP"}. Pastikan email benar atau coba beberapa saat lagi.`
      }, { status: 500 });
    }

    // Save pending registration
    pending[cleanEmail] = {
      code: otpCode,
      expiresAt: now + 15 * 60 * 1000, // 15 mins
      lastSentAt: now,
      attempts: 0,
      payload: {
        company: String(company).trim(),
        picName: String(picName).trim(),
        email: cleanEmail,
        phone: String(phone).trim(),
        password: String(regPassword),
        subdomain: cleanSubdomain,
      }
    };
    savePendingRegistrations(pending);

    return NextResponse.json({
      success: true,
      message: `Kode verifikasi 6-digit telah dikirim ke ${cleanEmail}. Silakan periksa inbox / spam email Anda.`,
      email: cleanEmail,
      expiresInSeconds: 900
    });
  }

  // 4. REGISTER VERIFY (Verify OTP code and create member)
  if (action === "register_verify") {
    const { email: regEmail, code } = body;
    if (!regEmail || !code) {
      return NextResponse.json({ error: "Email dan kode verifikasi 6-digit wajib diisi." }, { status: 400 });
    }

    const cleanEmail = String(regEmail).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const pending = getPendingRegistrations();
    const record = pending[cleanEmail];

    if (!record || record.expiresAt < Date.now()) {
      if (record) {
        delete pending[cleanEmail];
        savePendingRegistrations(pending);
      }
      return NextResponse.json({
        error: "Kode verifikasi telah kedaluwarsa atau sesi pendaftaran tidak ditemukan. Silakan lakukan pendaftaran ulang."
      }, { status: 400 });
    }

    if (record.code !== cleanCode) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 5) {
        delete pending[cleanEmail];
        savePendingRegistrations(pending);
        return NextResponse.json({
          error: "Terlalu banyak percobaan kode verifikasi yang salah. Pendaftaran dibatalkan, silakan lakukan pendaftaran ulang."
        }, { status: 400 });
      }
      savePendingRegistrations(pending);
      return NextResponse.json({
        error: `Kode verifikasi salah. Sisa kesempatan percobaan: ${5 - record.attempts}.`
      }, { status: 400 });
    }

    // OTP matched! Create member
    const db = getMembers();
    if (!db.members) db.members = [];

    if (db.members.some((m: any) => (m.email || "").toLowerCase() === cleanEmail)) {
      delete pending[cleanEmail];
      savePendingRegistrations(pending);
      return NextResponse.json({ error: "Akun dengan email ini sudah terdaftar." }, { status: 400 });
    }

    let maxNum = 0;
    for (const m of db.members) {
      const match = String(m.id).match(/^mbr_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const newId = `mbr_${String(maxNum + 1).padStart(3, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    const expiresDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const p = record.payload;

    const newMember = {
      id: newId,
      email: cleanEmail,
      password: p.password,
      company: p.company,
      picName: p.picName,
      phone: p.phone,
      address: "",
      npwp: "",
      plan: "trial",
      planName: "Trial Enterprise (14 Hari)",
      planPrice: "0",
      planCapacity: "1.000 Pelanggan",
      status: "active",
      subscribedAt: today,
      expiresAt: expiresDate,
      autoRenew: false,
      domain: `${p.subdomain}.ispsync.id`,
      role: "TENANT",
      clusterType: "shared",
      clusterNode: "103.179.65.73",
      engines: {
        ledger: {
          customDomain: `ledger.${p.subdomain}.ispsync.id`,
          updatedAt: new Date().toISOString()
        },
        nexus: {
          customDomain: `nexus.${p.subdomain}.ispsync.id`,
          brandName: p.company,
          updatedAt: new Date().toISOString()
        },
        fibergrid: {
          customDomain: `fibergrid.${p.subdomain}.ispsync.id`,
          updatedAt: new Date().toISOString()
        }
      },
      invoices: [
        {
          id: `INV-${Date.now().toString().slice(-6)}`,
          date: today,
          dueDate: expiresDate,
          period: "Free Trial 14 Hari",
          amount: "0",
          status: "paid",
          paymentDate: today,
          paymentMethod: "Free Trial"
        }
      ],
      tickets: []
    };

    db.members.push(newMember);
    saveMembers(db);

    // Remove from pending
    delete pending[cleanEmail];
    savePendingRegistrations(pending);

    // Send Welcome Email asynchronously
    sendWelcomeEmail({
      to: cleanEmail,
      name: p.picName,
      company: p.company,
      subdomain: p.subdomain,
    }).catch((err) => {
      console.error("Async welcome email sending error:", err);
    });

    // Create session token
    const sessionToken = signToken(newMember.id);
    sessions.set(sessionToken, {
      memberId: newMember.id,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    const { password: _, ...safeMember } = newMember;
    return NextResponse.json({
      success: true,
      message: "Verifikasi email berhasil! Akun cloud SaaS Anda telah aktif dengan akses 14 hari free trial.",
      token: sessionToken,
      member: safeMember
    });
  }

  // 5. REGISTER RESEND OTP
  if (action === "register_resend_otp") {
    const { email: regEmail } = body;
    if (!regEmail) return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });

    const cleanEmail = String(regEmail).trim().toLowerCase();
    const pending = getPendingRegistrations();
    const record = pending[cleanEmail];

    if (!record || record.expiresAt < Date.now()) {
      return NextResponse.json({
        error: "Sesi pendaftaran telah kedaluwarsa. Silakan lakukan pendaftaran ulang."
      }, { status: 400 });
    }

    const now = Date.now();
    if (now - (record.lastSentAt || 0) < 45000) {
      const waitSec = Math.ceil((45000 - (now - record.lastSentAt)) / 1000);
      return NextResponse.json({
        error: `Mohon tunggu ${waitSec} detik sebelum meminta ulang kode OTP.`
      }, { status: 429 });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    record.code = newOtp;
    record.expiresAt = now + 15 * 60 * 1000;
    record.lastSentAt = now;
    record.attempts = 0;
    savePendingRegistrations(pending);

    try {
      await sendOtpEmail({
        to: cleanEmail,
        name: record.payload.picName,
        otpCode: newOtp,
      });
    } catch (mailErr: any) {
      console.error("Resend OTP error:", mailErr);
      return NextResponse.json({
        error: `Gagal mengirim ulang email OTP: ${mailErr?.message || "Kesalahan SMTP"}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Kode verifikasi baru telah dikirimkan ke ${cleanEmail}.`
    });
  }

  // 6. UPDATE PROFILE
  if (action === "update_profile") {
    if (!token) return NextResponse.json({ error: "Sesi tidak valid atau belum masuk." }, { status: 401 });
    const memberId = verifySessionToken(token);
    if (!memberId) return NextResponse.json({ error: "Sesi kedaluwarsa, silakan login ulang." }, { status: 401 });

    const db = getMembers();
    const idx = (db.members || []).findIndex((m: any) => m.id === memberId);
    if (idx === -1) return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 404 });

    const member = db.members[idx];
    const { picName, phone, company, address, npwp, email: newEmail } = body;

    if (newEmail && newEmail.trim().toLowerCase() !== member.email.toLowerCase()) {
      const emailExists = db.members.some(
        (m: any) => m.id !== memberId && m.email.toLowerCase() === newEmail.trim().toLowerCase()
      );
      if (emailExists) {
        return NextResponse.json({ error: "Alamat email sudah digunakan akun lain." }, { status: 400 });
      }
      member.email = newEmail.trim().toLowerCase();
    }

    if (picName !== undefined) member.picName = String(picName).trim();
    if (phone !== undefined) member.phone = String(phone).trim();
    if (company !== undefined) member.company = String(company).trim();
    if (address !== undefined) member.address = String(address).trim();
    if (npwp !== undefined) member.npwp = String(npwp).trim();

    saveMembers(db);

    const { password: _, ...safeMember } = member;
    return NextResponse.json({ success: true, message: "Profil berhasil diperbarui.", member: safeMember });
  }

  // 7. CHANGE PASSWORD
  if (action === "change_password") {
    if (!token) return NextResponse.json({ error: "Sesi tidak valid atau belum masuk." }, { status: 401 });
    const memberId = verifySessionToken(token);
    if (!memberId) return NextResponse.json({ error: "Sesi kedaluwarsa, silakan login ulang." }, { status: 401 });

    const db = getMembers();
    const idx = (db.members || []).findIndex((m: any) => m.id === memberId);
    if (idx === -1) return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 404 });

    const member = db.members[idx];
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Kata sandi lama dan baru wajib diisi." }, { status: 400 });
    }

    if (member.password !== oldPassword) {
      return NextResponse.json({ error: "Kata sandi lama salah." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Kata sandi baru minimal 6 karakter." }, { status: 400 });
    }

    member.password = newPassword;
    saveMembers(db);

    return NextResponse.json({ success: true, message: "Kata sandi berhasil diubah." });
  }

  // 8. LOGOUT
  if (action === "logout") {
    if (token) sessions.delete(token);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
