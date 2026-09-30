import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "site-config.json");
const UPLOAD_DIR = path.join(process.cwd(), "public");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get("password") as string;
    const file = formData.get("logo") as File;

    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    if (password !== config.adminPassword) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `logo-custom.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    config.logo = { type: "image", text: config.logo.text || "IS", url: `/${filename}` };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({ success: true, url: `/${filename}`, message: "Logo berhasil diupload" });
  } catch (err) {
    return NextResponse.json({ error: "Gagal upload: " + String(err) }, { status: 500 });
  }
}
