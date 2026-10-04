"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  reportsApi,
  FinancialSummary,
  RevenueTrend,
  TrafficStats,
} from "@/lib/api/reports";
import { systemApi, SystemStatusResponse, ServiceStatus } from "@/lib/api/system";
import { formatRupiah, cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Server,
  Database,
  Zap,
  Radio,
  Globe,
  Cpu,
  Network,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { paymentApi, Payment } from "@/lib/api/payments";
import RecentPayments from "./RecentPayments";
import RevenueBreakdown from "./RevenueBreakdown";

export default function DashboardPage() {
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [traffic, setTraffic] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const loadSystemStatus = useCallback(async () => {
    try {
      setLoadingSystem(true);
      const res = await systemApi.getStatus();
      setSystemStatus(res);
    } catch (err) {
      console.error("Failed to load system status:", err);
    } finally {
      setLoadingSystem(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fin, trn, trf] = await Promise.allSettled([
        reportsApi.getFinancialSummary(),
        reportsApi.getRevenueTrends(6),
        reportsApi.getTrafficStats(),
      ]);
      if (fin.status === "fulfilled") setFinancial(fin.value);
      if (trn.status === "fulfilled") setTrends(trn.value);
      if (trf.status === "fulfilled") setTraffic(trf.value);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const list = await paymentApi.list({ limit: 20 });
      const sorted = list
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentPayments(sorted);
    } catch (err) {
      console.error("Failed to load recent payments:", err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadSystemStatus();
    loadPayments();
  }, [loadData, loadSystemStatus, loadPayments]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadSystemStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadSystemStatus]);

  const chartData = (trends || []).map((t) => ({
    bulan: t.month,
    Tagihan: t.invoiced,
    Terbayar: t.collected,
  }));

  const getServiceIcon = (id: string, category: string) => {
    switch (id) {
      case "freeradius":
        return <Radio className="w-5 h-5 text-indigo-500" />;
      case "postgresql":
        return <Database className="w-5 h-5 text-blue-500" />;
      case "redis":
        return <Zap className="w-5 h-5 text-rose-500" />;
      case "billing-api":
        return <Globe className="w-5 h-5 text-emerald-500" />;
      case "billing-worker":
        return <Layers className="w-5 h-5 text-amber-500" />;
      case "gogiga-isp":
      case "ispsync-core":
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case "gogiga-fttx":
      case "ispsync-fttx":
        return <Cpu className="w-5 h-5 text-cyan-500" />;
      case "nas-gateway":
        return <Network className="w-5 h-5 text-teal-500" />;
      default:
        return <Server className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Ringkasan operasional ISP Billing & Network Access Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/radius" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors">
            <Radio className="w-4 h-4 text-indigo-600" /> Monitoring RADIUS
          </Link>
          <Link href="/admin/reports" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700 transition-colors">
            Lihat Analitik Lengkap
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      {/* Stats Grid 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Pelanggan" value={loading ? "..." : financial ? String(financial.total_customers) : "0"} subtitle={`${financial?.active_subscribers || 0} aktif`} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" color="blue" />
        <StatCard title="MRR (Recurring)" value={loading ? "..." : financial ? formatRupiah(financial.mrr) : "Rp 0"} subtitle={`ARR: ${financial ? formatRupiah(financial.arr) : "Rp 0"}`} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="green" />
        <StatCard title="Total Terkumpul" value={loading ? "..." : financial ? formatRupiah(financial.total_collected) : "Rp 0"} subtitle={`Rate: ${financial?.collection_rate_percent != null ? financial.collection_rate_percent.toFixed(1) : 0}%`} icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" color="purple" />
        <StatCard title="Tunggakan Tagihan" value={loading ? "..." : financial ? formatRupiah(financial.outstanding_due) : "Rp 0"} subtitle={`ARPU: ${financial ? formatRupiah(financial.arpu) : "Rp 0"}`} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" color="orange" />
      </div>

      {/* Stats Grid 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Sesi Online Aktif" value={loading ? "..." : traffic ? `${traffic.active_sessions} Sesi` : "0 Sesi"} subtitle="RADIUS accounting" icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" color="cyan" />
        <StatCard title="Trafik Terpakai" value={loading ? "..." : traffic?.total_gigabytes != null ? `${traffic.total_gigabytes.toFixed(1)} GB` : "0 GB"} subtitle={`↓ ${traffic?.download_gigabytes != null ? traffic.download_gigabytes.toFixed(1) : 0} GB | ↑ ${traffic?.upload_gigabytes != null ? traffic.upload_gigabytes.toFixed(1) : 0} GB`} icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" color="green" />
        <StatCard title="Churn Rate (30 Hari)" value={loading ? "..." : financial?.churn_rate_percent != null ? `${financial.churn_rate_percent.toFixed(1)}%` : "0%"} subtitle="Tingkat retensi pelanggan" icon="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" color="yellow" />
      </div>

      {/* Server & Service Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Activity className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">Status Server & Layanan Jaringan</h2>
                {systemStatus && (
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1", systemStatus.overall_status === "HEALTHY" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : systemStatus.overall_status === "DEGRADED" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-rose-100 text-rose-800 border border-rose-200")}>
                    <span className={cn("w-2 h-2 rounded-full", systemStatus.overall_status === "HEALTHY" ? "bg-emerald-500 animate-pulse" : systemStatus.overall_status === "DEGRADED" ? "bg-amber-500" : "bg-rose-500 animate-ping")} />
                    {systemStatus.overall_status === "HEALTHY" ? "Semua Layanan Normal" : systemStatus.overall_status === "DEGRADED" ? "Ada Penurunan Performa" : "Gangguan Layanan Kritis"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Pemantauan realtime AAA FreeRADIUS, PostgreSQL, Redis, dan Network Gateway</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none"><input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" /> Auto-refresh (15s)</label>
            <button onClick={() => loadSystemStatus()} disabled={loadingSystem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors disabled:opacity-50"><RefreshCw className={cn("w-3.5 h-3.5", loadingSystem && "animate-spin text-indigo-600")} /> <span>Periksa Status</span></button>
          </div>
        </div>
        {/* Metrics */}
        {systemStatus?.metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex flex-col"><span className="text-slate-400 font-medium">Sesi RADIUS Aktif</span><span className="font-bold text-slate-800 font-mono text-sm mt-0.5">{systemStatus.metrics.active_radius_sessions} Sesi Online</span></div>
            <div className="flex flex-col"><span className="text-slate-400 font-medium">Router NAS BRAS</span><span className="font-bold text-slate-800 font-mono text-sm mt-0.5">{systemStatus.metrics.total_nas_routers} Terdaftar</span></div>
            <div className="flex flex-col"><span className="text-slate-400 font-medium">Koneksi Database</span><span className="font-bold text-slate-800 font-mono text-sm mt-0.5">{systemStatus.metrics.db_connections_open} Pool Aktif</span></div>
            <div className="flex flex-col"><span className="text-slate-400 font-medium">Pelanggan Aktif</span><span className="font-bold text-slate-800 font-mono text-sm mt-0.5">{systemStatus.metrics.total_active_subs} / {systemStatus.metrics.total_customers}</span></div>
            <div className="flex flex-col col-span-2 sm:col-span-1"><span className="text-slate-400 font-medium">API Server Uptime</span><span className="font-bold text-emerald-700 font-mono text-sm mt-0.5">{systemStatus.metrics.server_uptime_human}</span></div>
          </div>
        )}
        {/* Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {loadingSystem && !systemStatus ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> <span>Memeriksa status komponen server & layanan...</span></div>
          ) : (
            systemStatus?.services.map((svc) => {
              const isOk = svc.status === "OPERATIONAL";
              const isDegraded = svc.status === "DEGRADED";
              return (
                <div key={svc.id} className={cn("p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between", isOk ? "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs" : isDegraded ? "bg-amber-50/40 border-amber-200" : "bg-rose-50/50 border-rose-200")}>
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 shrink-0">{getServiceIcon(svc.id, svc.category)}</div>
                        <div className="min-w-0"><h4 className="font-semibold text-slate-900 text-xs truncate" title={svc.name}>{svc.name}</h4><span className="text-[10px] text-slate-400 font-mono block truncate">{svc.target}</span></div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1"><span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide", isOk ? "bg-emerald-100 text-emerald-800" : isDegraded ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800")}><span className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-emerald-500 animate-pulse" : isDegraded ? "bg-amber-500" : "bg-rose-500")} />{isOk ? "ONLINE" : isDegraded ? "DEGRADED" : "OFFLINE"}</span></div>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">{svc.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono"><span className="text-slate-600 truncate max-w-[140px]" title={svc.details}>{svc.details || "-"}</span><span className={cn("font-semibold shrink-0 ml-1", svc.latency_ms < 10 ? "text-emerald-600" : svc.latency_ms < 100 ? "text-amber-600" : "text-rose-600")}>{svc.latency_ms > 0 ? `${svc.latency_ms.toFixed(1)} ms` : "< 1 ms"}</span></div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentPayments payments={recentPayments} loading={loadingPayments} />
        <RevenueBreakdown financial={financial} loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Pendapatan 6 Bulan Terakhir</h3>
            <Link href="/admin/reports" className="text-xs text-blue-600 hover:underline">Detail & Filter →</Link>
          </div>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => [formatRupiah(Number(value) || 0), ""]} contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="Tagihan" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.2} fill="#3b82f6" />
                  <Area type="monotone" dataKey="Terbayar" stroke="#10b981" strokeWidth={2} fillOpacity={0.2} fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Belum ada tren data tagihan</div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Aksi Cepat & Navigasi</h3>
            <p className="text-xs text-slate-400 mb-4">Pintasan menuju modul utama sistem</p>
            <div className="space-y-2">
              <Link href="/admin/billing" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"><span>Kelola Tagihan & Faktur</span><span>→</span></Link>
              <Link href="/admin/vouchers" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"><span>Cetak Voucher Hotspot</span><span>→</span></Link>
              <Link href="/admin/passpoint" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"><span>Profil Passpoint 2.0</span><span>→</span></Link>
              <Link href="/admin/network" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"><span>Router & Perangkat Jaringan</span><span>→</span></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// StatCard Component
const colorMap = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   border: "border-blue-100" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  border: "border-green-100" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-100" },
  cyan:   { bg: "bg-cyan-50",   icon: "text-cyan-600",   border: "border-cyan-100" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", border: "border-yellow-100" },
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: keyof typeof colorMap;
}) {
  const { bg, icon: iconColor, border } = colorMap[color];
  return (
    <div className={`bg-white rounded-xl border ${border} border-opacity-60 p-5 shadow-xs`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
        </div>
      </div>
    </div>
  );
}
