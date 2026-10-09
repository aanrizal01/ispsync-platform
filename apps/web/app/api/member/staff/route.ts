import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireMember } from "../../../../../lib/member-auth";

function getMembersPath(): string {
  const p0 = path.join(process.cwd(), "data", "members.json");
  if (fs.existsSync(p0)) return p0;
  const p1 = path.join(process.cwd(), "apps", "web", "data", "members.json");
  if (fs.existsSync(p1)) return p1;
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
  } catch {
    return false;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ispsync_salt").digest("hex");
}

export async function GET(req: NextRequest) {
  const auth = requireMember(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getMembers();
  const member = db.members.find((m: any) => m.id === auth.member.id);
  
  if (!member) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const staffList = (member.staff || []).map((s: any) => {
    const { password, ...safe } = s;
    return safe;
  });

  return NextResponse.json({ success: true, staff: staffList });
}

export async function POST(req: NextRequest) {
  const auth = requireMember(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const db = getMembers();
    const idx = db.members.findIndex((m: any) => m.id === auth.member.id);

    if (idx === -1) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    if (!db.members[idx].staff) {
      db.members[idx].staff = [];
    }

    if (action === "create") {
      const { name, email, password, role } = body;
      
      if (!name || !email || !password || !role) {
        return NextResponse.json({ error: "Nama, email, password, dan role wajib diisi." }, { status: 400 });
      }

      // Check for duplicate email across the entire tenant's staff (and owner email)
      if (db.members[idx].email.toLowerCase() === email.toLowerCase()) {
        return NextResponse.json({ error: "Email ini sudah digunakan sebagai email utama Pemilik." }, { status: 400 });
      }

      if (db.members[idx].staff.some((s: any) => s.email.toLowerCase() === email.toLowerCase())) {
        return NextResponse.json({ error: "Email staf sudah terdaftar di tenant ini." }, { status: 400 });
      }

      const newStaff = {
        id: `stf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashPassword(password),
        role,
        status: "active",
        createdAt: new Date().toISOString(),
      };

      db.members[idx].staff.push(newStaff);
      saveMembers(db);

      const { password: _, ...safeStaff } = newStaff;
      return NextResponse.json({ success: true, message: "Staf berhasil ditambahkan.", staff: safeStaff });
    }

    if (action === "update") {
      const { id, name, role, status, password } = body;
      const staffIdx = db.members[idx].staff.findIndex((s: any) => s.id === id);
      
      if (staffIdx === -1) {
        return NextResponse.json({ error: "Staf tidak ditemukan." }, { status: 404 });
      }

      const currentStaff = db.members[idx].staff[staffIdx];

      db.members[idx].staff[staffIdx] = {
        ...currentStaff,
        name: name ? name.trim() : currentStaff.name,
        role: role || currentStaff.role,
        status: status || currentStaff.status,
      };

      if (password && password.trim() !== "") {
        if (password.length < 6) {
          return NextResponse.json({ error: "Kata sandi minimal 6 karakter." }, { status: 400 });
        }
        db.members[idx].staff[staffIdx].password = hashPassword(password);
      }

      saveMembers(db);
      
      const { password: _, ...safeStaff } = db.members[idx].staff[staffIdx];
      return NextResponse.json({ success: true, message: "Data staf berhasil diperbarui.", staff: safeStaff });
    }

    if (action === "delete") {
      const { id } = body;
      const staffIdx = db.members[idx].staff.findIndex((s: any) => s.id === id);
      
      if (staffIdx === -1) {
        return NextResponse.json({ error: "Staf tidak ditemukan." }, { status: 404 });
      }

      db.members[idx].staff.splice(staffIdx, 1);
      saveMembers(db);

      return NextResponse.json({ success: true, message: "Staf berhasil dihapus." });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
