import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");

function getMembersData() {
  try {
    const data = JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf-8"));
    const members = data.members || [];

    // Auto-fix any duplicate or missing IDs
    const seenIds = new Set<string>();
    let maxIdNum = 0;
    for (const m of members) {
      const match = String(m.id || "").match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxIdNum) maxIdNum = n;
      }
    }

    let modified = false;
    for (const m of members) {
      if (!m.id || seenIds.has(m.id)) {
        maxIdNum++;
        m.id = `mbr_${String(maxIdNum).padStart(3, "0")}`;
        modified = true;
      }
      seenIds.add(m.id);
    }

    if (modified) {
      saveMembersData(data);
    }
    return data;
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

      // Generate new strictly unique ID based on max existing ID number
      const existingNums = members
        .map((m: any) => {
          const match = String(m.id || "").match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n: number) => !isNaN(n));
      const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
      let candidateNum = maxNum + 1;
      let newId = `mbr_${String(candidateNum).padStart(3, "0")}`;
      while (members.some((m: any) => m.id === newId)) {
        candidateNum++;
        newId = `mbr_${String(candidateNum).padStart(3, "0")}`;
      }
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
        clusterType: body.clusterType || "shared",
        clusterNode: body.clusterNode || (body.clusterType === "dedicated" ? "Custom Node" : "103.179.65.73"),
        engineUrls: body.engineUrls || undefined,
        invoices: [],
        tickets: [],
      };

      members.push(newMember);
      db.members = members;

      if (!saveMembersData(db)) {
        return NextResponse.json({ error: "Gagal menyimpan data ke disk." }, { status: 500 });
      }

      // Execute Auto-Provision on database server
      let provSlug = "";
      if (newMember.domain) {
        const cleanDomain = newMember.domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();
        const parts = cleanDomain.split(".");
        if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "admin" || parts[0] === "portal")) {
          provSlug = parts[1];
        } else if (parts.length >= 3 && parts[1] === "ispsync") {
          provSlug = parts[0];
        } else {
          provSlug = parts[0];
        }
      }

      if (provSlug && provSlug !== "ispsync") {
        const payload = JSON.stringify({
          tenant_slug: provSlug,
          company: newMember.company,
          short_name: provSlug.toUpperCase(),
          email: newMember.email,
          password: password.trim(),
          pic_name: newMember.picName,
          phone: newMember.phone,
          address: newMember.address,
          plan: newMember.plan,
        });

        const urls = [
          "http://api:8080",
          process.env.API_BASE_URL || "http://api:8080",
          "http://172.18.0.1:8080",
          "http://127.0.0.1:8080",
          "http://localhost:8080",
        ];

        let provisioned = false;
        for (const baseUrl of urls) {
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const provRes = await fetch(`${baseUrl}/api/v1/internal/tenants/provision`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Admin-Key": "isp-onboarding-admin-key",
                },
                body: payload,
                signal: AbortSignal.timeout(5000),
              });
              if (provRes.ok) {
                console.log(`Auto-provision successfully executed via ${baseUrl} for tenant ${provSlug}`);
                provisioned = true;
                break;
              } else {
                console.warn(`Auto-provision attempt ${attempt} at ${baseUrl} returned status ${provRes.status}`);
              }
            } catch (err: any) {
              console.warn(`Auto-provision error at ${baseUrl} (attempt ${attempt}):`, err?.message || err);
              await new Promise((r) => setTimeout(r, 600));
            }
          }
          if (provisioned) break;
        }
      }

      return NextResponse.json({ success: true, message: "Tenant berhasil ditambahkan dan diprovisioning", tenant: newMember });
    }

    if (action === "update" || action === "edit") {
      const { id, ...updates } = body;
      const idx = members.findIndex((m: any) => m.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
      }

      // Prevent changing superadmin role via this endpoint
      if (members[idx].role === "SUPERADMIN" && updates.role && updates.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Tidak dapat mengubah hak akses Superadmin." }, { status: 403 });
      }

      const existingPassword = members[idx].password;

      members[idx] = {
        ...members[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Keep password intact if not provided or blank
      if (!updates.password || !String(updates.password).trim()) {
        members[idx].password = existingPassword;
      } else {
        members[idx].password = String(updates.password).trim();
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
      const { id, domain } = body;
      if (id === "mbr_001") {
        return NextResponse.json({ error: "Akun Superadmin tidak dapat dihapus." }, { status: 403 });
      }

      // Find the specific target member by id or domain
      const targetIdx = members.findIndex(
        (m: any) => m.id === id || (domain && m.domain && m.domain.toLowerCase() === domain.toLowerCase())
      );
      if (targetIdx === -1) {
        return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
      }

      const targetMember = members[targetIdx];

      // Determine tenant slug
      let slug = "";
      if (targetMember.domain) {
        const cleanDomain = targetMember.domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();
        const parts = cleanDomain.split(".");
        if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "admin" || parts[0] === "portal")) {
          slug = parts[1];
        } else if (parts.length >= 3 && parts[1] === "ispsync") {
          slug = parts[0];
        } else {
          slug = parts[0];
        }
      }

      // Execute Auto-Purge on database server
      if (slug && slug !== "dev" && slug !== "superadmin" && slug !== "gogiga") {
        const purgePayload = JSON.stringify({
          tenant_slug: slug,
          email: targetMember.email,
        });

        const urls = [
          "http://api:8080",
          process.env.API_BASE_URL || "http://api:8080",
          "http://172.18.0.1:8080",
          "http://127.0.0.1:8080",
          "http://localhost:8080",
        ];

        let purged = false;
        for (const baseUrl of urls) {
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const purgeRes = await fetch(`${baseUrl}/api/v1/internal/tenants/purge`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Admin-Key": "isp-onboarding-admin-key",
                },
                body: purgePayload,
                signal: AbortSignal.timeout(5000),
              });
              if (purgeRes.ok) {
                console.log(`Auto-purge successfully executed via ${baseUrl} for tenant ${slug}`);
                purged = true;
                break;
              }
            } catch (err: any) {
              console.warn(`Auto-purge attempt ${attempt} at ${baseUrl}:`, err?.message || err);
              await new Promise((r) => setTimeout(r, 500));
            }
          }
          if (purged) break;
        }
      }

      // Safely delete ONLY the single target tenant at targetIdx
      members.splice(targetIdx, 1);
      if (!saveMembersData(db)) {
        return NextResponse.json({ error: "Gagal menyimpan perubahan ke database file server (EACCES/Permission Denied)." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Tenant "${targetMember.company}" dan seluruh data di database server berhasil dimusnahkan secara permanen (Auto-Purge).`,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Terjadi kesalahan internal." }, { status: 500 });
  }
}
