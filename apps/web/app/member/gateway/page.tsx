"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  Network,
  Server,
  ShieldCheck,
  Globe,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  Layers,
  ArrowRight,
  Plus,
  X,
  Cpu,
  Lock,
  Radio,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";

type UpstreamInfo = {
  name: string;
  host: string;
  port: number;
  protocol: string;
  routingPattern: string;
  status: string;
  description: string;
};

type GatewayMeta = {
  serverIp: string;
  caddyVersion: string;
  tlsAutomation: string;
  askWebhookUrl: string;
  edgeStatus: string;
  upstreams: UpstreamInfo[];
};

type DomainItem = {
  domain: string;
  type: "SYSTEM_ROOT" | "SYSTEM_PORTAL" | "SYSTEM_SHOWCASE" | "TENANT_SUBDOMAIN" | "CUSTOM_DOMAIN";
  category: string;
  company: string;
  tenantSlug: string;
  tenantId?: string;
  primaryUpstream: string;
  apiUpstream: string;
  tlsMode: string;
  tlsStatus: string;
  pointsToEdge?: boolean;
  canDelete?: boolean;
};

type GatewayStats = {
  totalDomains: number;
  systemDomains: number;
  tenantSubdomains: number;
  customDomains: number;
  activeUpstreams: number;
  edgeNodeIp: string;
};

