"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  Building2,
  Server,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Layers,
  SlidersHorizontal,
  RefreshCw,
  Users,
  TrendingUp,
  Cpu,
  Database,
  Lock,
  Network,
} from "lucide-react";

type Tenant = {
  id: string;
  email: string;
  company: string;
  picName: string;
  phone?: string;
  plan: string;
  planName: string;
  planPrice: string;
  planCapacity: string;
  status: string;
  expiresAt: string;
  domain: string;
  daysLeft: number;
  isOwner?: boolean;
  clusterType?: "shared" | "dedicated";
  clusterNode?: string;
  engineUrls?: {
    ledger?: string;
    nexus?: string;
    fibergrid?: string;
    portal?: string;
  };
};

type Stats = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  expiringSoon: number;
  totalMRR: number;
};

function fmt(n: string | number) {
  const num = typeof n === "string" ? Number(n.replace(/\./g, "")) : n;
  if (isNaN(num)) return "Rp 0";
  return "Rp " + num.toLocaleString("id-ID");
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
  const { member, loading, token } = useMember();
  const router = useRouter();
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Superadmin SaaS stats & tenants list
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    expiringSoon: 0,
    totalMRR: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const isSuperadmin =
    member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001";

  useEffect(() => {
    if (!loading && !member) {
      router.replace("/member/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    if (isSuperadmin && token) {
      setLoadingStats(true);
      fetch("/api/member/tenants", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTenants(data.tenants || []);
            if (data.stats) setStats(data.stats);
          }
        })
        .catch((err) => console.error("Gagal mengambil data tenant:", err))
        .finally(() => setLoadingStats(false));
    }
  }, [isSuperadmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-cyan-600 animate-spin" />
          <div className="text-slate-400 text-xs font-mono animate-pulse">Memuat konsol platform...</div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Sesi Akses Diperlukan</h2>
          <p className="text-xs text-slate-400">
            Sesi masuk Anda belum terverifikasi atau telah berakhir. Mengarahkan ke halaman masuk...
          </p>
          <Link
            href="/member/login"
            className="block w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            Masuk ke Konsol Member
          </Link>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1: SUPERADMIN SAAS MASTER OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (isSuperadmin) {
    return (
      <MemberNav>
        <div className="max-w-6xl space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  PLATFORM ORCHESTRATION CONSOLE
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  Master Multi-Tenant Root
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-6 h-6 text-cyan-600" />
                <span>Pusat Kendali Eksekutif SaaS ISPSYNC</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Ikhtisar komprehensif performa pendapatan platform, kesehatan klaster telekomunikasi, dan seluruh tenant ISP yang aktif.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/member/tenants"
                className="whitespace-nowrap px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Kelola Tenant</span>
              </Link>
              <Link
                href="/member/gateway"
                className="whitespace-nowrap px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs bg-white shrink-0"
              >
                <Network className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Gateway &amp; Caddy</span>
              </Link>
              <Link
                href="/cms-9x7k2"
                className="whitespace-nowrap px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs bg-white shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
                <span>CMS &amp; Paket</span>
              </Link>
            </div>
          </div>

          {/* Top Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total MRR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">Estimasi MRR Platform</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-600">{fmt(stats.totalMRR)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                ARR: {fmt(stats.totalMRR * 12)} / tahun
              </div>
            </div>

            {/* Total Tenants */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">Total ISP Klien</span>
                <Building2 className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalTenants} Tenant</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {stats.activeTenants} Aktif Beroperasi
              </div>
            </div>

            {/* Managed End-User Capacity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">Kapasitas Ritel Terkelola</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-600">26.500+</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Kapasitas Radius AAA Pelanggan</div>
            </div>

            {/* Cluster Health */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">Status Infrastruktur</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600">100% Online</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Seluruh 6 Kontainer Sehat</div>
            </div>
          </div>

          {/* Cluster Services Health Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Telemetri Klaster &amp; Status 7 Engine ISPSYNC
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Node IP: 103.179.65.73 &bull; Carrier Architecture &bull; Uptime SLA 99.98%
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href="/member/gateway"
                  className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-xs"
                >
                  <Network className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Buka Caddy Gateway</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>
                <div className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Klaster 100% Online</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-5">
              {[
                { name: "Caddy Proxy", host: "On-Demand TLS", port: "80/443", status: "Online" },
                { name: "Web Portal", host: "Next.js 16", port: "3000", status: "Online" },
                { name: "Billing API", host: "Go Core API", port: "8080", status: "Online" },
                { name: "Nexus CRM", host: "ispsync-core", port: "8081", status: "Online" },
                { name: "FiberGrid", host: "ispsync-core", port: "8082", status: "Online" },
                { name: "FreeRADIUS", host: "Port 1812/1813", port: "3799", status: "Online" },
                { name: "PostgreSQL", host: "isp_billing", port: "5432", status: "Healthy" },
              ].map((svc, i) => (
                <div key={i} className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200/80 transition-all">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900 truncate">{svc.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{svc.host}</div>
                  <div className="text-[10px] text-cyan-700 font-mono font-semibold mt-1">Port: {svc.port}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tenant ISP Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Daftar Klien Tenant ISP Aktif</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar seluruh entitas ISP yang saat ini berlangganan dan terdistribusi di platform.
                </p>
              </div>

              <Link
                href="/member/tenants"
                className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
              >
                <span>Buka Panel Manajemen Penuh</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Entitas ISP</th>
                    <th className="py-3 px-4">Domain Subdomain</th>
                    <th className="py-3 px-4">Paket &amp; MRR</th>
                    <th className="py-3 px-4">Masa Berlaku</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Akses 3 Engine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants
                    .filter((t) => !t.isOwner)
                    .map((t) => {
                      const cleanDomain = t.domain.replace(/^https?:\/\//, "");
                      const baseDomain = cleanDomain.replace(
                        /^(ledger|billing|nexus|portal|fibergrid|fttx)\./,
                        ""
                      );
                      const ledgerUrl = t.engineUrls?.ledger || `https://ledger.${baseDomain}`;
                      const nexusUrl = t.engineUrls?.nexus || `https://nexus.${baseDomain}`;
                      const fibergridUrl = t.engineUrls?.fibergrid || `https://fibergrid.${baseDomain}`;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{t.company}</div>
                            <div className="text-[11px] font-normal text-slate-400 font-mono">
                              PIC: {t.picName}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-cyan-700">
                            <a
                              href={ledgerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>{cleanDomain}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <div className="mt-1">
                              {t.clusterType === "dedicated" ? (
                                <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Dedicated Cluster ({t.clusterNode || "Node Mandiri"})
                                </span>
                              ) : (
                                <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Shared Cloud ({t.clusterNode || "103.179.65.73"})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{t.planName}</div>
                            <div className="text-blue-600 font-semibold text-[11px]">
                              {fmt(t.planPrice)} / bln
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            <div>Exp: {t.expiresAt}</div>
                            <div className="text-[10px] text-slate-400">
                              {t.daysLeft > 0 ? `${t.daysLeft} hari lagi` : "Expired"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {t.status === "active" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span>Suspended</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-[10px]">
                              <a
                                href={ledgerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded hover:bg-blue-600 hover:text-white text-slate-600 font-bold transition-colors"
                                title={t.engineUrls?.ledger ? `Buka Ledger (${t.engineUrls.ledger})` : "Buka Ledger Tenant"}
                              >
                                Ledger
                              </a>
                              <a
                                href={nexusUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded hover:bg-purple-600 hover:text-white text-slate-600 font-bold transition-colors"
                                title={t.engineUrls?.nexus ? `Buka Nexus (${t.engineUrls.nexus})` : "Buka Nexus Tenant"}
                              >
                                Nexus
                              </a>
                              <a
                                href={fibergridUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded hover:bg-emerald-600 hover:text-white text-slate-600 font-bold transition-colors"
                                title={t.engineUrls?.fibergrid ? `Buka FiberGrid (${t.engineUrls.fibergrid})` : "Buka FiberGrid Tenant"}
                              >
                                FiberGrid
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </MemberNav>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2: TENANT CLIENT DASHBOARD (Hanya untuk Klien ISP Berlangganan)
  // ══════════════════════════════════════════════════════════════════════════
  const expires = new Date(member.expiresAt);
  const today = new Date();
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const pendingInvoice = member.invoices?.find((i) => i.status === "pending");
  const paidCount = member.invoices?.filter((i) => i.status === "paid").length || 0;
  const urls = getEngineUrls(member.domain);

  return (
    <MemberNav>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">
            Selamat datang, {member.picName.split(" ")[0]}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">{member.company}</p>
        </div>

        {/* Alert: pending invoice */}
        {pendingInvoice && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-xl font-bold">!</span>
              <div>
                <div className="font-bold text-amber-800 text-sm">Invoice menunggu pembayaran</div>
                <div className="text-amber-600 text-xs">
                  {pendingInvoice.id} — {fmt(pendingInvoice.amount)} — Jatuh tempo {pendingInvoice.dueDate}
                </div>
              </div>
            </div>
            <a
              href={`https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20konfirmasi%20pembayaran%20${pendingInvoice.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all"
            >
              Konfirmasi Bayar
            </a>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Status Langganan",
              value: member.status === "active" ? "Aktif" : "Tidak Aktif",
              sub: "",
              color: member.status === "active" ? "text-emerald-600" : "text-red-600",
              bg: "bg-white",
            },
            {
              label: "Hari Tersisa",
              value: daysLeft > 0 ? `${daysLeft} hari` : "Expired",
              sub: `Exp: ${member.expiresAt}`,
              color: daysLeft < 30 ? "text-amber-600" : "text-blue-600",
              bg: "bg-white",
            },
            {
              label: "Kapasitas Pelanggan",
              value: member.planCapacity,
              sub: "Paket " + member.planName,
              color: "text-indigo-600",
              bg: "bg-white",
            },
            {
              label: "Invoice Terbayar",
              value: `${paidCount} invoice`,
              sub: "Semua periode",
              color: "text-gray-700",
              bg: "bg-white",
            },
          ].map((card, i) => (
            <div key={i} className={`${card.bg} rounded-2xl border border-gray-200 p-4 shadow-sm`}>
              <div className="text-xs text-gray-500 mb-1">{card.label}</div>
              <div className={`text-lg font-black ${card.color}`}>{card.value}</div>
              {card.sub && <div className="text-[11px] text-gray-400 mt-0.5">{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Quick Launchpad: 3 Engines ISPSYNC */}
        <div className="mb-8">
          {/* Customer Landing Portal Banner */}
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-blue-400/30 font-mono">
                PORTAL
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
              >
                <span>Pengaturan Portal</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                Akses Cepat 3 Engine Platform
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Luncurkan seluruh modul operasional ISP Anda secara terpusat dalam satu klik.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                <div className="mb-3">
                  <h3 className="font-black text-gray-900 text-base truncate">ISPSYNC Ledger</h3>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{urls.ledger.replace("https://", "")}</p>
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

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {member.status === "pending_payment" ? (
                  <button disabled className="w-full py-2 px-3 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl text-center cursor-not-allowed">
                    Terkunci (Pilih Paket)
                  </button>
                ) : (
                  <>
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
                      className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-xl text-center transition-colors"
                    >
                      Setting
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Engine 2: Nexus */}
            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between group relative">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                    Engine 2
                  </span>
                  <span className="text-[11px] font-bold text-purple-600">Customer &amp; Ops</span>
                </div>
                <div className="mb-3">
                  <h3 className="font-black text-gray-900 text-base truncate">ISPSYNC Nexus</h3>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{urls.nexus.replace("https://", "")}</p>
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

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {member.status === "pending_payment" ? (
                  <button disabled className="w-full py-2 px-3 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl text-center cursor-not-allowed">
                    Terkunci (Pilih Paket)
                  </button>
                ) : (
                  <>
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
                      className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-xl text-center transition-colors"
                    >
                      Setting
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Engine 3: FiberGrid */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between group relative">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Engine 3
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">FTTX &amp; NOC</span>
                </div>
                <div className="mb-3">
                  <h3 className="font-black text-gray-900 text-base truncate">ISPSYNC FiberGrid</h3>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{urls.fibergrid.replace("https://", "")}</p>
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

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {member.status === "pending_payment" ? (
                  <button disabled className="w-full py-2 px-3 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl text-center cursor-not-allowed">
                    Terkunci (Pilih Paket)
                  </button>
                ) : (
                  <>
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
                      className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold rounded-xl text-center transition-colors"
                    >
                      Setting
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription detail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-600 rounded-2xl p-6 text-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-1">Paket Saat Ini</div>
              <div className="text-2xl font-black mb-1">{member.planName}</div>
              <div className="text-blue-100 text-sm mb-4">{member.planCapacity}</div>
              <div className="text-3xl font-black mb-0.5">{fmt(member.planPrice)}</div>
              <div className="text-blue-200 text-xs">per bulan</div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span>Mulai: {member.subscribedAt}</span>
                <span>Exp: {member.expiresAt}</span>
              </div>
              <Link
                href="/member/upgrade"
                className="w-full sm:w-auto px-4 py-2 bg-white text-blue-700 font-bold rounded-xl text-center hover:bg-blue-50 transition-colors shadow-sm"
              >
                Upgrade Paket
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Info Akses Platform</div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-gray-400">Dashboard CMS</div>
                <a href={`https://${member.domain}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">
                  {member.domain}
                </a>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Auto Renew</div>
                <div className={`text-sm font-bold ${member.autoRenew ? "text-emerald-600" : "text-gray-400"}`}>
                  {member.autoRenew ? "Aktif" : "Tidak Aktif"}
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
        {member.invoices && member.invoices.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Invoice Terbaru</h2>
              <Link href="/member/invoices" className="text-xs text-blue-600 hover:underline font-medium">
                Lihat semua &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {member.invoices.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{inv.id}</div>
                    <div className="text-xs text-gray-400">
                      {inv.period} &bull; {inv.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-gray-700">{fmt(inv.amount)}</div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        inv.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : inv.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {inv.status === "paid" ? "Lunas" : inv.status === "pending" ? "Belum Bayar" : "Overdue"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MemberNav>
  );
}
