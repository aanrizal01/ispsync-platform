"use client";
import { useState } from "react";
import Link from "next/link";
import MemberNav from "../_nav";
import { useMember } from "../context";

function fmt(n: string) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

function getEngineUrls(domain?: string) {
  let d = domain ? domain.trim() : "";
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!d) {
    if (typeof window !== "undefined") {
      d = window.location.hostname;
    } else {
      d = "ispsync.id";
    }
  }

  // Strip existing engine subdomains if present
  d = d.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx)\./, "");

  return {
    ledger: `https://ledger.${d}`,
    nexus: `https://nexus.${d}`,
    fibergrid: `https://fibergrid.${d}`,
  };
}

export default function MemberDashboard() {
  const { member } = useMember();
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!member) return null;

  const expires = new Date(member.expiresAt);
  const today = new Date();
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const pendingInvoice = member.invoices.find(i => i.status === "pending");
  const paidCount = member.invoices.filter(i => i.status === "paid").length;
  const urls = getEngineUrls(member.domain);

  return (
    <MemberNav>
      <div className="max-w-5xl">
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

        {/* 🚀 Quick Launchpad: 3 Engines ISPSYNC */}
        <div className="mb-8">
          {/* Customer Landing Portal Banner */}
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg flex-shrink-0 border border-blue-400/30">
                🏠
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Landing Portal Pelanggan ISP Anda</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Portal
                  </span>
                </div>
                <div className="text-xs text-blue-300 mt-0.5 font-mono font-semibold">
                  https://{urls.ledger.replace("https://ledger.", "")}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Portal publik pendaftaran pelanggan baru, tracking invoice ritel, dan info paket internet ISP Anda.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={`https://${urls.ledger.replace("https://ledger.", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-blue-900/50"
              >
                <span>Buka Portal</span>
                <span>↗</span>
              </a>
              <Link
                href="/member/engine/nexus"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                title="Pengaturan Domain Portal & Engine Nexus"
              >
                <span>⚙️ Pengaturan Portal &amp; Nexus</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  Akses Cepat 3 Engine Platform
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Luncurkan seluruh modul operasional ISP Anda secara terpusat dalam satu klik.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Semua Engine Online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Engine 1: Ledger */}
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                    Engine 1
                  </span>
                  <span className="text-[11px] font-bold text-blue-600">Core Billing</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-blue-200 group-hover:scale-105 transition-transform">
                    💳
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-base truncate">ISPSYNC Ledger</h3>
                    <p className="text-[11px] text-gray-400 font-mono truncate">{urls.ledger.replace("https://", "")}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Billing otomatis, AAA Radius PPPoE/Hotspot, manajemen tagihan pelanggan, akuntansi &amp; QRIS gateway.
                </p>
                <div className="space-y-1.5 mb-4 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>FreeRADIUS AAA Mikrotik &amp; Juniper</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Invoice Otomatis WhatsApp &amp; Email</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                <a
                  href={urls.ledger}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-200"
                >
                  <span>Buka Ledger</span>
                  <span className="text-sm font-normal">↗</span>
                </a>
                <Link
                  href="/member/engine/ledger"
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
                  title="Pengaturan Domain & RADIUS Ledger"
                >
                  <span>⚙️</span>
                </Link>
              </div>
            </div>

            {/* Engine 2: Nexus */}
            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                    Engine 2
                  </span>
                  <span className="text-[11px] font-bold text-purple-600">Customer &amp; Ops</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-purple-200 group-hover:scale-105 transition-transform">
                    🌐
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-base truncate">ISPSYNC Nexus</h3>
                    <p className="text-[11px] text-gray-400 font-mono truncate">{urls.nexus.replace("https://", "")}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Portal mandiri pelanggan (Self-care), aplikasi mobile teknisi lapangan, tiket gangguan &amp; agen mitra.
                </p>
                <div className="space-y-1.5 mb-4 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Portal Tiket &amp; Work Order Teknisi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Captive Portal Hotspot &amp; Beli Voucher</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                <a
                  href={urls.nexus}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-purple-200"
                >
                  <span>Buka Nexus</span>
                  <span className="text-sm font-normal">↗</span>
                </a>
                <Link
                  href="/member/engine/nexus"
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
                  title="Pengaturan Domain & Branding Nexus"
                >
                  <span>⚙️</span>
                </Link>
              </div>
            </div>

            {/* Engine 3: FiberGrid */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Engine 3
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">FTTX &amp; NOC Center</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-200 group-hover:scale-105 transition-transform">
                    📡
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-base truncate">ISPSYNC FiberGrid</h3>
                    <p className="text-[11px] text-gray-400 font-mono truncate">{urls.fibergrid.replace("https://", "")}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  NOC Command Center pemantauan OLT GPON/EPON, auto-provisioning TR-069 ACS ONT &amp; topologi kabel fiber.
                </p>
                <div className="space-y-1.5 mb-4 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Monitoring OLT &amp; Redaman Optik (dBm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>GenieACS Zero-Touch Provisioning</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                <a
                  href={urls.fibergrid}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-emerald-200"
                >
                  <span>Buka FiberGrid</span>
                  <span className="text-sm font-normal">↗</span>
                </a>
                <Link
                  href="/member/engine/fibergrid"
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
                  title="Pengaturan Domain & TR-069 FiberGrid"
                >
                  <span>⚙️</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Credential Bar */}
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border border-slate-800">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                🔑
              </div>
              <div>
                <div className="font-bold text-xs text-slate-200">
                  Kredensial Akses Engine
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Email Administrator Anda: <span className="font-mono text-blue-300 font-semibold">{member.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(member.email);
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2000);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>{copiedEmail ? "✓ Tersalin!" : "📋 Salin Email"}</span>
              </button>
            </div>
          </div>
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
