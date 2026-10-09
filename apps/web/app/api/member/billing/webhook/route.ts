import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireMember } from "@/lib/member-auth";

function getMembersPath(): string {
  const p0 = path.join(process.cwd(), "data", "members.json");
  if (fs.existsSync(p0)) return p0;
  const p1 = path.join(process.cwd(), "apps", "web", "data", "members.json");
  if (fs.existsSync(p1)) return p1;
  return p0;
}

function getMembers() {
  return JSON.parse(fs.readFileSync(getMembersPath(), "utf-8"));
}

function saveMembers(data: any) {
  fs.writeFileSync(getMembersPath(), JSON.stringify(data, null, 2), "utf-8");
}

export async function POST(req: NextRequest) {
  // In a real webhook from Midtrans/Xendit, we would verify the signature key here
  // Since this is a mock triggered by the frontend, we'll verify the session token
  const auth = requireMember(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { invoiceId, status } = body;

    if (!invoiceId || status !== "paid") {
      return NextResponse.json({ error: "Data webhook tidak valid." }, { status: 400 });
    }

    const db = getMembers();
    const idx = db.members.findIndex((m: any) => m.id === auth.member.id);
    if (idx === -1) return NextResponse.json({ error: "Member not found." }, { status: 404 });

    const member = db.members[idx];
    const invoice = member.invoices?.find((i: any) => i.id === invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ success: true, message: "Tagihan sudah dibayar." });
    }

    // Mark as paid
    invoice.status = "paid";
    invoice.paymentDate = new Date().toISOString().split("T")[0];
    invoice.paymentMethod = "Payment Gateway (Mock)";

    // Update member subscription if there is metadata
    if (invoice._metadata) {
      member.plan = invoice._metadata.planId;
      member.planName = invoice._metadata.planName;
      member.planPrice = invoice._metadata.planPrice;
      member.planCapacity = invoice._metadata.planCapacity;

      // Extend expiration date by 30 days
      const currentExpiry = new Date(member.expiresAt);
      const today = new Date();
      // If already expired, start from today. Otherwise, add to current expiry.
      const baseDate = currentExpiry < today ? today : currentExpiry;
      const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      member.expiresAt = newExpiry.toISOString().split("T")[0];
      
      // If they were suspended, reactivate them
      if (member.status === "suspended") {
        member.status = "active";
      }
    }

    saveMembers(db);

    return NextResponse.json({ success: true, message: "Pembayaran berhasil dicatat." });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
