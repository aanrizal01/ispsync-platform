"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  X,
  Search,
  CheckSquare,
  Square,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { rolesApi, Role, Permission } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/context";

// Mapping human-friendly module names in Indonesian
const MODULE_METADATA: Record<string, { label: string; icon: string; desc: string }> = {
  customers: { label: "Pelanggan & CRM", icon: "Users", desc: "Data kontak pelanggan, registrasi, dan verifikasi identitas." },
  plans: { label: "Paket & Tarif Internet", icon: "Package", desc: "Katalog bandwidth, tarif bulanan, dan klaster wilayah." },
  subscriptions: { label: "Langganan & Layanan", icon: "Repeat", desc: "Siklus langganan, aktivasi layanan, dan isolir otomatis." },
  invoices: { label: "Billing & Faktur Tagihan", icon: "FileText", desc: "Penerbitan tagihan bulanan, cetak invoice, dan pembatalan." },
  payments: { label: "Kasir & Pembayaran", icon: "CreditCard", desc: "Pencatatan pelunasan, kwitansi, dan mutasi payment gateway." },
  vouchers: { label: "Voucher Hotspot", icon: "Ticket", desc: "Generator voucher, kuota batch, dan aktivasi kode voucher." },
  passpoint: { label: "Passpoint HS2.0", icon: "Radio", desc: "Profil EAP, instalasi sertifikat OS, dan registrasi passpoint." },
  radius: { label: "Server RADIUS & AAA", icon: "Server", desc: "Sinkronisasi user PPPoE, IP Pool, dan status koneksi live." },
  network: { label: "Jaringan & Router Core", icon: "Network", desc: "Monitoring perangkat, interface bandwidth, dan reset sesi." },
  reports: { label: "Laporan & Rekap Finansial", icon: "BarChart3", desc: "Laporan pendapatan kotor/netto, piutang, dan KPI." },
  admin: { label: "Administrasi Sistem", icon: "Lock", desc: "Manajemen akun staf, audit log aktivitas, dan pengaturan umum." },
};

