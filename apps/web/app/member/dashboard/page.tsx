"use client";
import MemberNav from "../_nav";
import { useMember } from "../context";

function fmt(n: string) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export default function MemberDashboard() {
  const { member } = useMember();
  if (!member) return null;

  const expires = new Date(member.expiresAt);
  const today = new Date();
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const pendingInvoice = member.invoices.find(i => i.status === "pending");
  const paidCount = member.invoices.filter(i => i.status === "paid").length;

  return (
    <MemberNav>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Selamat datang, {member.picName.split(" ")[0]}!</h1>
          <p className="text-gray-500 text-sm mt-1">{member.company}</p>
        </div>

        {/* Alert: pending invoice */}
        {pendingInvoice && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-xl">⚠️</span>
              <div>
                <div className="font-bold text-amber-800 text-sm">Invoice menunggu pembayaran</div>
                <div className="text-amber-600 text-xs">{pendingInvoice.id} — {fmt(pendingInvoice.amount)} — Jatuh tempo {pendingInvoice.dueDate}</div>
              </div>
            </div>
            <a href={`https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20konfirmasi%20pembayaran%20${pendingInvoice.id}`}
              target="_blank"
              className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all">
              Konfirmasi Bayar
            </a>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Status Langganan", value: member.status === "active" ? "Aktif" : "Tidak Aktif", sub: "", color: member.status === "active" ? "text-emerald-600" : "text-red-600", bg: "bg-white" },
            { label: "Hari Tersisa", value: daysLeft > 0 ? `${daysLeft} hari` : "Expired", sub: `Exp: ${member.expiresAt}`, color: daysLeft < 30 ? "text-amber-600" : "text-blue-600", bg: "bg-white" },
            { label: "Kapasitas Pelanggan", value: member.planCapacity, sub: "Paket " + member.planName, color: "text-indigo-600", bg: "bg-white" },
            { label: "Invoice Terbayar", value: `${paidCount} invoice`, sub: "Semua periode", color: "text-gray-700", bg: "bg-white" },
          ].map((card, i) => (
            <div key={i} className={`${card.bg} rounded-2xl border border-gray-200 p-4 shadow-sm`}>
              <div className="text-xs text-gray-500 mb-1">{card.label}</div>
              <div className={`text-lg font-black ${card.color}`}>{card.value}</div>
              {card.sub && <div className="text-[11px] text-gray-400 mt-0.5">{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Subscription detail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-1">Paket Saat Ini</div>
            <div className="text-2xl font-black mb-1">{member.planName}</div>
            <div className="text-blue-100 text-sm mb-4">{member.planCapacity}</div>
            <div className="text-3xl font-black mb-0.5">Rp {Number(member.planPrice.replace(/\./g,"")).toLocaleString("id-ID")}</div>
            <div className="text-blue-200 text-xs">per bulan</div>
            <div className="mt-4 pt-4 border-t border-blue-500 flex justify-between text-xs text-blue-200">
              <span>Mulai: {member.subscribedAt}</span>
              <span>Exp: {member.expiresAt}</span>
            </div>
            <a href={`https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20upgrade%20paket%20dari%20${member.planName}`} target="_blank"
              className="mt-4 block text-center py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xs font-bold transition-all">
              Upgrade Paket →
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Info Akses Platform</div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-gray-400">Dashboard CMS</div>
                <a href={`https://${member.domain}`} target="_blank"
                  className="text-sm font-bold text-blue-600 hover:underline">{member.domain}</a>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Auto Renew</div>
                <div className={`text-sm font-bold ${member.autoRenew ? "text-emerald-600" : "text-gray-400"}`}>
                  {member.autoRenew ? "✓ Aktif" : "✗ Tidak Aktif"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">ID Member</div>
                <div className="text-sm font-mono text-gray-700">{member.id}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Invoice Terbaru</h2>
            <a href="/member/invoices" className="text-xs text-blue-600 hover:underline font-medium">Lihat semua →</a>
          </div>
          <div className="space-y-3">
            {member.invoices.slice(0, 3).map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{inv.id}</div>
                  <div className="text-xs text-gray-400">{inv.period} · {inv.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-gray-700">{fmt(inv.amount)}</div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    inv.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                    inv.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                  }`}>
                    {inv.status === "paid" ? "Lunas" : inv.status === "pending" ? "Belum Bayar" : "Overdue"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MemberNav>
  );
}
