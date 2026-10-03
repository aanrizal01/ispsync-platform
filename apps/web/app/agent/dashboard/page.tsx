"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  agentApi,
  getMutationBadgeInfo,
  type AgentDashboardSummary,
  type AgentMutation,
  type TopupRequest,
  type AgentBatchResult,
  type InvoiceInquiryResult,
  type PayInvoiceReceipt,
  type UpdateAgentSettingsRequest,
} from "@/lib/api/agents";
import { authApi } from "@/lib/api/client";
import { voucherApi, type Voucher, type VoucherTemplate, type BlankVoucherInquiry } from "@/lib/api/vouchers";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import {
  Wallet,
  Sparkles,
  Copy,
  Check,
  Share2,
  Printer,
  Download,
  PlusCircle,
  CreditCard,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  QrCode,
  Tag,
  Store,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  LogOut,
  Camera,
  ScanLine,
  Barcode,
  Layers,
  Search,
  ShieldAlert,
  KeyRound,
  Info,
  HelpCircle,
  ArrowRight,
  Eye,
  EyeOff,
  History as HistoryIcon,
  Sliders,
  Smartphone,
  Settings,
  Landmark,
  Lock,
  X,
  Wifi,
  Award,
  FileText,
  Crown,
  Users,
} from "lucide-react";
import { PrinterSettingsModal } from "./PrinterSettingsModal";
import AgentCertificateModal, { type CompanyCertificateProfile } from "@/components/agent/AgentCertificateModal";
import AgentPksModal from "@/components/agent/AgentPksModal";
import { ThermalPrinterService, type VoucherTicketData } from "@/lib/thermal-printer";
import { passpointApi, type PasspointInquiryResult, type PasspointReceipt, type PasspointPackage } from "@/lib/api/passpoint";