export default function GatewayManagementPage() {
  const { member, loading: memberLoading } = useMember();
  const [gatewayInfo, setGatewayInfo] = useState<GatewayMeta | null>(null);
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "SYSTEM" | "TENANT" | "CUSTOM">("ALL");
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Diagnostic Modal State
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [diagnosticDomain, setDiagnosticDomain] = useState("");
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Custom Domain Modal State
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false);
  const [selectedTenantSlug, setSelectedTenantSlug] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [customDomainSubmitting, setCustomDomainSubmitting] = useState(false);

  // Topology View Modal
  const [isTopologyOpen, setIsTopologyOpen] = useState(false);

  const isSuperadmin =
    member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001";

  const fetchGatewayData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/gateway");
      const data = await res.json();
      if (data.success) {
        setGatewayInfo(data.gatewayInfo);
        setStats(data.stats);
        setDomains(data.domains);
      }
    } catch (err) {
      console.error("Failed to load gateway data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatewayData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  // Run live diagnostic
  const runDiagnostic = async (domainToTest: string) => {
    setDiagnosticDomain(domainToTest);
    setIsDiagnosticOpen(true);
    setDiagnosticLoading(true);
    setDiagnosticResult(null);

    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleTimeString()}] Memulai diagnosis edge untuk hostname "${domainToTest}"...`);
    logs.push(`[${new Date().toLocaleTimeString()}] Tahap 1: Verifikasi resolusi DNS publik (A-Record / CNAME)...`);
    setDiagnosticLogs([...logs]);

    try {
      // 1. Verify DNS
      const dnsRes = await fetch("/api/member/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_dns", domain: domainToTest })
      });
      const dnsData = await dnsRes.json();

      if (dnsData.success) {
        if (dnsData.pointsToEdge) {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 1 OK: Hostname mengarah tepat ke IP Gateway 103.179.65.73 (${dnsData.latencyMs}ms).`);
        } else if (dnsData.isResolved) {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 1 PERINGATAN: DNS terarah ke [${dnsData.resolvedIps.join(", ")}], bukan 103.179.65.73.`);
        } else {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 1 GAGAL: Hostname belum terpropagasi di server DNS.`);
        }
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] Tahap 1 ERROR: ${dnsData.error}`);
      }
      setDiagnosticLogs([...logs]);

      // 2. Test Caddy Ask Hook
      logs.push(`[${new Date().toLocaleTimeString()}] Tahap 2: Menguji otorisasi On-Demand TLS via Caddy Ask Webhook...`);
      setDiagnosticLogs([...logs]);

      const askRes = await fetch("/api/member/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_caddy_ask", domain: domainToTest })
      });
      const askData = await askRes.json();

      if (askData.success) {
        if (askData.authorized) {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 2 OK: Caddy mengotorisasi penerbitan sertifikat SSL (HTTP 200 OK).`);
        } else {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 2 DITOLAK: Kebijakan Caddy menolak penerbitan sertifikat (HTTP ${askData.statusCode}).`);
        }
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] Tahap 2 ERROR: ${askData.error}`);
      }
      setDiagnosticLogs([...logs]);

      // 3. Probe HTTPS connection
      logs.push(`[${new Date().toLocaleTimeString()}] Tahap 3: Menguji jabat tangan SSL/TLS HTTPS pada port 443...`);
      setDiagnosticLogs([...logs]);

      const sslRes = await fetch("/api/member/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "probe_ssl", domain: domainToTest })
      });
      const sslData = await sslRes.json();

      if (sslData.success) {
        if (sslData.online) {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 3 OK: Koneksi HTTPS aktif (HTTP ${sslData.statusCode}, respons ${sslData.latencyMs}ms).`);
          logs.push(`[${new Date().toLocaleTimeString()}] DIAGNOSIS SELESAI: Hostname siap beroperasi penuh.`);
        } else {
          logs.push(`[${new Date().toLocaleTimeString()}] Tahap 3 CATATAN: Port 443 belum aktif atau menunggu penerbitan sertifikat pertama saat diakses klien.`);
        }
      }
      setDiagnosticLogs([...logs]);
      setDiagnosticResult({ dns: dnsData, ask: askData, ssl: sslData });
    } catch (err: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ERROR TIDAK TERDUGA: ${err.message}`);
      setDiagnosticLogs([...logs]);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Submit custom domain
  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantSlug || !customDomainInput) return;
    setCustomDomainSubmitting(true);

    try {
      const res = await fetch("/api/member/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_custom_domain",
          tenantSlug: selectedTenantSlug,
          customDomain: customDomainInput.trim().toLowerCase()
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCustomDomainModalOpen(false);
        setActionMessage(data.message);
        setCustomDomainInput("");
        fetchGatewayData();
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        alert("Gagal menyimpan custom domain: " + data.error);
      }
    } catch (err: any) {
      alert("Terjadi kesalahan sistem: " + err.message);
    } finally {
      setCustomDomainSubmitting(false);
    }
  };

  const filteredDomains = domains.filter((d) => {
    if (filterTab === "SYSTEM") {
      if (d.type !== "SYSTEM_ROOT" && d.type !== "SYSTEM_PORTAL" && d.type !== "SYSTEM_SHOWCASE") return false;
    } else if (filterTab === "TENANT") {
      if (d.type !== "TENANT_SUBDOMAIN") return false;
    } else if (filterTab === "CUSTOM") {
      if (d.type !== "CUSTOM_DOMAIN") return false;
    }

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.domain.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.tenantSlug.toLowerCase().includes(q) ||
      d.primaryUpstream.toLowerCase().includes(q)
    );
  });

  // Extract unique tenant slugs for custom domain dropdown
  const tenantOptions = Array.from(
    new Set(
      domains
        .filter((d) => d.type === "TENANT_SUBDOMAIN" && d.tenantSlug !== "showcase" && d.tenantSlug !== "ispsync")
        .map((d) => JSON.stringify({ slug: d.tenantSlug, company: d.company, id: d.tenantId }))
    )
  ).map((s) => JSON.parse(s));

  if (!isSuperadmin && !memberLoading) {
    return (
      <MemberNav>
        <div className="flex-1 ml-64 p-8 min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg">
            <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-900 mb-1">Akses Terbatas Administrator Master</h2>
            <p className="text-sm text-red-700">
              Modul Caddy Edge Gateway dan Manajemen Domain Routing hanya dapat diakses oleh akun Superadmin Platform ISPSYNC.
            </p>
          </div>
        </div>
      </MemberNav>
    );
  }

  return (
    <MemberNav>
      <div className="flex-1 ml-64 p-8 min-h-screen bg-slate-50 text-slate-800 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                SUPERADMIN GATEWAY
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Edge Reverse Proxy &amp; On-Demand TLS
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Network className="w-6 h-6 text-cyan-600" />
              <span>Caddy Gateway &amp; Domain Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pemantauan orkestrasi reverse proxy Caddy, validasi On-Demand TLS otomatis, serta pemetaan 4 upstream engine platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsTopologyOpen(true)}
              className="whitespace-nowrap px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-white shrink-0"
            >
              <Layers className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>Topologi Pipeline</span>
            </button>
            <button
              onClick={() => setIsCustomDomainModalOpen(true)}
              className="whitespace-nowrap px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Daftar Custom Domain</span>
            </button>
            <button
              onClick={fetchGatewayData}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors bg-white shadow-xs cursor-pointer shrink-0"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action notification banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Domain Terpantau</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{stats?.totalDomains || 0}</div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
              <span className="text-cyan-700 font-semibold">{stats?.tenantSubdomains || 0} Subdomain Klien</span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-700 font-semibold">{stats?.systemDomains || 0} Sistem</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Otorisasi On-Demand TLS</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">ACTIVE</div>
            <div className="text-[11px] text-slate-500 mt-2">Zero-Touch Let&apos;s Encrypt &amp; ZeroSSL</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Edge Cluster IP</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats?.edgeNodeIp || "103.179.65.73"}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-2">Port 80 (HTTP) &amp; Port 443 (HTTPS)</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Upstream Reverse Proxy</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-cyan-700 tracking-tight">4 Engine</div>
            <div className="text-[11px] text-slate-500 mt-2">Web:3000, API:8080, Nexus, FiberGrid</div>
          </div>
        </div>

        {/* Caddy Hook Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Webhook Otorisasi On-Demand TLS Caddy</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                ONLINE HTTP 200
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              GET http://172.18.0.1:8081/api/v1/caddy/ask?domain=&#123;domain&#125;
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => runDiagnostic("ispsync.id")}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-600" />
              <span>Uji Host Apex</span>
            </button>
            <button
              onClick={() => {
                const firstTenant = domains.find(d => d.type === "TENANT_SUBDOMAIN");
                if (firstTenant) runDiagnostic(firstTenant.domain);
              }}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              <span>Uji Tenant Klien</span>
            </button>
          </div>
        </div>

        {/* Domain Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Filter and Search Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setFilterTab("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "ALL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({domains.length})
              </button>
              <button
                onClick={() => setFilterTab("SYSTEM")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "SYSTEM"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sistem &amp; Showcase ({stats?.systemDomains || 0})
              </button>
              <button
                onClick={() => setFilterTab("TENANT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "TENANT"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Subdomain Tenant ({stats?.tenantSubdomains || 0})
              </button>
              <button
                onClick={() => setFilterTab("CUSTOM")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "CUSTOM"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Domain ({stats?.customDomains || 0})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari domain, tenant, atau engine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-600 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Hostname FQDN</th>
                  <th className="py-3.5 px-5">Peran &amp; Kategori</th>
                  <th className="py-3.5 px-5">Entitas / Tenant</th>
                  <th className="py-3.5 px-5">Target Upstream</th>
                  <th className="py-3.5 px-5">Status SSL (TLS)</th>
                  <th className="py-3.5 px-5 text-right">Diagnostik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDomains.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada domain yang cocok dengan pencarian atau filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredDomains.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-slate-900 text-sm">{d.domain}</span>
                              <button
                                onClick={() => copyToClipboard(d.domain)}
                                className="text-slate-400 hover:text-cyan-600 transition-colors p-0.5"
                                title="Salin domain"
                              >
                                {copiedDomain === d.domain ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={`https://${d.domain}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-cyan-600 transition-colors p-0.5"
                                title="Buka situs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{d.category}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 align-middle">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {d.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-4 px-5 align-middle">
                        <div className="font-semibold text-slate-800 text-xs">{d.company}</div>
                        <div className="text-[10px] text-cyan-700 font-mono mt-0.5">slug: {d.tenantSlug}</div>
                      </td>

                      <td className="py-4 px-5 align-middle font-mono">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {d.primaryUpstream}
                        </span>
                      </td>

                      <td className="py-4 px-5 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{d.tlsStatus}</span>
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.tlsMode}</div>
                      </td>

                      <td className="py-4 px-5 align-middle text-right">
                        <button
                          onClick={() => runDiagnostic(d.domain)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Terminal className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Diagnosa</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-4 pb-8 border-t border-slate-200 text-center text-xs text-slate-400">
          © 2026 PT Inovasi Sistem Pintar. All rights reserved. Enterprise Carrier-Grade Caddy Edge Proxy.
        </footer>

        {/* ── MODAL 1: Diagnostic Live Runner ───────────────────────────── */}
        {isDiagnosticOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Edge Diagnostic: {diagnosticDomain}</h3>
                </div>
                <button
                  onClick={() => setIsDiagnosticOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Status Indicator */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    {diagnosticLoading ? (
                      <RefreshCw className="w-4 h-4 text-cyan-600 animate-spin" />
                    ) : diagnosticResult?.ssl?.online || diagnosticResult?.ask?.authorized ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      {diagnosticLoading
                        ? "Menjalankan Pengujian Edge & SSL..."
                        : diagnosticResult?.ssl?.online
                        ? "Domain Aktif & Sertifikat SSL Beroperasi"
                        : "Diagnostik Selesai"}
                    </span>
                  </div>
                  <button
                    onClick={() => runDiagnostic(diagnosticDomain)}
                    disabled={diagnosticLoading}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    Uji Ulang
                  </button>
                </div>

                {/* Terminal Console Output */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-[11px] space-y-1.5 max-h-64 overflow-y-auto shadow-inner">
                  {diagnosticLogs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes("ERROR")
                          ? "text-red-400"
                          : log.includes("PERINGATAN") || log.includes("DITOLAK")
                          ? "text-amber-400"
                          : log.includes("OK") || log.includes("SELESAI")
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>

                {/* Explanatory Note */}
                <div className="text-[11px] text-slate-600 leading-normal p-3.5 rounded-xl bg-cyan-50/60 border border-cyan-100">
                  <strong className="text-slate-800">Arsitektur On-Demand TLS:</strong> Caddy otomatis meminta izin ke endpoint internal sebelum menerbitkan sertifikat SSL Let&apos;s Encrypt. Jika domain baru diarahkan ke IP <code className="text-cyan-700 font-bold">103.179.65.73</code>, sertifikat HTTPS otomatis dibuat dalam 1-2 detik saat akses HTTP/HTTPS pertama dilakukan.
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsDiagnosticOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: Register Custom Domain ───────────────────────────── */}
        {isCustomDomainModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
              <form onSubmit={handleSaveCustomDomain}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Daftarkan Custom Domain FQDN</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomDomainModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Pilih Tenant SaaS
                    </label>
                    <select
                      value={selectedTenantSlug}
                      onChange={(e) => setSelectedTenantSlug(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-cyan-600"
                    >
                      <option value="">-- Pilih Tenant --</option>
                      {tenantOptions.map((t, idx) => (
                        <option key={idx} value={t.slug}>
                          {t.company} ({t.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nama Custom Domain (FQDN)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. billing.gogiga.net.id atau portal.myisp.co.id"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-600 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Masukkan domain tanpa http:// atau https://.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
                    <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      Instruksi Konfigurasi DNS Klien:
                    </div>
                    <div className="space-y-1 font-mono text-[10px] text-slate-700">
                      <div>Tipe: <span className="text-slate-900 font-bold">A Record</span></div>
                      <div>Host / Subdomain: <span className="text-slate-900 font-bold">@ atau subdomain</span></div>
                      <div>Nilai Tujuan (Edge IP): <span className="text-cyan-700 font-bold">103.179.65.73</span></div>
                      <div className="text-slate-500 pt-1">Atau CNAME Record ke: <span className="text-cyan-700 font-bold">ispsync.id</span></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomDomainModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={customDomainSubmitting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {customDomainSubmitting ? "Mendaftarkan..." : "Daftarkan ke On-Demand TLS"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 3: Topology Inspector ───────────────────────────────── */}
        {isTopologyOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Topologi Arsitektur Caddy Edge Proxy</h3>
                </div>
                <button
                  onClick={() => setIsTopologyOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="text-[11px] text-slate-600">
                  Seluruh lalu lintas masuk dari domain Apex, subdomain tenant, dan custom domain diterima oleh Caddy Edge di port 80 &amp; 443 sebelum dialirkan ke upstream engine:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gatewayInfo?.upstreams.map((up, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{up.name}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          {up.status}
                        </span>
                      </div>
                      <div className="font-mono text-cyan-700 font-semibold text-[11px]">
                        Target: {up.host}
                      </div>
                      <div className="text-[11px] text-slate-600 leading-relaxed">
                        {up.description}
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                        Pattern: {up.routingPattern}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 text-slate-700 space-y-1.5">
                  <div className="font-bold text-cyan-900 text-xs">Validasi Keamanan Webhook:</div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Setiap ada request SSL handshake baru, Caddy menghubungi endpoint <code className="text-cyan-800 font-bold">/api/v1/caddy/ask</code>. Sertifikat SSL HTTPS On-Demand hanya akan diterbitkan jika domain berakhiran <code className="text-cyan-800 font-bold">.ispsync.id</code> atau telah terdaftar aktif sebagai custom domain resmi tenant.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsTopologyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MemberNav>
  );
}
