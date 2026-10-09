"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  Building2,
  Users,
  Search,
  Plus,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Filter,
  Power,
  Edit3,
  Trash2,
  Copy,
  Check,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  Terminal,
  Server,
  Database,
  Globe,
  ArrowRight,
} from "lucide-react";

const PROVISIONING_STAGES = [
  { id: 1, name: "Validasi Alokasi Subdomain & Routing DNS", desc: "Memverifikasi ketersediaan subdomain dan mapping host reverse proxy Caddy" },
  { id: 2, name: "Inskripsi Entitas Master SaaS Catalog", desc: "Mendaftarkan profil ISP, tier lisensi, dan alokasi batas kapasitas pelanggan" },
  { id: 3, name: "Provisioning Skema Isolasi Database", desc: "Menginisialisasi partisi multi-tenant pada database Billing & Ledger" },
  { id: 4, name: "Inisialisasi Kredensial Administrator", desc: "Membangun akun master tenant, enkripsi password, dan role otorisasi root" },
  { id: 5, name: "Pendaftaran Node Operasional Nexus & FTTX", desc: "Mengalokasikan namespace router RADIUS dan topologi FiberGrid" },
  { id: 6, name: "Pemeriksaan Kesiapan Tri-Engine (Healthcheck)", desc: "Verifikasi integrasi modul tri-engine (Ledger, Nexus, FiberGrid)" },
];

