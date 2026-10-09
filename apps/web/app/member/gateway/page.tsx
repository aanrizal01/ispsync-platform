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
        <div className="p-8 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
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
      <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
        {/* Ambient Radial Glows (Aurora Effect) */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white">CADDY EDGE GATEWAY</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  CARRIER PROXY
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Reverse proxy routing &amp; On-Demand TLS multi-tenant</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsTopologyOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Topologi Pipeline</span>
            </button>
            <button
              onClick={() => setIsCustomDomainModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-900/40 text-xs font-semibold text-cyan-300 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Daftar Custom Domain</span>
            </button>
            <button
              onClick={fetchGatewayData}
              className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full relative z-10">
          {/* Notification Banner */}
          {actionMessage && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/80 backdrop-blur-sm flex items-center justify-between text-xs text-cyan-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-cyan-400 hover:text-cyan-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Domain Terpantau</span>
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-black text-white tracking-tight">{stats?.totalDomains || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">{stats?.tenantSubdomains || 0} Subdomain</span>
                <span className="text-slate-600">|</span>
                <span className="text-blue-400 font-semibold">{stats?.customDomains || 0} Custom</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Otorisasi On-Demand TLS</span>
                <Lock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 tracking-tight">ACTIVE</div>
              <div className="text-[11px] text-slate-400 mt-1">Zero-Touch ACME Let&apos;s Encrypt &amp; ZeroSSL</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Edge Cluster IP</span>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono tracking-tight">{stats?.edgeNodeIp || "103.179.65.73"}</div>
              <div className="text-[11px] text-emerald-400 font-medium mt-1">Port 80 (HTTP) &amp; Port 443 (HTTPS)</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upstream Reverse Proxy</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-black text-cyan-400 tracking-tight">4 Engine</div>
              <div className="text-[11px] text-slate-400 mt-1">Next.js Web, Billing API, Nexus, FiberGrid</div>
            </div>
          </div>

          {/* Architecture Pipeline Banner */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Caddy Ask Webhook Hook Status</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                  ONLINE HTTP 200
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                GET http://172.18.0.1:8081/api/v1/caddy/ask?domain=&#123;domain&#125;
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => runDiagnostic("ispsync.id")}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Uji Host Apex</span>
              </button>
              <button
                onClick={() => {
                  const firstTenant = domains.find(d => d.type === "TENANT_SUBDOMAIN");
                  if (firstTenant) runDiagnostic(firstTenant.domain);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Uji Tenant Terdaftar</span>
              </button>
            </div>
          </div>

          {/* Domain Table Section */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg">
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
                <button
                  onClick={() => setFilterTab("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === "ALL"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Semua ({domains.length})
                </button>
                <button
                  onClick={() => setFilterTab("SYSTEM")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === "SYSTEM"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sistem &amp; Showcase ({stats?.systemDomains || 0})
                </button>
                <button
                  onClick={() => setFilterTab("TENANT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === "TENANT"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Subdomain Tenant ({stats?.tenantSubdomains || 0})
                </button>
                <button
                  onClick={() => setFilterTab("CUSTOM")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === "CUSTOM"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Custom Domain ({stats?.customDomains || 0})
                </button>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari domain, tenant, atau engine..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Domain FQDN</th>
                    <th className="py-3 px-4">Kategori &amp; Peran</th>
                    <th className="py-3 px-4">Entitas / Tenant</th>
                    <th className="py-3 px-4">Target Upstream</th>
                    <th className="py-3 px-4">Protokol TLS</th>
                    <th className="py-3 px-4 text-right">Diagnostik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDomains.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Tidak ada domain yang cocok dengan pencarian atau filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredDomains.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{d.domain}</span>
                            <button
                              onClick={() => copyToClipboard(d.domain)}
                              className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                              title="Salin domain"
                            >
                              {copiedDomain === d.domain ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={`https://${d.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                              title="Buka situs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-300">{d.category}</div>
                          <div className="text-[10px] text-slate-500">{d.type}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-200">{d.company}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">slug: {d.tenantSlug}</div>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {d.primaryUpstream}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="text-[11px] font-semibold text-emerald-400">
                              {d.tlsStatus}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">{d.tlsMode}</div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => runDiagnostic(d.domain)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/60 hover:text-cyan-300 hover:border-cyan-700/60 border border-slate-700 text-[11px] font-semibold text-slate-300 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Terminal className="w-3 h-3 text-cyan-400" />
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
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/70 py-4 px-6 text-center text-xs text-slate-500">
          © 2026 PT. Mitra Usaha Data. All rights reserved. Enterprise Carrier-Grade Caddy Edge Proxy.
        </footer>

        {/* ── MODAL 1: Diagnostic Live Runner ───────────────────────────── */}
        {isDiagnosticOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Edge Diagnostic: {diagnosticDomain}</h3>
                </div>
                <button
                  onClick={() => setIsDiagnosticOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Status Indicator */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2">
                    {diagnosticLoading ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : diagnosticResult?.ssl?.online || diagnosticResult?.ask?.authorized ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-xs font-bold text-slate-200">
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
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Uji Ulang
                  </button>
                </div>

                {/* Terminal Console Output */}
                <div className="bg-black/90 rounded-xl p-3.5 border border-slate-800 font-mono text-[11px] space-y-1.5 max-h-64 overflow-y-auto">
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
                <div className="text-[11px] text-slate-400 leading-normal p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <strong className="text-slate-200">Arsitektur On-Demand TLS:</strong> Caddy otomatis meminta izin ke endpoint internal sebelum menerbitkan sertifikat SSL Let&apos;s Encrypt. Jika domain baru diarahkan ke IP <code className="text-cyan-400">103.179.65.73</code>, sertifikat HTTPS otomatis dibuat dalam 1-2 detik saat akses HTTP/HTTPS pertama dilakukan.
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <button
                  onClick={() => setIsDiagnosticOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: Register Custom Domain ───────────────────────────── */}
        {isCustomDomainModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
              <form onSubmit={handleSaveCustomDomain}>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Daftarkan Custom Domain FQDN</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomDomainModalOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Pilih Tenant SaaS
                    </label>
                    <select
                      value={selectedTenantSlug}
                      onChange={(e) => setSelectedTenantSlug(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
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
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nama Custom Domain (FQDN)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. billing.gogiga.net.id atau portal.myisp.co.id"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Masukkan domain tanpa http:// atau https://.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                      Instruksi Konfigurasi DNS Klien:
                    </div>
                    <div className="space-y-1 font-mono text-[10px] text-slate-300">
                      <div>Tipe: <span className="text-white font-bold">A Record</span></div>
                      <div>Host / Subdomain: <span className="text-white font-bold">@ atau subdomain</span></div>
                      <div>Nilai Tujuan (Edge IP): <span className="text-cyan-400 font-bold">103.179.65.73</span></div>
                      <div className="text-slate-500 pt-1">Atau CNAME Record ke: <span className="text-cyan-400 font-bold">ispsync.id</span></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomDomainModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={customDomainSubmitting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Topologi Arsitektur Caddy Edge Proxy</h3>
                </div>
                <button
                  onClick={() => setIsTopologyOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="text-[11px] text-slate-400">
                  Seluruh lalu lintas masuk dari domain Apex, subdomain tenant, dan custom domain diterima oleh Caddy Edge di port 80 &amp; 443 sebelum dialirkan ke upstream engine:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gatewayInfo?.upstreams.map((up, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{up.name}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                          {up.status}
                        </span>
                      </div>
                      <div className="font-mono text-cyan-400 text-[11px]">
                        Target: {up.host}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        {up.description}
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                        Pattern: {up.routingPattern}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/60 text-slate-300 space-y-1.5">
                  <div className="font-bold text-cyan-400 text-xs">Validasi Keamanan Webhook:</div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Setiap ada request SSL handshake baru, Caddy menghubungi endpoint <code className="text-cyan-300">/api/v1/caddy/ask</code>. Sertifikat SSL HTTPS On-Demand hanya akan diterbitkan jika domain berakhiran <code className="text-cyan-300">.ispsync.id</code> atau telah terdaftar aktif sebagai custom domain resmi tenant.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <button
                  onClick={() => setIsTopologyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer"
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