export default function RolesManagementPage() {
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Form states
  const [roleName, setRoleName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesApi.getRoles(),
        rolesApi.getPermissions().catch(() => ({ permissions: [] })),
      ]);
      setRoles(rolesRes.roles || []);
      setPermissions(permsRes.permissions || []);
    } catch (err: any) {
      setActionError(err.message || "Gagal memuat data peran dan hak akses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      const mod = p.module || "other";
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    });
    return map;
  }, [permissions]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, search]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleSlug("");
    setRoleDescription("");
    setSelectedPermissionIds([]);
    setActionError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setRoleDescription(role.description || "");
    const initialPermIds = (role.permissions || []).map((p) => p.id);
    setSelectedPermissionIds(initialPermIds);
    setActionError(null);
    setIsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (role: Role) => {
    setDeletingRole(role);
    setActionError(null);
    setIsDeleteModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setActionError("Nama peran wajib diisi!");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingRole) {
        await rolesApi.updateRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDescription.trim(),
          permission_ids: selectedPermissionIds,
        });
        setActionSuccess(`Peran "${roleName}" berhasil diperbarui!`);
      } else {
        await rolesApi.createRole({
          name: roleName.trim(),
          slug: roleSlug.trim() || undefined,
          description: roleDescription.trim(),
          permission_ids: selectedPermissionIds,
        });
        setActionSuccess(`Peran baru "${roleName}" berhasil ditambahkan!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || "Gagal menyimpan peran");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await rolesApi.deleteRole(deletingRole.id);
      setActionSuccess(`Peran "${deletingRole.name}" berhasil dihapus!`);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || "Gagal menghapus peran");
    } finally {
      setSubmitting(false);
    }
  };

  // Permission selection helpers
  const togglePermission = (permId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const selectAllPermissions = () => {
    setSelectedPermissionIds(permissions.map((p) => p.id));
  };

  const selectReadOnlyPermissions = () => {
    const readOnlyIds = permissions.filter((p) => p.action === "read").map((p) => p.id);
    setSelectedPermissionIds(readOnlyIds);
  };

  const clearAllPermissions = () => {
    setSelectedPermissionIds([]);
  };

  const toggleModulePermissions = (moduleName: string) => {
    const modPerms = permissionsByModule[moduleName] || [];
    const modIds = modPerms.map((p) => p.id);
    const allSelected = modIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      setSelectedPermissionIds((prev) => prev.filter((id) => !modIds.includes(id)));
    } else {
      setSelectedPermissionIds((prev) => Array.from(new Set([...prev, ...modIds])));
    }
  };

  // Generate slug automatically when typing name (only for new roles)
  const handleNameChange = (val: string) => {
    setRoleName(val);
    if (!editingRole) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setRoleSlug(generated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Manajemen Peran &amp; Hak Akses
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Role-Based Access Control (RBAC) untuk staf NOC, Keuangan, Teknisi, dan Kepala Cabang.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Peran Baru
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2">
        <Link
          href="/admin/users"
          className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Daftar Pengguna &amp; Staf
        </Link>
        <button
          className="px-4 py-2.5 text-xs font-bold text-blue-600 border-b-2 border-blue-600 transition flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          Tingkatan Peran (Role Manager)
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-mono font-bold">
            {roles.length}
          </span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Peran (Roles)</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-black text-slate-900">{roles.length}</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peran Bawaan Sistem</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-black text-purple-600">{roles.filter((r) => r.is_system).length}</p>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peran Kustom ISP</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-black text-cyan-600">{roles.filter((r) => !r.is_system).length}</p>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Katalog Izin Modul</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-black text-emerald-600">{permissions.length} Izin</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama peran, slug, deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <p className="text-xs text-slate-500">
          Menampilkan <span className="font-bold text-slate-800">{filteredRoles.length}</span> peran yang terkonfigurasi.
        </p>
      </div>

      {/* Roles Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Memuat katalog peran dan hak akses...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-800">Tidak ada peran ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Sesuaikan kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRoles.map((role) => {
            const isSystem = !!role.is_system;
            const assignedPerms = role.permissions || [];
            const hasWildcard = assignedPerms.some((p) => p.slug === "*");

            return (
              <div
                key={role.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          role.slug === "super_admin"
                            ? "bg-purple-100 text-purple-700"
                            : isSystem
                            ? "bg-blue-100 text-blue-700"
                            : "bg-cyan-100 text-cyan-700"
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm">{role.name}</h3>
                          {isSystem ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              System Role
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                              Custom Role
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">slug: {role.slug}</p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/users?role=${role.slug}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                      title="Lihat staf dengan peran ini"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{role.user_count ?? 0} Staf</span>
                    </Link>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {role.description || "Tidak ada deskripsi khusus untuk peran ini."}
                  </p>

                  {/* Permissions Summary Tags */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      <span>Cakupan Hak Akses</span>
                      <span className="font-mono text-blue-600 font-bold">
                        {hasWildcard ? "Akses Penuh (*)" : `${assignedPerms.length} Izin Aktif`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {hasWildcard ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold font-mono">
                          ★ ROOT WILDCARD (ALL ACCESS)
                        </span>
                      ) : assignedPerms.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Belum ada izin modul yang diberikan.</span>
                      ) : (
                        assignedPerms.slice(0, 10).map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono"
                          >
                            {p.slug}
                          </span>
                        ))
                      )}
                      {!hasWildcard && assignedPerms.length > 10 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold">
                          +{assignedPerms.length - 10} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {isSystem ? "Peran default sistem dilindungi" : "Dapat dikonfigurasi mandiri"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(role)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isSystem ? "Atur Hak Akses" : "Edit Peran"}</span>
                    </button>
                    {!isSystem && (
                      <button
                        onClick={() => openDeleteModal(role)}
                        disabled={(role.user_count ?? 0) > 0}
                        className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                          (role.user_count ?? 0) > 0
                            ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                            : "border-rose-200 bg-white hover:bg-rose-50 text-rose-600"
                        }`}
                        title={
                          (role.user_count ?? 0) > 0
                            ? "Peran masih digunakan oleh staf, tidak dapat dihapus"
                            : "Hapus peran kustom"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL: Tambah / Edit Peran (Role & Permission Matrix)
         ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingRole ? `Konfigurasi Peran: ${editingRole.name}` : "Buat Peran Kustom Baru"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur nama peran, deskripsi tugas, dan checklist matriks izin akses modul (RBAC).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveRole} className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nama Peran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kepala Cabang / Branch Manager"
                    value={roleName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Slug Identifikasi Teknis
                  </label>
                  <input
                    type="text"
                    disabled={!!editingRole}
                    placeholder="Contoh: branch_manager"
                    value={roleSlug}
                    onChange={(e) => setRoleSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-600 disabled:opacity-75"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editingRole ? "Slug teknis peran tidak dapat diubah setelah dibuat." : "Dibuat otomatis dari nama peran."}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan ruang lingkup wewenang jabatan ini di operasional ISP..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Permission Matrix */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Matriks Hak Akses Modul (Permissions)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Centang izin yang diperbolehkan untuk peran ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={selectReadOnlyPermissions}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      Hanya Baca
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* Modules Checklist Accordion / Grid */}
                <div className="space-y-3">
                  {Object.entries(permissionsByModule).map(([modKey, perms]) => {
                    const meta = MODULE_METADATA[modKey] || {
                      label: modKey.toUpperCase(),
                      desc: "Izin operasional modul " + modKey,
                    };
                    const modIds = perms.map((p) => p.id);
                    const allChecked = modIds.length > 0 && modIds.every((id) => selectedPermissionIds.includes(id));
                    const someChecked = modIds.some((id) => selectedPermissionIds.includes(id)) && !allChecked;

                    return (
                      <div
                        key={modKey}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 transition"
                      >
                        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{meta.label}</h5>
                            <p className="text-[10px] text-slate-500">{meta.desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(modKey)}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white rounded border border-slate-200 transition cursor-pointer"
                          >
                            {allChecked ? "Batal Centang Semua" : "Centang Modul Ini"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-2.5">
                          {perms.map((p) => {
                            const isChecked = selectedPermissionIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition select-none ${
                                  isChecked
                                    ? "bg-blue-50/80 border-blue-300 text-blue-950 font-medium"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.id)}
                                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="block text-[11px] leading-tight font-semibold">{p.name}</span>
                                  <span className="block text-[9.5px] font-mono text-slate-400 mt-0.5">{p.slug}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRole ? "Simpan Perubahan" : "Simpan Peran Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Hapus Peran
         ======================================================== */}
      {isDeleteModalOpen && deletingRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Hapus Peran &quot;{deletingRole.name}&quot;?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada staf yang sedang terhubung ke peran ini sebelum melanjutkan.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteRole}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