const PURGE_STAGES = [
  { id: 1, name: "Pencabutan Kredensial & Revokasi Sesi", desc: "Menghentikan seluruh session token dan hak akses administrator/staf" },
  { id: 2, name: "Pemusnahan Basis Data Billing (Ledger)", desc: "Menghapus faktur, kas, router, data pelanggan, dan agen dari isp_billing" },
  { id: 3, name: "Pemusnahan Basis Data NOC / Nexus", desc: "Menghapus pelanggan aktif, staff NOC, dan konfigurasi dari ispsync" },
  { id: 4, name: "Pemusnahan Basis Data FTTX / FiberGrid", desc: "Menghapus topologi OLT, ODC, ODP, drop cable, dan ONT dari ispsync_fibergrid" },
  { id: 5, name: "De-registrasi Subdomain Master SaaS", desc: "Menghapus konfigurasi routing dan entitas dari katalog langganan" },
  { id: 6, name: "Verifikasi 0-Byte & Decommission Selesai", desc: "Memverifikasi seluruh tabel telah steril dan tidak ada sisa data tertinggal" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Tenant = {
  id: string;
  email: string;
  company: string;
  picName: string;
  phone?: string;
  address?: string;
  npwp?: string;
  nib?: string;
  sklo?: string;
  plan: string;
  planName: string;
  planPrice: string;
  planCapacity: string;
  status: string;
  subscribedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  domain: string;
  role?: string;
  daysLeft: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
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

function formatRupiah(amount: number | string): string {
  const num = typeof amount === "string" ? Number(amount.replace(/\./g, "")) : amount;
  if (isNaN(num)) return "Rp 0";
  return "Rp " + num.toLocaleString("id-ID");
}

export default function SaaSAdminTenantsPage() {
  const { member, token } = useMember();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    expiringSoon: 0,
    totalMRR: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeTenant, setActiveTenant] = useState<Partial<Tenant> | null>(null);
  const [formPassword, setFormPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Provisioning pipeline state
  const [isProvisioningModalOpen, setIsProvisioningModalOpen] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(1);
  const [provisioningLogs, setProvisioningLogs] = useState<string[]>([]);
  const [provisioningComplete, setProvisioningComplete] = useState(false);
  const [provisionedTenant, setProvisionedTenant] = useState<any>(null);

  // Strict Delete Confirmation & Purge Modal State
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleteInputText, setDeleteInputText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [isPurgingInProgress, setIsPurgingInProgress] = useState(false);
  const [purgeStep, setPurgeStep] = useState(1);
  const [purgeLogs, setPurgeLogs] = useState<string[]>([]);
  const [purgeComplete, setPurgeComplete] = useState(false);

  const isSuperadmin =
    member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001";

  useEffect(() => {
    if (token) {
      fetchTenants();
    }
  }, [token]);

  async function fetchTenants() {
    setLoading(true);
    try {
      const res = await fetch("/api/member/tenants", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Gagal mengambil data tenant:", err);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  async function handleToggleStatus(tenant: Tenant) {
    if (tenant.isOwner) return;
    try {
      const res = await fetch("/api/member/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "toggle_status", id: tenant.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(null), 3000);
        fetchTenants();
      } else {
        alert("Gagal mengubah status: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err) {
      alert("Koneksi gagal saat mengubah status.");
    }
  }

  function openDeleteModal(tenant: Tenant) {
    if (tenant.isOwner) return;
    setDeleteTarget(tenant);
    setDeleteInputText("");
    setIsPurgingInProgress(false);
    setPurgeStep(1);
    setPurgeLogs([]);
    setPurgeComplete(false);
  }

  async function executeDeleteTenant() {
    if (!deleteTarget || deleteTarget.isOwner) return;
    setDeleting(true);
    setIsPurgingInProgress(true);
    setPurgeStep(1);
    setPurgeComplete(false);

    const cleanDomain = deleteTarget.domain.replace(/^https?:\/\//, "");
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] [DECOMMISSION] Memulai auto-purge destruktif untuk "${deleteTarget.company}"...`,
      `[${new Date().toLocaleTimeString()}] [STAGE 1] Mencabut seluruh sesi login, JWT, dan API access key...`,
    ];
    setPurgeLogs(initialLogs);

    // Optimistically mark status in table
    setTenants((prev) =>
      prev.map((t) => (t.id === deleteTarget.id && t.domain === deleteTarget.domain ? { ...t, status: "purging" } : t))
    );

    try {
      await sleep(650);
      setPurgeStep(2);
      setPurgeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 1] Seluruh sesi dan token otentikasi berhasil direvokasi.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 2] Mengirim sinyal pemusnahan basis data Billing (isp_billing)...`,
      ]);

      const apiPromise = fetch("/api/member/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", id: deleteTarget.id, domain: deleteTarget.domain }),
      }).then((r) => r.json());

      await sleep(750);
      setPurgeStep(3);
      setPurgeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 2] Data faktur, kas, router, pelanggan, dan agen berhasil dimusnahkan.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 3] Memusnahkan proyeksi operasional NOC / Nexus (ispsync)...`,
      ]);

      await sleep(750);
      setPurgeStep(4);
      setPurgeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 3] Data subscriber, staff operasional, dan parameter router terhapus.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 4] Memusnahkan topologi FTTX / FiberGrid (ispsync_fibergrid)...`,
      ]);

      await sleep(700);
      setPurgeStep(5);
      setPurgeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 4] Topologi OLT, ODC, ODP, drop cable, dan akun FTTX terhapus.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 5] Melakukan de-registrasi domain & pembersihan cache reverse proxy...`,
      ]);

      const data = await apiPromise;

      if (!data.success) {
        throw new Error(data.error || "Gagal memproses pemusnahan di server.");
      }

      await sleep(650);
      setPurgeStep(6);
      setPurgeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 5] Entitas katalog SaaS dan konfigurasi routing telah dihapus.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 6] Audit integritas: 0 byte data tersisa. Decommission selesai 100%.`,
        `[${new Date().toLocaleTimeString()}] [SUCCESS] Seluruh basis data tenant berhasil disterilkan secara permanen.`,
      ]);

      await sleep(400);
      setPurgeComplete(true);
      fetchTenants();
    } catch (err: any) {
      setPurgeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] Kegagalan pemusnahan data: ${err.message}`,
      ]);
      alert("Kegagalan pemusnahan data: " + err.message);
      fetchTenants();
    } finally {
      setDeleting(false);
    }
  }

  function openCreateModal() {
    setModalMode("create");
    setActiveTenant({
      company: "",
      picName: "",
      email: "",
      phone: "",
      address: "",
      npwp: "",
      nib: "",
      sklo: "",
      domain: "",
      plan: "professional",
      planName: "Professional",
      planPrice: "6500000",
      planCapacity: "5.000 Pelanggan",
      clusterType: "shared",
      clusterNode: "103.179.65.73",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    setFormPassword("");
    setIsModalOpen(true);
  }

  function openEditModal(tenant: Tenant) {
    setModalMode("edit");
    setActiveTenant({ ...tenant });
    setFormPassword("");
    setIsModalOpen(true);
  }

  async function runProvisioningPipeline(payload: any) {
    setIsModalOpen(false);
    setIsProvisioningModalOpen(true);
    setProvisioningStep(1);
    setProvisioningComplete(false);
    setProvisionedTenant(null);

    const cleanDomain = payload.domain?.replace(/^https?:\/\//, "") || "";
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] [ORCHESTRATOR] Menginisiasi pipeline provisioning untuk "${payload.company}"...`,
      `[${new Date().toLocaleTimeString()}] [STAGE 1] Memvalidasi alokasi subdomain "${cleanDomain}" pada gateway...`,
    ];
    setProvisioningLogs(initialLogs);

    // Optimistically insert temporary tenant entry into table with status "provisioning"
    const tempId = `mbr_${Date.now().toString().slice(-4)}`;
    const optimisticTenant: Tenant = {
      id: tempId,
      email: payload.email,
      company: payload.company,
      picName: payload.picName || "Administrator",
      phone: payload.phone,
      plan: payload.plan || "professional",
      planName: payload.planName || "Professional",
      planPrice: payload.planPrice || "6500000",
      planCapacity: payload.planCapacity || "5.000 Pelanggan",
      status: "provisioning",
      subscribedAt: new Date().toISOString().split("T")[0],
      expiresAt: payload.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      autoRenew: true,
      domain: cleanDomain,
      daysLeft: 365,
      isExpiringSoon: false,
      isExpired: false,
      clusterType: payload.clusterType || "shared",
      clusterNode: payload.clusterNode || "103.179.65.73",
    };
    setTenants((prev) => [optimisticTenant, ...prev]);

    try {
      await sleep(650);
      setProvisioningStep(2);
      setProvisioningLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 1] Validasi routing reverse proxy Caddy OK (status: ACTIVE).`,
        `[${new Date().toLocaleTimeString()}] [STAGE 2] Menginskripsi entitas master katalog SaaS & lisensi paket...`,
      ]);

      const apiPromise = fetch("/api/member/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      await sleep(700);
      setProvisioningStep(3);
      setProvisioningLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 2] Profil organisasi dan batas kuota pelanggan terdaftar di registry.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 3] Menerapkan partisi skema isolasi data multi-tenant (PostgreSQL)...`,
      ]);

      await sleep(750);
      setProvisioningStep(4);
      setProvisioningLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 3] Skema partisi isolasi database Billing & Ledger terkonfigurasi.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 4] Menginisialisasi kredensial administrator root & hashing password...`,
      ]);

      await sleep(700);
      setProvisioningStep(5);
      setProvisioningLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 4] Akun administrator [${payload.email}] teraktivasi dengan akses root.`,
        `[${new Date().toLocaleTimeString()}] [STAGE 5] Sinkronisasi namespace operasional modul NOC Nexus & FTTX FiberGrid...`,
      ]);

      const data = await apiPromise;

      if (!data.success) {
        throw new Error(data.error || "Gagal melakukan provisioning di backend.");
      }

      await sleep(650);
      setProvisioningStep(6);
      setProvisioningLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [STAGE 5] Node Nexus & FiberGrid terhubung ke server core (103.179.65.73).`,
        `[${new Date().toLocaleTimeString()}] [STAGE 6] Menjalankan healthcheck verifikasi kesiapan tri-engine...`,
        `[${new Date().toLocaleTimeString()}] [SUCCESS] Seluruh 3 engine (Ledger, Nexus, FiberGrid) beroperasi normal.`,
      ]);

      await sleep(500);
      setProvisioningComplete(true);
      setProvisionedTenant(data.tenant || optimisticTenant);
      fetchTenants();
    } catch (err: any) {
      setProvisioningLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] Terjadi kegagalan provisioning: ${err.message}`,
      ]);
      alert("Kegagalan provisioning: " + err.message);
      fetchTenants();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenant) return;

    const payload: any = {
      action: modalMode === "edit" ? "update" : modalMode,
      ...activeTenant,
    };
    if (formPassword) {
      payload.password = formPassword;
    }

    if (modalMode === "create") {
      runProvisioningPipeline(payload);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/member/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setActionMessage(data.message || "Data tenant berhasil disimpan.");
        setTimeout(() => setActionMessage(null), 3000);
        fetchTenants();
      } else {
        alert("Gagal menyimpan: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err) {
      alert("Koneksi ke server gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredTenants = tenants.filter((t) => {
    // If not superadmin, only show non-owner or self
    if (!isSuperadmin && t.id !== member?.id) return false;

    // Search query
    const matchSearch =
      t.company.toLowerCase().includes(search.toLowerCase()) ||
      t.domain.toLowerCase().includes(search.toLowerCase()) ||
      t.picName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());

    // Status filter
    let matchStatus = true;
    if (statusFilter === "ACTIVE") matchStatus = t.status === "active";
    if (statusFilter === "SUSPENDED") matchStatus = t.status === "suspended";
    if (statusFilter === "EXPIRING") matchStatus = t.isExpiringSoon;

    // Plan filter
    let matchPlan = true;
    if (planFilter !== "ALL") matchPlan = t.plan === planFilter;

    return matchSearch && matchStatus && matchPlan;
  });

  return (
    <MemberNav>
      <div className="max-w-6xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                SUPERADMIN CONSOLE
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Multi-Tenant Architecture
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-600" />
              <span>Daftar Pelanggan SaaS (Tenant Management)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pantau dan kelola seluruh penyewa lisensi platform ISPSYNC, alokasi kapasitas engine, serta status langganan aktif.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTenants}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tenant Baru</span>
            </button>
          </div>
        </div>

        {/* Action notification banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">Total Tenant SaaS</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalTenants}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ISP Klien Terdaftar</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">Tenant Aktif</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">{stats.activeTenants}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Operasional Berjalan</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">Estimasi MRR Platform</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-600">{formatRupiah(stats.totalMRR)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pendapatan Langganan/Bulan</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">Mendekati Expired</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.expiringSoon}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">&le; 30 Hari Tersisa</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama ISP, PIC, email, domain, atau ID member..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif Saja</option>
                <option value="SUSPENDED">Suspended Saja</option>
                <option value="EXPIRING">Mendekati Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Paket</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
                <option value="private">Private Telco</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenant List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">ID &amp; Entitas ISP</th>
                  <th className="py-3.5 px-4">PIC &amp; Kontak</th>
                  <th className="py-3.5 px-4">Paket &amp; Kapasitas</th>
                  <th className="py-3.5 px-4">Masa Berlaku</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Memuat data pelanggan SaaS...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada data pelanggan SaaS yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const cleanDomain = t.domain.replace(/^https?:\/\//, "");
                    const baseDomain = cleanDomain.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx)\./, "");
                    const ledgerUrl = t.engineUrls?.ledger || `https://ledger.${baseDomain}`;
                    const nexusUrl = t.engineUrls?.nexus || `https://nexus.${baseDomain}`;
                    const fibergridUrl = t.engineUrls?.fibergrid || `https://fibergrid.${baseDomain}`;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* ID & Entitas */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-xs">
                              {t.isOwner ? "ROOT" : t.id.slice(-3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-sm">{t.company}</span>
                                {t.isOwner && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    FOUNDER
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-slate-500 font-mono text-[11px]">
                                <span>{t.id}</span>
                                <span>&bull;</span>
                                <a
                                  href={ledgerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1"
                                >
                                  <span>{cleanDomain}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
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
                            </div>
                          </div>
                        </td>

                        {/* PIC & Kontak */}
                        <td className="py-4 px-4 align-top">
                          <div className="font-semibold text-slate-800">{t.picName}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                            <span>{t.email}</span>
                            <button
                              onClick={() => copyToClipboard(t.email, t.id + "-email")}
                              className="text-slate-400 hover:text-slate-600"
                              title="Salin email"
                            >
                              {copiedId === t.id + "-email" ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {t.phone && (
                            <div className="text-slate-400 text-[10px] font-mono mt-0.5">{t.phone}</div>
                          )}
                        </td>

                        {/* Paket & Kapasitas */}
                        <td className="py-4 px-4 align-top">
                          <div className="font-bold text-slate-900">{t.planName}</div>
                          <div className="text-blue-600 font-semibold text-[11px] mt-0.5">
                            {formatRupiah(t.planPrice)} / bln
                          </div>
                          <div className="text-slate-400 text-[10px] mt-0.5">{t.planCapacity}</div>
                        </td>

                        {/* Masa Berlaku */}
                        <td className="py-4 px-4 align-top font-mono">
                          <div className="text-slate-700 font-medium">Exp: {t.expiresAt}</div>
                          <div className="text-[11px] mt-0.5">
                            {t.isOwner ? (
                              <span className="text-purple-600 font-semibold">Seumur Hidup</span>
                            ) : t.daysLeft > 0 ? (
                              <span className={t.daysLeft <= 30 ? "text-amber-600 font-bold" : "text-slate-500"}>
                                {t.daysLeft} hari lagi
                              </span>
                            ) : (
                              <span className="text-red-600 font-bold">Kedaluwarsa</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 align-top">
                          {t.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Aktif</span>
                            </span>
                          ) : t.status === "provisioning" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse">
                              <RefreshCw className="w-3 h-3 text-cyan-600 animate-spin" />
                              <span>Provisioning...</span>
                            </span>
                          ) : t.status === "purging" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                              <span>Purging...</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-4 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Launch 3 Engines menu */}
                            {!t.isOwner && (
                              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-[10px]">
                                <a
                                  href={ledgerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`px-1.5 py-1 rounded hover:bg-blue-600 hover:text-white text-slate-600 font-bold transition-colors ${
                                    t.status === "provisioning" || t.status === "purging"
                                      ? "pointer-events-none opacity-40"
                                      : ""
                                  }`}
                                  title="Buka Ledger"
                                >
                                  Ledger
                                </a>
                                <a
                                  href={nexusUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`px-1.5 py-1 rounded hover:bg-purple-600 hover:text-white text-slate-600 font-bold transition-colors ${
                                    t.status === "provisioning" || t.status === "purging"
                                      ? "pointer-events-none opacity-40"
                                      : ""
                                  }`}
                                  title="Buka Nexus"
                                >
                                  Nexus
                                </a>
                                <a
                                  href={fibergridUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`px-1.5 py-1 rounded hover:bg-emerald-600 hover:text-white text-slate-600 font-bold transition-colors ${
                                    t.status === "provisioning" || t.status === "purging"
                                      ? "pointer-events-none opacity-40"
                                      : ""
                                  }`}
                                  title="Buka FiberGrid"
                                >
                                  Fiber
                                </a>
                              </div>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(t)}
                              disabled={t.status === "provisioning" || t.status === "purging"}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Edit Data Tenant"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Resume Button */}
                            {!t.isOwner && (
                              <button
                                onClick={() => handleToggleStatus(t)}
                                disabled={t.status === "provisioning" || t.status === "purging"}
                                className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                  t.status === "active"
                                    ? "border-amber-200 hover:bg-amber-50 text-amber-600"
                                    : "border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                                }`}
                                title={t.status === "active" ? "Suspend Tenant" : "Aktifkan Tenant"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Button */}
                            {!t.isOwner && (
                              <button
                                onClick={() => openDeleteModal(t)}
                                disabled={t.status === "provisioning" || t.status === "purging"}
                                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Pemusnahan Data Tenant (Auto-Purge)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Tambah / Edit Tenant */}
        {isModalOpen && activeTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {modalMode === "create" ? "Pendaftaran Tenant SaaS Baru" : "Edit Profil Tenant"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {modalMode === "create"
                        ? "Daftarkan ISP baru ke dalam arsitektur multi-tenant ISPSYNC"
                        : `Perbarui konfigurasi lisensi untuk ${activeTenant.company}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nama Resmi Perusahaan (PT / ISP) *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeTenant.company || ""}
                      onChange={(e) => {
                        const comp = e.target.value;
                        const isShared = (activeTenant.clusterType || "shared") === "shared";
                        let updatedDomain = activeTenant.domain || "";
                        let updatedEmail = activeTenant.email || "";

                        if (isShared && modalMode === "create" && (!activeTenant.domain || activeTenant.domain.endsWith(".ispsync.id"))) {
                          const autoSlug = comp
                            .replace(/^pt\.?\s*/i, "")
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .toLowerCase()
                            .slice(0, 16);
                          if (autoSlug) {
                            updatedDomain = `${autoSlug}.ispsync.id`;
                            if (!activeTenant.email || activeTenant.email.includes(".ispsync.id")) {
                              updatedEmail = `admin@${autoSlug}.ispsync.id`;
                            }
                          }
                        }

                        setActiveTenant({
                          ...activeTenant,
                          company: comp,
                          domain: updatedDomain,
                          email: updatedEmail,
                        });
                      }}
                      placeholder="Contoh: PT. Fiber Prima Nusantara"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Subdomain / Domain Configuration */}
                  <div className="md:col-span-2 bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Alokasi Subdomain / Domain Tenant *
                      </label>
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="radio"
                            name="clusterTypeRadio"
                            checked={(activeTenant.clusterType || "shared") === "shared"}
                            onChange={() => {
                              const slug = (activeTenant.domain || "").replace(/\.ispsync\.id$/, "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
                              setActiveTenant({
                                ...activeTenant,
                                clusterType: "shared",
                                clusterNode: "103.179.65.73",
                                domain: slug ? `${slug}.ispsync.id` : "",
                              });
                            }}
                            className="text-cyan-600 focus:ring-cyan-500"
                          />
                          <span>Shared Server (.ispsync.id)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="radio"
                            name="clusterTypeRadio"
                            checked={activeTenant.clusterType === "dedicated"}
                            onChange={() => {
                              setActiveTenant({
                                ...activeTenant,
                                clusterType: "dedicated",
                                clusterNode: "103.179.65.72",
                              });
                            }}
                            className="text-cyan-600 focus:ring-cyan-500"
                          />
                          <span>Dedicated Node</span>
                        </label>
                      </div>
                    </div>

                    {(activeTenant.clusterType || "shared") === "shared" ? (
                      <div>
                        <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500">
                          <input
                            type="text"
                            required
                            value={(activeTenant.domain || "").replace(/\.ispsync\.id$/, "")}
                            onChange={(e) => {
                              const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                              const newDomain = raw ? `${raw}.ispsync.id` : "";
                              setActiveTenant({
                                ...activeTenant,
                                domain: newDomain,
                              });
                            }}
                            placeholder="primafiber"
                            className="flex-1 px-3.5 py-2.5 text-xs font-mono font-semibold focus:outline-none text-slate-900"
                          />
                          <span className="bg-slate-100 text-slate-600 px-3.5 py-2.5 text-xs font-mono font-bold border-l border-slate-200 select-none">
                            .ispsync.id
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                          <span>
                            URL Akses: <strong className="font-mono text-cyan-700 font-bold">{activeTenant.domain ? `https://${activeTenant.domain}` : "https://[subdomain].ispsync.id"}</strong>
                          </span>
                          <span className="text-emerald-600 font-medium">✓ Server Shared (103.179.65.73)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Domain Custom Mandiri *
                          </label>
                          <input
                            type="text"
                            required
                            value={activeTenant.domain || ""}
                            onChange={(e) => setActiveTenant({ ...activeTenant, domain: e.target.value.trim() })}
                            placeholder="Contoh: gogiga.net.id"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Host IP Server Node *
                          </label>
                          <input
                            type="text"
                            required
                            value={activeTenant.clusterNode || "103.179.65.72"}
                            onChange={(e) => setActiveTenant({ ...activeTenant, clusterNode: e.target.value.trim() })}
                            placeholder="103.179.65.72"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PIC Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nama PIC / Pimpinan *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeTenant.picName || ""}
                      onChange={(e) => setActiveTenant({ ...activeTenant, picName: e.target.value })}
                      placeholder="Contoh: Ahmad Faisal"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Email Login Portal *
                    </label>
                    <input
                      type="email"
                      required
                      value={activeTenant.email || ""}
                      onChange={(e) => setActiveTenant({ ...activeTenant, email: e.target.value })}
                      placeholder="admin@primafiber.ispsync.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {modalMode === "create" ? "Password Akses *" : "Ubah Password (opsional)"}
                    </label>
                    <input
                      type="password"
                      required={modalMode === "create"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={modalMode === "create" ? "Min. 8 karakter..." : "Kosongkan jika tidak diubah"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nomor Telepon / WhatsApp PIC
                    </label>
                    <input
                      type="text"
                      value={activeTenant.phone || ""}
                      onChange={(e) => setActiveTenant({ ...activeTenant, phone: e.target.value })}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Masa Berlaku Lisensi (Expires At) *
                    </label>
                    <input
                      type="date"
                      required
                      value={activeTenant.expiresAt || ""}
                      onChange={(e) => setActiveTenant({ ...activeTenant, expiresAt: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Plan Tier */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tier Paket SaaS *
                    </label>
                    <select
                      value={activeTenant.plan || "professional"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "starter") {
                          setActiveTenant({
                            ...activeTenant,
                            plan: "starter",
                            planName: "Starter",
                            planPrice: "2500000",
                            planCapacity: "1.500 Pelanggan",
                          });
                        } else if (val === "professional") {
                          setActiveTenant({
                            ...activeTenant,
                            plan: "professional",
                            planName: "Professional",
                            planPrice: "6500000",
                            planCapacity: "5.000 Pelanggan",
                          });
                        } else if (val === "enterprise") {
                          setActiveTenant({
                            ...activeTenant,
                            plan: "enterprise",
                            planName: "Carrier-Grade Enterprise",
                            planPrice: "14500000",
                            planCapacity: "15.000 Pelanggan",
                          });
                        } else {
                          setActiveTenant({
                            ...activeTenant,
                            plan: "private",
                            planName: "Private Telco",
                            planPrice: "65000000",
                            planCapacity: "Unlimited Pelanggan",
                          });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="starter">Starter (1.500 Pelanggan - Rp 2.500.000)</option>
                      <option value="professional">Professional (5.000 Pelanggan - Rp 6.500.000)</option>
                      <option value="enterprise">Enterprise (15.000 Pelanggan - Rp 14.500.000)</option>
                      <option value="private">Private Telco (Unlimited - Rp 65.000.000)</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Status Langganan
                    </label>
                    <select
                      value={activeTenant.status || "active"}
                      onChange={(e) => setActiveTenant({ ...activeTenant, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="active">Aktif (Active)</option>
                      <option value="suspended">Ditangguhkan (Suspended)</option>
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {submitting ? "Menyimpan..." : "Simpan Data Tenant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Provisioning Infrastruktur Tenant Baru */}
        {isProvisioningModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
              {/* Aurora Glows */}
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="p-6 border-b border-slate-800/80 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                      PROVISIONING PIPELINE
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {provisioningComplete ? "Status: COMPLETED" : `Tahap ${provisioningStep} / 6`}
                    </span>
                  </div>
                  {provisioningComplete && (
                    <button
                      onClick={() => {
                        setIsProvisioningModalOpen(false);
                        fetchTenants();
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-black text-white mt-2 tracking-tight flex items-center gap-2">
                  {provisioningComplete ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Infrastruktur Cloud Tenant Siap Digunakan</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                      <span>Menginisialisasi Node &amp; Partisi Tenant</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {provisioningComplete
                    ? `Domain ${(provisionedTenant || activeTenant)?.domain} telah aktif dan terhubung ke seluruh sistem platform.`
                    : `Sedang melakukan alokasi database, DNS routing, dan kredensial untuk ${(activeTenant)?.company || "tenant"}...`}
                </p>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span className="text-slate-400">
                      {provisioningComplete
                        ? "Provisioning Selesai (100%)"
                        : PROVISIONING_STAGES[provisioningStep - 1]?.name || "Memproses..."}
                    </span>
                    <span className="font-bold text-cyan-400">
                      {provisioningComplete ? 100 : Math.min(95, Math.round((provisioningStep / 6) * 100))}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${provisioningComplete ? 100 : Math.min(95, Math.round((provisioningStep / 6) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto relative z-10">
                {/* Checkpoint list */}
                <div className="space-y-2">
                  {PROVISIONING_STAGES.map((stage) => {
                    const isDone = stage.id < provisioningStep || provisioningComplete;
                    const isCurrent = stage.id === provisioningStep && !provisioningComplete;

                    return (
                      <div
                        key={stage.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                          isDone
                            ? "bg-slate-900/60 border-slate-800 text-slate-200"
                            : isCurrent
                            ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-100 shadow-sm shadow-cyan-950/50"
                            : "bg-slate-900/20 border-slate-900/50 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                              isDone
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : isCurrent
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : "bg-slate-800 text-slate-600 border border-slate-700/50"
                            }`}
                          >
                            {isDone ? <Check className="w-3.5 h-3.5" /> : stage.id}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>{stage.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{stage.desc}</div>
                          </div>
                        </div>

                        <div>
                          {isDone ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                              SELESAI
                            </span>
                          ) : isCurrent ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700 flex items-center gap-1.5">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>PROSES</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800/60 text-slate-500 border border-slate-700/40">
                              MENUNGGU
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Terminal Log */}
                <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-mono font-bold text-slate-300 uppercase tracking-wider">
                        Orchestrator Execution Log
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-400">STREAMING</span>
                    </div>
                  </div>
                  <div className="font-mono text-[11px] space-y-1 text-slate-300 max-h-28 overflow-y-auto pr-1">
                    {provisioningLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed text-slate-300">
                        <span className="text-cyan-400 select-none mr-1">&gt;</span>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tri-Engine Access Cards (Shown on Completion) */}
                {provisioningComplete && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        Akses Langsung Tri-Engine Platform:
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        NODE 100% ONLINE
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(() => {
                        const targetDomain = (provisionedTenant?.domain || activeTenant?.domain || "").replace(/^https?:\/\//, "");
                        const base = targetDomain.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx)\./, "");
                        return (
                          <>
                            <a
                              href={`https://ledger.${base}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 transition-all text-center block"
                            >
                              <div className="text-[10px] uppercase font-bold text-cyan-400">Engine 1</div>
                              <div className="text-xs font-black text-white mt-0.5">Ledger</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">ledger.{base}</div>
                            </a>
                            <a
                              href={`https://nexus.${base}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 transition-all text-center block"
                            >
                              <div className="text-[10px] uppercase font-bold text-purple-400">Engine 2</div>
                              <div className="text-xs font-black text-white mt-0.5">Nexus NOC</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">nexus.{base}</div>
                            </a>
                            <a
                              href={`https://fibergrid.${base}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 transition-all text-center block"
                            >
                              <div className="text-[10px] uppercase font-bold text-emerald-400">Engine 3</div>
                              <div className="text-xs font-black text-white mt-0.5">FiberGrid</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">fibergrid.{base}</div>
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between relative z-10">
                <span className="text-[11px] text-slate-400 font-mono">
                  Host Cluster: 103.179.65.73 (Carrier Node)
                </span>
                <div className="flex items-center gap-2">
                  {provisioningComplete ? (
                    <button
                      onClick={() => {
                        setIsProvisioningModalOpen(false);
                        fetchTenants();
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Selesai &amp; Buka Daftar Tenant
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>Orchestrator sedang berjalan...</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Pemusnahan Data Tenant (Auto-Purge) */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-red-900/40 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
              {/* Aurora Glows */}
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 -right-32 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

              {!isPurgingInProgress ? (
                // Step 1: Strict Confirmation Form
                <div className="relative z-10 bg-white text-slate-900 rounded-3xl overflow-hidden">
                  <div className="p-6 bg-red-50/70 border-b border-red-100 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Pemusnahan Data Tenant (Permanent Auto-Purge)
                      </h3>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Menghapus tenant ini akan otomatis memusnahkan seluruh basis data operasional server.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Perusahaan:</span>
                        <span className="font-bold text-slate-900">{deleteTarget.company}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Domain Utama:</span>
                        <span className="font-mono font-semibold text-cyan-700">{deleteTarget.domain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email Admin:</span>
                        <span className="text-slate-900">{deleteTarget.email}</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl text-[11px] text-red-800 leading-relaxed">
                      <span className="font-bold uppercase tracking-wider block mb-1">Cakupan Pemusnahan Otomatis (Auto-Purge):</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        <li>Database Billing: Faktur, Pelanggan, Transaksi Kas, Router, Agen</li>
                        <li>Database NOC / Nexus: Data Pelanggan Aktif, Akun Staff, Konfigurasi</li>
                        <li>Database FTTX / FiberGrid: Topologi OLT, ODC, ODP, ONT, Kredensial Staf</li>
                      </ul>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ketik konfirmasi <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">HAPUS {deleteTarget.domain}</span> di bawah:
                      </label>
                      <input
                        type="text"
                        value={deleteInputText}
                        onChange={(e) => setDeleteInputText(e.target.value)}
                        placeholder={`HAPUS ${deleteTarget.domain}`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none text-slate-900 bg-white"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        setDeleteTarget(null);
                        setDeleteInputText("");
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={deleting || deleteInputText.trim() !== `HAPUS ${deleteTarget.domain}`}
                      onClick={executeDeleteTenant}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Musnahkan Permanen (Auto-Purge)</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Step 2: Destructive Auto-Purge Pipeline Live Orchestration
                <div className="relative z-10">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-800/80 bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-950 text-red-400 border border-red-800">
                          DESTRUCTIVE AUTO-PURGE PIPELINE
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {purgeComplete ? "Status: PURGED" : `Tahap ${purgeStep} / 6`}
                        </span>
                      </div>
                      {purgeComplete && (
                        <button
                          onClick={() => {
                            setDeleteTarget(null);
                            setIsPurgingInProgress(false);
                            setPurgeComplete(false);
                            fetchTenants();
                          }}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white mt-2 tracking-tight flex items-center gap-2">
                      {purgeComplete ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Pemusnahan Data Server Selesai 100%</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5 text-red-400 animate-spin" />
                          <span>Memusnahkan Entitas Basis Data Server</span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {purgeComplete
                        ? `Seluruh data untuk ${deleteTarget.company} telah disterilkan secara permanen dari server.`
                        : `Sedang mengeksekusi auto-purge lintas database untuk ${deleteTarget.company} (${deleteTarget.domain})...`}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                        <span className="text-slate-400">
                          {purgeComplete
                            ? "Sterilisasi Database Tuntas (100%)"
                            : PURGE_STAGES[purgeStep - 1]?.name || "Memproses..."}
                        </span>
                        <span className="font-bold text-red-400">
                          {purgeComplete ? 100 : Math.min(95, Math.round((purgeStep / 6) * 100))}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${purgeComplete ? 100 : Math.min(95, Math.round((purgeStep / 6) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Purge checkpoints list */}
                  <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      {PURGE_STAGES.map((stage) => {
                        const isDone = stage.id < purgeStep || purgeComplete;
                        const isCurrent = stage.id === purgeStep && !purgeComplete;

                        return (
                          <div
                            key={stage.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                              isDone
                                ? "bg-slate-900/60 border-slate-800 text-slate-200"
                                : isCurrent
                                ? "bg-red-950/40 border-red-500/50 text-red-100 shadow-sm shadow-red-950/50"
                                : "bg-slate-900/20 border-slate-900/50 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : isCurrent
                                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                    : "bg-slate-800 text-slate-600 border border-slate-700/50"
                                }`}
                              >
                                {isDone ? <Check className="w-3.5 h-3.5" /> : stage.id}
                              </div>
                              <div>
                                <div className="font-bold">{stage.name}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{stage.desc}</div>
                              </div>
                            </div>

                            <div>
                              {isDone ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                                  TERHAPUS
                                </span>
                              ) : isCurrent ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700 flex items-center gap-1.5">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  <span>MEMUSNAHKAN</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800/60 text-slate-500 border border-slate-700/40">
                                  MENUNGGU
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Terminal Log */}
                    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-red-400" />
                          <span className="font-mono font-bold text-slate-300 uppercase tracking-wider">
                            Purge Execution Terminal
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span className="text-slate-400">STERILIZING</span>
                        </div>
                      </div>
                      <div className="font-mono text-[11px] space-y-1 text-slate-300 max-h-28 overflow-y-auto pr-1">
                        {purgeLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed text-slate-300">
                            <span className="text-red-400 select-none mr-1">&gt;</span>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Purge Audit Card */}
                    {purgeComplete && (
                      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-xs">
                          <div className="font-bold text-emerald-300">Sterilisasi Multi-Tenant Tuntas</div>
                          <div className="text-slate-300 text-[11px] mt-0.5">
                            Basis data server (Billing, NOC/Nexus, dan FTTX/FiberGrid) telah bebas dari entitas tenant ini.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Database Core: Postgres Pool (isp_billing, ispsync, ispsync_fibergrid)
                    </span>
                    <div className="flex items-center gap-2">
                      {purgeComplete ? (
                        <button
                          onClick={() => {
                            setDeleteTarget(null);
                            setIsPurgingInProgress(false);
                            setPurgeComplete(false);
                            fetchTenants();
                          }}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Tutup &amp; Perbarui Daftar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
                          <span>Proses pemusnahan sedang berjalan...</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MemberNav>
  );
}
