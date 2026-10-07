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
} from "lucide-react";

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
  const { member } = useMember();
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

  const isSuperadmin =
    member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001";

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    try {
      const res = await fetch("/api/member/tenants");
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
        headers: { "Content-Type": "application/json" },
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

  async function handleDeleteTenant(tenant: Tenant) {
    if (tenant.isOwner) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus tenant "${tenant.company}" (${tenant.domain}) dari platform?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/member/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: tenant.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(null), 3000);
        fetchTenants();
      } else {
        alert("Gagal menghapus: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err) {
      alert("Koneksi gagal.");
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

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenant) return;
    setSubmitting(true);

    try {
      const payload: any = {
        action: modalMode,
        ...activeTenant,
      };
      if (formPassword) {
        payload.password = formPassword;
      }

      const res = await fetch("/api/member/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
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
                                  className="px-1.5 py-1 rounded hover:bg-blue-600 hover:text-white text-slate-600 font-bold transition-colors"
                                  title="Buka Ledger"
                                >
                                  Ledger
                                </a>
                                <a
                                  href={nexusUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-1 rounded hover:bg-purple-600 hover:text-white text-slate-600 font-bold transition-colors"
                                  title="Buka Nexus"
                                >
                                  Nexus
                                </a>
                                <a
                                  href={fibergridUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-1 rounded hover:bg-emerald-600 hover:text-white text-slate-600 font-bold transition-colors"
                                  title="Buka FiberGrid"
                                >
                                  Fiber
                                </a>
                              </div>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Edit Data Tenant"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Resume Button */}
                            {!t.isOwner && (
                              <button
                                onClick={() => handleToggleStatus(t)}
                                className={`p-1.5 rounded-lg border transition-colors ${
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
                                onClick={() => handleDeleteTenant(t)}
                                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                                title="Hapus Tenant"
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
                      onChange={(e) => setActiveTenant({ ...activeTenant, company: e.target.value })}
                      placeholder="Contoh: PT. Fiber Prima Nusantara"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Domain */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Domain / Subdomain Utama *
                    </label>
                    <input
                      type="text"
                      required
                      value={activeTenant.domain || ""}
                      onChange={(e) => setActiveTenant({ ...activeTenant, domain: e.target.value })}
                      placeholder="Contoh: primafiber.ispsync.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
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
      </div>
    </MemberNav>
  );
}
