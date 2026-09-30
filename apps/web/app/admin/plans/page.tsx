"use client";

import { useEffect, useState } from "react";
import { 
  planApi, 
  type Plan, 
  type PlanGroup, 
  type CreatePlanInput, 
  type UpdatePlanInput,
  type CreatePriceVersionInput,
  type CreatePlanGroupInput 
} from "@/lib/api/plans";
import { formatRupiah, formatBandwidth, cn } from "@/lib/utils";

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [sortBy, setSortBy] = useState<"speed-asc" | "speed-desc" | "price-asc" | "price-desc" | "name-asc">("speed-asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);

  // Form State Plan Baru
  const [planForm, setPlanForm] = useState<CreatePlanInput>({
    name: "",
    description: "",
    plan_type: "HOME",
    download_kbps: 20000,
    upload_kbps: 10000,
    min_download_kbps: 0,
    min_upload_kbps: 0,
    billing_cycle: "MONTHLY",
    grace_period_days: 3,
    group_id: "",
    package_group: "UMUM",
    framed_pool: "",
    monthly_price: 150000,
    installation_fee: 0,
    activation_fee: 0,
    tax_percent: 1100,
    late_fee_percent: 500,
  });

  // Form State Versi Harga Baru
  const [priceForm, setPriceForm] = useState<CreatePriceVersionInput>({
    monthly_price: 0,
    installation_fee: 0,
    activation_fee: 0,
    tax_percent: 1100,
    late_fee_percent: 500,
  });

  // Form State Tambah Group Baru
  const [groupForm, setGroupForm] = useState<CreatePlanGroupInput>({
    name: "",
    code: "",
    description: "",
    cluster_code: "",
    cluster_area: "",
  });

  // Form State Edit Detail Paket
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    plan_type: "HOME" | "BUSINESS" | "HOTSPOT" | "VOUCHER" | "PASSPOINT";
    download_mbps: number;
    upload_mbps: number;
    min_download_mbps: number;
    min_upload_mbps: number;
    billing_cycle: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "PREPAID";
    grace_period_days: number;
    group_id: string;
    package_group: string;
    framed_pool: string;
    status: "ACTIVE" | "INACTIVE" | "DEPRECATED";
    is_visible: boolean;
  }>({
    name: "",
    description: "",
    plan_type: "HOME",
    download_mbps: 10,
    upload_mbps: 10,
    min_download_mbps: 0,
    min_upload_mbps: 0,
    billing_cycle: "MONTHLY",
    grace_period_days: 3,
    group_id: "",
    package_group: "UMUM",
    framed_pool: "",
    status: "ACTIVE",
    is_visible: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, groupsData] = await Promise.all([
        planApi.list({ limit: 100 }),
        planApi.listGroups().catch(() => [] as PlanGroup[]),
      ]);
      setPlans(plansData || []);
      setGroups(groupsData || []);

      if (groupsData && groupsData.length > 0 && !planForm.group_id) {
        const defaultGrp = groupsData.find((g) => g.code === "GRP-002") || groupsData[0];
        setPlanForm((prev) => ({
          ...prev,
          group_id: defaultGrp.id,
          package_group: defaultGrp.name,
        }));
      }
    } catch (err) {
      console.error("Failed to load plans or groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await planApi.create(planForm);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat paket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPriceVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await planApi.addPriceVersion(selectedPlan.id, priceForm);
      setIsPriceModalOpen(false);
      setSelectedPlan(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui versi harga");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = (p: Plan) => {
    setPlanToDelete(p);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await planApi.delete(planToDelete.id);
      setIsDeleteModalOpen(false);
      setPlanToDelete(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menghapus paket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await planApi.createGroup(groupForm);
      setGroupForm({ name: "", code: "", description: "", cluster_code: "", cluster_area: "" });
      setIsGroupModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat group paket");
    } finally {
      setSubmitting(false);
    }
  };

  const openPriceModal = (p: Plan) => {
    setSelectedPlan(p);
    setPriceForm({
      monthly_price: p.current_price?.monthly_price || 0,
      installation_fee: p.current_price?.installation_fee || 0,
      activation_fee: p.current_price?.activation_fee || 0,
      tax_percent: p.current_price?.tax_percent || 1100,
      late_fee_percent: p.current_price?.late_fee_percent || 500,
    });
    setIsPriceModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setSelectedPlan(p);
    const downMbps = Math.max(1, Math.round(p.download_kbps / 1024));
    const upMbps = Math.max(1, Math.round(p.upload_kbps / 1024));
    const minDownMbps = p.min_download_kbps ? Math.round(p.min_download_kbps / 1024) : 0;
    const minUpMbps = p.min_upload_kbps ? Math.round(p.min_upload_kbps / 1024) : 0;
    setEditForm({
      name: p.name,
      description: p.description || "",
      plan_type: p.plan_type,
      download_mbps: downMbps,
      upload_mbps: upMbps,
      min_download_mbps: minDownMbps,
      min_upload_mbps: minUpMbps,
      billing_cycle: p.billing_cycle,
      grace_period_days: p.grace_period_days,
      group_id: p.group_id || "",
      package_group: p.group_name || p.package_group || "UMUM",
      framed_pool: p.framed_pool || "",
      status: p.status,
      is_visible: p.is_visible !== false,
    });
    setErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const selectedGrp = groups.find((g) => g.id === editForm.group_id);
      const pkgGroup = selectedGrp ? selectedGrp.name : editForm.package_group;

      await planApi.update(selectedPlan.id, {
        name: editForm.name,
        description: editForm.description,
        plan_type: editForm.plan_type,
        download_kbps: editForm.download_mbps * 1024,
        upload_kbps: editForm.upload_mbps * 1024,
        min_download_kbps: editForm.min_download_mbps ? editForm.min_download_mbps * 1024 : 0,
        min_upload_kbps: editForm.min_upload_mbps ? editForm.min_upload_mbps * 1024 : 0,
        billing_cycle: editForm.billing_cycle,
        grace_period_days: editForm.grace_period_days,
        group_id: editForm.group_id || undefined,
        package_group: pkgGroup,
        framed_pool: editForm.framed_pool || undefined,
        status: editForm.status,
        is_visible: editForm.is_visible,
      });

      setIsEditModalOpen(false);
      setSelectedPlan(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui detail paket");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle speed sort on click
  const toggleSpeedSort = () => {
    setSortBy(prev => prev === "speed-asc" ? "speed-desc" : "speed-asc");
  };

  // Toggle price sort on click
  const togglePriceSort = () => {
    setSortBy(prev => prev === "price-asc" ? "price-desc" : "price-asc");
  };

  // Toggle visibility (tampil/sembunyi di portal pendaftaran)
  const handleToggleVisibility = async (p: Plan) => {
    const currentVis = p.is_visible !== false;
    const newVis = !currentVis;
    setTogglingVisibilityId(p.id);
    try {
      await planApi.toggleVisibility(p.id, newVis);
      setPlans((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_visible: newVis } : item))
      );
    } catch (err: any) {
      alert("Gagal mengubah status visibilitas paket: " + (err.message || err));
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Filtered plans based on active group tab and search query
  const filteredPlans = plans.filter((p) => {
    // 1. Group Filter
    let matchesGroup = true;
    if (selectedGroupFilter !== "ALL") {
      const activeGroupObj = groups.find((g) => g.id === selectedGroupFilter || g.cluster_code === selectedGroupFilter);
      if (selectedGroupFilter === "UMUM") {
        matchesGroup = Boolean(!p.group_id || p.package_group === "UMUM" || p.cluster_code === "000" || (activeGroupObj && p.package_group === activeGroupObj.name));
      } else {
        matchesGroup = Boolean(
          p.group_id === selectedGroupFilter || 
          p.cluster_code === selectedGroupFilter ||
          (activeGroupObj && (p.package_group === activeGroupObj.name || (activeGroupObj.cluster_code && p.cluster_code === activeGroupObj.cluster_code)))
        );
      }
    }

    // 2. Search Query Filter
    let matchesSearch = true;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      matchesSearch = 
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.package_group || "").toLowerCase().includes(q) ||
        (p.group_name || "").toLowerCase().includes(q);
    }

    return matchesGroup && matchesSearch;
  });

  // Sorted plans
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    if (sortBy === "speed-asc") {
      return a.download_kbps - b.download_kbps;
    }
    if (sortBy === "speed-desc") {
      return b.download_kbps - a.download_kbps;
    }
    if (sortBy === "price-asc") {
      const pA = a.current_price?.monthly_price || 0;
      const pB = b.current_price?.monthly_price || 0;
      return pA - pB;
    }
    if (sortBy === "price-desc") {
      const pA = a.current_price?.monthly_price || 0;
      const pB = b.current_price?.monthly_price || 0;
      return pB - pA;
    }
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Paket Internet & Cluster Pricing</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manajemen profil paket bandwidth, harga regional per cluster, dan tarif tagihan pelanggan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors border border-slate-300 shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Kelola Group Cluster
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Paket Baru
          </button>
        </div>
      </div>

      {/* Cluster Group Filter Tabs & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Horizontal tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedGroupFilter("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
              selectedGroupFilter === "ALL"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Semua Paket</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              selectedGroupFilter === "ALL" ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {plans.length}
            </span>
          </button>

          {groups.map((g) => {
            const count = plans.filter((p) => p.group_id === g.id || (g.cluster_code && p.cluster_code === g.cluster_code) || p.package_group === g.name).length || g.plan_count || 0;
            const isSelected = selectedGroupFilter === g.id || selectedGroupFilter === g.cluster_code;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupFilter(g.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{g.name}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  isSelected ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort Dropdown & Toggle Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari paket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 sm:w-48 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="speed-asc">Kecepatan (10M → 150M)</option>
              <option value="speed-desc">Kecepatan (150M → 10M)</option>
              <option value="price-asc">Tarif Termurah</option>
              <option value="price-desc">Tarif Tertinggi</option>
              <option value="name-asc">Nama Paket (A-Z)</option>
            </select>
          </div>

          {/* List vs Grid Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors",
                viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
              title="Tampilan Tabel List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors",
                viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
              title="Tampilan Kartu Grid"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table List View or Grid View */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 font-medium">
          Memuat daftar paket internet...
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-slate-700 font-bold">Tidak ada paket yang sesuai</p>
          <p className="text-slate-400 text-xs">Coba ganti kata kunci pencarian atau pilih tab klaster wilayah lain.</p>
        </div>
      ) : viewMode === "list" ? (
        /* TABLE / LIST VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Paket & Deskripsi</th>
                  <th className="py-3 px-4">Klaster Wilayah</th>
                  <th 
                    onClick={toggleSpeedSort}
                    className="py-3 px-4 cursor-pointer select-none hover:text-slate-900 transition-colors"
                    title="Klik untuk sortir kecepatan"
                  >
                    <div className="flex items-center gap-1">
                      <span>Kecepatan (Down / Up)</span>
                      <span className="text-slate-400 font-bold text-xs">
                        {sortBy === "speed-asc" ? "↑" : sortBy === "speed-desc" ? "↓" : ""}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={togglePriceSort}
                    className="py-3 px-4 cursor-pointer select-none hover:text-slate-900 transition-colors"
                    title="Klik untuk sortir tarif harga"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tarif Bulanan</span>
                      <span className="text-slate-400 font-bold text-xs">
                        {sortBy === "price-asc" ? "↑" : sortBy === "price-desc" ? "↓" : ""}
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-4">Siklus</th>
                  <th className="py-3 px-4 text-center">Visibilitas</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPlans.map((p) => {
                  const monthlyPrice = p.current_price?.monthly_price || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nama & Deskripsi */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                            {p.plan_type === "BUSINESS" ? "BIZ" : "HOME"}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{p.name}</span>
                              {monthlyPrice === 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 max-w-sm line-clamp-1">
                              {p.description || "Internet fiber simetris tanpa batasan FUP"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Group / Klaster */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                          <span>{p.group_name || p.package_group || "Umum"}</span>
                          {p.cluster_code && p.cluster_code !== "000" && (
                            <span className="ml-1 text-[10px] text-slate-400">
                              (C-{p.cluster_code})
                            </span>
                          )}
                        </span>
                        {p.framed_pool && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Pool: {p.framed_pool}
                          </div>
                        )}
                      </td>

                      {/* Kecepatan Bandwidth */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {formatBandwidth(p.download_kbps)} <span className="text-slate-400 font-normal">/</span> {formatBandwidth(p.upload_kbps)}
                        </div>
                        {((p.min_download_kbps || 0) > 0 || (p.min_upload_kbps || 0) > 0) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            CIR: {formatBandwidth(p.min_download_kbps || 0)} / {formatBandwidth(p.min_upload_kbps || 0)}
                          </div>
                        )}
                      </td>

                      {/* Tarif Bulanan */}
                      <td className="py-3.5 px-4">
                        {monthlyPrice > 0 ? (
                          <div className="font-semibold text-slate-900 text-sm">
                            {formatRupiah(monthlyPrice)}
                            <span className="text-xs font-normal text-slate-400 ml-1">/bln</span>
                          </div>
                        ) : (
                          <div className="font-medium text-slate-600 text-xs">
                            Custom Quote
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.current_price?.installation_fee
                            ? `Pasang: ${formatRupiah(p.current_price.installation_fee)}`
                            : "Bebas Biaya Pasang"}
                        </div>
                      </td>

                      {/* Siklus */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="font-medium">{p.billing_cycle}</div>
                        <div className="text-slate-400 text-[11px]">Grace: {p.grace_period_days} hari</div>
                      </td>

                      {/* Visibilitas Portal */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={togglingVisibilityId === p.id}
                          onClick={() => handleToggleVisibility(p)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border cursor-pointer",
                            p.is_visible !== false
                              ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          )}
                          title={
                            p.is_visible !== false
                              ? "Paket tampil di portal. Klik untuk sembunyikan."
                              : "Paket disembunyikan. Klik untuk tampilkan."
                          }
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              p.is_visible !== false ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          />
                          <span>{p.is_visible !== false ? "Tampil" : "Hidden"}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          p.status === "ACTIVE" 
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                            : "text-slate-500 bg-slate-100"
                        )}>
                          {p.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            title="Edit Detail Paket"
                          >
                            Edit Detail
                          </button>
                          <button
                            onClick={() => openPriceModal(p)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            title="Ubah Tarif"
                          >
                            Ubah Harga
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p)}
                            className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Paket"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlans.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {p.plan_type}
                    </span>
                    <button
                      type="button"
                      disabled={togglingVisibilityId === p.id}
                      onClick={() => handleToggleVisibility(p)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all border shadow-2xs cursor-pointer",
                        p.is_visible !== false
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                      )}
                      title={
                        p.is_visible !== false
                          ? "Paket tampil di portal. Klik untuk menyembunyikan."
                          : "Paket tersembunyi. Klik untuk menampilkan."
                      }
                    >
                      {togglingVisibilityId === p.id ? (
                        <span>⌛</span>
                      ) : p.is_visible !== false ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>👁️ Tampil</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>👁️‍🗨️ Hidden</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    p.status === "ACTIVE" 
                      ? "text-emerald-700 bg-emerald-50" 
                      : p.status === "DEPRECATED"
                      ? "text-rose-700 bg-rose-50"
                      : "text-slate-500 bg-slate-100"
                  )}>
                    {p.status}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    📍 {p.group_name || p.package_group || "Umum"}
                    {p.cluster_code && p.cluster_code !== "000" && (
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded ml-1 font-mono">
                        C-{p.cluster_code}
                      </span>
                    )}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{p.name}</h3>
                <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{p.description || "Tidak ada deskripsi"}</p>

                {/* Speed indicator */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-around border border-slate-100">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Download</span>
                    <span className="text-sm font-bold text-slate-800">{formatBandwidth(p.download_kbps)}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Upload</span>
                    <span className="text-sm font-bold text-slate-800">{formatBandwidth(p.upload_kbps)}</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="border-t border-slate-100 pt-3 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Tarif Bulanan</span>
                    <span className="text-xl font-extrabold text-blue-600">
                      {p.current_price?.monthly_price ? formatRupiah(p.current_price.monthly_price) : "Custom Quote"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Biaya Pasang:</span>
                    <span>{p.current_price?.installation_fee ? formatRupiah(p.current_price.installation_fee) : "Rp 0"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                    <span>Siklus:</span>
                    <span className="font-medium text-slate-700">{p.billing_cycle}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(p)}
                  className="flex-1 text-center py-2 px-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  Edit Detail
                </button>
                <button
                  onClick={() => openPriceModal(p)}
                  className="flex-1 text-center py-2 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Ubah Harga
                </button>
                <button
                  onClick={() => handleDeletePlan(p)}
                  className="py-2 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Hapus Paket"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Paket */}
      {isDeleteModalOpen && planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Paket Internet?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan menghapus paket dari daftar pilihan.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Paket:</span>
                <span className="font-bold text-slate-800">{planToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Klaster Wilayah:</span>
                <span className="font-medium text-slate-800">{planToDelete.group_name || planToDelete.package_group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kecepatan:</span>
                <span className="font-bold text-slate-800 font-mono">{formatBandwidth(planToDelete.download_kbps)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tarif Bulanan:</span>
                <span className="font-extrabold text-blue-600">
                  {planToDelete.current_price?.monthly_price ? formatRupiah(planToDelete.current_price.monthly_price) : "Custom"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Catatan Keamanan:</strong> Jika paket ini sedang digunakan oleh pelanggan aktif, sistem akan mengarsipkannya secara aman (<code className="font-mono text-rose-600">DEPRECATED</code>) agar invoice dan koneksi pelanggan tidak terputus.
            </p>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:bg-rose-400"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus Paket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Paket */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Buat Paket Internet Baru</h2>
                <p className="text-xs text-slate-500">Atur harga spesifik berdasarkan cluster wilayah atau umum</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4 text-sm">
              {/* Group / Cluster Assignment */}
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <label className="block font-semibold text-blue-900 mb-1">
                  Assign ke Group Paket / Cluster Wilayah *
                </label>
                <select
                  value={planForm.group_id || ""}
                  onChange={(e) => {
                    const selGrp = groups.find((g) => g.id === e.target.value);
                    setPlanForm({
                      ...planForm,
                      group_id: e.target.value || undefined,
                      package_group: selGrp ? selGrp.name : "UMUM",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-medium"
                >
                  <option value="">Pilih Group Cluster...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.cluster_code ? `Cluster ${g.cluster_code}` : g.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-blue-700 mt-1">
                  Calon pelanggan yang berada di jangkauan ODP cluster ini otomatis akan mendapatkan harga paket ini.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Paket *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Paket Epic (30M)"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori Paket</label>
                  <select
                    value={planForm.plan_type}
                    onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="HOME">Home</option>
                    <option value="BUSINESS">Business</option>
                    <option value="HOTSPOT">Hotspot</option>
                    <option value="VOUCHER">Voucher</option>
                    <option value="PASSPOINT">Passpoint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  placeholder="Streaming Lancar Tanpa Buffering"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Alokasi Bandwidth Download & Upload (CIR & MIR) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Bandwidth MikroTik (Auto-Sync FreeRADIUS)
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">Sistem "Up To" / Sharing</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      (Max) Download (Kbps) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={planForm.download_kbps}
                      onChange={(e) => setPlanForm({ ...planForm, download_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 bg-white text-sm"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      = {(planForm.download_kbps / 1024).toFixed(1)} Mbps (Plafon Max)
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      (Max) Upload (Kbps) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={planForm.upload_kbps}
                      onChange={(e) => setPlanForm({ ...planForm, upload_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-emerald-700 bg-white text-sm"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      = {(planForm.upload_kbps / 1024).toFixed(1)} Mbps (Plafon Max)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      (Min) Download (Kbps)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0 = Best Effort"
                      value={planForm.min_download_kbps || 0}
                      onChange={(e) => setPlanForm({ ...planForm, min_download_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {!planForm.min_download_kbps ? "0 = Best effort (tanpa batas bawah)" : `= ${(planForm.min_download_kbps / 1024).toFixed(1)} Mbps (Garansi jam sibuk)`}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      (Min) Upload (Kbps)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0 = Best Effort"
                      value={planForm.min_upload_kbps || 0}
                      onChange={(e) => setPlanForm({ ...planForm, min_upload_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {!planForm.min_upload_kbps ? "0 = Best effort (tanpa batas bawah)" : `= ${(planForm.min_upload_kbps / 1024).toFixed(1)} Mbps (Garansi jam sibuk)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target IP Pool / Framed-Pool */}
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                <label className="block font-semibold text-amber-900 text-xs mb-1 flex items-center justify-between">
                  <span>Target IP Pool / Framed-Pool (Opsional)</span>
                  <span className="text-[10px] text-amber-700 font-mono font-normal">FreeRADIUS Framed-Pool</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: pool-public atau NAS-PPPOE-GO"
                  value={planForm.framed_pool || ""}
                  onChange={(e) => setPlanForm({ ...planForm, framed_pool: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-800"
                />
                <p className="text-[11px] text-amber-800 mt-1">
                  Kosongkan jika menggunakan pool standar MikroTik. Isi jika paket ini diarahkan ke pool khusus (misal IP Publik).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tarif Bulanan Cluster (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={planForm.monthly_price}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Biaya Pasang (Rp)</label>
                  <input
                    type="number"
                    value={planForm.installation_fee}
                    onChange={(e) => setPlanForm({ ...planForm, installation_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Siklus Tagihan</label>
                  <select
                    value={planForm.billing_cycle}
                    onChange={(e) => setPlanForm({ ...planForm, billing_cycle: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="MONTHLY">Bulanan (Monthly)</option>
                    <option value="QUARTERLY">3 Bulan (Quarterly)</option>
                    <option value="ANNUAL">Tahunan (Annual)</option>
                    <option value="PREPAID">Prepaid</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Grace Period (Hari)</label>
                  <input
                    type="number"
                    value={planForm.grace_period_days}
                    onChange={(e) => setPlanForm({ ...planForm, grace_period_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Menyimpan..." : "Simpan Paket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Group Cluster */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Kelola Group Paket / Cluster Wilayah</h2>
                <p className="text-xs text-slate-500">Daftar pemetaan cluster coverage ODP dengan group paket billing</p>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List Existing Groups */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group Wilayah Aktif</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs">
                {groups.map((g) => (
                  <div key={g.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span>{g.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          {g.code}
                        </span>
                        {g.cluster_code && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Cluster {g.cluster_code}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{g.description || g.cluster_area}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        {g.plan_count} Paket
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Tambah Group Baru */}
            <form onSubmit={handleCreateGroup} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 text-sm">Tambah Group Cluster Baru</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Group *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Cluster 005 - Bukittinggi"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kode Group *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: GRP-005"
                    value={groupForm.code}
                    onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kode Cluster ODP *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 005"
                    value={groupForm.cluster_code}
                    onChange={(e) => setGroupForm({ ...groupForm, cluster_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Wilayah / Coverage Area *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bukittinggi Kota"
                    value={groupForm.cluster_area}
                    onChange={(e) => setGroupForm({ ...groupForm, cluster_area: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Keterangan paket atau target wilayah"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Menyimpan..." : "Tambah Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Detail & Bandwidth Paket */}
      {isEditModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Edit Detail Paket Internet</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                    ID: {selectedPlan.id.slice(0, 8)}...
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah nama, kategori, alokasi bandwidth MikroTik, klaster wilayah, dan visibilitas
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleUpdatePlan} className="space-y-4 text-sm">
              {/* Group / Cluster Assignment */}
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <label className="block font-semibold text-blue-900 mb-1">
                  Group Paket / Klaster Wilayah *
                </label>
                <select
                  value={editForm.group_id}
                  onChange={(e) => {
                    const selGrp = groups.find((g) => g.id === e.target.value);
                    setEditForm({
                      ...editForm,
                      group_id: e.target.value,
                      package_group: selGrp ? selGrp.name : "UMUM",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-medium"
                >
                  <option value="">Pilih Group Cluster...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.cluster_code ? `Cluster ${g.cluster_code}` : g.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-blue-700 mt-1">
                  Paket ini akan berlaku untuk pelanggan di jangkauan ODP klaster tersebut.
                </p>
              </div>

              {/* Nama Paket & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Paket *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Paket Gold (10M)"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori Layanan</label>
                  <select
                    value={editForm.plan_type}
                    onChange={(e) => setEditForm({ ...editForm, plan_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    <option value="HOME">HOME (Rumah Tangga / Residensial)</option>
                    <option value="BUSINESS">BUSINESS (Korporasi / Bisnis)</option>
                    <option value="HOTSPOT">HOTSPOT (Voucher Hotspot)</option>
                    <option value="VOUCHER">VOUCHER</option>
                    <option value="PASSPOINT">PASSPOINT (WiFi Hotspot 2.0)</option>
                  </select>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi Paket</label>
                <input
                  type="text"
                  placeholder="Contoh: Gaming & Streaming Hemat Rumah Anda (HOT)"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Alokasi Bandwidth Download & Upload (CIR & MIR) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Bandwidth MikroTik (Auto-Sync FreeRADIUS)
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">Sistem "Up To" / Sharing</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">(Max) Download (Mbps) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        required
                        value={editForm.download_mbps}
                        onChange={(e) => setEditForm({ ...editForm, download_mbps: Number(e.target.value) })}
                        className="w-full pl-3 pr-14 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 bg-white"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">Mbps</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      = {(editForm.download_mbps * 1024).toLocaleString()} Kbps (Plafon Max)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">(Max) Upload (Mbps) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        required
                        value={editForm.upload_mbps}
                        onChange={(e) => setEditForm({ ...editForm, upload_mbps: Number(e.target.value) })}
                        className="w-full pl-3 pr-14 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-emerald-700 bg-white"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">Mbps</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      = {(editForm.upload_mbps * 1024).toLocaleString()} Kbps (Plafon Max)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">(Min) Download (CIR)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0 = Best Effort"
                        value={editForm.min_download_mbps || 0}
                        onChange={(e) => setEditForm({ ...editForm, min_download_mbps: Number(e.target.value) })}
                        className="w-full pl-3 pr-14 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">Mbps</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {!editForm.min_download_mbps ? "0 = Best effort (tanpa batas)" : `= ${(editForm.min_download_mbps * 1024).toLocaleString()} Kbps (Garansi)`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">(Min) Upload (CIR)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0 = Best Effort"
                        value={editForm.min_upload_mbps || 0}
                        onChange={(e) => setEditForm({ ...editForm, min_upload_mbps: Number(e.target.value) })}
                        className="w-full pl-3 pr-14 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">Mbps</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {!editForm.min_upload_mbps ? "0 = Best effort (tanpa batas)" : `= ${(editForm.min_upload_mbps * 1024).toLocaleString()} Kbps (Garansi)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Target IP Pool / Framed-Pool */}
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                <label className="block font-semibold text-amber-900 text-xs mb-1 flex items-center justify-between">
                  <span>Target IP Pool / Framed-Pool (Opsional)</span>
                  <span className="text-[10px] text-amber-700 font-mono font-normal">FreeRADIUS Framed-Pool</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: pool-public atau NAS-PPPOE-GO"
                  value={editForm.framed_pool || ""}
                  onChange={(e) => setEditForm({ ...editForm, framed_pool: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-800"
                />
                <p className="text-[11px] text-amber-800 mt-1">
                  Kosongkan jika menggunakan pool default MikroTik. Isi nama pool di MikroTik jika ingin pelanggan paket ini mengambil IP dari pool tertentu (misal IP Publik).
                </p>
              </div>

              {/* Siklus Penagihan & Grace Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Siklus Penagihan</label>
                  <select
                    value={editForm.billing_cycle}
                    onChange={(e) => setEditForm({ ...editForm, billing_cycle: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    <option value="MONTHLY">Bulanan (Monthly)</option>
                    <option value="DAILY">Harian (Daily)</option>
                    <option value="WEEKLY">Mingguan (Weekly)</option>
                    <option value="QUARTERLY">Triwulan (Quarterly)</option>
                    <option value="ANNUAL">Tahunan (Annual)</option>
                    <option value="PREPAID">Prabayar (Prepaid)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Masa Tenggang (Grace Period)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={editForm.grace_period_days}
                      onChange={(e) => setEditForm({ ...editForm, grace_period_days: Number(e.target.value) })}
                      className="w-full pl-3 pr-12 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">Hari</span>
                  </div>
                </div>
              </div>

              {/* Status & Visibilitas Portal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status Paket</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Aktif Digunakan)</option>
                    <option value="INACTIVE">INACTIVE (Nonaktif)</option>
                    <option value="DEPRECATED">DEPRECATED (Hanya Pelanggan Lama)</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editForm.is_visible}
                      onChange={(e) => setEditForm({ ...editForm, is_visible: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 text-xs block">Tampil di Portal Pendaftaran</span>
                      <span className="text-[10px] text-slate-400 block">Dapat dipilih calon pelanggan baru</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <span className="text-base">💡</span>
                <div>
                  <span className="font-bold">Ubah Harga Langganan?</span> Untuk menjaga riwayat tagihan & invoice masa lalu tetap akurat, perubahan harga bulanan atau biaya pasang dilakukan terpisah melalui tombol <b>Ubah Harga</b>.
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm cursor-pointer"
                >
                  {submitting ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Versi Harga Baru */}
      {isPriceModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ubah Tarif / Snapshot Harga</h2>
                <p className="text-xs text-slate-500">{selectedPlan.name} ({selectedPlan.package_group || "Umum"})</p>
              </div>
              <button onClick={() => setIsPriceModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddPriceVersion} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tarif Bulanan Baru (Rp) *</label>
                <input
                  type="number"
                  required
                  value={priceForm.monthly_price}
                  onChange={(e) => setPriceForm({ ...priceForm, monthly_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Biaya Pasang Baru (Rp)</label>
                <input
                  type="number"
                  value={priceForm.installation_fee}
                  onChange={(e) => setPriceForm({ ...priceForm, installation_fee: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Shortcut to Edit Plan Details */}
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
                <span>Ingin ubah nama, bandwidth, atau klaster?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPriceModalOpen(false);
                    openEditModal(selectedPlan);
                  }}
                  className="text-xs font-bold text-blue-700 underline hover:text-blue-900 cursor-pointer shrink-0 ml-2"
                >
                  Buka Edit Detail →
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Menyimpan..." : "Terapkan Harga Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
