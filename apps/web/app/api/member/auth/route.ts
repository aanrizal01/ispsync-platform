import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");

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

function getMembers() {
  try {
    return JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf-8"));
  } catch {
    return { members: [] };
  }
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

  if (action === "logout") {
    if (token) sessions.delete(token);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
