import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "agents";

    if (!file) {
      return NextResponse.json({ success: false, message: "File tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists in public/uploads/<folder>
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Clean filename
    const originalExt = path.extname(file.name) || ".jpg";
    const cleanExt = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(cleanExt) ? cleanExt : ".jpg";
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${safeExt}`;
    const filePath = path.join(uploadDir, uniqueName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${folder}/${uniqueName}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}