export default function AgentDashboardPage() {
  const { logout } = useAuth();
  const [dashboard, setDashboard] = useState<AgentDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showPksModal, setShowPksModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyCertificateProfile>({
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
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [hideAppBanner, setHideAppBanner] = useState(false);

  useEffect(() => {
    setIsNativeApp(ThermalPrinterService.isNativeAndroid());

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

  // Active Tab
  const [activeTab, setActiveTab] = useState<"vouchers" | "scratch_cards" | "bill_payment" | "passpoint" | "mutations" | "topups" | "network">("vouchers");
  const [copiedReferral, setCopiedReferral] = useState(false);

  // ── Passpoint Wi-Fi State ─────────────────────────────────────────
  const [passpointSubTab, setPasspointSubTab] = useState<"manual" | "counter">("manual");
  const [passpointCodeSearch, setPasspointCodeSearch] = useState("");
  const [passpointInquiry, setPasspointInquiry] = useState<PasspointInquiryResult | null>(null);
  const [passpointInquiryLoading, setPasspointInquiryLoading] = useState(false);
  const [passpointInquiryError, setPasspointInquiryError] = useState<string | null>(null);
  const [passpointPayLoading, setPasspointPayLoading] = useState(false);
  const [passpointReceipt, setPasspointReceipt] = useState<PasspointReceipt | null>(null);
  const [passpointPackages, setPasspointPackages] = useState<PasspointPackage[]>([]);
  const [passpointManualPackageId, setPasspointManualPackageId] = useState("");
  const [passpointManualName, setPasspointManualName] = useState("");
  const [passpointManualPhone, setPasspointManualPhone] = useState("");
  const [passpointManualLoading, setPasspointManualLoading] = useState(false);
  const [passpointManualError, setPasspointManualError] = useState<string | null>(null);

  // ── Scratch Cards State ───────────────────────────────────────────
  const [scratchSubTab, setScratchSubTab] = useState<"activate" | "inquiry" | "history">("activate");
  const [activationMode, setActivationMode] = useState<"single" | "range">("single");
  const [snSingle, setSnSingle] = useState("");
  const [snStart, setSnStart] = useState("");
  const [snEnd, setSnEnd] = useState("");
  const [scratchTemplateId, setScratchTemplateId] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"single" | "start" | "end" | "inquiry" | "bill">("single");

  // Inquiry & Reissue State
  const [inquirySN, setInquirySN] = useState("");
  const [isCheckingSN, setIsCheckingSN] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<BlankVoucherInquiry | null>(null);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [isReissuing, setIsReissuing] = useState(false);
  const [reissueResult, setReissueResult] = useState<{
    old_code: string;
    new_code: string;
    new_password?: string;
    serial_number: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Scratch Cards History
  const [scratchHistory, setScratchHistory] = useState<Voucher[]>([]);
  const [scratchHistoryMeta, setScratchHistoryMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [scratchHistorySearch, setScratchHistorySearch] = useState("");
  const [scratchSearchInput, setScratchSearchInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});

  // Vouchers state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vouchersMeta, setVouchersMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);

  // Mutations state
  const [mutations, setMutations] = useState<AgentMutation[]>([]);
  const [mutationsMeta, setMutationsMeta] = useState({ page: 1, limit: 15, total: 0, total_pages: 1 });
  const [mutationTypeFilter, setMutationTypeFilter] = useState<string>("");
  const [isLoadingMutations, setIsLoadingMutations] = useState(false);

  // Topup requests state
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [isLoadingTopups, setIsLoadingTopups] = useState(false);

  // Templates for offline generation
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [batchResult, setBatchResult] = useState<AgentBatchResult | null>(null);

  // Generate form
  const [generateForm, setGenerateForm] = useState({
    template_id: "",
    quantity: 10,
    prefix: "",
    notes: "Voucher cetak konter",
  });

  // Topup form
  const [topupForm, setTopupForm] = useState({
    amount: 100000,
    bank_name: "BCA",
    bank_account_number: "",
    bank_account_holder: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Settings Modal State ──────────────────────────────────────────
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    company_name: "",
    phone: "",
    loket_admin_fee: 2500,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [copiedAgentCode, setCopiedAgentCode] = useState(false);

  // ── Bill Payment (Loket Tagihan) State ────────────────────────────
  const [showBillModal, setShowBillModal] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [isSearchingBill, setIsSearchingBill] = useState(false);
  const [billInquiry, setBillInquiry] = useState<InvoiceInquiryResult | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [billSearchError, setBillSearchError] = useState<string | null>(null);
  const [billAdminFee, setBillAdminFee] = useState<number>(2500);
  const [isPayingBill, setIsPayingBill] = useState(false);
  const [billReceipt, setBillReceipt] = useState<PayInvoiceReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isPrintingInvoiceReceipt, setIsPrintingInvoiceReceipt] = useState(false);
  const [confirmPaymentStep, setConfirmPaymentStep] = useState(false);

  // ── Thermal Print State ───────────────────────────────────────────
  const [thermalPrintVouchers, setThermalPrintVouchers] = useState<Voucher[]>([]);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [printFilter, setPrintFilter] = useState<"all" | "unprinted" | "printed">("all");

  const displayedVouchers = vouchers.filter((v) => {
    if (channelFilter === "OFFLINE" || !channelFilter) {
      if (printFilter === "unprinted") return !v.is_printed;
      if (printFilter === "printed") return v.is_printed;
    }
    return true;
  });

  const offlineVouchers = displayedVouchers.filter((v) => v.channel === "OFFLINE");
  const isAllSelected =
    offlineVouchers.length > 0 &&
    offlineVouchers.every((v) => selectedVoucherIds.includes(v.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedVoucherIds([]);
    } else {
      setSelectedVoucherIds(offlineVouchers.map((v) => v.id));
    }
  };

  const toggleSelectVoucher = (id: string) => {
    setSelectedVoucherIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePrintThermal = async (vouchersToPrint: Voucher[]) => {
    if (!vouchersToPrint || vouchersToPrint.length === 0) return;

    const tickets: VoucherTicketData[] = vouchersToPrint.map((v) => ({
      code: v.code,
      password: v.password,
      template_name: v.template_name,
      price: v.price,
      agent_name: dashboard?.agent.company_name || dashboard?.agent.name || "Mitra Resmi",
      created_at: formatDate(v.created_at),
    }));

    const cfg = ThermalPrinterService.getSettings();
    if (ThermalPrinterService.isNativeAndroid() || cfg.printMode === "rawbt") {
      const res = await ThermalPrinterService.printTickets(tickets, cfg);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } else {
      setThermalPrintVouchers(vouchersToPrint);
      setTimeout(() => {
        window.print();
      }, 250);
    }

    // Call API to mark as printed
    const ids = vouchersToPrint.map((v) => v.id);
    try {
      await agentApi.markVouchersPrinted(ids);
      setVouchers((prev) =>
        prev.map((v) =>
          ids.includes(v.id)
            ? {
                ...v,
                is_printed: true,
                print_count: (v.print_count || 0) + 1,
                printed_at: new Date().toISOString(),
              }
            : v
        )
      );
      if (batchResult) {
        setBatchResult((prev) =>
          prev
            ? {
                ...prev,
                vouchers: prev.vouchers.map((v) =>
                  ids.includes(v.id)
                    ? {
                        ...v,
                        is_printed: true,
                        print_count: (v.print_count || 0) + 1,
                        printed_at: new Date().toISOString(),
                      }
                    : v
                ),
              }
            : null
        );
      }
      setSelectedVoucherIds([]);
      showSuccess(`${vouchersToPrint.length} voucher berhasil dikirim ke printer thermal!`);
    } catch (err) {
      console.error("Failed to mark vouchers as printed", err);
    }
  };

  // ── Fetch Dashboard Summary ───────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await agentApi.getMyDashboard();
      setDashboard(data);
    } catch (err: any) {
      console.error("Failed to load agent dashboard", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch Vouchers ────────────────────────────────────────────────
  const fetchVouchers = useCallback(async (page = 1) => {
    setIsLoadingVouchers(true);
    try {
      const res = await agentApi.listMyVouchers({
        page,
        limit: 15,
        channel: channelFilter || undefined,
      });
      setVouchers(res.data || []);
      if (res.meta) setVouchersMeta(res.meta);
    } catch (err: any) {
      console.error("Failed to fetch vouchers", err);
    } finally {
      setIsLoadingVouchers(false);
    }
  }, [channelFilter]);

  // ── Fetch Mutations ───────────────────────────────────────────────
  const fetchMutations = useCallback(async (page = 1) => {
    setIsLoadingMutations(true);
    try {
      const res = await agentApi.listMyMutations({
        page,
        limit: 15,
        mutation_type: mutationTypeFilter || undefined,
      });
      setMutations(res.data || []);
      if (res.meta) setMutationsMeta(res.meta);
    } catch (err: any) {
      console.error("Failed to fetch mutations", err);
    } finally {
      setIsLoadingMutations(false);
    }
  }, [mutationTypeFilter]);

  // ── Fetch Topups ──────────────────────────────────────────────────
  const fetchTopups = useCallback(async () => {
    setIsLoadingTopups(true);
    try {
      const res = await agentApi.listMyTopupRequests({ page: 1, limit: 15 });
      setTopupRequests(res.data || []);
    } catch (err: any) {
      console.error("Failed to fetch topup requests", err);
    } finally {
      setIsLoadingTopups(false);
    }
  }, []);

  // ── Fetch Templates ───────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      const list = await agentApi.listTemplates();
      const active = (list || []).filter((t) => t.is_active);
      setTemplates(active);
      if (active.length > 0) {
        setGenerateForm((prev) => ({
          ...prev,
          template_id: prev.template_id || active[0].id,
        }));
        setScratchTemplateId((prev) => prev || active[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  }, []);

  // ── Fetch Scratch History ─────────────────────────────────────────
  const fetchScratchHistory = useCallback(async (page = 1, search = "") => {
    setIsLoadingHistory(true);
    try {
      const res = await voucherApi.listAgentHistory({
        page,
        limit: 10,
        search: search || undefined,
      });
      setScratchHistory(res.data || []);
      if (res.meta) setScratchHistoryMeta(res.meta);
    } catch (err: any) {
      console.error("Failed to fetch scratch history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchTemplates();
  }, [fetchDashboard, fetchTemplates]);

  useEffect(() => {
    if (activeTab === "vouchers") fetchVouchers(1);
    if (activeTab === "scratch_cards") fetchScratchHistory(1, scratchHistorySearch);
    if (activeTab === "mutations") fetchMutations();
    if (activeTab === "topups") fetchTopups();
    if (activeTab === "passpoint" && passpointPackages.length === 0) {
      passpointApi.getPackages().then((pkgs) => {
        setPasspointPackages(pkgs);
        if (pkgs.length > 0) {
          const pop = pkgs.find((p) => p.is_popular) || pkgs[0];
          setPasspointManualPackageId(pop.id);
        }
      }).catch(() => {});
    }
  }, [activeTab, fetchVouchers, fetchScratchHistory, fetchMutations, fetchTopups, scratchHistorySearch, passpointPackages.length]);

  const handleInquirePasspoint = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = passpointCodeSearch.trim();
    if (!code) return;
    setPasspointInquiryLoading(true);
    setPasspointInquiryError(null);
    setPasspointInquiry(null);
    try {
      const res = await passpointApi.inquireAgentOrder(code);
      setPasspointInquiry(res);
    } catch (err: any) {
      setPasspointInquiryError(err.message || "Pesanan Passpoint tidak ditemukan atau sudah kadaluwarsa");
    } finally {
      setPasspointInquiryLoading(false);
    }
  };

  const handlePayPasspoint = async () => {
    if (!passpointInquiry) return;
    setPasspointPayLoading(true);
    try {
      const receipt = await passpointApi.payAgentOrder({
        cashier_code: passpointInquiry.cashier_code,
        order_id: passpointInquiry.order_id,
      });
      setPasspointReceipt(receipt);
      setPasspointInquiry(null);
      setPasspointCodeSearch("");
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || "Gagal memproses pembayaran Passpoint");
    } finally {
      setPasspointPayLoading(false);
    }
  };

  const handleIssueManualPasspoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passpointManualPackageId || !passpointManualPhone.trim()) return;
    setPasspointManualLoading(true);
    setPasspointManualError(null);
    try {
      const receipt = await passpointApi.issueManualAgent({
        package_id: passpointManualPackageId,
        customer_name: passpointManualName.trim() || "Pelanggan Passpoint",
        phone: passpointManualPhone.trim().replace(/\D/g, "").replace(/^0/, "62"),
      });
      setPasspointReceipt(receipt);
      setPasspointManualPhone("");
      setPasspointManualName("");
      fetchDashboard();
    } catch (err: any) {
      setPasspointManualError(err.message || "Gagal menerbitkan Passpoint di konter");
    } finally {
      setPasspointManualLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettingsModal) setShowSettingsModal(false);
        if (showBillModal) {
          setShowBillModal(false);
          setBillInquiry(null);
          setConfirmPaymentStep(false);
        }
        if (showReceiptModal) {
          setShowReceiptModal(false);
          setBillReceipt(null);
        }
        if (showTopupModal) setShowTopupModal(false);
        if (showGenerateModal) setShowGenerateModal(false);
        if (showPrinterModal) setShowPrinterModal(false);
        if (batchResult) setBatchResult(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettingsModal, showBillModal, showReceiptModal, showTopupModal, showGenerateModal, showPrinterModal, batchResult]);

  // ── Global Barcode Scanner Gun Auto-Listener ──────────────────────
  useEffect(() => {
    let scanBuffer = "";
    let lastScanTime = Date.now();

    const handleBarcodeScannerWedge = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      const now = Date.now();
      const diff = now - lastScanTime;
      lastScanTime = now;

      if (e.key === "Enter") {
        const candidate = scanBuffer.trim();
        // If scanner captured an invoice or customer ID
        if (candidate.length >= 4 && (candidate.toUpperCase().startsWith("INV-") || candidate.toUpperCase().startsWith("CUS"))) {
          e.preventDefault();
          scanBuffer = "";
          setShowBillModal(true);
          setBillSearch(candidate);
          executeBillInquiry(candidate);
          return;
        }
        scanBuffer = "";
        return;
      }

      // Scanner guns type in fast bursts (< 75ms between characters)
      if (diff > 75 && !isInput) {
        scanBuffer = "";
      }

      if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleBarcodeScannerWedge);
    return () => window.removeEventListener("keydown", handleBarcodeScannerWedge);
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // ── Settings Handlers ─────────────────────────────────────────────
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatus(null);
    try {
      const updated = await agentApi.updateSettings({
        company_name: settingsForm.company_name.trim(),
        phone: settingsForm.phone.trim(),
        loket_admin_fee: Number(settingsForm.loket_admin_fee) || 2500,
      });
      if (dashboard) {
        setDashboard({
          ...dashboard,
          agent: {
            ...dashboard.agent,
            company_name: updated.company_name,
            phone: updated.phone,
            loket_admin_fee: updated.loket_admin_fee,
          },
        });
      }
      setBillAdminFee(updated.loket_admin_fee ?? 2500);
      setSettingsStatus({ type: "success", msg: "Pengaturan profil & fee loket berhasil disimpan!" });
    } catch (err: any) {
      setSettingsStatus({ type: "error", msg: err.message || "Gagal menyimpan pengaturan" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (!passwordForm.current_password) {
      setPasswordStatus({ type: "error", msg: "Kata sandi saat ini wajib diisi" });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordStatus({ type: "error", msg: "Kata sandi baru minimal 8 karakter" });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordStatus({ type: "error", msg: "Konfirmasi kata sandi baru tidak cocok" });
      return;
    }

    setIsSavingPassword(true);
    try {
      await authApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordStatus({ type: "success", msg: "Kata sandi berhasil diubah! Gunakan sandi baru pada login berikutnya." });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      setPasswordStatus({ type: "error", msg: err.message || "Gagal mengubah kata sandi" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Barcode POS Beep Audio Feedback ─────────────────────────────
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1350, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // AudioContext policy suppression gracefully ignored
    }
  };

  // ── Bill Payment Handlers ─────────────────────────────────────────
  const executeBillInquiry = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) {
      setBillSearchError("Masukkan ID Pelanggan, nomor invoice, atau nomor HP");
      return;
    }

    setIsSearchingBill(true);
    setBillSearchError(null);
    setBillInquiry(null);
    setSelectedInvoiceId(null);
    setConfirmPaymentStep(false);

    try {
      const res = await agentApi.inquireInvoice(query);
      setBillInquiry(res);
      setSelectedInvoiceId(res.invoice_id);
      setBillAdminFee(res.admin_fee || dashboard?.agent.loket_admin_fee || 2500);
      playScanBeep();
    } catch (err: any) {
      setBillSearchError(err.message || "Tagihan tidak ditemukan atau sudah lunas");
    } finally {
      setIsSearchingBill(false);
    }
  };

  const handleInquireBill = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeBillInquiry(billSearch);
  };

  const handlePayBill = async () => {
    if (!billInquiry) return;
    const invoiceToPayId = selectedInvoiceId || billInquiry.invoice_id;
    if (!invoiceToPayId) return;

    setIsPayingBill(true);
    try {
      const receipt = await agentApi.payInvoice({
        invoice_id: invoiceToPayId,
        admin_fee: Number(billAdminFee) || 0,
      });
      setBillReceipt(receipt);
      setShowBillModal(false);
      setShowReceiptModal(true);
      setBillInquiry(null);
      setSelectedInvoiceId(null);
      setBillSearch("");
      setConfirmPaymentStep(false);
      fetchDashboard();
      fetchMutations();
    } catch (err: any) {
      alert("Gagal melakukan pembayaran: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsPayingBill(false);
    }
  };

  const handlePrintReceiptThermal = async (receipt: PayInvoiceReceipt) => {
    setIsPrintingInvoiceReceipt(true);
    try {
      await ThermalPrinterService.printInvoiceReceipt(receipt);
    } catch (err: any) {
      alert("Gagal mencetak struk: " + (err.message || ""));
    } finally {
      setIsPrintingInvoiceReceipt(false);
    }
  };

  const handleShareWhatsAppReceipt = (receipt: PayInvoiceReceipt) => {
    const lines = [
      `*STRUK PEMBAYARAN TAGIHAN INTERNET*`,
      `*${(receipt.agent_company_name || receipt.agent_name || "ISPSYNC BILL").toUpperCase()}*`,
      `==============================`,
      `*No. Transaksi:* ${receipt.payment_number}`,
      `*No. Invoice:* ${receipt.invoice_number}`,
      `*Waktu:* ${formatDate(receipt.paid_at)}`,
      `------------------------------`,
      `*ID Pelanggan:* ${receipt.customer_code}`,
      `*Nama:* ${receipt.customer_name}`,
      receipt.customer_phone ? `*No. HP:* ${receipt.customer_phone}` : null,
      `*Paket:* ${receipt.plan_name}`,
      `*Bulan Tagihan:* ${receipt.billing_month}`,
      `------------------------------`,
      `Tagihan Net: ${formatRupiah(receipt.subtotal)}`,
      receipt.tax_amount > 0 ? `PPN 11%: ${formatRupiah(receipt.tax_amount)}` : null,
      `Biaya Admin/Loket: ${formatRupiah(receipt.admin_fee)}`,
      `==============================`,
      `*TOTAL BAYAR: ${formatRupiah(receipt.total_customer_pay)}*`,
      `==============================`,
      `*STATUS: LUNAS* ✅`,
      ``,
      `Terima kasih telah melakukan pembayaran di ${receipt.agent_company_name || receipt.agent_name || "loket kami"}! Simpan pesan ini sebagai bukti pembayaran yang sah.`,
    ].filter(Boolean).join("\n");

    const phone = receipt.customer_phone ? receipt.customer_phone.replace(/\D/g, "") : "";
    let waUrl = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    if (phone) {
      const formattedPhone = phone.startsWith("0") ? "62" + phone.slice(1) : phone;
      waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(lines)}`;
    }
    window.open(waUrl, "_blank");
  };

  // ── Copy Promo Code ───────────────────────────────────────────────
  const handleCopyPromo = () => {
    if (!dashboard?.today_promo_code) return;
    navigator.clipboard.writeText(dashboard.today_promo_code);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  // ── Share WhatsApp ────────────────────────────────────────────────
  const handleShareWhatsApp = () => {
    if (!dashboard) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://hot.ispsync.id";
    const discountPct = dashboard.agent?.online_discount_pct ?? 5;
    const text = `Halo! Mau internet WiFi cepat & stabil? 🚀\n\nBeli voucher hotspot resmi di sini: ${origin}/hotspot/buy\nGunakan Kode Promo Harian: *${dashboard.today_promo_code}*\n\n🎁 Dapatkan langsung DISKON ${discountPct}% saat pembayaran!`;

    // 1. Android Native App Bridge
    if ((window as any).AndroidPrinter?.shareWhatsApp) {
      (window as any).AndroidPrinter.shareWhatsApp(text, null);
      return;
    }

    // 2. Web WhatsApp Redirect (with popup blocker fallback)
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      const win = window.open(waUrl, "_blank");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = waUrl;
      }
    } catch {
      window.location.href = waUrl;
    }
  };

  // ── Generate Offline Voucher Batch ────────────────────────────────
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await agentApi.generateOfflineBatch({
        template_id: generateForm.template_id,
        quantity: Number(generateForm.quantity),
        prefix: generateForm.prefix || undefined,
        notes: generateForm.notes,
      });

      setBatchResult(res);
      setShowGenerateModal(false);
      showSuccess(`Berhasil membuat ${res.vouchers.length} voucher! Saldo terpotong ${formatRupiah(res.net_cost)}.`);
      fetchDashboard();
      if (activeTab === "vouchers") fetchVouchers(1);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit Topup Request ──────────────────────────────────────────
  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await agentApi.submitMyTopupRequest({
        amount: Number(topupForm.amount),
        bank_name: topupForm.bank_name,
        bank_account_number: topupForm.bank_account_number,
        bank_account_holder: topupForm.bank_account_holder,
        notes: topupForm.notes,
      });

      setShowTopupModal(false);
      showSuccess("Pengajuan top-up berhasil dikirim! Silakan transfer dan tunggu konfirmasi admin.");
      setActiveTab("topups");
      fetchTopups();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengirim pengajuan top-up");
    } finally {
      setIsSubmitting(false);
    }
  };
  // ── Activate Single Blank Voucher ─────────────────────────────────
  const handleActivateSingle = async () => {
    if (!snSingle.trim()) {
      setErrorMessage("Silakan masukkan atau scan Serial Number (SN)");
      return;
    }
    if (!scratchTemplateId) {
      setErrorMessage("Pilih paket voucher terlebih dahulu");
      return;
    }
    setIsActivating(true);
    setErrorMessage(null);
    try {
      const activated = await voucherApi.activateBlankVoucher({
        serial_number: snSingle.trim(),
        template_id: scratchTemplateId,
      });
      showSuccess(`Kartu SN ${activated.serial_number} berhasil diaktifkan dengan paket ${activated.template_name || ""}!`);
      setSnSingle("");
      fetchDashboard();
      fetchScratchHistory(1, scratchHistorySearch);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengaktifkan kartu voucher");
    } finally {
      setIsActivating(false);
    }
  };

  // ── Helper Range Count Calculation ────────────────────────────────
  const getRangeCount = () => {
    const sStr = snStart.replace(/\D/g, "");
    const eStr = snEnd.replace(/\D/g, "");
    if (!sStr || !eStr) return 0;
    try {
      const s = BigInt(sStr);
      const e = BigInt(eStr);
      if (s <= BigInt(0) || e <= BigInt(0) || e < s) return 0;
      const diff = e - s + BigInt(1);
      if (diff > BigInt(500)) return -1;
      return Number(diff);
    } catch {
      return 0;
    }
  };
  const rangeCount = getRangeCount();

  // ── Activate Blank Range ──────────────────────────────────────────
  const handleActivateRange = async () => {
    if (!snStart.trim() || !snEnd.trim()) {
      setErrorMessage("Masukkan SN Awal dan SN Akhir dengan lengkap");
      return;
    }
    if (!scratchTemplateId) {
      setErrorMessage("Pilih paket voucher terlebih dahulu");
      return;
    }
    if (rangeCount <= 0) {
      setErrorMessage("Rentang Serial Number tidak valid (SN Akhir harus >= SN Awal)");
      return;
    }
    if (rangeCount > 500) {
      setErrorMessage("Maksimal aktivasi rentang sekaligus adalah 500 kartu");
      return;
    }

    if (!confirm(`Konfirmasi: Anda akan mengaktifkan ${rangeCount} lembar kartu fisik (SN ${snStart} s/d ${snEnd})?\nTotal modal yang akan dipotong: ${formatRupiah(totalRangeNet)}`)) {
      return;
    }

    setIsActivating(true);
    setErrorMessage(null);
    try {
      const res = await voucherApi.activateBlankRange({
        sn_start: snStart.trim(),
        sn_end: snEnd.trim(),
        template_id: scratchTemplateId,
      });
      showSuccess(`Berhasil mengaktifkan ${res.success_count} kartu fisik sekaligus! Total modal terpotong ${formatRupiah(res.total_cost)}.`);
      setSnStart("");
      setSnEnd("");
      fetchDashboard();
      fetchScratchHistory(1, scratchHistorySearch);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengaktifkan rentang voucher");
    } finally {
      setIsActivating(false);
    }
  };

  // ── Check SN (Inquiry) ────────────────────────────────────────────
  const handleCheckSN = async (snToCheck?: string) => {
    const targetSN = (snToCheck || inquirySN).trim();
    if (!targetSN) {
      setInquiryError("Masukkan Serial Number (SN) yang ingin diperiksa");
      return;
    }
    setIsCheckingSN(true);
    setInquiryError(null);
    setInquiryResult(null);
    setReissueResult(null);
    try {
      const res = await voucherApi.checkSN(targetSN);
      setInquiryResult(res);
    } catch (err: any) {
      setInquiryError(err.message || "SN tidak ditemukan atau gagal dicek");
    } finally {
      setIsCheckingSN(false);
    }
  };

  // ── Reissue Damaged Voucher ───────────────────────────────────────
  const handleReissueDamaged = async () => {
    if (!inquiryResult?.serial_number) return;
    const reason = prompt("Masukkan alasan pembatalan fisik & ganti kode darurat (misal: 'Stiker perak terkelupas rusak oleh pembeli'):", "Stiker rusak terkelupas");
    if (!reason) return;
    setIsReissuing(true);
    try {
      const res = await voucherApi.reissueDamagedVoucher({
        serial_number: inquiryResult.serial_number,
        reason,
      });
      setReissueResult({
        old_code: inquiryResult.code || "",
        new_code: res.code,
        new_password: res.password,
        serial_number: res.serial_number || inquiryResult.serial_number,
      });
      showSuccess(`Kode darurat baru berhasil diterbitkan! Kode fisik lama telah dinonaktifkan (void).`);
      handleCheckSN(inquiryResult.serial_number);
      fetchScratchHistory(1, scratchHistorySearch);
    } catch (err: any) {
      alert(err.message || "Gagal menerbitkan kode baru");
    } finally {
      setIsReissuing(false);
    }
  };

  // ── Handle Camera Scanner Scan Event ──────────────────────────────
  const handleScanSuccess = (scannedText: string) => {
    setShowCameraScanner(false);
    const cleaned = scannedText.trim();
    if (cameraTarget === "single") {
      setSnSingle(cleaned);
    } else if (cameraTarget === "start") {
      setSnStart(cleaned);
    } else if (cameraTarget === "end") {
      setSnEnd(cleaned);
    } else if (cameraTarget === "inquiry") {
      setInquirySN(cleaned);
      handleCheckSN(cleaned);
    } else if (cameraTarget === "bill") {
      setBillSearch(cleaned);
      executeBillInquiry(cleaned);
    }
  };

  // ── Share Replacement Voucher via WhatsApp ────────────────────────
  const handleShareReissueWhatsApp = () => {
    if (!reissueResult) return;
    const text = `Halo! Berikut penggantian kode voucher hotspot Anda karena fisik rusak:\n\n*Serial Number:* ${reissueResult.serial_number}\n*Kode Login Baru:* *${reissueResult.new_code}*\n${reissueResult.new_password && reissueResult.new_password !== reissueResult.new_code ? `*Password:* ${reissueResult.new_password}\n` : ""}Silakan login ke hotspot WiFi @ISPSYNC-HOTSPOT.\n(Kode fisik lama telah dibatalkan)`;

    // 1. Android Native App Bridge
    if ((window as any).AndroidPrinter?.shareWhatsApp) {
      (window as any).AndroidPrinter.shareWhatsApp(text, null);
      return;
    }

    // 2. Web WhatsApp Redirect (with popup blocker fallback)
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      const win = window.open(waUrl, "_blank");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = waUrl;
      }
    } catch {
      window.location.href = waUrl;
    }
  };

  // ── Scratch Cards Financial Calculations ──────────────────────────
  const selectedScratchTemplate = templates.find((t) => t.id === scratchTemplateId) || templates[0];
  const scratchUnitPrice = selectedScratchTemplate?.price || 0;
  const scratchCashbackPct = dashboard?.agent.offline_cashback_pct ?? 20;
  const scratchCashbackUnit = Math.round((scratchUnitPrice * scratchCashbackPct) / 100);
  const scratchNetCostUnit = scratchUnitPrice - scratchCashbackUnit;

  const totalRangeGross = rangeCount > 0 ? rangeCount * scratchUnitPrice : 0;
  const totalRangeNet = rangeCount > 0 ? rangeCount * scratchNetCostUnit : 0;
  const totalRangeProfit = rangeCount > 0 ? rangeCount * scratchCashbackUnit : 0;

  const isScratchSingleBalanceEnough = (dashboard?.agent.balance ?? 0) >= scratchNetCostUnit;
  const isScratchRangeBalanceEnough = (dashboard?.agent.balance ?? 0) >= totalRangeNet;
  // Calculations for Generate Modal
  const selectedTemplate = templates.find((t) => t.id === generateForm.template_id);
  const qty = Number(generateForm.quantity) || 1;
  const unitPrice = selectedTemplate?.price || 0;
  const grossTotal = unitPrice * qty;
  const cashbackPct = dashboard?.agent.offline_cashback_pct ?? 20;
  const cashbackAmount = Math.round((grossTotal * cashbackPct) / 100);
  const netCost = grossTotal - cashbackAmount;
  const currentBalance = dashboard?.agent.balance ?? 0;
  const isBalanceEnough = currentBalance >= netCost;

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-sm font-medium">Memuat data portal agen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── ANDROID APP & BLUETOOTH THERMAL GUIDANCE BANNER ──────── */}
      {isNativeApp ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Aplikasi Android GOGIGA Agent Aktif</span>
              <p className="text-xs text-emerald-700">Printer Thermal Bluetooth terhubung secara langsung via ESC/POS.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPrinterModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 text-center"
          >
            Pilih Printer Bluetooth
          </button>
        </div>
      ) : !hideAppBanner ? (
        <div className="bg-linear-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden border border-blue-800/40">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-52 h-52 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Solusi Cetak Struk Bluetooth Anti Gagal</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Pakai Aplikasi Android GOGIGA Agent
              </h3>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                Cetak voucher langsung dari browser smartphone sering gagal tersambung ke printer Bluetooth portabel. Gunakan aplikasi Android resmi agar voucher bisa langsung keluar di printer thermal 58mm/80mm sekali klik!
              </p>

              {/* 3 Langkah Cepat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                    <span>Unduh APK</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">Download & pasang aplikasi GOGIGA Agent di HP.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
                    <span>Pair Bluetooth</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">Nyalakan & pasangkan printer di menu Bluetooth HP.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
                    <span>Sekali Klik Cetak</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">Pilih printer & langsung cetak tanpa dialog terpotong!</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 self-stretch sm:self-auto justify-center">
              <a
                href="/downloads/gogiga-agent.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download APK Resmi</span>
              </a>

              <button
                type="button"
                onClick={() => setShowPrinterModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition-all active:scale-95 border border-white/10 text-center"
              >
                <Sliders className="w-4 h-4 text-blue-300" />
                <span>Setting & Driver RawBT</span>
              </button>

              <button
                type="button"
                onClick={() => setHideAppBanner(true)}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors text-center pt-0.5"
              >
                Sembunyikan panduan ini ✕
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── TOP HERO: WALLET & DAILY PROMO ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Card Saldo Dompet */}
        <div className="md:col-span-6 bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Saldo Dompet Agen
                </span>
                {dashboard?.is_master ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/40">
                    <Crown className="w-3 h-3 text-amber-300 fill-amber-300" />
                    MASTER AGENT ({dashboard.override_pct || 3}%)
                  </span>
                ) : dashboard?.agent.parent_agent_name ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300 border border-white/15">
                    Induk: {dashboard.agent.parent_agent_name}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettingsForm({
                    company_name: dashboard?.agent.company_name || "",
                    phone: dashboard?.agent.phone || "",
                    loket_admin_fee: dashboard?.agent.loket_admin_fee ?? 2500,
                  });
                  setSettingsStatus(null);
                  setPasswordStatus(null);
                  setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                  setShowSettingsModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-3 py-1 rounded-xl transition-all border border-white/15 active:scale-95 cursor-pointer shadow-xs"
                title="Pengaturan Profil, Fee Loket & Kata Sandi"
              >
                <Settings className="w-3.5 h-3.5 text-amber-300" />
                <span>Pengaturan</span>
              </button>
            </div>

            <div className="mt-3">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {formatRupiah(dashboard?.agent.balance || 0)}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Gunakan saldo untuk mencetak voucher offline atau bayar tagihan pelanggan!
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setBillSearch("");
                setBillInquiry(null);
                setBillSearchError(null);
                setConfirmPaymentStep(false);
                setBillAdminFee(dashboard?.agent.loket_admin_fee ?? 2500);
                setShowBillModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Landmark className="w-4 h-4" />
              Bayar Tagihan
            </button>

            <button
              onClick={() => {
                fetchTemplates();
                setShowGenerateModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Voucher Fisik
            </button>

            <button
              onClick={() => setShowTopupModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-xs transition-all active:scale-95 border border-white/10"
            >
              <CreditCard className="w-4 h-4" />
              Isi Saldo
            </button>
          </div>
        </div>

        {/* Card Kode Promo Harian */}
        <div className="md:col-span-6 bg-linear-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-200" />
                Kode Promo Harian Anda
              </span>
              <span className="text-[11px] font-semibold bg-black/20 text-amber-100 px-2 py-0.5 rounded-full">
                Berlaku Hari Ini ({dashboard?.valid_date || "Hari Ini"})
              </span>
            </div>

            {/* 6-Digit Big Promo Display */}
            <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="bg-slate-950/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border-2 border-white/30 tracking-widest font-mono text-3xl sm:text-4xl font-black text-amber-300 shadow-inner text-center">
                {dashboard?.today_promo_code || "------"}
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2">
                <button
                  onClick={handleCopyPromo}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  title="Salin Kode Promo"
                >
                  {copiedPromo ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPromo ? "Tersalin!" : "Salin"}</span>
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                  title="Bagikan ke WhatsApp Pelanggan"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-amber-100 leading-relaxed font-medium bg-black/15 p-2.5 rounded-xl border border-white/10">
              💡 Pelanggan memasukkan kode ini saat beli online di <b>/hotspot/buy</b>. Pelanggan dapat <b>Diskon {dashboard?.agent.online_discount_pct}%</b>, dan Anda otomatis dapat <b>Komisi {dashboard?.agent.online_cashback_pct}%</b> langsung masuk ke saldo dompet!
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS SUMMARY CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Terjual</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {dashboard?.total_vouchers_sold || 0}
          </div>
          <span className="text-[11px] text-slate-500">Seluruh voucher</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Voucher Offline</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {dashboard?.total_offline_count || 0}
          </div>
          <span className="text-[11px] text-slate-500">Cashback {dashboard?.agent.offline_cashback_pct}%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Penjualan Promo</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {dashboard?.total_online_count || 0}
          </div>
          <span className="text-[11px] text-slate-500">Komisi {dashboard?.agent.online_cashback_pct}%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Status Topup</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {dashboard?.pending_topup_count || 0}
          </div>
          <span className="text-[11px] text-slate-500">Pengajuan menunggu</span>
        </div>
      </div>

      {/* ── TABS NAVIGATION ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-2xs flex overflow-x-auto no-scrollbar gap-1.5">
        <button
          onClick={() => setActiveTab("bill_payment")}
          className={cn(
            "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "bill_payment"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Landmark className="w-4 h-4 shrink-0" />
          <span>Loket Tagihan</span>
          <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-700/60 text-emerald-100 font-bold">
            PPOB
          </span>
        </button>

        <button
          onClick={() => setActiveTab("vouchers")}
          className={cn(
            "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeTab === "vouchers"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Voucher Saya ({vouchersMeta.total})</span>
        </button>

        <button
          onClick={() => setActiveTab("scratch_cards")}
          className={cn(
            "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "scratch_cards"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Voucher Gesek</span>
          <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 text-white font-bold">
            SN
          </span>
        </button>

        <button
          onClick={() => setActiveTab("passpoint")}
          className={cn(
            "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "passpoint"
              ? "bg-cyan-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Passpoint Wi-Fi</span>
          <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-700/60 text-cyan-100 font-bold">
            15%
          </span>
        </button>

        <button
          onClick={() => setActiveTab("mutations")}
          className={cn(
            "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeTab === "mutations"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Mutasi Saldo</span>
        </button>

        <button
          onClick={() => setActiveTab("topups")}
          className={cn(
            "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeTab === "topups"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>Riwayat Top-Up</span>
        </button>

        {dashboard?.is_master && (
          <button
            onClick={() => setActiveTab("network")}
            className={cn(
              "shrink-0 sm:flex-1 py-2.5 px-3.5 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
              activeTab === "network"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Crown className="w-4 h-4 shrink-0 text-amber-300 fill-amber-300" />
            <span>Jaringan Sub-Agen</span>
            <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-purple-700/60 text-purple-100 font-bold">
              {dashboard.sub_agents_count || (dashboard.sub_agents ? dashboard.sub_agents.length : 0)}
            </span>
          </button>
        )}
      </div>

      {/* ── TAB: LOKET PEMBAYARAN TAGIHAN INTERNET ────────────────── */}
      {activeTab === "bill_payment" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-linear-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-bold mb-3 backdrop-blur-xs border border-white/10">
                <Landmark className="w-3.5 h-3.5 text-emerald-300" />
                Loket PPOB Internet & Tagihan Bulanan
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Bayar Tagihan Bulanan Pelanggan
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 leading-relaxed">
                Terima pembayaran tagihan internet secara tunai langsung di konter/loket Anda. Saldo dompet agen Anda hanya dipotong sejumlah tagihan resmi ISP, dan biaya loket (admin fee) menjadi keuntungan tunai utuh kas agen Anda!
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cari Tagihan Pelanggan
              </label>
              <form onSubmit={handleInquireBill} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    placeholder="Masukkan ID Pelanggan (CUST-...), No. HP, atau No. Invoice..."
                    className="w-full pl-10 pr-8 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium"
                  />
                  {billSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBillSearch("");
                        setBillInquiry(null);
                        setBillSearchError(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearchingBill || !billSearch.trim()}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
                >
                  {isSearchingBill ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mencari...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Cek Tagihan</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Error state */}
            {billSearchError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <div className="font-bold">Tagihan Tidak Ditemukan</div>
                  <div>{billSearchError}</div>
                </div>
              </div>
            )}
          </div>

          {/* Inquiry Result Card */}
          {billInquiry && (() => {
            const activeInv = billInquiry.invoices?.find((i) => i.invoice_id === selectedInvoiceId) || {
              invoice_id: billInquiry.invoice_id,
              invoice_number: billInquiry.invoice_number,
              billing_month: billInquiry.billing_month,
              due_date: billInquiry.due_date,
              subtotal: billInquiry.subtotal,
              tax_amount: billInquiry.tax_amount,
              total_amount: billInquiry.total_amount || billInquiry.total_invoice,
              amount_paid: billInquiry.amount_paid || 0,
              amount_due: billInquiry.amount_due || billInquiry.total_invoice,
              status: billInquiry.status,
              is_overdue: billInquiry.is_overdue,
            };
            const invoiceAmount = Number(activeInv.amount_due || activeInv.total_amount || 0);
            const feeLoket = Number(billAdminFee) || 0;
            const totalPayCustomer = invoiceAmount + feeLoket;
            const hasEnoughBalance = (dashboard?.agent.balance || 0) >= invoiceAmount;
            const isPaid = billInquiry.status === "PAID" || (billInquiry.unpaid_count === 0 && (!billInquiry.invoices || billInquiry.invoices.length === 0));

            return (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
                      Tagihan Ditemukan
                    </span>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      {activeInv.invoice_number}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide",
                      isPaid
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : activeInv.is_overdue
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    )}>
                      {isPaid ? "Sudah Lunas" : activeInv.is_overdue ? "Jatuh Tempo" : "Belum Dibayar"}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Customer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pelanggan</span>
                      <div className="text-base font-bold text-slate-900 mt-0.5">{billInquiry.customer_name}</div>
                      <div className="text-xs font-mono text-slate-600 mt-0.5">ID: {billInquiry.customer_code}</div>
                      {billInquiry.customer_phone && (
                        <div className="text-xs text-slate-500 mt-0.5">HP/WA: {billInquiry.customer_phone}</div>
                      )}
                      {billInquiry.customer_address && (
                        <div className="text-xs text-slate-500 mt-0.5 italic">{billInquiry.customer_address}</div>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Layanan & Periode</span>
                      <div className="text-base font-bold text-blue-600 mt-0.5">{billInquiry.plan_name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">Bulan Tagihan: <span className="font-semibold">{activeInv.billing_month || "Bulan Ini"}</span></div>
                      <div className="text-xs text-slate-500 mt-0.5">Jatuh Tempo: <span className="font-semibold font-mono">{formatDate(activeInv.due_date)}</span></div>
                    </div>
                  </div>

                  {/* Multi-invoice selector if > 1 unpaid */}
                  {billInquiry.invoices && billInquiry.invoices.length > 1 && (
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-900 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Pelanggan Memiliki {billInquiry.invoices.length} Tagihan Tertunggak</span>
                        </div>
                        <span className="font-mono font-bold text-xs bg-amber-200/70 text-amber-900 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                          Total Semua: {formatRupiah(billInquiry.total_unpaid_amount || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800">
                        Pilih tagihan yang ingin dibayar (disarankan lunasi tagihan terlama lebih dulu):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {billInquiry.invoices.map((inv, idx) => {
                          const isSel = (selectedInvoiceId || billInquiry.invoice_id) === inv.invoice_id;
                          return (
                            <button
                              key={inv.invoice_id}
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceId(inv.invoice_id);
                                setConfirmPaymentStep(false);
                              }}
                              className={cn(
                                "text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer",
                                isSel
                                  ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20 text-slate-900"
                                  : "bg-white/60 hover:bg-white border-amber-200 text-slate-700"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] shrink-0",
                                  isSel ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                                )}>
                                  {isSel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div>
                                  <span className="font-bold text-xs block">{inv.billing_month || `Bulan ${idx + 1}`}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{inv.invoice_number}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs text-slate-900 block">{formatRupiah(inv.amount_due)}</span>
                                <span className="text-[10px] text-rose-600 font-semibold">{inv.is_overdue ? "Jatuh Tempo" : "Belum Bayar"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Calculation Breakdown or Paid Notice */}
                  {isPaid ? (
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-base">Semua Tagihan Sudah Lunas</div>
                        <div className="text-xs text-emerald-700 mt-0.5">
                          Pelanggan ini tidak memiliki tagihan tertunggak saat ini.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-3">
                      <div className="flex justify-between items-center text-sm text-slate-600">
                        <span>Tagihan Internet Net ({activeInv.invoice_number}):</span>
                        <span className="font-bold font-mono text-slate-900">{formatRupiah(activeInv.subtotal)}</span>
                      </div>
                      {activeInv.tax_amount > 0 && (
                        <div className="flex justify-between items-center text-sm text-slate-600">
                          <span>PPN 11%:</span>
                          <span className="font-bold font-mono text-slate-900">{formatRupiah(activeInv.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm text-slate-700 font-semibold pt-1 border-t border-slate-200">
                        <span>Subtotal Tagihan Resmi ISP:</span>
                        <span className="font-mono text-slate-900">{formatRupiah(invoiceAmount)}</span>
                      </div>

                      {/* Fee Loket Input */}
                      <div className="pt-2 pb-1 border-t border-dashed border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                              <Store className="w-3.5 h-3.5" />
                              Biaya Admin / Fee Loket Anda (Kas Langsung Agen):
                            </span>
                            <p className="text-[11px] text-slate-500">
                              Keuntungan tunai yang Anda terima langsung dari pelanggan (tidak memotong saldo ISP).
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <span className="text-xs font-bold text-slate-500">Rp</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={billAdminFee}
                              onChange={(e) => setBillAdminFee(Number(e.target.value) || 0)}
                              className="w-28 px-3 py-1.5 text-right font-mono font-bold text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Total customer pays */}
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                            TOTAL DITERIMA DARI PELANGGAN (TUNAI)
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            Tagihan ISP + Fee Admin Loket
                          </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700 font-mono">
                          {formatRupiah(totalPayCustomer)}
                        </div>
                      </div>

                      {/* Deduction from agent balance notice */}
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Saldo Dompet Agen yang akan dipotong:</span>
                        </div>
                        <span className="font-mono font-bold text-blue-800 text-sm">
                          {formatRupiah(invoiceAmount)}
                        </span>
                      </div>

                      {/* Balance check */}
                      {!hasEnoughBalance && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Saldo dompet tidak mencukupi (Saldo: {formatRupiah(dashboard?.agent.balance || 0)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowTopupModal(true)}
                            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-500"
                          >
                            Top-Up Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBillInquiry(null);
                          setSelectedInvoiceId(null);
                          setConfirmPaymentStep(false);
                        }}
                        className="w-full py-3 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm transition-colors cursor-pointer"
                      >
                        Tutup (Tagihan Lunas)
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setBillInquiry(null);
                            setSelectedInvoiceId(null);
                            setConfirmPaymentStep(false);
                          }}
                          className="sm:w-1/3 py-3 px-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Batal
                        </button>

                        {!confirmPaymentStep ? (
                          <button
                            type="button"
                            disabled={!hasEnoughBalance}
                            onClick={() => setConfirmPaymentStep(true)}
                            className="sm:flex-1 py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Lanjut Pembayaran ({activeInv.invoice_number})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPayingBill}
                            onClick={handlePayBill}
                            className="sm:flex-1 py-3 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse cursor-pointer"
                          >
                            {isPayingBill ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Memproses Pembayaran...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Konfirmasi: Potong Saldo {formatRupiah(invoiceAmount)}</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB 1: VOUCHERS LIST ──────────────────────────────────── */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          {/* Sub-filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { label: "Semua Jalur", val: "" },
                  { label: "Offline (Cetak)", val: "OFFLINE" },
                  { label: "Online (Promo)", val: "ONLINE" },
                ].map((f) => (
                  <button
                    key={f.val}
                    onClick={() => {
                      setChannelFilter(f.val);
                      setSelectedVoucherIds([]);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                      channelFilter === f.val
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Status Cetak Filter (khusus jika ada voucher offline) */}
              {(channelFilter === "" || channelFilter === "OFFLINE") && (
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {[
                    { label: "Semua Cetak", val: "all" },
                    { label: "⏳ Belum Diprint", val: "unprinted" },
                    { label: "✓ Sudah Diprint", val: "printed" },
                  ].map((f) => (
                    <button
                      key={f.val}
                      onClick={() => setPrintFilter(f.val as any)}
                      className={cn(
                        "px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                        printFilter === f.val
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedVoucherIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const toPrint = vouchers.filter((v) => selectedVoucherIds.includes(v.id));
                    handlePrintThermal(toPrint);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  Cetak {selectedVoucherIds.length} Tiket Thermal
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowPrinterModal(true)}
                className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg transition-colors shadow-2xs"
                title="Pengaturan Printer Thermal Bluetooth (58mm/80mm)"
              >
                <Sliders className="w-4 h-4" />
              </button>

              <button
                onClick={() => fetchVouchers(1)}
                className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg transition-colors shadow-2xs"
                title="Refresh"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingVouchers && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Vouchers Content (Responsive: Cards on Mobile, Table on Desktop) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        disabled={offlineVouchers.length === 0}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Pilih Semua Voucher Offline"
                      />
                    </th>
                    <th className="py-3 px-4">Kode / Order ID</th>
                    <th className="py-3 px-4">Paket / Layanan</th>
                    <th className="py-3 px-4">Harga Normal</th>
                    <th className="py-3 px-4">Jalur &amp; Keuntungan</th>
                    <th className="py-3 px-4">Status Cetak</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Waktu Buat</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingVouchers ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Memuat voucher...
                      </td>
                    </tr>
                  ) : displayedVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Belum ada voucher pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    displayedVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-center">
                          {v.channel === "OFFLINE" ? (
                            <input
                              type="checkbox"
                              checked={selectedVoucherIds.includes(v.id)}
                              onChange={() => toggleSelectVoucher(v.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {v.channel === "ONLINE" ? (
                            <div>
                              <div className="font-mono font-bold text-slate-800 text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded inline-flex items-center gap-1.5 shadow-2xs">
                                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                <span>{v.order_id || "Order Online"}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {v.buyer_phone ? `No. HP: ${v.buyer_phone}` : "Voucher milik pembeli"}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono font-bold text-slate-900 text-sm">{v.code}</div>
                              {v.password && v.password !== v.code && (
                                <div className="text-xs text-slate-400 font-mono">Pwd: {v.password}</div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{v.template_name || "Voucher Hotspot"}</div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {formatRupiah(v.price)}
                        </td>

                        <td className="py-3 px-4">
                          {v.channel === "OFFLINE" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              Offline (Cashback {dashboard?.agent.offline_cashback_pct}%)
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                Online (Promo {v.promo_code || "-"})
                              </span>
                              {v.agent_commission && v.agent_commission > 0 && (
                                <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                                  + Komisi {formatRupiah(v.agent_commission)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status Cetak */}
                        <td className="py-3 px-4">
                          {v.channel === "OFFLINE" ? (
                            v.is_printed ? (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md"
                                title={`Dicetak pada ${v.printed_at ? formatDate(v.printed_at) : "-"}`}
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                Dicetak {v.print_count && v.print_count > 1 ? `(${v.print_count}x)` : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Belum Diprint
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">- (E-Voucher)</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                              v.status === "UNUSED" || v.status === "CREATED"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : v.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {v.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                          {formatDate(v.created_at)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {v.channel === "OFFLINE" ? (
                            <button
                              type="button"
                              onClick={() => handlePrintThermal([v])}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs hover:text-blue-600 transition-colors"
                              title="Cetak Tiket Thermal (58mm/80mm)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed View */}
            <div className="block md:hidden">
              {/* Mobile Select All Header */}
              {offlineVouchers.length > 0 && (
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Pilih Semua Voucher Offline ({offlineVouchers.length})</span>
                  </label>
                  {selectedVoucherIds.length > 0 && (
                    <span className="text-blue-600 font-mono">
                      {selectedVoucherIds.length} terpilih
                    </span>
                  )}
                </div>
              )}

              {isLoadingVouchers ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">Memuat voucher...</p>
                </div>
              ) : displayedVouchers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada voucher pada kategori ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {displayedVouchers.map((v) => (
                    <div key={v.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {v.channel === "OFFLINE" && (
                            <input
                              type="checkbox"
                              checked={selectedVoucherIds.includes(v.id)}
                              onChange={() => toggleSelectVoucher(v.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                            />
                          )}
                          <div>
                            {v.channel === "ONLINE" ? (
                              <div className="font-mono font-bold text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 inline-flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-slate-500" />
                                <span>{v.order_id || "Order Online"}</span>
                              </div>
                            ) : (
                              <div className="font-mono font-black text-slate-900 text-base tracking-wider">
                                {v.code}
                              </div>
                            )}
                            {v.password && v.password !== v.code && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                PIN: {v.password}
                              </div>
                            )}
                          </div>
                        </div>

                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0",
                            v.status === "UNUSED" || v.status === "CREATED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : v.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {v.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{v.template_name || "Voucher Hotspot"}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {formatDate(v.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-900 text-sm">
                            {formatRupiah(v.price)}
                          </div>
                          {v.channel === "OFFLINE" ? (
                            <div className="text-[10.5px] text-blue-600 font-semibold mt-0.5">
                              Cashback {dashboard?.agent.offline_cashback_pct}%
                            </div>
                          ) : v.agent_commission && v.agent_commission > 0 ? (
                            <div className="text-[10.5px] text-emerald-600 font-bold mt-0.5">
                              + Komisi {formatRupiah(v.agent_commission)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Footer actions & print info */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                        <div>
                          {v.channel === "OFFLINE" ? (
                            v.is_printed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Dicetak {v.print_count && v.print_count > 1 ? `(${v.print_count}x)` : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Belum Diprint
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">E-Voucher Online</span>
                          )}
                        </div>

                        {v.channel === "OFFLINE" && (
                          <button
                            type="button"
                            onClick={() => handlePrintThermal([v])}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors active:scale-95"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Cetak Thermal</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1.5: VOUCHER GESEK & UNIVERSAL BLANKO SYSTEM ──────── */}
      {activeTab === "scratch_cards" && (
        <div className="space-y-6">
          {/* Banner Penjelasan Sistem Blanko */}
          <div className="bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-amber-100 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Sistem Kartu Blanko Fisik Gesek Ala Telkomsel</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                Aktivasi & Tembak Paket Kartu Gesek
              </h3>
              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed max-w-2xl font-medium">
                Pegang stok kartu blanko fisik di konter. Ketika pembeli datang, tembak Serial Number (SN) kartu, pilih paket WiFi yang diinginkan, dan saldo modal Anda otomatis dipotong dengan <b>Diskon Cashback {dashboard?.agent.offline_cashback_pct}%</b>. Kartu fisik langsung aktif dan siap digesek pelanggan!
              </p>
            </div>
          </div>

          {/* Sub Tabs: Aktivasi vs Cek Status/Bantuan vs Riwayat */}
          <div className="flex overflow-x-auto no-scrollbar items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setScratchSubTab("activate")}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                scratchSubTab === "activate"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Aktivasi Kartu (SN)</span>
            </button>

            <button
              onClick={() => setScratchSubTab("inquiry")}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                scratchSubTab === "inquiry"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Cek SN & Bantuan Darurat</span>
            </button>

            <button
              onClick={() => {
                setScratchSubTab("history");
                fetchScratchHistory(1, scratchHistorySearch);
              }}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                scratchSubTab === "history"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <HistoryIcon className="w-4 h-4 shrink-0" />
              <span>Riwayat Aktivasi ({scratchHistoryMeta.total})</span>
            </button>
          </div>

          {/* ── SUB-TAB 1: AKTIVASI KARTU (SATUAN & RENTANG) ─────────── */}
          {scratchSubTab === "activate" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Aktivasi */}
              <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
                {/* Switch Mode: Satuan vs Rentang */}
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setActivationMode("single")}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                      activationMode === "single"
                        ? "bg-white text-amber-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Barcode className="w-4 h-4" />
                    <span>Aktivasi Satuan (1 Kartu)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivationMode("range")}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                      activationMode === "range"
                        ? "bg-white text-amber-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Aktivasi Rentang SN (Batch)</span>
                  </button>
                </div>

                {/* MODE 1: AKTIVASI SATUAN */}
                {activationMode === "single" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Serial Number (SN) Kartu Blanko *
                        </label>
                        <span className="text-[10.5px] text-blue-600 font-medium">
                          Mendukung Scanner Gun (Laser / Bluetooth)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Ketik atau tembak barcode SN (misal: 260000000001)"
                            value={snSingle}
                            onChange={(e) => setSnSingle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleActivateSingle();
                              }
                            }}
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:font-normal placeholder:text-xs"
                          />
                          {snSingle && (
                            <button
                              type="button"
                              onClick={() => setSnSingle("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCameraTarget("single");
                            setShowCameraScanner(true);
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                          title="Buka Kamera untuk Scan Barcode"
                        >
                          <Camera className="w-4 h-4 text-slate-600" />
                          <span className="hidden sm:inline">Kamera</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Arahkan scanner gun laser ke barcode di bagian belakang kartu, atau ketik 12 digit SN lalu tekan Enter.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pilih Paket Hotspot yang Diinjeksikan *
                      </label>
                      <select
                        value={scratchTemplateId}
                        onChange={(e) => setScratchTemplateId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white font-semibold text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} — {formatRupiah(tpl.price)} ({tpl.duration_minutes >= 60 ? `${tpl.duration_minutes / 60} Jam` : `${tpl.duration_minutes} Menit`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isActivating || !snSingle.trim() || !isScratchSingleBalanceEnough}
                      onClick={handleActivateSingle}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none active:scale-[0.99]"
                    >
                      {isActivating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengaktifkan Kartu Gesek...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Aktifkan Kartu Gesek Sekarang ({formatRupiah(scratchNetCostUnit)})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* MODE 2: AKTIVASI RENTANG SN (BATCH) */}
                {activationMode === "range" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <b>Aktivasi Cepat Multi-Kartu:</b> Masukkan SN kartu pertama dan kartu terakhir dari gepokan fisik Anda. Sistem akan mengaktifkan seluruh rentang sekaligus secara otomatis dalam 1 transaksi.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SN Awal (Mulai) *
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Contoh: 260000000010"
                            value={snStart}
                            onChange={(e) => setSnStart(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCameraTarget("start");
                              setShowCameraScanner(true);
                            }}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Scan Barcode SN Awal"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SN Akhir (Selesai) *
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Contoh: 260000000020"
                            value={snEnd}
                            onChange={(e) => setSnEnd(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCameraTarget("end");
                              setShowCameraScanner(true);
                            }}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Scan Barcode SN Akhir"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Range Detection Badge */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                      <span className="font-semibold text-slate-600">Deteksi Jumlah Kartu:</span>
                      {rangeCount > 0 ? (
                        <span className="font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          {rangeCount} Lembar Kartu Berurutan
                        </span>
                      ) : rangeCount === -1 ? (
                        <span className="font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                          Maksimal 500 kartu per aktivasi
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Masukkan SN awal dan akhir
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pilih Paket Hotspot untuk Semua Kartu Ini *
                      </label>
                      <select
                        value={scratchTemplateId}
                        onChange={(e) => setScratchTemplateId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white font-semibold text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} — {formatRupiah(tpl.price)} ({tpl.duration_minutes >= 60 ? `${tpl.duration_minutes / 60} Jam` : `${tpl.duration_minutes} Menit`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isActivating || rangeCount <= 0 || !isScratchRangeBalanceEnough}
                      onClick={handleActivateRange}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none active:scale-[0.99]"
                    >
                      {isActivating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengaktifkan {rangeCount} Kartu...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>
                            Aktifkan {rangeCount > 0 ? `${rangeCount} Kartu Sekaligus` : "Rentang Kartu"} ({formatRupiah(totalRangeNet)})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Financial Breakdown & Profit Simulator */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-sm text-slate-100">Kalkulator Modal & Laba</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md font-bold">
                      Cashback {scratchCashbackPct}%
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Paket Dipilih:</span>
                      <span className="font-bold text-white text-right">
                        {selectedScratchTemplate?.name || "-"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Harga Normal Jual:</span>
                      <span className="font-bold text-slate-200">
                        {formatRupiah(activationMode === "single" ? scratchUnitPrice : totalRangeGross)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Margin / Komisi Agen ({scratchCashbackPct}%):</span>
                      <span className="font-bold">
                        + {formatRupiah(activationMode === "single" ? scratchCashbackUnit : totalRangeProfit)}
                      </span>
                    </div>

                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm text-white block">Modal Terpotong Saldo:</span>
                        <span className="text-[10px] text-slate-400">Dipotong dari dompet agen</span>
                      </div>
                      <span className="text-xl font-black text-amber-400 font-mono">
                        {formatRupiah(activationMode === "single" ? scratchNetCostUnit : totalRangeNet)}
                      </span>
                    </div>
                  </div>

                  {/* Wallet Check & Warning */}
                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Saldo Dompet Anda:</span>
                      <span className="font-bold text-white font-mono">
                        {formatRupiah(dashboard?.agent.balance || 0)}
                      </span>
                    </div>

                    {activationMode === "single" && !isScratchSingleBalanceEnough && (
                      <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Saldo dompet tidak mencukupi untuk mengaktifkan kartu ini.</span>
                      </div>
                    )}

                    {activationMode === "range" && rangeCount > 0 && !isScratchRangeBalanceEnough && (
                      <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Saldo tidak cukup untuk {rangeCount} kartu (butuh {formatRupiah(totalRangeNet)}).</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fast Tips Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2 text-xs text-slate-600">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-500" />
                    <span>Petunjuk Penulisan Fisik:</span>
                  </div>
                  <p className="leading-relaxed text-[11.5px]">
                    Setelah kartu diaktifkan, tuliskan nama paket dan harga pada kolom titik-titik kartu blanko menggunakan spidol/pulpen sebelum diserahkan ke pembeli.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── SUB-TAB 2: CEK STATUS & BANTUAN DARURAT ─────────────── */}
          {scratchSubTab === "inquiry" && (
            <div className="space-y-6">
              {/* Inquiry Search Bar */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Pemeriksaan Kartu & Solusi Gosok Rusak
                  </h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Masukkan Serial Number kartu untuk memeriksa apakah kartu masih kosong, sudah aktif, sedang online, atau expired. Jika pembeli merusak stiker saat menggosok, Anda dapat menerbitkan kode darurat baru.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <div className="flex gap-2 w-full flex-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Masukkan Serial Number (SN) kartu..."
                        value={inquirySN}
                        onChange={(e) => setInquirySN(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCheckSN();
                          }
                        }}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:font-normal placeholder:text-xs"
                      />
                      {inquirySN && (
                        <button
                          type="button"
                          onClick={() => setInquirySN("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("inquiry");
                        setShowCameraScanner(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      title="Scan Barcode SN"
                    >
                      <Camera className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">Kamera</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isCheckingSN || !inquirySN.trim()}
                    onClick={() => handleCheckSN()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                  >
                    {isCheckingSN ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Periksa Kartu</span>
                  </button>
                </div>

                {inquiryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{inquiryError}</span>
                  </div>
                )}
              </div>

              {/* Inquiry Result Card */}
              {inquiryResult && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        SERIAL NUMBER (SN)
                      </span>
                      <div className="text-xl font-black font-mono text-slate-900 tracking-wider">
                        {inquiryResult.serial_number}
                      </div>
                    </div>

                    <div>
                      {inquiryResult.status === "BLANK" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          BLANK (Belum Diinjeksi Paket)
                        </span>
                      )}
                      {inquiryResult.status === "UNUSED" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          SIAP DIGUNAKAN (Belum Login)
                        </span>
                      )}
                      {inquiryResult.status === "ACTIVE" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          SEDANG AKTIF ONLINE
                        </span>
                      )}
                      {inquiryResult.status === "EXPIRED" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          KEDALUWARSA / HABIS
                        </span>
                      )}
                      {inquiryResult.status === "REVOKED" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          DIBATALKAN / DIGANTI DARURAT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Paket Internet</span>
                      <span className="font-bold text-slate-900 text-sm">{inquiryResult.template_name || "-"}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Harga Jual</span>
                      <span className="font-bold text-blue-700 text-sm">{formatRupiah(inquiryResult.price)}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Waktu Aktivasi</span>
                      <span className="font-bold text-slate-800">
                        {inquiryResult.activated_at ? formatDate(inquiryResult.activated_at) : "Belum diaktifkan"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Kedaluwarsa</span>
                      <span className="font-bold text-slate-800">
                        {inquiryResult.expires_at ? formatDate(inquiryResult.expires_at) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* EMERGENCY REISSUE ACTION CARD */}
                  {inquiryResult.status === "UNUSED" && (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">
                            Pelanggan Mengeluh Kode Rusak Saat Menggosok?
                          </h4>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                            Jika lapisan perak terkelupas terlalu keras hingga angka PIN robek/hilang, Anda dapat membatalkan voucher fisik ini secara permanen (anti-double use) dan menerbitkan kode baru secara instan tanpa dipotong saldo lagi.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isReissuing}
                        onClick={handleReissueDamaged}
                        className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                      >
                        {isReissuing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menerbitkan Kode Baru...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            <span>Batalkan Fisik & Terbitkan Kode Pengganti Darurat</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* REISSUE SUCCESS MODAL/BANNER */}
                  {reissueResult && (
                    <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>KODE PENGGANTI DARURAT BERHASIL DITERBITKAN!</span>
                      </div>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        Kode fisik lama (<del>{reissueResult.old_code}</del>) telah dinonaktifkan (void) sehingga tidak dapat digunakan kembali jika serpihannya ditemukan orang lain.
                      </p>

                      <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          KODE LOGIN BARU UNTUK PELANGGAN:
                        </span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-widest">
                          {reissueResult.new_code}
                        </div>
                        {reissueResult.new_password && reissueResult.new_password !== reissueResult.new_code && (
                          <div className="text-xs font-mono text-slate-600">
                            Password: <b>{reissueResult.new_password}</b>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(reissueResult.new_code);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedCode ? "Kode Tersalin!" : "Salin Kode Baru"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleShareReissueWhatsApp}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Share2 className="w-4 h-4 text-emerald-400" />
                          <span>Kirim ke WhatsApp Pelanggan</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SUB-TAB 3: RIWAYAT KARTU GESEK SAYA ─────────────────── */}
          {scratchSubTab === "history" && (
            <div className="space-y-4">
              {/* Filter / Search History */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setScratchHistorySearch(scratchSearchInput);
                    fetchScratchHistory(1, scratchSearchInput);
                  }}
                  className="flex items-center gap-2 flex-1 max-w-md"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari Serial Number (SN) atau Kode..."
                      value={scratchSearchInput}
                      onChange={(e) => setScratchSearchInput(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Cari
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => fetchScratchHistory(scratchHistoryMeta.page, scratchHistorySearch)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoadingHistory && "animate-spin")} />
                </button>
              </div>

              {/* History Table (Desktop) & Cards (Mobile) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-3 px-4">Serial Number</th>
                        <th className="py-3 px-4">Kode PIN</th>
                        <th className="py-3 px-4">Paket & Tarif</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Waktu Aktivasi</th>
                        <th className="py-3 px-4 text-center">Bantuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingHistory ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                            Memuat riwayat aktivasi kartu gesek...
                          </td>
                        </tr>
                      ) : scratchHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            Belum ada kartu gesek yang diaktifkan.
                          </td>
                        </tr>
                      ) : (
                        scratchHistory.map((item) => {
                          const isRevealed = revealedCodes[item.id];
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900">
                                {item.serial_number || "-"}
                              </td>

                              <td className="py-3 px-4 font-mono text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">
                                    {isRevealed ? item.code : "••••••"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedCodes((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id],
                                      }))
                                    }
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                    title={isRevealed ? "Sembunyikan" : "Tampilkan Kode"}
                                  >
                                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 text-xs">{item.template_name || "-"}</div>
                                <div className="text-[11px] text-blue-600 font-semibold">{formatRupiah(item.price)}</div>
                              </td>

                              <td className="py-3 px-4">
                                {item.status === "UNUSED" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    Siap Pakai
                                  </span>
                                )}
                                {item.status === "ACTIVE" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Aktif Online
                                  </span>
                                )}
                                {item.status === "EXPIRED" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    Expired
                                  </span>
                                )}
                                {item.status === "REVOKED" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    Void / Diganti
                                  </span>
                                )}
                                {item.status === "BLANK" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Blanko
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                                {item.activated_at ? formatDate(item.activated_at) : formatDate(item.created_at)}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScratchSubTab("inquiry");
                                    setInquirySN(item.serial_number || "");
                                    handleCheckSN(item.serial_number || "");
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs hover:text-amber-600 transition-colors"
                                >
                                  Cek / Bantuan
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Feed View */}
                <div className="block md:hidden">
                  {isLoadingHistory ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      <p className="text-xs">Memuat riwayat kartu gesek...</p>
                    </div>
                  ) : scratchHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Belum ada kartu gesek yang diaktifkan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {scratchHistory.map((item) => {
                        const isRevealed = revealedCodes[item.id];
                        return (
                          <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                                  SERIAL NUMBER
                                </span>
                                <div className="font-mono font-black text-slate-900 text-sm tracking-wider">
                                  {item.serial_number || "-"}
                                </div>
                              </div>

                              <div>
                                {item.status === "UNUSED" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    Siap Pakai
                                  </span>
                                )}
                                {item.status === "ACTIVE" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Aktif Online
                                  </span>
                                )}
                                {item.status === "EXPIRED" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    Expired
                                  </span>
                                )}
                                {item.status === "REVOKED" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    Void / Diganti
                                  </span>
                                )}
                                {item.status === "BLANK" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Blanko
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                              <div>
                                <div className="font-bold text-slate-800">{item.template_name || "-"}</div>
                                <div className="text-[11px] text-blue-600 font-bold mt-0.5">{formatRupiah(item.price)}</div>
                              </div>

                              {/* Revealable Code PIN */}
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 font-mono text-xs">
                                <span className="font-bold text-slate-900">
                                  {isRevealed ? item.code : "••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedCodes((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id],
                                    }))
                                  }
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                  title={isRevealed ? "Sembunyikan" : "Tampilkan Kode"}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {item.activated_at ? formatDate(item.activated_at) : formatDate(item.created_at)}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setScratchSubTab("inquiry");
                                  setInquirySN(item.serial_number || "");
                                  handleCheckSN(item.serial_number || "");
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors active:scale-95"
                              >
                                Cek / Solusi Rusak
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* History Pagination */}
                {scratchHistoryMeta.total_pages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-200 text-xs">
                    <span className="text-slate-500">
                      Halaman {scratchHistoryMeta.page} dari {scratchHistoryMeta.total_pages} (Total {scratchHistoryMeta.total} kartu)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={scratchHistoryMeta.page <= 1 || isLoadingHistory}
                        onClick={() => fetchScratchHistory(scratchHistoryMeta.page - 1, scratchHistorySearch)}
                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        disabled={scratchHistoryMeta.page >= scratchHistoryMeta.total_pages || isLoadingHistory}
                        onClick={() => fetchScratchHistory(scratchHistoryMeta.page + 1, scratchHistorySearch)}
                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: LOKET PASSPOINT WI-FI 2.0 ───────────────────────── */}
      {activeTab === "passpoint" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold mb-3 border border-cyan-500/30">
                  <Wifi className="w-3.5 h-3.5" />
                  HOTSPOT 2.0 CARRIER-GRADE
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Loket Passpoint Wi-Fi 2.0
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  Layani pembayaran kode pesanan pelanggan online (+ Biaya Kasir Rp {dashboard?.agent.loket_admin_fee?.toLocaleString() || "2.500"} Tunai) atau terbitkan akses Passpoint manual langsung di konter kasir dengan margin {dashboard?.agent.offline_cashback_pct || 15}%.
                </p>
              </div>

              {/* Quick Commission Stats */}
              <div className="flex gap-2 sm:gap-3 shrink-0">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center min-w-[120px]">
                  <p className="text-[10px] text-cyan-200 font-mono uppercase">Komisi Kasir Online</p>
                  <p className="text-lg font-black text-white font-mono mt-0.5">
                    {dashboard?.agent.online_cashback_pct || 10}% <span className="text-xs font-normal text-cyan-300">+ Admin</span>
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center min-w-[120px]">
                  <p className="text-[10px] text-cyan-200 font-mono uppercase">Margin Manual Konter</p>
                  <p className="text-lg font-black text-white font-mono mt-0.5">
                    {dashboard?.agent.offline_cashback_pct || 15}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          <div className="flex border-b border-slate-200 gap-6">
            <button
              onClick={() => {
                setPasspointSubTab("manual");
                setPasspointInquiry(null);
                setPasspointInquiryError(null);
              }}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer",
                passpointSubTab === "manual"
                  ? "text-cyan-700 border-b-2 border-cyan-600"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>1. Terbitkan Akses Langsung di Konter (Margin 15%)</span>
            </button>

            <button
              onClick={() => {
                setPasspointSubTab("counter");
                setPasspointInquiry(null);
                setPasspointInquiryError(null);
              }}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer",
                passpointSubTab === "counter"
                  ? "text-cyan-700 border-b-2 border-cyan-600"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Store className="w-4 h-4" />
              <span>2. Cek Kode Bayar / Konfirmasi Pesanan</span>
            </button>
          </div>

          {/* SUB-TAB 1: Konfirmasi Pesanan Kasir */}
          {passpointSubTab === "counter" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cek &amp; Lunasi Kode Bayar Pelanggan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan kode kasir Passpoint (contoh: <b>PP-48192</b> atau <b>ORD-PP-...</b>) yang ditunjukkan oleh pelanggan di konter Anda.
                  </p>
                </div>

                <form onSubmit={handleInquirePasspoint} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Masukkan Kode Bayar (contoh: PP-48192)"
                      value={passpointCodeSearch}
                      onChange={(e) => setPasspointCodeSearch(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase font-bold outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passpointInquiryLoading || !passpointCodeSearch.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {passpointInquiryLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memeriksa...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Cek Pesanan</span>
                      </>
                    )}
                  </button>
                </form>

                {passpointInquiryError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{passpointInquiryError}</span>
                  </div>
                )}
              </div>

              {/* Inquiry Result Card */}
              {passpointInquiry && (
                <div className="bg-white rounded-2xl border-2 border-cyan-500/40 p-6 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                          {passpointInquiry.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Kadaluwarsa: {passpointInquiry.expires_at}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mt-1 font-mono">
                        Kode: {passpointInquiry.cashier_code}
                      </h4>
                      <p className="text-xs text-slate-500">Order ID: {passpointInquiry.order_id}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400">Total Wajib Diterima dari Pelanggan:</span>
                      <p className="text-2xl font-black text-emerald-600 font-mono">
                        {formatRupiah(passpointInquiry.total_customer_pays)}
                      </p>
                    </div>
                  </div>

                  {/* Detail Pelanggan & Paket */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Informasi Pelanggan</span>
                      <p className="text-sm font-bold text-slate-900">{passpointInquiry.customer_name || "Pelanggan Passpoint"}</p>
                      <p className="text-xs text-slate-600 font-mono">{passpointInquiry.customer_phone}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Paket Internet Passpoint</span>
                      <p className="text-sm font-bold text-slate-900">{passpointInquiry.package_name}</p>
                      <p className="text-xs text-cyan-700 font-mono font-bold">Masa Aktif +{passpointInquiry.duration_days} Hari Unlimited</p>
                    </div>
                  </div>

                  {/* Kalkulasi Kasir & Komisi */}
                  <div className="p-4 rounded-xl bg-cyan-950 text-white space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Harga Asli Paket:</span>
                      <span>{formatRupiah(passpointInquiry.original_price)}</span>
                    </div>
                    {passpointInquiry.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Diskon Online Pelanggan:</span>
                        <span>-{formatRupiah(passpointInquiry.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>Biaya Layanan Kasir Konter Anda:</span>
                      <span className="text-cyan-300">+{formatRupiah(passpointInquiry.admin_fee)}</span>
                    </div>
                    <div className="pt-2 border-t border-cyan-800 flex justify-between text-sm font-bold text-white">
                      <span>Total Uang Diterima dari Pelanggan:</span>
                      <span className="text-emerald-400 font-black">{formatRupiah(passpointInquiry.total_customer_pays)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pt-1">
                      <span>Modal Saldo Agen Dipotong (Nett):</span>
                      <span className="text-red-400 font-bold">-{formatRupiah(passpointInquiry.agent_debit_amount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-300 font-bold bg-cyan-900/60 p-2 rounded-lg border border-cyan-700">
                      <span>Keuntungan Kasir Bersih (Cash di Tangan):</span>
                      <span className="text-sm font-black">+{formatRupiah(passpointInquiry.agent_profit)}</span>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      disabled={passpointPayLoading || (dashboard?.agent.balance ?? 0) < passpointInquiry.agent_debit_amount}
                      onClick={handlePayPasspoint}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {passpointPayLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Memproses Pelunasan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Bayar via Saldo Agen ({formatRupiah(passpointInquiry.agent_debit_amount)})</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasspointInquiry(null)}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  {(dashboard?.agent.balance ?? 0) < passpointInquiry.agent_debit_amount && (
                    <p className="text-xs text-red-600 text-center font-semibold">
                      ⚠️ Saldo modal agen Anda tidak mencukupi (Perlu {formatRupiah(passpointInquiry.agent_debit_amount)}, Saldo Anda {formatRupiah(dashboard?.agent.balance || 0)}). Silakan top-up saldo terlebih dahulu.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: Terbitkan Manual di Konter */}
          {passpointSubTab === "manual" && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Penerbitan Passpoint Baru Manual (Margin {dashboard?.agent.offline_cashback_pct || 15}%)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan form ini jika pelanggan datang langsung ke konter Anda tanpa melakukan pemesanan online sebelumnya. Saldo modal Anda otomatis dipotong dengan margin {dashboard?.agent.offline_cashback_pct || 15}%.
                </p>
              </div>

              {passpointManualError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{passpointManualError}</span>
                </div>
              )}

              <form onSubmit={handleIssueManualPasspoint} className="space-y-6">
                {/* Package Cards */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Pilih Paket Passpoint *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {passpointPackages.map((pkg) => {
                      const isSelected = passpointManualPackageId === pkg.id;
                      const cashback = Math.round(pkg.price * ((dashboard?.agent.offline_cashback_pct || 15) / 100));
                      const debit = pkg.price - cashback;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setPasspointManualPackageId(pkg.id)}
                          className={cn(
                            "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                            isSelected
                              ? "border-cyan-600 bg-cyan-50/50 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          )}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="text-sm font-bold text-slate-900">{pkg.name}</h4>
                              {pkg.is_popular && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  Laris
                                </span>
                              )}
                            </div>
                            <p className="text-lg font-black text-cyan-700 font-mono mt-1">
                              {formatRupiah(pkg.price)}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">{pkg.description}</p>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-mono">Modal: <b className="text-slate-800">{formatRupiah(debit)}</b></span>
                            <span className="text-emerald-600 font-bold font-mono">Untung: +{formatRupiah(cashback)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nomor WhatsApp Pelanggan *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={passpointManualPhone}
                      onChange={(e) => setPasspointManualPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nama Pelanggan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pak Budi"
                      value={passpointManualName}
                      onChange={(e) => setPasspointManualName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
                    />
                  </div>
                </div>

                {/* Real-time Summary Bar */}
                {(() => {
                  const sel = passpointPackages.find((p) => p.id === passpointManualPackageId);
                  if (!sel) return null;
                  const comm = Math.round(sel.price * ((dashboard?.agent.offline_cashback_pct || 15) / 100));
                  const debit = sel.price - comm;
                  const canAfford = (dashboard?.agent.balance ?? 0) >= debit;
                  return (
                    <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span>Paket Terpilih:</span>
                        <span className="font-bold text-white">{sel.name}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Uang Diterima dari Pelanggan:</span>
                        <span className="text-emerald-400 font-bold">{formatRupiah(sel.price)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Potong Saldo Modal Agen:</span>
                        <span className="text-red-400 font-bold">-{formatRupiah(debit)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-emerald-400">
                        <span>Keuntungan Langsung Kasir:</span>
                        <span className="text-base font-black">+{formatRupiah(comm)}</span>
                      </div>
                      {!canAfford && (
                        <p className="text-red-400 pt-1 text-center font-bold">
                          ⚠️ Saldo agen tidak cukup ({formatRupiah(dashboard?.agent.balance || 0)} &lt; {formatRupiah(debit)}). Silakan top-up terlebih dahulu.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={
                    passpointManualLoading ||
                    !passpointManualPackageId ||
                    !passpointManualPhone.trim() ||
                    (() => {
                      const sel = passpointPackages.find((p) => p.id === passpointManualPackageId);
                      if (!sel) return true;
                      const comm = Math.round(sel.price * ((dashboard?.agent.offline_cashback_pct || 15) / 100));
                      return (dashboard?.agent.balance ?? 0) < sel.price - comm;
                    })()
                  }
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {passpointManualLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menerbitkan Akses Passpoint...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Terbitkan Passpoint Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: MUTASI SALDO ───────────────────────────────────── */}
      {activeTab === "mutations" && (
        <div className="space-y-4">
          {/* Header & Filter Bar */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700" />
                  Buku Kas & Riwayat Mutasi Saldo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan pembukuan kas saldo Anda: penarikan dana, top-up, modal voucher, komisi agen, dan pembayaran tagihan.
                </p>
              </div>

              <button
                onClick={() => fetchMutations(mutationsMeta.page)}
                className="p-1.5 self-end sm:self-auto text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                title="Segarkan Riwayat Mutasi"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingMutations && "animate-spin")} />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Filter Transaksi:
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

          {/* Mutasi List Container */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
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
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                        Memuat riwayat mutasi...
                      </td>
                    </tr>
                  ) : mutations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Tidak ada catatan mutasi saldo untuk filter yang dipilih.
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
                          <td className="py-2.5 px-4 font-mono font-medium whitespace-nowrap">
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

            {/* Mobile Card Feed View */}
            <div className="block md:hidden">
              {isLoadingMutations ? (
                <div className="py-10 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                  <p className="text-xs">Memuat riwayat mutasi...</p>
                </div>
              ) : mutations.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Tidak ada catatan mutasi saldo untuk filter yang dipilih.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mutations.map((m) => {
                    const isCredit = m.amount > 0;
                    const badge = getMutationBadgeInfo(m.mutation_type, isCredit);

                    return (
                      <div key={m.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-[11px] font-medium border",
                              badge.badgeClass
                            )}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(m.created_at)}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500">Nominal:</span>
                          <span className={cn("text-sm font-mono font-semibold", isCredit ? "text-emerald-700" : "text-rose-700")}>
                            {isCredit ? "+" : ""}{formatRupiah(m.amount)}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs space-y-0.5 font-mono">
                          <div className="flex justify-between text-slate-500">
                            <span>Saldo Sebelum:</span>
                            <span>{formatRupiah(m.balance_before)}</span>
                          </div>
                          <div className="flex justify-between text-slate-800 font-medium">
                            <span>Saldo Sesudah:</span>
                            <span>{formatRupiah(m.balance_after)}</span>
                          </div>
                        </div>

                        {m.description && (
                          <p className="text-xs text-slate-600 pt-0.5">
                            {m.description}
                          </p>
                        )}
                        {m.reference_id && (
                          <p className="text-[10px] font-mono text-slate-400">
                            Ref: {m.reference_id}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
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

      {/* ── TAB 3: RIWAYAT TOP-UP BANK ────────────────────────────── */}
      {activeTab === "topups" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">No. Pengajuan</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Rekening Pengirim</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan Admin</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingTopups ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Memuat pengajuan top-up...
                    </td>
                  </tr>
                ) : topupRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum pernah mengajukan top-up saldo via transfer bank.
                    </td>
                  </tr>
                ) : (
                  topupRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {req.request_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 text-base">
                        {formatRupiah(req.amount)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-slate-800">{req.bank_name} - {req.bank_account_number}</div>
                        <div className="text-slate-500">{req.bank_account_holder}</div>
                      </td>
                      <td className="py-3 px-4">
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
                          {req.status === "PENDING" ? "Menunggu Konfirmasi" : req.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {req.admin_notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                        {formatDate(req.requested_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Feed View */}
          <div className="block md:hidden">
            {isLoadingTopups ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs">Memuat pengajuan top-up...</p>
              </div>
            ) : topupRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum pernah mengajukan top-up saldo via transfer bank.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topupRequests.map((req) => (
                  <div key={req.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          NO. PENGAJUAN
                        </span>
                        <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                          {req.request_number}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold",
                          req.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : req.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        )}
                      >
                        {req.status === "PENDING" ? "Menunggu Konfirmasi" : req.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-slate-500">Nominal Top-Up:</span>
                      <span className="text-lg font-black text-emerald-600 font-mono">
                        {formatRupiah(req.amount)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                        Rekening Pengirim
                      </div>
                      <div className="font-bold text-slate-800">
                        {req.bank_name} - {req.bank_account_number}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        a/n {req.bank_account_holder}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-400">
                      <span className="font-mono text-[11px]">
                        {formatDate(req.requested_at)}
                      </span>
                      {req.admin_notes && (
                        <span className="text-slate-600 italic text-[11px] truncate max-w-[180px]">
                          Note: {req.admin_notes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: JARINGAN SUB-AGEN MASTER ───────────────────────────── */}
      {activeTab === "network" && dashboard?.is_master && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-linear-to-r from-purple-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-purple-800/40">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Program Kemitraan Master Distributor</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Jaringan Distribusi &amp; Overriding Komisi
                </h3>
                <p className="text-xs text-purple-100/90 leading-relaxed font-medium max-w-xl">
                  Sebagai Master Agen, Anda memperoleh komisi overriding sebesar <b>{dashboard.override_pct || 3}%</b> dari total omzet penjualan voucher yang dicetak atau dijual secara online oleh seluruh sub-agen di bawah binaan Anda.
                </p>
              </div>

              {/* Referral Code Box */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 sm:min-w-[260px]">
                <span className="text-[11px] text-purple-200 uppercase tracking-wider font-semibold block mb-1">
                  Kode Referral Master Anda
                </span>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-white/20 font-mono text-xl font-black text-amber-300 tracking-wider">
                    {dashboard.agent.code}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(dashboard.agent.code);
                        setCopiedReferral(true);
                        setTimeout(() => setCopiedReferral(false), 2500);
                      }
                    }}
                    className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="Salin Kode Referral"
                  >
                    {copiedReferral ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedReferral ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
                <span className="text-[10px] text-purple-200/70 mt-1 block">
                  Berikan kode ini saat mendaftarkan konter sub-agen baru.
                </span>
              </div>
            </div>
          </div>

          {/* Network KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Sub-Agen Terdaftar
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1.5 flex items-baseline gap-2">
                <span>{dashboard.sub_agents_count || (dashboard.sub_agents ? dashboard.sub_agents.length : 0)}</span>
                <span className="text-xs text-slate-400 font-normal">mitra aktif</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Konter/toko binaan langsung</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Omzet Jaringan
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1.5 font-mono">
                {formatRupiah(dashboard.total_network_omzet || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Akumulasi voucher cetak sub-agen</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Komisi Overriding ({dashboard.override_pct || 3}%)
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1.5 font-mono">
                {formatRupiah(dashboard.total_override_earned || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Otomatis masuk ke saldo dompet</p>
            </div>
          </div>

          {/* Sub-Agents List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Daftar Sub-Agen di Jaringan Anda
                </h4>
                <p className="text-xs text-slate-500">Seluruh mitra konter yang terhubung di bawah kode Master Anda</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full self-start sm:self-auto">
                {dashboard.sub_agents?.length || 0} Sub-Agen Aktif
              </span>
            </div>

            {(!dashboard.sub_agents || dashboard.sub_agents.length === 0) ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Store className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-600">Belum ada sub-agen yang terdaftar di jaringan Anda.</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Ajak pemilik toko atau konter di sekitar Anda bergabung dan masukkan kode <b>{dashboard.agent.code}</b> saat pendaftaran agar otomatis masuk ke jaringan Anda.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Nama Agen &amp; Konter</th>
                      <th className="py-3 px-4">No. WhatsApp</th>
                      <th className="py-3 px-4">Saldo Dompet</th>
                      <th className="py-3 px-4">Voucher Terjual</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Terdaftar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.sub_agents.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{sub.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {sub.code}
                            </span>
                            {sub.company_name && <span>• {sub.company_name}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                          {sub.phone}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                          {formatRupiah(sub.balance)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800">{sub.total_vouchers_sold || 0}</span>
                          <span className="text-xs text-slate-400"> voucher</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            sub.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          )}>
                            {sub.status === "ACTIVE" ? "Aktif" : sub.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {formatDate(sub.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: BUAT VOUCHER OFFLINE ───────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  Buat Voucher Hotspot Offline
                </h3>
                <p className="text-xs text-slate-500">Saldo dompet akan dipotong dengan harga bersih (setelah cashback {cashbackPct}%)</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Paket Template Voucher *</label>
                <select
                  required
                  value={generateForm.template_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, template_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {templates.length === 0 ? (
                    <option value="">Memuat paket voucher...</option>
                  ) : (
                    templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} — {formatRupiah(tpl.price)} ({tpl.duration_minutes >= 1440 ? `${(tpl.duration_minutes / 1440).toFixed(0)} Hari` : `${(tpl.duration_minutes / 60).toFixed(0)} Jam`})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Voucher yang Ingin Dibuat *</label>
                <div className="flex gap-2">
                  {[5, 10, 20, 50, 100].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setGenerateForm({ ...generateForm, quantity: q })}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl border transition-colors",
                        generateForm.quantity === q
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {q} pcs
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={generateForm.quantity}
                  onChange={(e) => setGenerateForm({ ...generateForm, quantity: Number(e.target.value) })}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-xl font-mono text-center font-bold"
                  placeholder="Atau ketik jumlah bebas"
                />
              </div>

              {/* Rincian Biaya & Cashback */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Harga Normal ({qty} × {formatRupiah(unitPrice)}):</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(grossTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Cashback Agen ({cashbackPct}%):</span>
                  <span className="font-bold">- {formatRupiah(cashbackAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Potong Saldo:</span>
                  <span className="text-blue-600">{formatRupiah(netCost)}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Sisa Saldo Anda Nanti:</span>
                  <span className={cn("font-bold", isBalanceEnough ? "text-slate-800" : "text-rose-600")}>
                    {formatRupiah(currentBalance - netCost)}
                  </span>
                </div>
              </div>

              {!isBalanceEnough && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Saldo Anda ({formatRupiah(currentBalance)}) tidak cukup. Silakan isi saldo terlebih dahulu!</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isBalanceEnough}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50 transition-all active:scale-95 text-center"
                >
                  {isSubmitting ? "Membuat Voucher..." : `Konfirmasi & Bayar ${formatRupiah(netCost)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: HASIL CETAK VOUCHER ────────────────────────────── */}
      {batchResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Voucher Berhasil Dibuat!
                </h3>
                <p className="text-xs text-slate-500">Total {batchResult.vouchers.length} voucher siap digunakan / dicetak</p>
              </div>
              <button onClick={() => setBatchResult(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div>Harga Normal: <span className="font-semibold">{formatRupiah(batchResult.gross_amount)}</span></div>
              <div>Cashback Agen ({batchResult.cashback_pct}%): <span className="font-bold text-emerald-700">{formatRupiah(batchResult.cashback_amount)}</span></div>
              <div className="font-bold">Total Saldo Terpotong: {formatRupiah(batchResult.net_cost)}</div>
            </div>

            {/* List Kode Voucher */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
              {batchResult.vouchers.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">#{i + 1}</span>
                    <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">{v.code}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(v.code);
                      alert(`Kode ${v.code} disalin!`);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Salin Kode"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintThermal(batchResult.vouchers)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  Cetak Thermal ({batchResult.vouchers.length} Tiket)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = batchResult.vouchers.map((v, idx) => `${idx + 1}. Kode: ${v.code}`).join("\n");
                    navigator.clipboard.writeText(text);
                    alert("Seluruh kode voucher berhasil disalin!");
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Salin Teks
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBatchResult(null)}
                className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs text-center"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ISI SALDO (TRANSFER BANK) ──────────────────────── */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Pengajuan Top-Up Saldo Transfer Bank
                </h3>
                <p className="text-xs text-slate-500">Transfer ke rekening ISP dan masukkan konfirmasi di bawah ini</p>
              </div>
              <button onClick={() => setShowTopupModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* ISP Destination Bank Accounts */}
            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 space-y-2 text-xs">
              <div className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                Rekening Tujuan Transfer ISP (ISPSYNC):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                  <div className="font-bold text-slate-900">BCA: 8295-0192-88</div>
                  <div className="text-slate-500 text-[11px]">a.n. ISPSYNC CLOUD TELCO</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                  <div className="font-bold text-slate-900">MANDIRI: 1370-0283-9912</div>
                  <div className="text-slate-500 text-[11px]">a.n. ISPSYNC CLOUD TELCO</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitTopup} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Top-Up (IDR) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {[50000, 100000, 250000, 500000, 1000000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupForm({ ...topupForm, amount: amt })}
                      className={cn(
                        "py-2 text-xs font-bold rounded-xl border transition-colors",
                        topupForm.amount === amt
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={10000}
                  step={10000}
                  required
                  value={topupForm.amount}
                  onChange={(e) => setTopupForm({ ...topupForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Pengirim *</label>
                  <input
                    type="text"
                    required
                    placeholder="BCA / BRI / dll"
                    value={topupForm.bank_name}
                    onChange={(e) => setTopupForm({ ...topupForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Rekening Anda *</label>
                  <input
                    type="text"
                    required
                    placeholder="1234567890"
                    value={topupForm.bank_account_number}
                    onChange={(e) => setTopupForm({ ...topupForm, bank_account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama Rekening *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama di buku tabungan"
                    value={topupForm.bank_account_holder}
                    onChange={(e) => setTopupForm({ ...topupForm, bank_account_holder: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={topupForm.notes}
                  onChange={(e) => setTopupForm({ ...topupForm, notes: e.target.value })}
                  placeholder="Misal: sudah transfer via m-Banking jam 14:30"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50 transition-all active:scale-95 text-center"
                >
                  {isSubmitting ? "Mengirim Pengajuan..." : "Kirim Konfirmasi Top-Up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BAYAR TAGIHAN INTERNET (LOKET PPOB) ─────────────── */}
      {showBillModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBillModal(false);
              setBillInquiry(null);
              setConfirmPaymentStep(false);
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bayar Tagihan Internet Pelanggan</h3>
                  <p className="text-xs text-slate-500">Loket PPOB Resmi — Potong saldo deposit agen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBillModal(false);
                  setBillInquiry(null);
                  setConfirmPaymentStep(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">

            {/* Search Input */}
            <form onSubmit={handleInquireBill} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cari ID Pelanggan / No. HP / No. Invoice
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={billSearch}
                      onChange={(e) => setBillSearch(e.target.value)}
                      placeholder="Contoh: CUST-..., 0812..., atau INV-..."
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    {billSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setBillSearch("");
                          setBillInquiry(null);
                          setBillSearchError(null);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCameraTarget("bill");
                      setShowCameraScanner(true);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    title="Buka Kamera untuk Scan Barcode Invoice"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span className="hidden sm:inline">Scan Barcode</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSearchingBill || !billSearch.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isSearchingBill ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mencari...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Cek Tagihan</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200/80 mt-2">
                  <Barcode className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Mendukung Barcode Scanner Gun &amp; Kamera:</strong> Arahkan scanner laser atau kamera langsung ke kode batang pada lembar faktur atau kartu pelanggan untuk cek tagihan instan.
                  </span>
                </div>
              </div>
            </form>

            {/* Search Error */}
            {billSearchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <div className="font-bold">Tagihan Tidak Ditemukan</div>
                  <div>{billSearchError}</div>
                </div>
              </div>
            )}

            {/* Inquiry Result */}
            {billInquiry && (() => {
              const activeInv = billInquiry.invoices?.find((i) => i.invoice_id === selectedInvoiceId) || {
                invoice_id: billInquiry.invoice_id,
                invoice_number: billInquiry.invoice_number,
                billing_month: billInquiry.billing_month,
                due_date: billInquiry.due_date,
                subtotal: billInquiry.subtotal,
                tax_amount: billInquiry.tax_amount,
                total_amount: billInquiry.total_amount || billInquiry.total_invoice,
                amount_paid: billInquiry.amount_paid || 0,
                amount_due: billInquiry.amount_due || billInquiry.total_invoice,
                status: billInquiry.status,
                is_overdue: billInquiry.is_overdue,
              };
              const invoiceAmount = Number(activeInv.amount_due || activeInv.total_amount || 0);
              const feeLoket = Number(billAdminFee) || 0;
              const totalPayCustomer = invoiceAmount + feeLoket;
              const hasEnoughBalance = (dashboard?.agent.balance || 0) >= invoiceAmount;
              const isPaid = billInquiry.status === "PAID" || (billInquiry.unpaid_count === 0 && (!billInquiry.invoices || billInquiry.invoices.length === 0));

              return (
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-4 text-xs">
                  {/* Header Info */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">No. Tagihan</span>
                      <div className="font-mono font-bold text-slate-900 text-sm">{activeInv.invoice_number}</div>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold",
                      isPaid
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : activeInv.is_overdue
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    )}>
                      {isPaid ? "Sudah Lunas" : activeInv.is_overdue ? "Jatuh Tempo" : "Belum Dibayar"}
                    </span>
                  </div>

                  {/* Customer & Service Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Pelanggan:</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{billInquiry.customer_name}</span>
                      <span className="text-slate-500 font-mono text-[11px] block">{billInquiry.customer_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Paket & Periode:</span>
                      <span className="font-bold text-blue-600 block mt-0.5">{billInquiry.plan_name}</span>
                      <span className="text-slate-500 text-[11px] block">Bulan: {activeInv.billing_month || "Bulan Ini"}</span>
                    </div>
                  </div>

                  {/* Multi-invoice selector if > 1 unpaid */}
                  {billInquiry.invoices && billInquiry.invoices.length > 1 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11.5px] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {billInquiry.invoices.length} Tagihan Tertunggak
                        </span>
                        <span className="font-mono font-bold text-[11px] text-amber-800">
                          Total: {formatRupiah(billInquiry.total_unpaid_amount || 0)}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-amber-800">
                        Pilih invoice yang ingin dibayar:
                      </p>
                      <div className="space-y-1.5 pt-0.5">
                        {billInquiry.invoices.map((inv, idx) => {
                          const isSel = (selectedInvoiceId || billInquiry.invoice_id) === inv.invoice_id;
                          return (
                            <button
                              key={inv.invoice_id}
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceId(inv.invoice_id);
                                setConfirmPaymentStep(false);
                              }}
                              className={cn(
                                "w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer",
                                isSel
                                  ? "bg-white border-emerald-500 shadow-2xs ring-1 ring-emerald-500 text-slate-900"
                                  : "bg-white/70 hover:bg-white border-amber-200 text-slate-700"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center text-[9px] shrink-0",
                                  isSel ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                                )}>
                                  {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div>
                                  <span className="font-bold text-[11px] block">{inv.billing_month || `Bulan ${idx + 1}`}</span>
                                  <span className="text-[9.5px] text-slate-500 font-mono">{inv.invoice_number}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs text-slate-900 block">{formatRupiah(inv.amount_due)}</span>
                                <span className="text-[9.5px] text-rose-600 font-semibold">{inv.is_overdue ? "Jatuh Tempo" : "Belum Bayar"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Financial breakdown */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex justify-between">
                      <span>Tagihan Net ({activeInv.invoice_number}):</span>
                      <span className="font-mono font-bold text-slate-800">{formatRupiah(activeInv.subtotal || 0)}</span>
                    </div>
                    {(activeInv.tax_amount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>PPN 11%:</span>
                        <span className="font-mono font-bold text-slate-800">{formatRupiah(activeInv.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-200">
                      <span>Total Tagihan Resmi ISP:</span>
                      <span className="font-mono font-bold">{formatRupiah(invoiceAmount)}</span>
                    </div>

                    {isPaid ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold block">Semua Tagihan Sudah Lunas</span>
                          <span className="text-[11px] text-emerald-700">Pelanggan tidak memiliki tagihan tertunggak saat ini.</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Fee Loket input */}
                        <div className="flex items-center justify-between pt-2 pb-1 border-t border-dashed border-slate-200">
                          <div>
                            <span className="font-bold text-emerald-800 block text-xs">Biaya Admin / Fee Loket:</span>
                            <span className="text-[10px] text-slate-400">Keuntungan tunai kas agen</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={billAdminFee}
                              onChange={(e) => setBillAdminFee(Number(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-white border border-emerald-300 rounded-lg text-emerald-700"
                            />
                          </div>
                        </div>

                        {/* Total Cash to Collect */}
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-900 uppercase block">TERIMA DARI PELANGGAN</span>
                            <span className="text-[10px] text-emerald-700">Tagihan + Fee Loket</span>
                          </div>
                          <span className="text-lg font-black text-emerald-700 font-mono">
                            {formatRupiah(totalPayCustomer)}
                          </span>
                        </div>

                        {/* Agent Balance notice */}
                        <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-center justify-between">
                          <span>Potong Saldo Dompet Agen:</span>
                          <span className="font-mono font-bold text-blue-800">{formatRupiah(invoiceAmount)}</span>
                        </div>

                        {!hasEnoughBalance && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-center justify-between">
                            <span>Saldo tidak cukup (Saldo: {formatRupiah(dashboard?.agent.balance || 0)})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowBillModal(false);
                                setShowTopupModal(true);
                              }}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                            >
                              Top-Up
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Confirm Pay Button or Paid Notice */}
                  <div className="pt-2">
                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowBillModal(false);
                          setBillInquiry(null);
                          setSelectedInvoiceId(null);
                        }}
                        className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                      >
                        Tutup (Tagihan Lunas)
                      </button>
                    ) : !confirmPaymentStep ? (
                      <button
                        type="button"
                        disabled={!hasEnoughBalance}
                        onClick={() => setConfirmPaymentStep(true)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lanjut Pembayaran ({activeInv.invoice_number})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPayingBill}
                        onClick={handlePayBill}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 animate-pulse cursor-pointer"
                      >
                        {isPayingBill ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Memproses Pembayaran...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Konfirmasi: Potong Saldo {formatRupiah(invoiceAmount)}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: STRUK PEMBAYARAN TAGIHAN ────────────────────────── */}
      {showReceiptModal && billReceipt && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReceiptModal(false);
              setBillReceipt(null);
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-5 overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Pembayaran Berhasil!</h3>
              <p className="text-xs text-slate-500">
                Tagihan {billReceipt.invoice_number} telah lunas dan internet pelanggan aktif otomatis.
              </p>
            </div>

            {/* Receipt Preview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 font-mono text-xs space-y-2.5 text-slate-700">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-sm text-slate-900">{(billReceipt.agent_company_name || billReceipt.agent_name).toUpperCase()}</div>
                <div className="text-[11px] text-slate-500">LOKET PEMBAYARAN RESMI</div>
              </div>

              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Trx:</span>
                  <span className="font-bold">{billReceipt.payment_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Invoice:</span>
                  <span>{billReceipt.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu:</span>
                  <span>{formatDate(billReceipt.paid_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pelanggan:</span>
                  <span className="font-bold">{billReceipt.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ID Pelanggan:</span>
                  <span>{billReceipt.customer_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Paket:</span>
                  <span>{billReceipt.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bulan:</span>
                  <span>{billReceipt.billing_month}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <span>Tagihan Net:</span>
                  <span>{formatRupiah(billReceipt.subtotal)}</span>
                </div>
                {billReceipt.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>PPN 11%:</span>
                    <span>{formatRupiah(billReceipt.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Biaya Loket:</span>
                  <span>{formatRupiah(billReceipt.admin_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL BAYAR:</span>
                  <span>{formatRupiah(billReceipt.total_customer_pay)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[11px] text-emerald-600 font-bold">
                *** STATUS: LUNAS ***
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePrintReceiptThermal(billReceipt)}
                disabled={isPrintingInvoiceReceipt}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Cetak Struk Thermal Bluetooth</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsAppReceipt(billReceipt)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Kirim Struk WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  setBillReceipt(null);
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
              >
                Selesai / Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: STRUK TRANSAKSI PASSPOINT WI-FI ──────────────────── */}
      {passpointReceipt && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPasspointReceipt(null);
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col p-6 shadow-2xl space-y-5 overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Wifi className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Transaksi Passpoint Berhasil!</h3>
              <p className="text-xs text-slate-500">
                Akses Wi-Fi Passpoint pelanggan telah aktif otomatis di seluruh jaringan.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 font-mono text-xs space-y-2.5 text-slate-700">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-sm text-slate-900">{passpointReceipt.agent_name.toUpperCase()}</div>
                <div className="text-[11px] text-slate-500">LOKET RESMI PASSPOINT WI-FI 2.0</div>
              </div>

              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Bukti:</span>
                  <span className="font-bold">{passpointReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kode Kasir:</span>
                  <span className="font-bold text-cyan-700">{passpointReceipt.cashier_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu:</span>
                  <span>{passpointReceipt.transaction_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pelanggan:</span>
                  <span className="font-bold">{passpointReceipt.customer_name || "Pelanggan Passpoint"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">No. HP:</span>
                  <span>{passpointReceipt.customer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Paket:</span>
                  <span className="font-bold text-slate-900">{passpointReceipt.package_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Masa Aktif:</span>
                  <span>+{passpointReceipt.duration_days} Hari</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11.5px]">
                <div className="flex justify-between text-slate-900 font-bold">
                  <span>Total Diterima Tunai:</span>
                  <span className="text-sm font-black text-emerald-600">{formatRupiah(passpointReceipt.total_customer_pays)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Modal Saldo Terpotong:</span>
                  <span>{formatRupiah(passpointReceipt.agent_debit_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
                  <span>Keuntungan Bersih Kasir:</span>
                  <span>+{formatRupiah(passpointReceipt.agent_profit)}</span>
                </div>
              </div>

              {/* Kredensial Box */}
              <div className="pt-2 border-t border-slate-200 p-2.5 bg-slate-900 text-white rounded-xl space-y-1 text-[11px]">
                <div className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-1">
                  Kredensial Login Wi-Fi Passpoint:
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Username:</span>
                  <span className="font-bold text-cyan-300">{passpointReceipt.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password:</span>
                  <span className="font-bold text-white">{passpointReceipt.password}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Domain / Realm:</span>
                  <span className="text-slate-300">{passpointReceipt.realm}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/${passpointReceipt.customer_phone}?text=${encodeURIComponent(
                  `Halo ${passpointReceipt.customer_name || "Pelanggan"},\n\nTerima kasih! Akses Passpoint Wi-Fi 2.0 Anda telah AKTIF.\n\n*Rincian Akses:*\n• Paket: ${passpointReceipt.package_name} (+${passpointReceipt.duration_days} Hari)\n• Username: ${passpointReceipt.username}\n• Password: ${passpointReceipt.password}\n• Pasang Profil Apple / Android: ${typeof window !== "undefined" ? window.location.origin : ""}/passpoint?lookup=${passpointReceipt.username}\n\nPerangkat Anda otomatis langsung terhubung ke Wi-Fi di area jaringan kami.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Kirim Bukti via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => setPasspointReceipt(null)}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 transition font-bold cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PENGATURAN AKUN & LOKET AGEN ────────────────────── */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettingsModal(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header (Sticky) */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Pengaturan Akun & Loket</h3>
                  <p className="text-[11px] text-slate-500">Profil toko, fee admin loket, dan sandi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="Tutup (Kembali ke Dashboard)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">

            {/* Profile Overview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Identitas Agen
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Kode Agen:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {dashboard?.agent.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dashboard?.agent.code || "");
                        setCopiedAgentCode(true);
                        setTimeout(() => setCopiedAgentCode(false), 2000);
                      }}
                      className="text-slate-400 hover:text-slate-700"
                      title="Salin Kode Agen"
                    >
                      {copiedAgentCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Nama Agen:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{dashboard?.agent.name}</span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Email Terdaftar:</span>
                  <span className="font-mono text-slate-700 block mt-0.5">{dashboard?.agent.email || dashboard?.agent.user_email || "-"}</span>
                </div>
              </div>
            </div>

            {/* Setting Printer Card */}
            <div className="bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Printer Thermal Bluetooth</span>
                  <p className="text-[11px] text-slate-500">Pilih printer 58mm/80mm & tes cetak.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPrinterModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Setting Printer</span>
              </button>
            </div>

            {/* Dokumen Legalitas Kemitraan (PKS & Sertifikat) */}
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50/70 to-purple-50/60 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Legalitas &amp; Dokumen Kemitraan Resmi</span>
                  <p className="text-[11px] text-slate-500">Cetak Surat Perjanjian Kerja Sama (PKS) dan Sertifikat Kemitraan resmi {companyProfile.brandName}.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPksModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-800 bg-white hover:bg-purple-50 border border-purple-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Cetak Surat Perjanjian Kerja Sama (PKS)"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Dokumen PKS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-white hover:bg-amber-100/60 border border-amber-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Cetak Sertifikat Kemitraan Resmi"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sertifikat</span>
                </button>
              </div>
            </div>

            {/* Form 1: Profile & Loket Fee */}
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Profil Toko & Fee Loket
              </div>

              {settingsStatus && (
                <div
                  className={cn(
                    "p-3 rounded-xl text-xs flex items-center gap-2",
                    settingsStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  )}
                >
                  {settingsStatus.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{settingsStatus.msg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Usaha / Konter / Toko
                  </label>
                  <input
                    type="text"
                    value={settingsForm.company_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, company_name: e.target.value })}
                    placeholder="Contoh: Toko Berkah Cell / Loket Anri"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Nama ini akan dicetak di bagian atas struk pembayaran kasir.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fee Loket Standar (Biaya Admin Tagihan Internet)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Rp</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={settingsForm.loket_admin_fee}
                      onChange={(e) => setSettingsForm({ ...settingsForm, loket_admin_fee: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    💡 Biaya administrasi ini menjadi keuntungan tunai loket Anda langsung dari pelanggan. Tidak memotong saldo deposit ISP & tidak dipotong pajak ISP.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan Profil & Fee</span>
                )}
              </button>
            </form>

            {/* Form 2: Change Password */}
            <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Ganti Kata Sandi Portal
              </div>

              {passwordStatus && (
                <div
                  className={cn(
                    "p-3 rounded-xl text-xs flex items-center gap-2",
                    passwordStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  )}
                >
                  {passwordStatus.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordStatus.msg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Saat Ini *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      placeholder="Masukkan kata sandi lama"
                      className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Baru * (Min. 8 karakter)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      required
                      minLength={8}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="Minimal 8 karakter"
                      className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi Baru *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPassword}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isSavingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengubah Kata Sandi...</span>
                  </>
                ) : (
                  <span>Perbarui Kata Sandi</span>
                )}
              </button>
            </form>

            </div>

            {/* Sticky Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Keluar dari akun agen di perangkat ini"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                Tutup / Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HIDDEN THERMAL PRINT AREA ─────────────────────────────────── */}
      <div id="thermal-print-area" className="hidden">
        {thermalPrintVouchers.map((v, idx) => (
          <div key={v.id || idx} className="thermal-receipt">
            <div className="text-center mb-2">
              <div className="font-bold text-base tracking-wider">GOGIGA HOTSPOT</div>
              <div className="text-[10px] text-gray-500">Internet Cepat &amp; Murah</div>
              <div className="border-b border-dashed border-black my-1.5"></div>
            </div>

            <div className="text-center font-bold text-sm my-1 tracking-wide uppercase">
              {v.template_name || "VOUCHER HOTSPOT"}
            </div>

            <div className="border border-black py-2.5 my-2.5 text-center rounded">
              <div className="text-[10px] uppercase font-semibold text-gray-600">KODE LOGIN:</div>
              <div className="text-xl font-bold font-mono tracking-widest my-0.5">{v.code}</div>
              {v.password && v.password !== v.code && (
                <div className="text-xs font-mono text-gray-700">Password: {v.password}</div>
              )}
            </div>

            <div className="text-[11px] space-y-1 my-2">
              <div className="flex justify-between">
                <span>Tarif:</span>
                <span className="font-bold">{formatRupiah(v.price)}</span>
              </div>
              {v.data_limit_bytes && v.data_limit_bytes > 0 ? (
                <div className="flex justify-between">
                  <span>Kuota:</span>
                  <span>{(v.data_limit_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB</span>
                </div>
              ) : null}
              {v.time_limit_seconds && v.time_limit_seconds > 0 ? (
                <div className="flex justify-between">
                  <span>Masa Aktif:</span>
                  <span>
                    {v.time_limit_seconds >= 86400
                      ? `${Math.floor(v.time_limit_seconds / 86400)} Hari`
                      : `${Math.floor(v.time_limit_seconds / 3600)} Jam`}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>Mitra Outlet:</span>
                <span className="font-medium truncate max-w-[120px]">
                  {dashboard?.agent.company_name || dashboard?.agent.name || "Mitra Resmi"}
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="text-[10px] leading-tight space-y-1">
              <div className="font-bold">PETUNJUK LOGIN:</div>
              <div>1. Hubungkan WiFi: <b>ISPSYNC</b></div>
              <div>2. Buka browser: <b>hot.ispsync.id</b></div>
              <div>3. Masukkan Kode Login di atas</div>
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="text-center text-[9px] text-gray-600">
              <div>Terima kasih atas kunjungan Anda!</div>
              <div className="font-mono mt-0.5">{formatDate(v.created_at)}</div>
            </div>
            <div className="h-6"></div>
          </div>
        ))}
      </div>

      {/* ── CAMERA BARCODE SCANNER MODAL ───────────────────────── */}
      <CameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleScanSuccess}
        target={cameraTarget}
      />

      {/* ── PRINTER SETTINGS MODAL ─────────────────────────────── */}
      <PrinterSettingsModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
      />

      {/* ── MODAL: SERTIFIKAT KEMITRAAN AGEN RESMI ───────────────────── */}
      <AgentCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        agent={dashboard?.agent || null}
        companyProfile={companyProfile}
      />

      {/* ── MODAL: PERJANJIAN KERJA SAMA (PKS) RESMI ──────────────────── */}
      <AgentPksModal
        isOpen={showPksModal}
        onClose={() => setShowPksModal(false)}
        agent={dashboard?.agent || null}
        companyProfile={companyProfile}
      />

      {!showCertificateModal && !showPksModal && (
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #thermal-print-area,
            #thermal-print-area * {
              visibility: visible !important;
            }
            #thermal-print-area {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 58mm;
              padding: 0;
              margin: 0;
              background: #fff;
              color: #000;
              font-family: monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .thermal-receipt {
              width: 58mm;
              page-break-after: always;
              break-after: page;
              padding: 4mm 2mm;
              box-sizing: border-box;
            }
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }
        `}</style>
      )}
    </div>
  );
}

// ── SELF-CONTAINED CAMERA SCANNER MODAL (NATIVE BARCODE DETECTOR) ───────
function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  target,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  target?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBillTarget = target === "bill";
  const modalTitle = isBillTarget ? "Scan Barcode Faktur / Kartu Pelanggan" : "Scan Barcode Serial Number";
  const instructions = isBillTarget
    ? "Arahkan garis merah kamera tepat ke kode batang pada lembar faktur (INV-...) atau kartu pelanggan (CUST-...). Tagihan akan langsung dicek otomatis."
    : "Arahkan garis merah kamera tepat ke barcode Serial Number pada kartu fisik. Jika menggunakan HP Android, kode akan terdeteksi otomatis. Anda juga dapat menggunakan Scanner Barcode Gun USB/Bluetooth secara langsung.";

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let active = true;
    let localStream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }

        // Check if native BarcodeDetector API is supported
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code", "upc_a"],
          });
          const detectLoop = async () => {
            if (!active || !videoRef.current) return;
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue;
                  if (rawVal) {
                    onScan(rawVal);
                    return;
                  }
                }
              }
            } catch (err) {
              // Ignore frame detection transient errors
            }
            animationFrameId = requestAnimationFrame(detectLoop);
          };
          detectLoop();
        }
      } catch (err: any) {
        setError(err.message || "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
      }
    };

    startCamera();

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 text-sm">{modalTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Gagal Membuka Kamera</span>
            </div>
            <p>{error}</p>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Red Laser Line Animation */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse pointer-events-none" />
            <div className="absolute inset-6 border-2 border-white/40 rounded-xl pointer-events-none" />
          </div>
        )}

        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-[11.5px] text-emerald-900 space-y-1">
          <div className="font-bold flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            <span>Petunjuk Pemindaian:</span>
          </div>
          <p className="leading-relaxed">
            {instructions}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Tutup Kamera
        </button>
      </div>
    </div>
  );
}
