import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");

// Simple in-memory sessions (per process)
const sessions = new Map<string, { memberId: string; expiresAt: number }>();

// Rate limiting for member auth
const authAttempts = new Map<string, { count: number; blockedUntil: number }>();

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
  if (rec.count >= 5) {
    rec.blockedUntil = now + 15 * 60 * 1000;
    return false;
  }
  return true;
}

function recordFail(ip: string) {
  const now = Date.now();
  const rec = authAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= 5) rec.blockedUntil = now + 15 * 60 * 1000;
  authAttempts.set(ip, rec);
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, { status: 429 });
  }

  const { action, email, password, token } = await req.json();

  if (action === "login") {
    const db = getMembers();
    const member = db.members.find((m: any) => m.email === email && m.password === password);
    if (!member) {
      recordFail(ip);
      await new Promise(r => setTimeout(r, 800));
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }
    authAttempts.delete(ip);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionToken, { memberId: member.id, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    const res = NextResponse.json({ success: true, token: sessionToken, member: { id: member.id, email: member.email, company: member.company, picName: member.picName, role: member.role || (member.email === "admin@ispsync.id" ? "SUPERADMIN" : "TENANT") } });
    return res;
  }

  if (action === "verify") {
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    const db = getMembers();
    const member = db.members.find((m: any) => m.id === session.memberId);
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
