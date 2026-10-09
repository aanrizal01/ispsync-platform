import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { getDataDir } from "./mailer";

/**
 * Shared server-side member authentication helpers.
 * Session tokens have the format `memberId:expiresAt:hmacSignature`.
 */

function resolveSessionSecret(): string {
  const fromEnv = (process.env.SESSION_SECRET || "").trim();
  if (fromEnv.length >= 32) return fromEnv;

  // No strong secret in env: generate once and persist in the data volume so
  // sessions survive container restarts but the key is never in source code.
  const secretPath = path.join(getDataDir(), ".session-secret");
  try {
    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, "utf-8").trim();
      if (stored.length >= 32) return stored;
    }
    const generated = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(secretPath, generated, { encoding: "utf-8", mode: 0o600 });
    return generated;
  } catch (err) {
    console.error("[member-auth] Gagal membaca/menulis .session-secret:", err);
    // Last resort: per-process random secret (sessions reset on restart).
    return crypto.randomBytes(48).toString("hex");
  }
}

export const SESSION_SECRET = resolveSessionSecret();
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function signSessionToken(memberId: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const data = `${memberId}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}:${sig}`;
}

export function verifySessionToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [memberId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!memberId || isNaN(exp) || exp <= Date.now()) return null;

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(`${memberId}:${expStr}`).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return memberId;
}

function getMembersPath(): string {
  const p0 = path.join(getDataDir(), "members.json");
  if (fs.existsSync(p0)) return p0;
  const p1 = path.join(process.cwd(), "data", "members.json");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "apps", "web", "data", "members.json");
  if (fs.existsSync(p2)) return p2;
  return p0;
}

export function findMemberById(memberId: string): any | null {
  try {
    const db = JSON.parse(fs.readFileSync(getMembersPath(), "utf-8"));
    return (db.members || []).find((m: any) => m.id === memberId) || null;
  } catch {
    return null;
  }
}

export function resolveMemberRole(member: any): string {
  return member?.role || (member?.email === "admin@ispsync.id" ? "SUPERADMIN" : "TENANT");
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return null;
}

export type AuthResult =
  | { ok: true; member: any; role: string }
  | { ok: false; status: 401 | 403; error: string };

/** Require a valid member session. Optionally require specific roles. */
export function requireMember(req: NextRequest, roles?: string[]): AuthResult {
  const memberId = verifySessionToken(getBearerToken(req));
  if (!memberId) {
    return { ok: false, status: 401, error: "Sesi tidak valid atau sudah berakhir. Silakan masuk kembali." };
  }
  const member = findMemberById(memberId);
  if (!member) {
    return { ok: false, status: 401, error: "Akun tidak ditemukan. Silakan masuk kembali." };
  }
  const role = resolveMemberRole(member);
  if (roles && !roles.includes(role)) {
    return { ok: false, status: 403, error: "Anda tidak memiliki hak akses ke pengaturan platform." };
  }
  return { ok: true, member, role };
}
