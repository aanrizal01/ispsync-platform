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
  Eye,
  ShieldCheck,
  MapPin,
  UserPlus,
  Check,
  Image as ImageIcon,
  Award,
  Crown,
} from "lucide-react";
import AgentCertificateModal from "@/components/agent/AgentCertificateModal";
import AgentPksModal from "@/components/agent/AgentPksModal";

export default function AdminAgentsPage() {
  const [activeTab, setActiveTab] = useState<"agents" | "pending" | "topups" | "mutations">("agents");

  // Data states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsMeta, setAgentsMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [searchAgent, setSearchAgent] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);

  const [showVerificationModal, setShowVerificationModal] = useState<Agent | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessingVerification, setIsProcessingVerification] = useState(false);
  const [selectedAgentForCertificate, setSelectedAgentForCertificate] = useState<Agent | null>(null);

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
    nib?: string;
    sklo?: string;
    address: string;
    phone: string;
    emailSupport: string;
    logoUrl?: string;
  }>({
    companyName: "PT. Inovasi Sistem Pintar",
    brandName: "ISPSYNC",
    npwp: "03.882.194.5-014.000",
    nib: "0220208123456",
    sklo: "No. 128/TEL.04.02/KOMINFO",
    address: "Sentra Telekomunikasi Internet Nusantara",
    phone: "+62 811-0000-0000",
    emailSupport: "admin@ispsync.id",
    logoUrl: "/web/dev_logo.svg",
  });

  const [hierarchyFilter, setHierarchyFilter] = useState<"ALL" | "MASTER" | "SUB">("ALL");

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
    is_master: false,
    parent_agent_id: undefined,
    override_pct: 3,
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
    is_master: false,
    parent_agent_id: undefined,
    clear_parent_agent: false,
    override_pct: 3,
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

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await agentApi.listAgents({ status: "PENDING", limit: 1 });
      if (res.meta) setPendingAgentsCount(res.meta.total);
    } catch {}
  }, []);

  const handleApproveAgent = async (agentId: string) => {
    setIsProcessingVerification(true);
    try {
      await agentApi.approveRegistration(agentId);
      setSuccessMessage("Pendaftaran agen berhasil disetujui! Akun agen telah aktif.");
      setShowVerificationModal(null);
      fetchAgents(agentsMeta.page);
      fetchPendingCount();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyetujui pendaftaran agen");
    } finally {
      setIsProcessingVerification(false);
    }
  };

  const handleRejectAgent = async (agentId: string) => {
    setIsProcessingVerification(true);
    try {
      await agentApi.rejectRegistration(agentId, rejectReason);
      setSuccessMessage("Pendaftaran agen telah ditolak.");
      setShowVerificationModal(null);
      setShowRejectForm(false);
      setRejectReason("");
      fetchAgents(agentsMeta.page);
      fetchPendingCount();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menolak pendaftaran agen");
    } finally {
      setIsProcessingVerification(false);
    }
  };

  useEffect(() => {
    fetchAgents(1);
    fetchTopups(1);
    fetchPendingCount();
  }, [fetchAgents, fetchTopups, fetchPendingCount]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.hostname.split(".");
      let detectedSlug = "dev";
      if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length >= 3 && parts[0] !== "www") {
        detectedSlug = parts[0].toLowerCase();
      }
      if (detectedSlug && detectedSlug !== "localhost" && detectedSlug !== "127") {
        setCompanyProfile((prev) => ({
          ...prev,
          logoUrl: `/web/${detectedSlug}_logo.svg`,
        }));
      }
    }

    fetch("/api/tenant/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setCompanyProfile({
            companyName: data.companyName || "PT. Inovasi Sistem Pintar",
            brandName: data.brandName || "ISPSYNC",
            npwp: data.npwp || "03.882.194.5-014.000",
            nib: data.nib || "0220208123456",
            sklo: data.sklo || "No. 128/TEL.04.02/KOMINFO",
            address: data.address || "Sentra Telekomunikasi Internet Nusantara",
            phone: data.phone || "+62 811-0000-0000",
            emailSupport: data.emailSupport || "admin@ispsync.id",
            logoUrl: data.logoUrl || `/web/${data.slug || "dev"}_logo.svg`,
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
          onClick={() => {
            setActiveTab("agents");
            setStatusFilter("");
          }}
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
          onClick={() => {
            setActiveTab("pending");
            setStatusFilter("PENDING");
          }}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 relative",
            activeTab === "pending"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <UserPlus className="w-4 h-4" />
          Pendaftaran Baru
          {pendingAgentsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {pendingAgentsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("topups");
            setStatusFilter("");
          }}
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
          onClick={() => {
            setActiveTab("mutations");
            setStatusFilter("");
          }}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "mutations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Buku Besar &amp; Tarik Saldo
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

      {/* ── TAB 1 & 2: DAFTAR AGEN & PENDAFTARAN BARU ─────────────────── */}
      {(activeTab === "agents" || activeTab === "pending") && (
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
                <option value="PENDING">Menunggu Verifikasi (Pending)</option>
                <option value="REJECTED">Ditolak (Rejected)</option>
                <option value="SUSPENDED">Ditangguhkan (Suspended)</option>
                <option value="TERMINATED">Nonaktif (Terminated)</option>
              </select>

              <select
                value={hierarchyFilter}
                onChange={(e) => setHierarchyFilter(e.target.value as "ALL" | "MASTER" | "SUB")}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 font-medium"
              >
                <option value="ALL">Semua Tingkatan</option>
                <option value="MASTER">👑 Hanya Master Agen</option>
                <option value="SUB">🏪 Hanya Sub-Agen</option>
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
                  ) : agents.filter((a) => {
                      if (hierarchyFilter === "MASTER") return a.is_master;
                      if (hierarchyFilter === "SUB") return !a.is_master;
                      return true;
                    }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada agen ditemukan.
                      </td>
                    </tr>
                  ) : (
                    agents
                      .filter((a) => {
                        if (hierarchyFilter === "MASTER") return a.is_master;
                        if (hierarchyFilter === "SUB") return !a.is_master;
                        return true;
                      })
                      .map((agent) => (
                      <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-slate-900">{agent.name}</div>
                            {agent.is_master ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                                <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />
                                Master ({agent.override_pct || 3}% Override)
                              </span>
                            ) : agent.parent_agent_name ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Induk: {agent.parent_agent_name}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              {agent.code}
                            </span>
                            {agent.company_name && <span>• {agent.company_name}</span>}
                            <span>• {agent.phone}</span>
                            {agent.is_master && (
                              <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                {agent.sub_agents_count || 0} Sub-Agen
                              </span>
                            )}
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
                                : agent.status === "PENDING"
                                ? "bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                                : agent.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : agent.status === "SUSPENDED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}
                          >
                            {agent.status === "ACTIVE"
                              ? "Aktif"
                              : agent.status === "PENDING"
                              ? "Menunggu Verifikasi"
                              : agent.status === "REJECTED"
                              ? "Ditolak"
                              : agent.status === "SUSPENDED"
                              ? "Suspended"
                              : "Terminated"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {agent.status === "PENDING" ? (
                              <button
                                onClick={() => {
                                  setShowVerificationModal(agent);
                                  setShowRejectForm(false);
                                  setRejectReason("");
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                                title="Verifikasi Pendaftaran & Berkas KTP"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verifikasi Berkas
                              </button>
                            ) : (
                              <>
                                {(agent.ktp_url || agent.business_photo_url) && (
                                  <button
                                    onClick={() => {
                                      setShowVerificationModal(agent);
                                      setShowRejectForm(false);
                                      setRejectReason("");
                                    }}
                                    className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Lihat Foto KTP & Usaha"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    Berkas
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setShowTopupModal(agent);
                                    setManualTopupForm({ amount: 100000, notes: "Top-up saldo langsung oleh admin" });
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Riwayat Mutasi Saldo"
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  Mutasi
                                </button>
                              </>
                            )}

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
                                  is_master: agent.is_master || false,
                                  parent_agent_id: agent.parent_agent_id || undefined,
                                  clear_parent_agent: false,
                                  override_pct: agent.override_pct || 3,
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
                              className="px-2.5 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Cetak Dokumen PKS Kemitraan Resmi"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PKS
                            </button>

                            <button
                              onClick={() => setSelectedAgentForCertificate(agent)}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Cetak Sertifikat Kemitraan Resmi (A4 Landscape)"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-600" />
                              Sertifikat
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

              {/* Master Agent Hierarchy */}
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-purple-600" />
                    Tingkatan Keagenan (Master & Sub-Agen)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-900 select-none">
                    <input
                      type="checkbox"
                      checked={createForm.is_master || false}
                      onChange={(e) => {
                        const isMaster = e.target.checked;
                        setCreateForm({
                          ...createForm,
                          is_master: isMaster,
                          parent_agent_id: isMaster ? undefined : createForm.parent_agent_id,
                          override_pct: isMaster ? (createForm.override_pct || 3) : createForm.override_pct,
                        });
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>Jadikan Master Agen</span>
                  </label>
                </div>

                {createForm.is_master ? (
                  <div className="bg-white p-3 rounded-lg border border-purple-200 space-y-2">
                    <label className="block text-xs font-semibold text-purple-950 mb-1">
                      Persentase Overriding Commission (%) *
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={createForm.override_pct ?? 3}
                        onChange={(e) => setCreateForm({ ...createForm, override_pct: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg pr-7 font-bold text-purple-900"
                      />
                      <span className="absolute right-3 top-2 text-purple-400 font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-relaxed">
                      Master Agen memperoleh komisi overriding ini (default 3%) dari omzet voucher yang dihasilkan oleh sub-agen di bawah jaringannya.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilih Master Agen Induk (Opsional)
                    </label>
                    <select
                      value={createForm.parent_agent_id || ""}
                      onChange={(e) => setCreateForm({ ...createForm, parent_agent_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Tidak Ada (Agen Mandiri / Langsung ke ISP) --</option>
                      {agents
                        .filter((a) => a.is_master && a.status === "ACTIVE")
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            👑 {m.name} ({m.code}) - {m.company_name || "Tanpa Nama Toko"}
                          </option>
                        ))}
                    </select>
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      Jika dipilih, Master Agen induk akan otomatis menerima komisi overriding 3% saat agen ini bertransaksi voucher.
                    </p>
                  </div>
                )}
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

              {/* Tingkatan Keagenan (Master & Sub-Agen) */}
              <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-purple-600" />
                    Tingkatan Keagenan
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-900 select-none">
                    <input
                      type="checkbox"
                      checked={editForm.is_master || false}
                      onChange={(e) => {
                        const isMaster = e.target.checked;
                        setEditForm({
                          ...editForm,
                          is_master: isMaster,
                          clear_parent_agent: isMaster ? true : editForm.clear_parent_agent,
                          parent_agent_id: isMaster ? undefined : editForm.parent_agent_id,
                          override_pct: isMaster ? (editForm.override_pct || 3) : editForm.override_pct,
                        });
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>Master Agen</span>
                  </label>
                </div>

                {editForm.is_master ? (
                  <div className="bg-white p-3 rounded-lg border border-purple-200 space-y-1.5">
                    <label className="block text-xs font-semibold text-purple-950">
                      Persentase Overriding Commission (%)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={editForm.override_pct ?? 3}
                        onChange={(e) => setEditForm({ ...editForm, override_pct: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg pr-7 font-bold text-purple-900 text-xs"
                      />
                      <span className="absolute right-3 top-2 text-purple-400 font-bold text-xs">%</span>
                    </div>
                    <p className="text-[10.5px] text-purple-700">
                      Komisi overriding dari seluruh omzet voucher sub-agen di bawah jaringannya.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Master Agen Induk
                    </label>
                    <select
                      value={editForm.parent_agent_id || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm({
                          ...editForm,
                          parent_agent_id: val || undefined,
                          clear_parent_agent: !val,
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Tidak Ada (Agen Mandiri / Langsung ke ISP) --</option>
                      {agents
                        .filter((a) => a.is_master && a.status === "ACTIVE" && a.id !== showEditModal.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            👑 {m.name} ({m.code}) - {m.company_name || "Tanpa Nama Toko"}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
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
      <AgentPksModal
        isOpen={showPksModal}
        onClose={() => setShowPksModal(false)}
        agent={selectedAgentForPks}
        companyProfile={companyProfile}
      />

      {/* ── MODAL: VERIFIKASI PENDAFTARAN & BERKAS AGEN ───────────────── */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Verifikasi Pendaftaran &amp; Berkas Agen
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">
                      {showVerificationModal.code}
                    </span>
                    <span>&bull; {showVerificationModal.name}</span>
                    {showVerificationModal.company_name && (
                      <span>&bull; <strong>{showVerificationModal.company_name}</strong></span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowVerificationModal(null);
                  setShowRejectForm(false);
                  setRejectReason("");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dokumen Unggahan: KTP & Foto Usaha */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                Dokumen Verifikasi yang Diunggah
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Foto KTP */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Foto KTP Pemilik</span>
                    {showVerificationModal.ktp_url && (
                      <a
                        href={showVerificationModal.ktp_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-cyan-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka Penuh
                      </a>
                    )}
                  </div>
                  {showVerificationModal.ktp_url ? (
                    <div className="h-48 rounded-xl overflow-hidden bg-slate-900/5 flex items-center justify-center border border-slate-200">
                      <img
                        src={showVerificationModal.ktp_url}
                        alt="Foto KTP"
                        className="max-h-full max-w-full object-contain cursor-zoom-in"
                        onClick={() => window.open(showVerificationModal.ktp_url, "_blank")}
                      />
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <CreditCard className="w-8 h-8 mb-1 opacity-50" />
                      Belum ada foto KTP
                    </div>
                  )}
                </div>

                {/* Foto Loket/Tempat Usaha */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Foto Tempat Usaha / Gerai</span>
                    {showVerificationModal.business_photo_url && (
                      <a
                        href={showVerificationModal.business_photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-cyan-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka Penuh
                      </a>
                    )}
                  </div>
                  {showVerificationModal.business_photo_url ? (
                    <div className="h-48 rounded-xl overflow-hidden bg-slate-900/5 flex items-center justify-center border border-slate-200">
                      <img
                        src={showVerificationModal.business_photo_url}
                        alt="Foto Usaha"
                        className="max-h-full max-w-full object-contain cursor-zoom-in"
                        onClick={() => window.open(showVerificationModal.business_photo_url, "_blank")}
                      />
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Building2 className="w-8 h-8 mb-1 opacity-50" />
                      Belum ada foto gerai/loket
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rincian Identitas Lengkap */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Nama Pemilik (PIC):</span>
                <strong className="text-slate-900">{showVerificationModal.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NIK KTP (16 Digit):</span>
                <span className="font-mono font-bold text-slate-900">
                  {showVerificationModal.id_card_number || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Nomor WhatsApp:</span>
                <a
                  href={`https://wa.me/${showVerificationModal.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-cyan-700 hover:underline"
                >
                  {showVerificationModal.phone}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email Akun:</span>
                <span className="font-mono text-slate-700">
                  {showVerificationModal.email || showVerificationModal.user_email || "-"}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Alamat Lengkap Gerai / Loket:</span>
                <span className="text-slate-800">{showVerificationModal.address || "-"}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-200/80 pt-2">
                <span className="text-slate-400 block text-[11px]">Rekening Penampungan:</span>
                <span className="text-slate-800 font-medium">
                  {showVerificationModal.bank_name || "-"} {showVerificationModal.bank_account_number || "-"} a/n{" "}
                  {showVerificationModal.bank_account_holder || "-"}
                </span>
              </div>
            </div>

            {/* Form Alasan Penolakan (if clicked) */}
            {showRejectForm && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                <label className="block text-xs font-bold text-rose-900">
                  Alasan Penolakan Pendaftaran:
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Misal: Foto KTP buram / lokasi di luar wilayah operasional coverage..."
                  className="w-full p-2.5 text-xs border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-slate-900"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingVerification}
                    onClick={() => handleRejectAgent(showVerificationModal.id)}
                    className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingVerification ? "Memproses..." : "Konfirmasi Tolak Pendaftaran"}
                  </button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Status saat ini:{" "}
                <span className="font-bold text-slate-900">{showVerificationModal.status}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {showVerificationModal.status === "PENDING" && !showRejectForm && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(true)}
                      disabled={isProcessingVerification}
                      className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingVerification}
                      onClick={() => handleApproveAgent(showVerificationModal.id)}
                      className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {isProcessingVerification ? "Menyetujui..." : "Setujui Pendaftaran"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowVerificationModal(null);
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SERTIFIKAT KEMITRAAN AGEN RESMI ───────────────────── */}
      <AgentCertificateModal
        isOpen={!!selectedAgentForCertificate}
        onClose={() => setSelectedAgentForCertificate(null)}
        agent={selectedAgentForCertificate}
        companyProfile={companyProfile}
      />
    </div>
  );
}
