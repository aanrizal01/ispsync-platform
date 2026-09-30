import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "site-config.json");

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
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }
  const { adminPassword: _, ...safeConfig } = config;
  return NextResponse.json(safeConfig);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, newPassword, ...updates } = body;

    const config = getConfig();
    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    if (password !== config.adminPassword) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    const newConfig = {
      ...config,
      ...updates,
      adminPassword: newPassword || config.adminPassword,
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    return NextResponse.json({ success: true, message: "Konfigurasi berhasil disimpan" });
  } catch (err) {
    return NextResponse.json({ error: "Gagal menyimpan: " + String(err) }, { status: 500 });
  }
}
