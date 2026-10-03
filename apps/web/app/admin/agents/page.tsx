"use client";

import { useEffect, useState, useCallback } from "react";
import {
  agentApi,
  getMutationBadgeInfo,
  type Agent,
  type AgentMutation,
  type TopupRequest,
  type CreateAgentInput,
  type UpdateAgentInput,
} from "@/lib/api/agents";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import {
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Percent,
  RefreshCw,
  Building2,
  CreditCard,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Printer,
  X,
} from "lucide-react";

export default function AdminAgentsPage() {
  const [activeTab, setActiveTab] = useState<"agents" | "topups" | "mutations">("agents");

  // Data states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsMeta, setAgentsMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [searchAgent, setSearchAgent] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [topupMeta, setTopupMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [topupStatusFilter, setTopupStatusFilter] = useState("PENDING");
  const [isLoadingTopups, setIsLoadingTopups] = useState(false);

  const [mutations, setMutations] = useState<AgentMutation[]>([]);
  const [selectedAgentForMutations, setSelectedAgentForMutations] = useState<Agent | null>(null);
  const [mutationAgentFilter, setMutationAgentFilter] = useState<string>("");
  const [mutationTypeFilter, setMutationTypeFilter] = useState<string>("");
  const [mutationsMeta, setMutationsMeta] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [isLoadingMutations, setIsLoadingMutations] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState<Agent | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState<Agent | null>(null);
  const [showEditModal, setShowEditModal] = useState<Agent | null>(null);
  const [showProcessTopupModal, setShowProcessTopupModal] = useState<{ request: TopupRequest; action: "APPROVE" | "REJECT" } | null>(null);
  const [showPksModal, setShowPksModal] = useState(false);
  const [selectedAgentForPks, setSelectedAgentForPks] = useState<Agent | null>(null);
  const [companyProfile, setCompanyProfile] = useState<{
    companyName: string;
    brandName: string;
    npwp: string;
    address: string;
    phone: string;
    emailSupport: string;
  }>({
    companyName: "PT. Inovasi Sistem Pintar",
    brandName: "ISPSYNC",
    npwp: "03.882.194.5-014.000",
    address: "Sentra Telekomunikasi Internet Nusantara",
    phone: "+62 811-0000-0000",
    emailSupport: "admin@ispsync.id",
  });

  // Form states
  const [createForm, setCreateForm] = useState<CreateAgentInput>({
    code: "",
    name: "",
    company_name: "",
    phone: "",
    email: "",
    initial_balance: 0,
    offline_cashback_pct: 15,
    online_cashback_pct: 10,
    online_discount_pct: 10,
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    notes: "",
    create_user_account: true,
    user_password: "",
  });

  const [manualTopupForm, setManualTopupForm] = useState({
    amount: 100000,
    notes: "Top-up saldo langsung oleh administrator",
  });

  const [withdrawForm, setWithdrawForm] = useState({
    amount: 50000,
    mutation_type: "WITHDRAWAL",
    reference_id: "",
    notes: "Pencairan saldo komisi agen",
  });

  const [editForm, setEditForm] = useState<UpdateAgentInput>({
    name: "",
    company_name: "",
    phone: "",
    email: "",
    offline_cashback_pct: 20,
    online_cashback_pct: 15,
    online_discount_pct: 5,
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    status: "ACTIVE",
    notes: "",
  });

  const [processNotes, setProcessNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Fetch Agents ──────────────────────────────────────────────────
  const fetchAgents = useCallback(async (page = 1) => {
    setIsLoadingAgents(true);
    try {
      const res = await agentApi.listAgents({
        page,
        limit: 10,
        search: searchAgent || undefined,
        status: statusFilter || undefined,
      });
      setAgents(res.data || []);
      if (res.meta) setAgentsMeta(res.meta);
    } catch (err: any) {
      console.error("Failed to fetch agents", err);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [searchAgent, statusFilter]);

  // ── Fetch Topups ──────────────────────────────────────────────────
  const fetchTopups = useCallback(async (page = 1) => {
    setIsLoadingTopups(true);
    try {
      const res = await agentApi.listTopupRequests({
        page,
        limit: 10,
        status: topupStatusFilter || undefined,
      });
      setTopupRequests(res.data || []);
      if (res.meta) setTopupMeta(res.meta);
    } catch (err: any) {
      console.error("Failed to fetch topups", err);
    } finally {
      setIsLoadingTopups(false);
    }
  }, [topupStatusFilter]);

  // ── Fetch Mutations ───────────────────────────────────────────────
  const fetchMutations = useCallback(async (page = 1) => {
    setIsLoadingMutations(true);
    try {
      const res = await agentApi.listAllMutations({
        page,
        limit: 20,
        agent_id: mutationAgentFilter || undefined,
        mutation_type: mutationTypeFilter || undefined,
      });
      setMutations(res.data || []);
      if (res.meta) setMutationsMeta(res.meta);
    } catch (err: any) {
      console.error("Failed to fetch mutations", err);
    } finally {
      setIsLoadingMutations(false);
    }
  }, [mutationAgentFilter, mutationTypeFilter]);

  useEffect(() => {
    fetchAgents(1);
    fetchTopups(1);
  }, [fetchAgents, fetchTopups]);

  useEffect(() => {
    fetch("/api/tenant/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setCompanyProfile({
            companyName: data.companyName || "PT. Inovasi Sistem Pintar",
            brandName: data.brandName || "ISPSYNC",
            npwp: data.npwp || "03.882.194.5-014.000",
            address: data.address || "Sentra Telekomunikasi Internet Nusantara",
            phone: data.phone || "+62 811-0000-0000",
            emailSupport: data.emailSupport || "admin@ispsync.id",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "mutations") {
      fetchMutations(1);
    }
  }, [activeTab, fetchMutations]);

  // Flash alert helper
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // ── Create Agent Handler ──────────────────────────────────────────
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await agentApi.createAgent(createForm);
      showSuccess(`Agen "${createForm.name}" (${createForm.code}) berhasil didaftarkan!`);
      setShowCreateModal(false);
      // Reset form
      setCreateForm({
        code: `AGN-${Math.floor(100 + Math.random() * 900)}`,
        name: "",
        company_name: "",
        phone: "",
        email: "",
        initial_balance: 0,
        offline_cashback_pct: 15,
        online_cashback_pct: 10,
        online_discount_pct: 10,
        bank_name: "",
        bank_account_number: "",
        bank_account_holder: "",
        notes: "",
        create_user_account: true,
        user_password: "",
      });
      fetchAgents(1);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat agen baru");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Agent Handler ────────────────────────────────────────────
  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await agentApi.updateAgent(showEditModal.id, editForm);
      showSuccess(`Data agen "${editForm.name}" berhasil diperbarui!`);
      setShowEditModal(null);
      fetchAgents(agentsMeta.page);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui agen");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Manual Topup Handler ──────────────────────────────────────────
  const handleManualTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTopupModal) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await agentApi.topupManual(showTopupModal.id, manualTopupForm.amount, manualTopupForm.notes);
      showSuccess(`Saldo ${formatRupiah(manualTopupForm.amount)} berhasil ditambahkan ke dompet agen ${showTopupModal.name}!`);
      setShowTopupModal(null);
      fetchAgents(agentsMeta.page);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal top-up saldo");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Manual Withdraw / Deduct Handler ──────────────────────────────
  const handleManualWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showWithdrawModal) return;
    if (withdrawForm.amount <= 0) {
      setErrorMessage("Nominal penarikan harus lebih dari Rp 0");
      return;
    }
    if (withdrawForm.amount > showWithdrawModal.balance) {
      setErrorMessage(
        `Nominal penarikan (${formatRupiah(withdrawForm.amount)}) melebihi saldo agen (${formatRupiah(
          showWithdrawModal.balance
        )})`
      );
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await agentApi.withdrawManual(showWithdrawModal.id, {
        amount: withdrawForm.amount,
        mutation_type: withdrawForm.mutation_type,
        reference_id: withdrawForm.reference_id || undefined,
        notes: withdrawForm.notes || undefined,
      });
      showSuccess(
        `Saldo ${formatRupiah(withdrawForm.amount)} berhasil ditarik/dipotong dari dompet agen ${
          showWithdrawModal.name
        }!`
      );
      setShowWithdrawModal(null);
      fetchAgents(agentsMeta.page);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menarik saldo agen");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Process Bank Topup Handler ────────────────────────────────────
  const handleProcessTopup = async () => {
    if (!showProcessTopupModal) return;
    const { request, action } = showProcessTopupModal;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await agentApi.processTopupRequest(request.id, action, processNotes || undefined);
      showSuccess(
        action === "APPROVE"
          ? `Permintaan #${request.request_number} disetujui! Saldo agen ${request.agent_name} telah dikreditkan.`
          : `Permintaan #${request.request_number} telah ditolak.`
      );
      setShowProcessTopupModal(null);
      setProcessNotes("");
      fetchTopups(topupMeta.page);
      fetchAgents(agentsMeta.page);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memproses permintaan top-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals for stats
  const totalBalance = agents.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  const pendingTopupCount = topupRequests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            Manajemen Mitra Agen Voucher
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola agen penjual voucher, cashback komisi penjualan offline & online, serta persetujuan saldo top-up.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCreateForm((prev) => ({
                ...prev,
                code: `AGN-${Math.floor(100 + Math.random() * 900)}`,
              }));
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Agen Baru
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Mitra Agen</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{agentsMeta.total}</span>
            <span className="text-xs text-slate-400 ml-2">Mitra terdaftar</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Saldo Agen</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">{formatRupiah(totalBalance)}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Saldo siap pakai</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top-Up Menunggu</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{pendingTopupCount}</span>
            <span className="text-xs text-slate-400">Permintaan bank</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aturan Komisi Default</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs space-y-1 text-slate-600 font-medium">
            <div>Offline: <span className="font-bold text-slate-900">15% Cashback</span></div>
            <div>Online: <span className="font-bold text-slate-900">10% Komisi + 10% Diskon</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        <button
          onClick={() => setActiveTab("agents")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "agents"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Users className="w-4 h-4" />
          Daftar Agen ({agentsMeta.total})
        </button>

        <button
          onClick={() => setActiveTab("topups")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 relative",
            activeTab === "topups"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Permintaan Top-Up Bank
          {pendingTopupCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {pendingTopupCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("mutations")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "mutations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Buku Besar & Tarik Saldo
          {selectedAgentForMutations ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
              {selectedAgentForMutations.name}
            </span>
          ) : mutationsMeta.total > 0 ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full">
              {mutationsMeta.total}
            </span>
          ) : null}
        </button>
      </div>

      {/* ── TAB 1: DAFTAR AGEN ────────────────────────────────────── */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
                placeholder="Cari nama, kode agen, email, telp..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="SUSPENDED">Ditangguhkan (Suspended)</option>
                <option value="TERMINATED">Nonaktif (Terminated)</option>
              </select>

              <button
                onClick={() => fetchAgents(1)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingAgents && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Agents Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Agen / Toko</th>
                    <th className="py-3.5 px-4">Saldo Dompet</th>
                    <th className="py-3.5 px-4">Skema Komisi & Promo</th>
                    <th className="py-3.5 px-4">Rekening Bank</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingAgents ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Memuat data agen...
                      </td>
                    </tr>
                  ) : agents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada agen ditemukan.
                      </td>
                    </tr>
                  ) : (
                    agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{agent.name}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              {agent.code}
                            </span>
                            {agent.company_name && <span>• {agent.company_name}</span>}
                            <span>• {agent.phone}</span>
                          </div>
                          {agent.user_email && (
                            <div className="text-[11px] text-blue-600 mt-0.5">Login: {agent.user_email}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-base text-emerald-600">
                            {formatRupiah(agent.balance)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {agent.total_vouchers_sold || 0} voucher terjual
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs space-y-0.5">
                            <div>
                              Offline: <span className="font-bold text-slate-800">{agent.offline_cashback_pct}% Cashback</span>
                            </div>
                            <div>
                              Online: <span className="font-bold text-blue-700">{agent.online_cashback_pct}% Komisi</span>
                              <span className="text-slate-400"> (Diskon: {agent.online_discount_pct}%)</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {agent.bank_name ? (
                            <div className="text-xs">
                              <div className="font-semibold text-slate-800">{agent.bank_name}</div>
                              <div className="font-mono text-slate-600">{agent.bank_account_number}</div>
                              <div className="text-slate-400 text-[11px]">{agent.bank_account_holder}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum diisi</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                              agent.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : agent.status === "SUSPENDED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}
                          >
                            {agent.status === "ACTIVE" ? "Aktif" : agent.status === "SUSPENDED" ? "Suspended" : "Terminated"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setShowTopupModal(agent);
                                setManualTopupForm({ amount: 100000, notes: "Top-up saldo langsung oleh admin" });
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Isi Saldo Agen"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              Top Up
                            </button>

                            <button
                              onClick={() => {
                                setShowWithdrawModal(agent);
                                setWithdrawForm({
                                  amount: Math.min(100000, Number(agent.balance) || 0),
                                  mutation_type: "WITHDRAWAL",
                                  reference_id: "",
                                  notes: "Pencairan saldo komisi agen",
                                });
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Tarik / Potong Saldo Agen"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              Tarik
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAgentForMutations(agent);
                                setMutationAgentFilter(agent.id);
                                setActiveTab("mutations");
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Riwayat Mutasi Saldo"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              Mutasi
                            </button>

                            <button
                              onClick={() => {
                                setShowEditModal(agent);
                                setEditForm({
                                  name: agent.name,
                                  company_name: agent.company_name || "",
                                  phone: agent.phone,
                                  email: agent.email || "",
                                  offline_cashback_pct: agent.offline_cashback_pct,
                                  online_cashback_pct: agent.online_cashback_pct,
                                  online_discount_pct: agent.online_discount_pct,
                                  bank_name: agent.bank_name || "",
                                  bank_account_number: agent.bank_account_number || "",
                                  bank_account_holder: agent.bank_account_holder || "",
                                  status: agent.status,
                                  notes: agent.notes || "",
                                });
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAgentForPks(agent);
                                setShowPksModal(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Cetak Dokumen PKS Kemitraan Resmi"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PKS
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {agentsMeta.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Total {agentsMeta.total} agen (Hal. {agentsMeta.page} dari {agentsMeta.total_pages})</span>
                <div className="flex gap-1">
                  <button
                    disabled={agentsMeta.page <= 1}
                    onClick={() => fetchAgents(agentsMeta.page - 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={agentsMeta.page >= agentsMeta.total_pages}
                    onClick={() => fetchAgents(agentsMeta.page + 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: PERMINTAAN TOP-UP BANK ─────────────────────────── */}
      {activeTab === "topups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Status Permintaan:</span>
              <div className="flex gap-1.5">
                {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTopupStatusFilter(st)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                      topupStatusFilter === st
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {st === "" ? "Semua" : st === "PENDING" ? "Menunggu Konfirmasi" : st === "APPROVED" ? "Disetujui" : "Ditolak"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => fetchTopups(1)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              title="Refresh Topup"
            >
              <RefreshCw className={cn("w-4 h-4", isLoadingTopups && "animate-spin")} />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">No. Pengajuan</th>
                    <th className="py-3.5 px-4">Agen</th>
                    <th className="py-3.5 px-4">Nominal Transfer</th>
                    <th className="py-3.5 px-4">Rekening Pengirim</th>
                    <th className="py-3.5 px-4">Bukti Transfer</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingTopups ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Memuat data pengajuan...
                      </td>
                    </tr>
                  ) : topupRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada pengajuan top-up bank pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    topupRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800">{req.request_number}</span>
                          <div className="text-xs text-slate-400 mt-0.5">{formatDate(req.requested_at)}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{req.agent_name}</div>
                          <div className="text-xs text-slate-400 font-mono">{req.agent_code}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-base text-emerald-600">
                            {formatRupiah(req.amount)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs">
                            <span className="font-bold text-slate-800">{req.bank_name}</span> - {req.bank_account_number}
                            <div className="text-slate-500 font-medium">{req.bank_account_holder}</div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {req.proof_url ? (
                            <a
                              href={req.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Tidak ada lampiran</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                              req.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}
                          >
                            {req.status === "PENDING" ? "Menunggu" : req.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {req.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setShowProcessTopupModal({ request: req, action: "APPROVE" });
                                  setProcessNotes("Pembayaran transfer bank telah diverifikasi dan dana masuk.");
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setShowProcessTopupModal({ request: req, action: "REJECT" });
                                  setProcessNotes("Dana belum masuk / bukti transfer tidak valid.");
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Diproses: {req.processed_at ? formatDate(req.processed_at) : "-"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {topupMeta.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Total {topupMeta.total} pengajuan</span>
                <div className="flex gap-1">
                  <button
                    disabled={topupMeta.page <= 1}
                    onClick={() => fetchTopups(topupMeta.page - 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={topupMeta.page >= topupMeta.total_pages}
                    onClick={() => fetchTopups(topupMeta.page + 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: BUKU BESAR & MUTASI SALDO AGEN ────────────────── */}
      {activeTab === "mutations" && (
        <div className="space-y-4">
          {/* Header & Filter Card */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700" />
                  Buku Besar & Mutasi Saldo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan pembukuan kas penarikan saldo, top-up dana, modal voucher, komisi agen, dan penyesuaian.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedAgentForMutations && (
                  <>
                    <button
                      onClick={() => setShowWithdrawModal(selectedAgentForMutations)}
                      className="px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Tarik Saldo
                    </button>
                    <button
                      onClick={() => setShowTopupModal(selectedAgentForMutations)}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-800 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Top-Up
                    </button>
                  </>
                )}
                <button
                  onClick={() => fetchMutations(mutationsMeta.page)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                  title="Segarkan Data"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoadingMutations && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              {/* Agent Filter Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filter Agen:
                </label>
                <select
                  value={mutationAgentFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMutationAgentFilter(val);
                    const found = agents.find((a) => a.id === val);
                    setSelectedAgentForMutations(found || null);
                  }}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">Semua Agen (Global Log)</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name} ({formatRupiah(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mutation Type Selector */}
              <div className="sm:col-span-1 lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filter Jenis Transaksi:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { val: "", label: "Semua" },
                    { val: "WITHDRAWAL", label: "Tarik Saldo" },
                    { val: "TOPUP_MANUAL", label: "Top-Up Manual" },
                    { val: "TOPUP_BANK_TRANSFER", label: "Transfer Bank" },
                    { val: "VOUCHER_OFFLINE_BUY", label: "Modal Voucher" },
                    { val: "VOUCHER_ONLINE_COMMISSION", label: "Komisi Voucher" },
                    { val: "INVOICE_PAYMENT_AGENT", label: "Bayar Tagihan" },
                  ].map((t) => (
                    <button
                      key={t.val}
                      onClick={() => setMutationTypeFilter(t.val)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                        mutationTypeFilter === t.val
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Agent Banner */}
            {selectedAgentForMutations && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Agen Terpilih: </span>
                  <span className="font-semibold text-slate-900">{selectedAgentForMutations.name} ({selectedAgentForMutations.code})</span>
                  <span className="text-slate-400 mx-2">•</span>
                  <span className="text-slate-500">Saldo: </span>
                  <span className="font-semibold text-emerald-700">{formatRupiah(selectedAgentForMutations.balance)}</span>
                </div>

                <button
                  onClick={() => {
                    setSelectedAgentForMutations(null);
                    setMutationAgentFilter("");
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 transition-colors"
                >
                  Tampilkan Semua Agen
                </button>
              </div>
            )}
          </div>

          {/* Mutations Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Agen</th>
                    <th className="py-3 px-4">Tipe Mutasi</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Saldo Sebelum</th>
                    <th className="py-3 px-4">Saldo Sesudah</th>
                    <th className="py-3 px-4">Keterangan & Referensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingMutations ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                        Memuat data riwayat mutasi saldo...
                      </td>
                    </tr>
                  ) : mutations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Tidak ada riwayat mutasi saldo yang sesuai kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    mutations.map((m) => {
                      const isCredit = m.amount > 0;
                      const badge = getMutationBadgeInfo(m.mutation_type, isCredit);

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                            {formatDate(m.created_at)}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-900">
                              {m.agent_name || (selectedAgentForMutations?.id === m.agent_id ? selectedAgentForMutations.name : "Agen")}
                            </div>
                            {m.agent_code && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {m.agent_code}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded text-[11px] font-medium border",
                                badge.badgeClass
                              )}
                              title={badge.typeDesc}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap font-mono font-medium">
                            <span className={isCredit ? "text-emerald-700" : "text-rose-700"}>
                              {isCredit ? "+" : ""}{formatRupiah(m.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {formatRupiah(m.balance_before)}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                            {formatRupiah(m.balance_after)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 max-w-xs">
                            <div>{m.description || "-"}</div>
                            {m.reference_id && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Ref: {m.reference_id}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {mutationsMeta.total_pages > 1 && (
              <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Total {mutationsMeta.total} transaksi mutasi (Hal. {mutationsMeta.page} dari {mutationsMeta.total_pages})
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={mutationsMeta.page <= 1}
                    onClick={() => fetchMutations(mutationsMeta.page - 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={mutationsMeta.page >= mutationsMeta.total_pages}
                    onClick={() => fetchMutations(mutationsMeta.page + 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: TAMBAH AGEN BARU ───────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tambah Mitra Agen Voucher</h3>
                <p className="text-xs text-slate-500">Daftarkan konter / toko sebagai agen penjual voucher hotspot</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Agen *</label>
                  <input
                    type="text"
                    required
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: AGN-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Agen *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Nama pemilik / penanggung jawab"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko / Usaha</label>
                  <input
                    type="text"
                    value={createForm.company_name || ""}
                    onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                    placeholder="Contoh: Toko Berkah Cell"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Agen</label>
                  <input
                    type="email"
                    value={createForm.email || ""}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="agen@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Saldo Awal (Opsional)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={createForm.initial_balance || 0}
                    onChange={(e) => setCreateForm({ ...createForm, initial_balance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Commission Rates */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Aturan Cashback & Komisi Agen
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cashback Offline (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={createForm.offline_cashback_pct}
                        onChange={(e) => setCreateForm({ ...createForm, offline_cashback_pct: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg pr-7 font-bold"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Dipotong saat cetak voucher fisik</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Komisi Online (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={createForm.online_cashback_pct}
                        onChange={(e) => setCreateForm({ ...createForm, online_cashback_pct: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg pr-7 font-bold text-blue-700"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Masuk saldo agen via kode promo</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Diskon Pembeli Online (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={createForm.online_discount_pct}
                        onChange={(e) => setCreateForm({ ...createForm, online_discount_pct: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg pr-7 font-bold text-emerald-700"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Potongan harga untuk pembeli</span>
                  </div>
                </div>
              </div>

              {/* Bank Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Informasi Rekening Bank Agen (Opsional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Bank</label>
                    <input
                      type="text"
                      value={createForm.bank_name || ""}
                      onChange={(e) => setCreateForm({ ...createForm, bank_name: e.target.value })}
                      placeholder="BCA / BRI / Mandiri"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      value={createForm.bank_account_number || ""}
                      onChange={(e) => setCreateForm({ ...createForm, bank_account_number: e.target.value })}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Atas Nama Rekening</label>
                    <input
                      type="text"
                      value={createForm.bank_account_holder || ""}
                      onChange={(e) => setCreateForm({ ...createForm, bank_account_holder: e.target.value })}
                      placeholder="Nama di buku tabungan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Login Account */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.create_user_account}
                    onChange={(e) => setCreateForm({ ...createForm, create_user_account: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-bold text-blue-900">
                    Buat Akun Login Portal Agen (Bisa login ke /login & buka dashboard agen)
                  </span>
                </label>

                {createForm.create_user_account && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Login *</label>
                      <input
                        type="email"
                        required={createForm.create_user_account}
                        value={createForm.email || ""}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="agen@gogiganet.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password Login *</label>
                      <input
                        type="password"
                        required={createForm.create_user_account}
                        value={createForm.user_password || ""}
                        onChange={(e) => setCreateForm({ ...createForm, user_password: e.target.value })}
                        placeholder="Minimal 8 karakter"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan & Daftarkan Agen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TOP-UP SALDO MANUAL ────────────────────────────── */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Top-Up Saldo Dompet Agen
              </h3>
              <button onClick={() => setShowTopupModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="text-slate-500">Agen Penerima:</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{showTopupModal.name} ({showTopupModal.code})</div>
              <div className="text-slate-500 mt-1">Saldo Saat Ini: <span className="font-bold text-emerald-600">{formatRupiah(showTopupModal.balance)}</span></div>
            </div>

            <form onSubmit={handleManualTopup} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Top-Up (IDR) *</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={manualTopupForm.amount}
                  onChange={(e) => setManualTopupForm({ ...manualTopupForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-emerald-700"
                />
                <div className="flex gap-2 mt-2">
                  {[50000, 100000, 250000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setManualTopupForm({ ...manualTopupForm, amount: amt })}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  value={manualTopupForm.notes}
                  onChange={(e) => setManualTopupForm({ ...manualTopupForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi & Tambah Saldo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TARIK / POTONG SALDO MANUAL ────────────────────────────── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-rose-600" />
                Tarik / Potong Saldo Dompet Agen
              </h3>
              <button onClick={() => setShowWithdrawModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Agen:</span>
                <span className="font-bold text-slate-900">{showWithdrawModal.name} ({showWithdrawModal.code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Saat Ini:</span>
                <span className="font-bold text-emerald-600">{formatRupiah(showWithdrawModal.balance)}</span>
              </div>
              {showWithdrawModal.bank_name && (
                <div className="pt-1 mt-1 border-t border-slate-200 flex justify-between text-[11px]">
                  <span className="text-slate-500">Rekening Tujuan:</span>
                  <span className="font-medium text-slate-700">
                    {showWithdrawModal.bank_name} {showWithdrawModal.bank_account_number} ({showWithdrawModal.bank_account_holder})
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleManualWithdraw} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Penarikan / Pengurangan</label>
                <select
                  value={withdrawForm.mutation_type}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, mutation_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="WITHDRAWAL">Pencairan Saldo / Cash-out (WITHDRAWAL)</option>
                  <option value="ADJUSTMENT">Koreksi / Penyesuaian Minus (ADJUSTMENT)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Nominal Penarikan (IDR) *</label>
                  <button
                    type="button"
                    onClick={() => setWithdrawForm({ ...withdrawForm, amount: Number(showWithdrawModal.balance) || 0 })}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline"
                  >
                    Tarik Semua ({formatRupiah(showWithdrawModal.balance)})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={Number(showWithdrawModal.balance) || 0}
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-rose-700"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[50000, 100000, 250000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={amt > Number(showWithdrawModal.balance)}
                      onClick={() => setWithdrawForm({ ...withdrawForm, amount: amt })}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors disabled:opacity-40"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. Referensi / Bukti Transfer (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: TRF-BCA-981249"
                  value={withdrawForm.reference_id}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, reference_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  value={withdrawForm.notes}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || withdrawForm.amount <= 0 || withdrawForm.amount > Number(showWithdrawModal.balance)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi & Tarik Saldo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT PENGATURAN AGEN ───────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Data & Komisi Agen</h3>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleEditAgent} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Agen *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko / Usaha</label>
                  <input
                    type="text"
                    value={editForm.company_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Agen</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
                    <option value="TERMINATED">Nonaktif (TERMINATED)</option>
                  </select>
                </div>
              </div>

              {/* Komisi */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cashback Offline (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={editForm.offline_cashback_pct}
                    onChange={(e) => setEditForm({ ...editForm, offline_cashback_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Komisi Online (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={editForm.online_cashback_pct}
                    onChange={(e) => setEditForm({ ...editForm, online_cashback_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Diskon Online (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={editForm.online_discount_pct}
                    onChange={(e) => setEditForm({ ...editForm, online_discount_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PROSES TOP-UP BANK (APPROVE / REJECT) ───────────── */}
      {showProcessTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {showProcessTopupModal.action === "APPROVE" ? "Konfirmasi Persetujuan Top-Up" : "Tolak Permintaan Top-Up"}
              </h3>
              <button onClick={() => setShowProcessTopupModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>No. Request: <span className="font-mono font-bold">{showProcessTopupModal.request.request_number}</span></div>
              <div>Agen: <span className="font-bold text-slate-900">{showProcessTopupModal.request.agent_name}</span></div>
              <div>Nominal: <span className="font-bold text-emerald-600 text-sm">{formatRupiah(showProcessTopupModal.request.amount)}</span></div>
              <div>Pengirim: {showProcessTopupModal.request.bank_name} - {showProcessTopupModal.request.bank_account_holder}</div>
            </div>

            {showProcessTopupModal.action === "APPROVE" ? (
              <p className="text-xs text-slate-600">
                Apakah Anda yakin telah mengecek mutasi rekening bank dan dana <b>{formatRupiah(showProcessTopupModal.request.amount)}</b> sudah masuk? Saldo akan langsung dikreditkan ke dompet agen.
              </p>
            ) : (
              <p className="text-xs text-rose-600">
                Permintaan ini akan ditolak dan saldo tidak akan ditambahkan.
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Admin</label>
              <textarea
                rows={2}
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                placeholder="Catatan untuk riwayat / agen"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowProcessTopupModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessTopup}
                disabled={isSubmitting}
                className={cn(
                  "px-5 py-2 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50",
                  showProcessTopupModal.action === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {isSubmitting
                  ? "Memproses..."
                  : showProcessTopupModal.action === "APPROVE"
                  ? "Ya, Setujui & Tambah Saldo"
                  : "Ya, Tolak Permintaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PKS Agreement Printable Modal ────────────────────────────── */}
      {showPksModal && selectedAgentForPks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 max-h-[92vh] flex flex-col">
            {/* Modal Action Header (Hidden in Print) */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Surat Perjanjian Kerja Sama (PKS) Kemitraan Agen
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mitra: <span className="font-semibold text-slate-800">{selectedAgentForPks.name}</span> ({selectedAgentForPks.code})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPksModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-8 sm:p-12 overflow-y-auto font-sans text-slate-900 text-xs sm:text-sm leading-relaxed print:p-0 print:overflow-visible print:m-0 print:text-black">
              {/* Kop Surat Resmi */}
              <div className="text-center pb-3 border-b-4 border-double border-slate-900 mb-6">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950 font-serif">
                  {companyProfile.companyName}
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-0.5">
                  Penyelenggara Jasa Akses Internet (Internet Service Provider)
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  NPWP: {companyProfile.npwp}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Kantor: {companyProfile.address} &bull; Telp/WA: {companyProfile.phone} &bull; Email: {companyProfile.emailSupport}
                </p>
              </div>

              {/* Judul & Nomor Surat */}
              <div className="text-center mb-6">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wide underline underline-offset-4 text-slate-950 font-serif">
                  SURAT PERJANJIAN KERJA SAMA (PKS) KEMITRAAN AGEN RESMI
                </h2>
                <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                  Nomor Registrasi: PKS/ISP/AGN/{new Date().getFullYear()}/{selectedAgentForPks.code}
                </p>
              </div>

              {/* Pembukaan & Para Pihak */}
              <div className="space-y-3 mb-5 text-justify leading-relaxed">
                <p>
                  Pada hari ini, tanggal <strong>{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>, telah dibuat dan ditandatangani Perjanjian Kerja Sama Kemitraan Distribusi Layanan Internet, Voucher Hotspot, WiFi Roaming Passpoint, dan Loket Pembayaran Tagihan (selanjutnya disebut <strong>&quot;Perjanjian&quot;</strong>), oleh dan antara:
                </p>

                <div className="pl-4 border-l-2 border-slate-300 space-y-1">
                  <p>
                    <strong>1. {companyProfile.companyName}</strong>, sebuah perseroan terbatas berizin resmi penyelenggara jasa internet ISP, beralamat kantor di {companyProfile.address}, dalam hal ini bertindak untuk dan atas nama perseroan (selanjutnya disebut sebagai <strong>&quot;PIHAK PERTAMA&quot;</strong>).
                  </p>
                  <p>
                    <strong>2. {selectedAgentForPks.name}</strong>, pemilik / penanggung jawab operasional gerai <strong>{selectedAgentForPks.company_name || selectedAgentForPks.name}</strong>, beralamat kontak {selectedAgentForPks.phone}, nomor rekening penampungan <strong>{selectedAgentForPks.bank_name || "BCA"} {selectedAgentForPks.bank_account_number || "-"}</strong> a/n {selectedAgentForPks.bank_account_holder || selectedAgentForPks.name} (selanjutnya disebut sebagai <strong>&quot;PIHAK KEDUA&quot;</strong>).
                  </p>
                </div>

                <p>
                  PARA PIHAK sepakat untuk saling mengikatkan diri dalam Perjanjian Kemitraan Keagenan ini dengan syarat dan ketentuan sebagai berikut:
                </p>
              </div>

              {/* Pasal-Pasal */}
              <div className="space-y-4 text-justify">
                <div>
                  <h4 className="font-bold text-slate-950 font-serif">PASAL 1 — DASAR KEMITRAAN &amp; LEGALITAS</h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    1. PIHAK PERTAMA adalah Badan Hukum Penyelenggara Jasa Internet (ISP) berizin resmi dari Kementerian Komunikasi dan Informatika RI.<br />
                    2. PIHAK KEDUA bertindak semata-mata sebagai <strong>Mitra Saluran Distribusi Resmi (Channel Partner)</strong> bagi produk PIHAK PERTAMA, dan hubungan ini merupakan kemitraan bisnis keagenan, bukan ketenagakerjaan/karyawan, serta bukan pengalihan izin telekomunikasi.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 font-serif">PASAL 2 — RUANG LINGKUP LAYANAN</h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    PIHAK KEDUA ditunjuk sah untuk melayani: (a) Penjualan kode voucher Hotspot WiFi digital/fisik; (b) Penyaluran dan aktivasi paket WiFi Roaming Passpoint (Hotspot 2.0); (c) Penerimaan setoran loket pembayaran tagihan bulanan pelanggan resmi PIHAK PERTAMA.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 font-serif">PASAL 3 — HAK &amp; KEWAJIBAN PARA PIHAK</h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    1. PIHAK PERTAMA berkewajiban menyediakan aplikasi loket agen yang stabil, pasokan voucher, dan menyetorkan PPN resmi ke kas negara.<br />
                    2. PIHAK KEDUA berhak atas bagi hasil/komisi resmi, dan berkewajiban menjual produk sesuai tarif HET resmi serta menerbitkan struk/bukti bayar sah kepada pelanggan akhir.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 font-serif">PASAL 4 — LARANGAN KERAS &amp; INTEGRITAS (ANTI RT/RW NET ILEGAL)</h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    PIHAK KEDUA <strong>dilarang keras</strong>: (a) Menjual kembali bandwidth mentah secara ilegal, menarik kabel LAN/FO ke tetangga di luar izin resmi, atau menyelenggarakan RT/RW Net ilegal; (b) Memodifikasi konfigurasi perangkat Access Point/ONT; (c) Mengenakan pungutan biaya liar di luar tarif resmi. Pelanggaran mengakibatkan pemutusan kerja sama seketika dan penerusan ke ranah hukum UU Telekomunikasi No. 36/1999.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 font-serif">PASAL 5 — SKEMA KOMISI &amp; KETENTUAN PERPAJAKAN</h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    1. <strong>Komisi Voucher Offline / Grosir:</strong> Cashback sebesar <strong>{selectedAgentForPks.offline_cashback_pct}%</strong>.<br />
                    2. <strong>Komisi Transaksi Online / Kode Promo:</strong> Komisi sebesar <strong>{selectedAgentForPks.online_cashback_pct}%</strong> (Diskon pelanggan: {selectedAgentForPks.online_discount_pct}%).<br />
                    3. <strong>Pajak (PMK No. 6/PMK.03/2021):</strong> Nilai jual paket sudah mencakup PPN 11% yang disetorkan langsung oleh PIHAK PERTAMA ke kas negara, di mana Dasar Pengenaan Pajak (DPP) dihitung dari harga bersih setelah diskon resmi (<em>final price / 1.11</em>).
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 font-serif">PASAL 6 — MASA BERLAKU &amp; PENYELESAIAN PERSELISIHAN</h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Perjanjian ini berlaku selama 1 (satu) tahun sejak ditandatangani. Segala perselisihan diselesaikan secara musyawarah mufakat, dan apabila tidak tercapai mufakat, PARA PIHAK sepakat memilih domisili hukum di Pengadilan Negeri setempat.
                  </p>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200">
                <div className="text-center">
                  <p className="font-bold text-slate-900">PIHAK PERTAMA</p>
                  <p className="text-xs text-slate-600">{companyProfile.companyName}</p>
                  <div className="h-20 flex items-center justify-center my-1 text-slate-400 text-[11px] italic border border-dashed border-slate-300 rounded-lg max-w-[200px] mx-auto bg-slate-50">
                    [ Meterai Rp 10.000 &amp; Cap ]
                  </div>
                  <p className="font-bold text-slate-900 underline mt-2">Pimpinan Perusahaan</p>
                  <p className="text-[11px] text-slate-500">Direktur / Authorized Representative</p>
                </div>

                <div className="text-center">
                  <p className="font-bold text-slate-900">PIHAK KEDUA</p>
                  <p className="text-xs text-slate-600">Mitra Agen / Pengelola Gerai</p>
                  <div className="h-20 flex items-center justify-center my-1 text-slate-400 text-[11px] italic border border-dashed border-slate-300 rounded-lg max-w-[200px] mx-auto bg-slate-50">
                    [ Tanda Tangan Mitra ]
                  </div>
                  <p className="font-bold text-slate-900 underline mt-2">{selectedAgentForPks.name}</p>
                  <p className="text-[11px] text-slate-500">Pemilik / Penanggung Jawab Gerai</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
