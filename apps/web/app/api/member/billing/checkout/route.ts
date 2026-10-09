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

const plans = [
  {
    id: "starter",
    name: "Starter ISP",
    price: "1500000",
    capacity: "500 Pelanggan",
  },
  {
    id: "pro",
    name: "Professional",
    price: "3500000",
    capacity: "2.500 Pelanggan",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "8000000",
    capacity: "Unlimited",
  },
];

export async function POST(req: NextRequest) {
  const auth = requireMember(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { planId } = body;

    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan) {
      return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 400 });
    }

    const db = getMembers();
    const idx = db.members.findIndex((m: any) => m.id === auth.member.id);
    if (idx === -1) return NextResponse.json({ error: "Member not found." }, { status: 404 });

    const member = db.members[idx];

    // Cek jika ada invoice pending, tidak boleh buat baru
    if (member.invoices && member.invoices.some((i: any) => i.status === "pending")) {
      return NextResponse.json({ error: "Anda memiliki tagihan yang belum dibayar. Silakan lunasi atau batalkan tagihan sebelumnya." }, { status: 400 });
    }

    // Buat tagihan
    const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date();
    const dueDateStr = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const newInvoice = {
      id: invoiceId,
      date: todayStr,
      dueDate: dueDateStr,
      period: `Upgrade Paket ${selectedPlan.name}`,
      amount: selectedPlan.price,
      status: "pending",
      paymentMethod: "",
      _metadata: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        planCapacity: selectedPlan.capacity
      }
    };

    if (!member.invoices) member.invoices = [];
    member.invoices.unshift(newInvoice);

    saveMembers(db);

    // Kirim URL checkout mock (nanti diarahkan ke halaman payment sandbox kita)
    return NextResponse.json({
      success: true,
      checkoutUrl: `/member/payment/${invoiceId}`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
