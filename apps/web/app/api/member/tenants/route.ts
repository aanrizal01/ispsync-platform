import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");

function getMembersData() {
  try {
    return JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf-8"));
  } catch {
    return { members: [] };
  }
}

function saveMembersData(data: any): boolean {
  try {
    fs.writeFileSync(MEMBERS_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save members.json:", err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const db = getMembersData();
  const members = db.members || [];

  // Exclude master platform root owner or mark accordingly
  const tenants = members.map((m: any) => {
    const { password: _, ...safe } = m;
    const expires = new Date(m.expiresAt || "");
    const today = new Date();
    const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...safe,
      daysLeft: isNaN(daysLeft) ? 0 : daysLeft,
      isExpiringSoon: daysLeft > 0 && daysLeft <= 30,
      isExpired: daysLeft <= 0,
      isOwner: m.role === "SUPERADMIN" || m.id === "mbr_001",
    };
  });

  const tenantOnly = tenants.filter((t: any) => !t.isOwner);

  const stats = {
    totalTenants: tenantOnly.length,
    activeTenants: tenantOnly.filter((t: any) => t.status === "active").length,
    suspendedTenants: tenantOnly.filter((t: any) => t.status === "suspended").length,
    expiringSoon: tenantOnly.filter((t: any) => t.isExpiringSoon).length,
    totalMRR: tenantOnly
      .filter((t: any) => t.status === "active")
      .reduce((acc: number, t: any) => acc + (Number(String(t.planPrice || "0").replace(/\./g, "")) || 0), 0),
  };

  return NextResponse.json({
    success: true,
    stats,
    tenants,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const db = getMembersData();
    const members = db.members || [];

    if (action === "create") {
      const {
        company,
        picName,
        email,
        phone,
        address,
        npwp,
        nib,
        sklo,
        domain,
        plan,
        planName,
        planPrice,
        planCapacity,
        password,
        expiresAt,
      } = body;

      if (!company || !email || !password || !domain) {
        return NextResponse.json(
          { error: "Nama perusahaan, email, password, dan domain wajib diisi." },
          { status: 400 }
        );
      }

      // Check duplicate email or domain
      const exists = members.find(
        (m: any) => m.email.toLowerCase() === email.toLowerCase() || m.domain.toLowerCase() === domain.toLowerCase()
      );
      if (exists) {
        return NextResponse.json(
          { error: "Email atau domain sudah terdaftar pada tenant lain." },
          { status: 400 }
        );
      }

      // Generate new ID
      const nextNum = members.length + 1;
      const newId = `mbr_${String(nextNum).padStart(3, "0")}`;
      const nowStr = new Date().toISOString().split("T")[0];
      const defaultExpires = new Date();
      defaultExpires.setFullYear(defaultExpires.getFullYear() + 1);
      const defaultExpiresStr = defaultExpires.toISOString().split("T")[0];

      const newMember = {
        id: newId,
        email: email.trim(),
        password: password.trim(),
        company: company.trim(),
        picName: picName?.trim() || "Administrator",
        phone: phone?.trim() || "",
        address: address?.trim() || "",
        npwp: npwp?.trim() || "",
        nib: nib?.trim() || "",
        sklo: sklo?.trim() || "",
        plan: plan || "professional",
        planName: planName || "Professional",
        planPrice: String(planPrice || "6500000").replace(/\./g, ""),
        planCapacity: planCapacity || "5.000 Pelanggan",
        status: "active",
        subscribedAt: nowStr,
        expiresAt: expiresAt || defaultExpiresStr,
        autoRenew: true,
        domain: domain.trim().replace(/^https?:\/\//, ""),
        role: "TENANT",
        invoices: [],
        tickets: [],
      };

      members.push(newMember);
      db.members = members;

      if (!saveMembersData(db)) {
        return NextResponse.json({ error: "Gagal menyimpan data ke disk." }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Tenant berhasil ditambahkan", tenant: newMember });
    }

    if (action === "update") {
      const { id, ...updates } = body;
      const idx = members.findIndex((m: any) => m.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
      }

      // Prevent changing superadmin role via this endpoint
      if (members[idx].role === "SUPERADMIN" && updates.role && updates.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Tidak dapat mengubah hak akses Superadmin." }, { status: 403 });
      }

      members[idx] = {
        ...members[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Keep password intact if not provided
      if (!updates.password) {
        delete updates.password;
      }

      db.members = members;
      if (!saveMembersData(db)) {
        return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Data tenant berhasil diperbarui", tenant: members[idx] });
    }

    if (action === "toggle_status") {
      const { id } = body;
      const idx = members.findIndex((m: any) => m.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
      }

      if (members[idx].role === "SUPERADMIN" || members[idx].id === "mbr_001") {
        return NextResponse.json({ error: "Status Superadmin tidak dapat diubah." }, { status: 403 });
      }

      const currentStatus = members[idx].status || "active";
      members[idx].status = currentStatus === "active" ? "suspended" : "active";

      db.members = members;
      saveMembersData(db);

      return NextResponse.json({
        success: true,
        message: `Status tenant diubah menjadi ${members[idx].status}`,
        newStatus: members[idx].status,
      });
    }

    if (action === "delete") {
      const { id } = body;
      if (id === "mbr_001") {
        return NextResponse.json({ error: "Akun Superadmin tidak dapat dihapus." }, { status: 403 });
      }

      const filtered = members.filter((m: any) => m.id !== id);
      if (filtered.length === members.length) {
        return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
      }

      db.members = filtered;
      saveMembersData(db);

      return NextResponse.json({ success: true, message: "Tenant berhasil dihapus dari platform." });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Terjadi kesalahan internal." }, { status: 500 });
  }
}
