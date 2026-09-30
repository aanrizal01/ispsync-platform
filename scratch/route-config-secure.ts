import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "site-config.json");

// In-memory rate limiter
const attempts = new Map<string, { count: number; firstAttempt: number; blockedUntil: number }>();

const MAX_ATTEMPTS = 5;       // max failed attempts
const WINDOW_MS = 15 * 60 * 1000;  // 15 menit window
const BLOCK_MS = 15 * 60 * 1000;   // blokir 15 menit
const BASE_DELAY_MS = 500;          // delay dasar per percobaan gagal

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS };

  // If blocked
  if (record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Reset window if expired
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_MS;
    return { allowed: false, retryAfter: Math.ceil(BLOCK_MS / 1000) };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record) {
    attempts.set(ip, { count: 1, firstAttempt: now, blockedUntil: 0 });
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_MS;
    }
  }
}

function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

function getConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET() {
  const config = getConfig();
  if (!config) return NextResponse.json({ error: "Config not found" }, { status: 404 });
  const { adminPassword: _, ...safeConfig } = config;
  return NextResponse.json(safeConfig);
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  // Rate limit check
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    const mins = Math.ceil((rateCheck.retryAfter || 900) / 60);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${mins} menit.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateCheck.retryAfter || 900),
          "X-RateLimit-Limit": String(MAX_ATTEMPTS),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const { password, newPassword, ...updates } = body;

    const config = getConfig();
    if (!config) return NextResponse.json({ error: "Config not found" }, { status: 404 });

    // Wrong password
    if (password !== config.adminPassword) {
      recordFailedAttempt(ip);

      // Progressive delay: 500ms * attempt count
      const record = attempts.get(ip);
      const delay = BASE_DELAY_MS * (record?.count || 1);
      await new Promise((r) => setTimeout(r, Math.min(delay, 5000)));

      const remaining = MAX_ATTEMPTS - (record?.count || 1);
      return NextResponse.json(
        {
          error: remaining > 0
            ? `Password salah. ${remaining} percobaan tersisa.`
            : "Akun terkunci 15 menit karena terlalu banyak percobaan.",
        },
        {
          status: 401,
          headers: {
            "X-RateLimit-Remaining": String(Math.max(0, remaining)),
          },
        }
      );
    }

    // Success - clear rate limit
    clearAttempts(ip);

    const newConfig = {
      ...config,
      ...updates,
      adminPassword: newPassword || config.adminPassword,
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    return NextResponse.json({ success: true, message: "Konfigurasi berhasil disimpan" });
  } catch (err) {
    return NextResponse.json({ error: "Gagal: " + String(err) }, { status: 500 });
  }
}
