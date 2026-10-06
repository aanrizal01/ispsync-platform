"use client";

import { useEffect, useState, useCallback } from "react";
import { voucherApi, type Voucher, type VoucherDetail, type VoucherSessionLog, type VoucherTemplate, type VoucherBatch, type CreateTemplateInput, type GenerateBatchInput, type HotspotOrder, type HotspotOrdersSummary } from "@/lib/api/vouchers";
import { agentApi, type Agent } from "@/lib/api/agents";
import { formatDate, formatRupiah, formatBandwidth, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search, X, Eye, EyeOff, Copy, Check, Ticket, Globe, Sparkles, Layers, Sliders, RefreshCw, Clock, CheckCircle2, AlertCircle, ExternalLink, ArrowRight, Shield, Wifi, Activity, Power, ArrowUp, ArrowDown, Laptop, Smartphone } from "lucide-react";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

function formatSeconds(sec: number): string {
  if (!sec || sec <= 0) return "0 detik";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s} detik`;
}

function formatDurationHuman(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 Menit";
  if (minutes % 43200 === 0) {
    const months = minutes / 43200;
    return `${months} Bulan`;
  }
  if (minutes % 10080 === 0) {
    const weeks = minutes / 10080;
    return `${weeks} Minggu (${weeks * 7} Hari)`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} Hari`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60} Jam`;
  }
  return `${minutes} Menit`;
}

function parseDurationUnit(minutes: number): { value: number; unit: "MINUTES" | "HOURS" | "DAYS" | "MONTHS" } {
  if (!minutes || minutes <= 0) return { value: 1, unit: "HOURS" };
  if (minutes % 43200 === 0) return { value: minutes / 43200, unit: "MONTHS" };
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: "DAYS" };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: "HOURS" };
  return { value: minutes, unit: "MINUTES" };
}

const DEFAULT_CUSTOM_HTML = `<div class="v-card">
  <div class="v-top">
    <span class="v-net">HOTSPOT ACCESS</span>
    <span class="v-price">{{price}}</span>
  </div>
  <div class="v-plan">{{template_name}}</div>
  <div class="v-code-box">
    <div class="v-lbl">KODE LOGIN VOUCHER</div>
    <div class="v-code">{{code}}</div>
    {{#if_separate}}
    <div class="v-pwd">Password: <b>{{password}}</b></div>
    {{/if_separate}}
  </div>
  <div class="v-meta">
    <span>⏱ {{duration}}</span>
    <span>⚡ {{data_limit}}</span>
  </div>
  <div class="v-bot">Buka browser & masukkan kode di atas</div>
</div>

<style>
.v-card {
  border: 2px dashed #0284c7;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  text-align: center;
  font-family: ui-sans-serif, system-ui, sans-serif;
  page-break-inside: avoid;
}
.v-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}
.v-net { color: #0284c7; letter-spacing: 0.5px; }
.v-price { color: #0f172a; font-weight: 800; }
.v-plan { font-size: 13px; font-weight: 800; color: #0f172a; margin: 4px 0; }
.v-code-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px;
  margin: 6px 0;
}
.v-lbl { font-size: 8px; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
.v-code {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #0369a1;
  font-family: monospace;
  margin: 2px 0;
}
.v-pwd { font-size: 10px; color: #475569; font-family: monospace; margin-top: 2px; }
.v-meta {
  display: flex;
  justify-content: space-around;
  font-size: 9px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 4px;
}
.v-bot { font-size: 8px; color: #94a3b8; margin-top: 6px; }
</style>`;

function getSampleCode(prefix: string, charType: string, length: number): string {
  let sample = "";
  const chars: Record<string, string> = {
    numeric: "7392810456",
    alpha_lower: "kmaprtxwvynb",
    alpha_upper: "KMAPRTXWVYNB",
    alphanumeric_lower: "k7m2p9t4x1",
    alphanumeric_upper: "K7M2P9T4X1",
    alphanumeric_mixed: "K7m2P9t4X1",
  };
  const set = chars[charType] || chars.alphanumeric_upper;
  for (let i = 0; i < length; i++) {
    sample += set[i % set.length];
  }
  const cleanPrefix = prefix.trim();
  if (cleanPrefix) {
    return cleanPrefix + sample;
  }
  return sample;
}

function renderCustomHTML(templateHtml: string, v: Voucher, tpl?: VoucherTemplate): string {
  const isSame = !v.password || v.password === v.code;
  let res = templateHtml;
  res = res.replaceAll("{{code}}", v.code || "");
  res = res.replaceAll("{{password}}", isSame ? v.code : (v.password || ""));
  res = res.replaceAll("{{price}}", formatRupiah(v.price));
  res = res.replaceAll("{{template_name}}", v.template_name || tpl?.name || "Hotspot Voucher");
  res = res.replaceAll("{{batch_number}}", v.batch_number || "");
  res = res.replaceAll("{{date}}", formatDate(new Date().toISOString()));
  const durationStr = tpl ? formatDurationHuman(tpl.duration_minutes) : "Hotspot";
  const quotaStr = tpl && tpl.data_limit_bytes > 0 ? `${tpl.data_limit_bytes / (1024 * 1024)} MB` : "Unlimited";
  const speedStr = tpl ? `${formatBandwidth(tpl.download_kbps)} / ${formatBandwidth(tpl.upload_kbps)}` : "5 Mbps";
  res = res.replaceAll("{{duration}}", durationStr);
  res = res.replaceAll("{{data_limit}}", quotaStr);
  res = res.replaceAll("{{speed}}", speedStr);

  if (isSame) {
    res = res.replace(/\{\{#if_separate\}\}[\s\S]*?\{\{\/if_separate\}\}/g, "");
    res = res.replace(/\{\{#if_same\}\}([\s\S]*?)\{\{\/if_same\}\}/g, "$1");
  } else {
    res = res.replace(/\{\{#if_same\}\}[\s\S]*?\{\{\/if_same\}\}/g, "");
    res = res.replace(/\{\{#if_separate\}\}([\s\S]*?)\{\{\/if_separate\}\}/g, "$1");
  }
  return res;
}

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState<"classic" | "online" | "scratch" | "batches" | "templates">("classic");
  const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRevealPin = (id: string) => {
    setRevealedPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [batches, setBatches] = useState<VoucherBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBatchID, setSelectedBatchID] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchInput, setSearchInput] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");

  // Hotspot Orders Log State
  const [onlineSubTab, setOnlineSubTab] = useState<"orders" | "vouchers">("orders");
  const [orders, setOrders] = useState<HotspotOrder[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<HotspotOrdersSummary>({
    total_orders: 0,
    total_paid: 0,
    total_pending: 0,
    total_expired: 0,
    total_revenue: 0,
  });
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("");
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [orderSearchInput, setOrderSearchInput] = useState<string>("");
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState<number>(1);
  const [ordersTotalCount, setOrdersTotalCount] = useState<number>(0);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await voucherApi.listOrders({
        page: ordersPage,
        limit: 20,
        status: orderStatusFilter || undefined,
        search: orderSearch || undefined,
      });
      if (res && res.data) {
        setOrders(res.data);
      }
      if (res && res.summary) {
        setOrdersSummary(res.summary);
      }
      if (res && res.pagination) {
        setOrdersTotalPages(res.pagination.total_pages || 1);
        setOrdersTotalCount(res.pagination.total || 0);
      }
    } catch (err) {
      console.error("Failed to load hotspot orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, orderStatusFilter, orderSearch]);

  useEffect(() => {
    if (activeTab === "online") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  const handleOrderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSearch(orderSearchInput.trim());
    setOrdersPage(1);
  };

  const handleClearOrderSearch = () => {
    setOrderSearchInput("");
    setOrderSearch("");
    setOrdersPage(1);
  };

  const handleCheckOrderStatus = async (orderId: string) => {
    setCheckingOrderId(orderId);
    try {
      const res = await fetch("/api/v1/hotspot/check-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (data.status === "PAID") {
        alert(`Pembayaran Terverifikasi! Voucher ${data.code} berhasil diterbitkan.`);
      } else {
        alert(data.message || "Pesanan masih berstatus PENDING (belum dibayar oleh pelanggan).");
      }
      await fetchOrders();
    } catch (err: any) {
      alert("Gagal memeriksa status pembayaran: " + (err.message || "Network error"));
    } finally {
      setCheckingOrderId(null);
    }
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [vouchersToPrint, setVouchersToPrint] = useState<Voucher[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Checkbox selection for printing
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<Set<string>>(new Set());

  // Print sheet options
  const [printTheme, setPrintTheme] = useState<
    "modern" | "minimal" | "thermal" | "compact" | "scratch_card" | "atm_wifi_id" | "atm_split2" | "atm_full" | "custom"
  >("modern");
  const [printCols, setPrintCols] = useState<number>(3);
  const [customHtml, setCustomHtml] = useState<string>(DEFAULT_CUSTOM_HTML);
  const [isEditingCustomHtml, setIsEditingCustomHtml] = useState(false);

  // Batch Generation Mode
  const [batchMode, setBatchMode] = useState<"standard" | "blank_scratch">("standard");

  // Form State Generate Batch
  const [batchForm, setBatchForm] = useState<GenerateBatchInput>({
    template_id: "",
    quantity: 20,
    prefix: "VC",
    notes: "",
    user_mode: "same",
    char_type: "alphanumeric_upper",
    code_length: 6,
    is_mac_locked: true,
  });

  // Form State Template Baru
  const [templateForm, setTemplateForm] = useState<CreateTemplateInput>({
    name: "",
    description: "",
    price: 5000,
    duration_minutes: 180, // 3 hours
    data_limit_bytes: 0,
    download_kbps: 5000,
    upload_kbps: 2000,
    min_download_kbps: 0,
    min_upload_kbps: 0,
    validity_days: 30,
    is_available_online: false,
  });
  const [quotaMB, setQuotaMB] = useState<number>(0);
  const [durationValue, setDurationValue] = useState<number>(3);
  const [durationUnit, setDurationUnit] = useState<"MINUTES" | "HOURS" | "DAYS" | "MONTHS">("HOURS");
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);
  const [resetMACLoadingId, setResetMACLoadingId] = useState<string | null>(null);
  const [restoreLoadingId, setRestoreLoadingId] = useState<string | null>(null);

  // Voucher Detail & Session Inspection Modal State
  const [selectedDetailVoucherId, setSelectedDetailVoucherId] = useState<string | null>(null);
  const [detailVoucher, setDetailVoucher] = useState<VoucherDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [kickLoadingId, setKickLoadingId] = useState<string | null>(null);

  const calculateTotalMinutes = (val: number, unit: "MINUTES" | "HOURS" | "DAYS" | "MONTHS") => {
    switch (unit) {
      case "MINUTES":
        return val;
      case "HOURS":
        return val * 60;
      case "DAYS":
        return val * 1440;
      case "MONTHS":
        return val * 43200;
      default:
        return val;
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let queryChannel: string | undefined = channelFilter || undefined;
      let queryAgent: string | undefined = agentFilter || undefined;

      if (activeTab === "online") {
        queryChannel = "ONLINE";
        if (channelFilter === "ONLINE_REFERRAL") {
          queryAgent = agentFilter || "any";
        } else if (channelFilter === "ONLINE_DIRECT") {
          queryAgent = "none";
        }
      } else if (activeTab === "classic" || activeTab === "scratch") {
        queryChannel = "OFFLINE";
      }

      let queryVoucherType: "classic" | "online" | "scratch" | undefined = undefined;
      if (activeTab === "classic") queryVoucherType = "classic";
      else if (activeTab === "online") queryVoucherType = "online";
      else if (activeTab === "scratch") queryVoucherType = "scratch";

      const [vRes, tRes, bRes, aRes] = await Promise.all([
        voucherApi.listVouchers({
          page,
          limit,
          status: statusFilter || undefined,
          batch_id: selectedBatchID || undefined,
          channel: queryChannel,
          agent_id: queryAgent,
          search: activeSearch || undefined,
          voucher_type: queryVoucherType,
        }),
        voucherApi.listTemplates(),
        voucherApi.listBatches(),
        agentApi.listAgents({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setVouchers(vRes.data || []);
      if (vRes.meta) {
        setTotalPages(vRes.meta.total_pages || 1);
        setTotalCount(vRes.meta.total || 0);
      }
      setTemplates(tRes || []);
      setBatches(bRes || []);
      if (aRes && aRes.data) {
        setAgents(aRes.data);
      }
      if (tRes && tRes.length > 0 && !batchForm.template_id) {
        setBatchForm((prev) => ({ ...prev, template_id: tRes[0].id }));
      }
    } catch (err) {
      console.error("Failed to load voucher data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedBatchID, channelFilter, agentFilter, activeSearch, page, limit, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const savedHtml = localStorage.getItem("ispsync_voucher_custom_html");
      if (savedHtml) {
        setCustomHtml(savedHtml);
      }
    }
  }, [loadData]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (batchMode === "blank_scratch") {
        const res = await voucherApi.generateBlankBatch({
          quantity: Number(batchForm.quantity),
          prefix: batchForm.prefix || undefined,
          code_length: Number(batchForm.code_length || 10),
          notes: batchForm.notes || undefined,
          is_mac_locked: batchForm.is_mac_locked !== false,
        });
        setIsGenerateModalOpen(false);
        setVouchersToPrint(res.vouchers || []);
        setPrintTheme("scratch_card");
        setIsPrintSheetOpen(true);
      } else {
        const res = await voucherApi.generateBatch({
          ...batchForm,
          quantity: Number(batchForm.quantity),
          code_length: Number(batchForm.code_length || 6),
          is_mac_locked: batchForm.is_mac_locked !== false,
        });
        setIsGenerateModalOpen(false);
        setVouchersToPrint(res.vouchers || []);
        setIsPrintSheetOpen(true);
      }
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat batch voucher");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateTemplateModal = () => {
    setEditingTemplateId(null);
    setTemplateForm({
      name: "",
      description: "",
      price: 5000,
      duration_minutes: 180,
      data_limit_bytes: 0,
      download_kbps: 5000,
      upload_kbps: 2000,
      min_download_kbps: 0,
      min_upload_kbps: 0,
      validity_days: 30,
      is_available_online: false,
    });
    setDurationValue(3);
    setDurationUnit("HOURS");
    setQuotaMB(0);
    setErrorMessage(null);
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (t: VoucherTemplate) => {
    setEditingTemplateId(t.id);
    const { value, unit } = parseDurationUnit(t.duration_minutes);
    setDurationValue(value);
    setDurationUnit(unit);
    setQuotaMB(t.data_limit_bytes > 0 ? Math.round(t.data_limit_bytes / (1024 * 1024)) : 0);
    setTemplateForm({
      name: t.name,
      description: t.description || "",
      price: t.price,
      duration_minutes: t.duration_minutes,
      data_limit_bytes: t.data_limit_bytes,
      download_kbps: t.download_kbps,
      upload_kbps: t.upload_kbps,
      min_download_kbps: t.min_download_kbps || 0,
      min_upload_kbps: t.min_upload_kbps || 0,
      validity_days: t.validity_days,
      is_available_online: t.is_available_online ?? false,
    });
    setErrorMessage(null);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const totalMinutes = calculateTotalMinutes(durationValue, durationUnit);
      const payload = {
        ...templateForm,
        price: Number(templateForm.price),
        duration_minutes: totalMinutes,
        data_limit_bytes: quotaMB > 0 ? Number(quotaMB) * 1024 * 1024 : 0,
        download_kbps: Number(templateForm.download_kbps),
        upload_kbps: Number(templateForm.upload_kbps),
        min_download_kbps: Number(templateForm.min_download_kbps || 0),
        min_upload_kbps: Number(templateForm.min_upload_kbps || 0),
        validity_days: Number(templateForm.validity_days || 30),
        is_available_online: Boolean(templateForm.is_available_online),
      };

      if (editingTemplateId) {
        await voucherApi.updateTemplate(editingTemplateId, payload);
      } else {
        await voucherApi.createTemplate(payload);
      }
      setIsTemplateModalOpen(false);
      setEditingTemplateId(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || (editingTemplateId ? "Gagal memperbarui template" : "Gagal membuat template voucher"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus template paket "${name}"? Template yang sudah memiliki batch voucher akan dinonaktifkan.`)) {
      return;
    }
    try {
      await voucherApi.deleteTemplate(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus template");
    }
  };

  const handleRevoke = async (id: string, code: string) => {
    const reason = prompt(`Masukkan alasan pembatalan voucher "${code}":`);
    if (!reason) return;
    try {
      await voucherApi.revoke(id, reason);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan voucher");
    }
  };

  const handleResendWA = async (id: string, phone?: string) => {
    if (!phone) {
      alert("Nomor WhatsApp tidak tersedia pada voucher ini");
      return;
    }
    if (!confirm(`Kirim ulang kode voucher ke nomor WhatsApp ${phone}?`)) {
      return;
    }
    setResendLoadingId(id);
    try {
      const res = await voucherApi.resendWhatsApp(id);
      alert(res.message || `Kode voucher berhasil dikirim ulang ke ${phone}`);
    } catch (err: any) {
      alert(err.message || "Gagal mengirim WhatsApp");
    } finally {
      setResendLoadingId(null);
    }
  };

  const handleResetMAC = async (id: string, code: string) => {
    if (!confirm(`Reset kuncian MAC perangkat untuk voucher "${code}"? Perangkat baru akan dapat login kembali.`)) {
      return;
    }
    setResetMACLoadingId(id);
    try {
      const res = await voucherApi.resetMAC(id);
      alert(res.message || "Kuncian MAC perangkat berhasil direset");
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mereset kuncian MAC");
    } finally {
      setResetMACLoadingId(null);
    }
  };

  const handleRestore = async (id: string, code: string) => {
    if (!confirm(`Aktifkan kembali voucher "${code}"? Voucher akan dapat digunakan kembali.`)) {
      return;
    }
    setRestoreLoadingId(id);
    try {
      const res = await voucherApi.restore(id);
      alert(res.message || "Voucher berhasil diaktifkan kembali");
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mengaktifkan kembali voucher");
    } finally {
      setRestoreLoadingId(null);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedDetailVoucherId(id);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await voucherApi.getDetailByID(id);
      setDetailVoucher(res);
    } catch (err: any) {
      alert(err.message || "Gagal memuat rincian voucher");
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleKickSession = async (id: string, code: string) => {
    if (!confirm(`Putuskan paksa (Kick CoA) sesi login aktif untuk voucher "${code}"? Koneksi internet perangkat terkait akan langsung diputus.`)) {
      return;
    }
    setKickLoadingId(id);
    try {
      const res = await voucherApi.disconnect(id);
      alert(res.message || "Sesi login berhasil diputuskan");
      const updated = await voucherApi.getDetailByID(id);
      setDetailVoucher(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memutuskan sesi voucher");
    } finally {
      setKickLoadingId(null);
    }
  };

  const latestBatch = batches.length > 0 ? batches[0] : null;

  const toggleSelectVoucher = (id: string) => {
    setSelectedVoucherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const switchTab = (tab: "classic" | "online" | "scratch" | "batches" | "templates") => {
    setActiveTab(tab);
    setPage(1);
    setStatusFilter("");
    setChannelFilter("");
    setAgentFilter("");
    setSelectedBatchID("");
    setActiveSearch("");
    setSearchInput("");
    setSelectedVoucherIds(new Set());
  };

  const getSelectableVouchers = () => {
    if (activeTab === "scratch") return vouchers;
    if (activeTab === "classic") return vouchers.filter((v) => v.channel === "OFFLINE");
    return [];
  };

  const toggleSelectAll = () => {
    const selectable = getSelectableVouchers();
    if (selectable.length === 0) return;
    if (selectedVoucherIds.size === selectable.length) {
      setSelectedVoucherIds(new Set());
    } else {
      setSelectedVoucherIds(new Set(selectable.map((v) => v.id)));
    }
  };

  const handlePrintSelected = (theme?: typeof printTheme) => {
    const selected = vouchers.filter((v) => selectedVoucherIds.has(v.id));
    if (selected.length === 0) {
      alert("Pilih minimal satu voucher untuk dicetak.");
      return;
    }
    if (theme) {
      setPrintTheme(theme);
    } else if (activeTab === "scratch" || selected.some((v) => v.is_blank || v.serial_number)) {
      setPrintTheme("scratch_card");
    } else {
      setPrintTheme("modern");
    }
    setVouchersToPrint(selected);
    setIsPrintSheetOpen(true);
  };

  const handlePrintSingle = (v: Voucher, theme?: typeof printTheme) => {
    if (theme) {
      setPrintTheme(theme);
    } else if (v.is_blank || v.serial_number) {
      setPrintTheme("scratch_card");
    } else {
      setPrintTheme("modern");
    }
    setVouchersToPrint([v]);
    setIsPrintSheetOpen(true);
  };

  const handlePrintSheet = (limit = 50) => {
    // Khusus voucher fisik (OFFLINE) yang belum terpakai (UNUSED atau BLANK)
    const offlineUnused = vouchers.filter((v) => v.channel === "OFFLINE" && (v.status === "UNUSED" || v.status === "BLANK"));
    if (offlineUnused.length === 0) {
      alert("Tidak ada voucher fisik (OFFLINE) untuk dicetak.");
      return;
    }
    if (offlineUnused.some((v) => v.is_blank || v.serial_number)) {
      setPrintTheme("scratch_card");
    }
    setVouchersToPrint(offlineUnused.slice(0, limit));
    setIsPrintSheetOpen(true);
  };

  const openPrintForBatch = async (batchID: string) => {
    try {
      setLoading(true);
      // Ambil seluruh voucher dalam batch dari API langsung (khusus OFFLINE)
      const res = await voucherApi.listVouchers({ batch_id: batchID, channel: "OFFLINE", limit: 500 });
      const printList = res.data || [];
      if (printList.length === 0) {
        alert("Tidak ada voucher offline di batch ini untuk dicetak");
        return;
      }
      if (printList.some((v) => v.is_blank || v.serial_number)) {
        setPrintTheme("scratch_card");
      }
      setVouchersToPrint(printList);
      setIsPrintSheetOpen(true);
    } catch (err: any) {
      alert(err.message || "Gagal memuat voucher batch");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLatestBatch = () => {
    if (!latestBatch) {
      alert("Belum ada batch voucher yang dibuat");
      return;
    }
    openPrintForBatch(latestBatch.id);
  };

  const renderPagination = () => (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs text-slate-500">
        Menampilkan{" "}
        <span className="font-semibold text-slate-700">
          {totalCount > 0 ? (page - 1) * limit + 1 : 0}
        </span>{" "}
        -{" "}
        <span className="font-semibold text-slate-700">
          {Math.min(page * limit, totalCount)}
        </span>{" "}
        dari <span className="font-semibold text-slate-700">{totalCount}</span> voucher
        {totalPages > 1 && ` (Halaman ${page} dari ${totalPages})`}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Baris:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 border border-slate-200 rounded-md bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Main Dashboard Content (Hidden when printing) */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manajemen Voucher Hotspot</h1>
            <p className="text-slate-500 text-sm mt-1">
              Generate kode acak aman (CSPRNG), paket durasi & kuota, serta cetak lembar voucher
            </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateTemplateModal}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 shadow-sm"
          >
            + Template Baru
          </button>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Batch Baru
          </button>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => switchTab("classic")}
          className={cn(
            "pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "classic"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <Ticket className="w-4 h-4" />
          <span>Voucher Klasik (Fisik)</span>
          {activeTab === "classic" && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {totalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab("online")}
          className={cn(
            "pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "online"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <Globe className="w-4 h-4" />
          <span>Voucher Online (QRIS)</span>
          {activeTab === "online" && (
            <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {totalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab("scratch")}
          className={cn(
            "pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "scratch"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Voucher Gesek (Blanko SN)</span>
          {activeTab === "scratch" && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {totalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab("batches")}
          className={cn(
            "pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "batches"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Riwayat Batch</span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => switchTab("templates")}
          className={cn(
            "pb-3 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === "templates"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Template Paket</span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
            {templates.length}
          </span>
        </button>
      </div>

      {/* TAB 1: VOUCHER KLASIK (FISIK / CETAK LEMBARAN) */}
      {activeTab === "classic" && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Voucher Klasik</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Belum Terpakai (Siap Jual)</span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {vouchers.filter((v) => v.status === "UNUSED").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Sedang Digunakan</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {vouchers.filter((v) => v.status === "ACTIVE").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kedaluwarsa / Dibatalkan</span>
              <div className="text-2xl font-black text-slate-600 mt-1">
                {vouchers.filter((v) => v.status === "EXPIRED" || v.status === "REVOKED").length}
              </div>
            </div>
          </div>

          {/* Search, Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              {/* Form Pencarian */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari kode voucher klasik, paket, batch, agen..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari
                </button>
                {activeSearch && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium border border-slate-200 rounded-lg bg-slate-50 shrink-0"
                  >
                    Reset
                  </button>
                )}
              </form>

              {/* Action Buttons (Cetak Lembaran Fisik) */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedVoucherIds.size > 0 ? (
                  <>
                    <button
                      onClick={() => handlePrintSelected("modern")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg shadow-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Cetak Terpilih ({selectedVoucherIds.size} Lembar)
                    </button>
                    <button
                      onClick={() => setSelectedVoucherIds(new Set())}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                    >
                      Batal Pilih
                    </button>
                  </>
                ) : (
                  <>
                    {latestBatch && (
                      <button
                        type="button"
                        onClick={handlePrintLatestBatch}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 transition-colors shadow-xs"
                        title={`Cetak seluruh voucher dari batch terakhir (${latestBatch.batch_number})`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Cetak Batch Terakhir</span>
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintSheet(50)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
                      title="Cetak voucher fisik belum terpakai (maks 50 lembar)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Cetak 50 Lembar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
              <select
                value={selectedBatchID}
                onChange={(e) => {
                  setSelectedBatchID(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Semua Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} ({b.template_name})
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Semua Status</option>
                <option value="UNUSED">Belum Terpakai (UNUSED)</option>
                <option value="ACTIVE">Aktif (ACTIVE)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                <option value="REVOKED">Dibatalkan (REVOKED)</option>
              </select>
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="">Semua Kepemilikan (Pusat & Agen)</option>
                <option value="none">Kantor Pusat (Tanpa Agen)</option>
                <option value="any">Semua Mitra Agen</option>
                {agents.length > 0 && (
                  <optgroup label="Mitra Agen Spesifik">
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.code})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {activeSearch && (
                <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 ml-auto">
                  <span>Pencarian: <b>&quot;{activeSearch}&quot;</b> ({totalCount} ditemukan)</span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-blue-500 hover:text-blue-800"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Voucher Klasik */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={vouchers.length > 0 && selectedVoucherIds.size === vouchers.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Pilih semua voucher klasik di halaman ini"
                      />
                    </th>
                    <th className="px-5 py-3.5">Kode / Username</th>
                    <th className="px-5 py-3.5">Password</th>
                    <th className="px-5 py-3.5">Paket Template</th>
                    <th className="px-5 py-3.5">Agen / Pemilik</th>
                    <th className="px-5 py-3.5">Tarif</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Kedaluwarsa</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                        Memuat data voucher klasik...
                      </td>
                    </tr>
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                        {activeSearch ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-700">Tidak ada voucher klasik yang cocok dengan pencarian &quot;{activeSearch}&quot;</p>
                            <button
                              type="button"
                              onClick={handleClearSearch}
                              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                            >
                              Hapus filter pencarian
                            </button>
                          </div>
                        ) : (
                          "Belum ada voucher klasik yang digenerate"
                        )}
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const isSame = !v.password || v.password === v.code;
                      return (
                        <tr key={v.id} className={cn("hover:bg-slate-50/80 transition-colors", selectedVoucherIds.has(v.id) && "bg-blue-50/50")}>
                          <td className="px-4 py-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedVoucherIds.has(v.id)}
                              onChange={() => toggleSelectVoucher(v.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-blue-600 text-base">{v.code}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isSame ? (
                                <span className="text-slate-400">Mode: User = Password</span>
                              ) : (
                                <span className="text-amber-600 font-semibold">Mode: User & Pass Berbeda</span>
                              )}
                            </div>
                            {v.is_mac_locked === false ? (
                              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5" title="Bebas digunakan di perangkat apa saja tanpa kuncian MAC">
                                🔓 Bebas MAC
                              </div>
                            ) : v.buyer_mac ? (
                              <div className="text-[10px] text-amber-600 font-mono mt-0.5 flex items-center gap-1" title="Terkunci ke MAC ini">
                                🔒 MAC: {v.buyer_mac}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs">
                            {isSame ? (
                              <span className="text-slate-400 italic">(Sama dengan User)</span>
                            ) : (
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {v.password}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">{v.template_name || "Paket Hotspot"}</div>
                            {v.batch_number && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Batch: {v.batch_number}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {v.agent_name ? (
                              <div>
                                <div className="font-semibold text-slate-900 text-xs truncate max-w-[140px]" title={v.agent_name}>
                                  {v.agent_name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{v.agent_code || "-"}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Kantor Pusat</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {formatRupiah(v.price)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                v.status === "UNUSED" && "bg-blue-50 text-blue-700 border border-blue-200",
                                v.status === "ACTIVE" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                v.status === "EXPIRED" && "bg-slate-100 text-slate-500 border border-slate-200",
                                v.status === "REVOKED" && "bg-rose-50 text-rose-700 border border-rose-200"
                              )}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {v.expires_at ? formatDate(v.expires_at) : "—"}
                          </td>
                          <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(v.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded border border-cyan-200"
                              title="Periksa Detail Sesi & Riwayat Log Login"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => handlePrintSingle(v, "modern")}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200"
                              title="Cetak lembar voucher ini"
                            >
                              Cetak
                            </button>
                            {v.buyer_mac && (
                              <button
                                type="button"
                                disabled={resetMACLoadingId === v.id}
                                onClick={() => handleResetMAC(v.id, v.code)}
                                className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded border border-amber-200 disabled:opacity-50"
                                title={`Reset Kuncian Perangkat (MAC: ${v.buyer_mac})`}
                              >
                                {resetMACLoadingId === v.id ? "Mereset..." : "Reset MAC"}
                              </button>
                            )}
                            {v.status !== "REVOKED" && v.status !== "EXPIRED" && (
                              <button
                                onClick={() => handleRevoke(v.id, v.code)}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded border border-rose-200"
                              >
                                Revoke
                              </button>
                            )}
                            {v.status === "REVOKED" && (
                              <button
                                type="button"
                                disabled={restoreLoadingId === v.id}
                                onClick={() => handleRestore(v.id, v.code)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-300 disabled:opacity-50"
                                title="Aktifkan kembali voucher ini"
                              >
                                {restoreLoadingId === v.id ? "Mengaktifkan..." : "Aktifkan"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {renderPagination()}
          </div>
        </div>
      )}

      {/* TAB 2: VOUCHER ONLINE & LOG TRANSAKSI QRIS */}
      {activeTab === "online" && (
        <div className="space-y-6">
          {/* Sub-navigation tabs: Orders Log vs Vouchers Issued */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlineSubTab("orders")}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
                  onlineSubTab === "orders"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Log Order Transaksi (Pending & Lunas)</span>
                {ordersSummary.total_orders > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-extrabold",
                      onlineSubTab === "orders" ? "bg-teal-800 text-teal-100" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {ordersSummary.total_orders}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOnlineSubTab("vouchers")}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
                  onlineSubTab === "vouchers"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Voucher Online Terbit</span>
                {totalCount > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-extrabold",
                      onlineSubTab === "vouchers" ? "bg-teal-800 text-teal-100" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {totalCount}
                  </span>
                )}
              </button>
            </div>

            {onlineSubTab === "orders" && (
              <button
                type="button"
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", ordersLoading && "animate-spin")} />
                <span>Refresh Order</span>
              </button>
            )}
          </div>

          {/* SUB-VIEW 1: LOG ORDER TRANSAKSI (SEMUA STATUS: PENDING & LUNAS) */}
          {onlineSubTab === "orders" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Order</span>
                  <div className="text-xl font-black text-slate-900 mt-1">{ordersSummary.total_orders}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Lunas (PAID)
                  </span>
                  <div className="text-xl font-black text-emerald-700 mt-1">{ordersSummary.total_paid}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Menunggu (PENDING)
                  </span>
                  <div className="text-xl font-black text-amber-700 mt-1">{ordersSummary.total_pending}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 bg-slate-50 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Kedaluwarsa (EXPIRED)
                  </span>
                  <div className="text-xl font-black text-slate-600 mt-1">{ordersSummary.total_expired}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-teal-200 bg-teal-50/30 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Total Omset Lunas</span>
                  <div className="text-lg font-black text-teal-800 mt-1">{formatRupiah(ordersSummary.total_revenue)}</div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                  <form onSubmit={handleOrderSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Cari Order ID, No WA, Paket, Voucher, Promo..."
                        value={orderSearchInput}
                        onChange={(e) => setOrderSearchInput(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      {orderSearchInput && (
                        <button
                          type="button"
                          onClick={handleClearOrderSearch}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                          title="Hapus pencarian"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Cari
                    </button>
                    {orderSearch && (
                      <button
                        type="button"
                        onClick={handleClearOrderSearch}
                        className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium border border-slate-200 rounded-lg bg-slate-50 shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </form>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Status Order:</span>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => {
                        setOrderStatusFilter(e.target.value);
                        setOrdersPage(1);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                    >
                      <option value="">Semua Status Order</option>
                      <option value="PAID">Lunas / Berhasil (PAID)</option>
                      <option value="PENDING">Menunggu Bayar (PENDING)</option>
                      <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                      <option value="FAILED">Gagal (FAILED)</option>
                    </select>
                  </div>
                </div>

                {orderSearch && (
                  <div className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit">
                    <span>
                      Hasil pencarian: <b>&quot;{orderSearch}&quot;</b> ({ordersTotalCount} ditemukan)
                    </span>
                    <button
                      type="button"
                      onClick={handleClearOrderSearch}
                      className="text-teal-500 hover:text-teal-800"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Table Orders */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                      <tr>
                        <th className="px-4 py-3.5">Order ID & Waktu</th>
                        <th className="px-4 py-3.5">Pelanggan & Perangkat</th>
                        <th className="px-4 py-3.5">Paket & Tarif</th>
                        <th className="px-4 py-3.5">Status Order</th>
                        <th className="px-4 py-3.5">Kode Voucher</th>
                        <th className="px-4 py-3.5">Saluran / Referral</th>
                        <th className="px-4 py-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ordersLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            Memuat log transaksi order hotspot...
                          </td>
                        </tr>
                      ) : orders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            {orderSearch
                              ? `Tidak ada transaksi yang cocok dengan pencarian "${orderSearch}"`
                              : "Belum ada riwayat pesanan online hotspot"}
                          </td>
                        </tr>
                      ) : (
                        orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900 text-xs">{ord.order_id}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(ord.order_id, ord.id + "_ord")}
                                  className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                                  title="Salin Order ID"
                                >
                                  {copiedId === ord.id + "_ord" ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{formatDate(ord.created_at)}</div>
                              {ord.paid_at && (
                                <div className="text-[10px] text-emerald-600 font-medium">
                                  Lunas: {formatDate(ord.paid_at)}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {ord.customer_phone ? (
                                <a
                                  href={`https://wa.me/${ord.customer_phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-emerald-600 hover:underline block"
                                  title="Chat WhatsApp"
                                >
                                  WA: {ord.customer_phone} ↗
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                              {ord.client_ip && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">IP: {ord.client_ip}</div>
                              )}
                              {ord.client_mac && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">MAC: {ord.client_mac}</div>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-slate-900 text-xs">{ord.package_name}</div>
                              <div className="font-bold text-teal-700 mt-0.5">{formatRupiah(ord.amount)}</div>
                              {ord.discount_amount > 0 && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  {formatRupiah(ord.original_price)}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {ord.status === "PAID" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  PAID / LUNAS
                                </span>
                              )}
                              {ord.status === "PENDING" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  PENDING
                                </span>
                              )}
                              {ord.status === "EXPIRED" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  EXPIRED
                                </span>
                              )}
                              {ord.status === "FAILED" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  FAILED
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {ord.voucher_code ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-teal-700 text-sm">{ord.voucher_code}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(ord.voucher_code, ord.id + "_vc")}
                                    className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                                    title="Salin Kode Voucher"
                                  >
                                    {copiedId === ord.id + "_vc" ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : ord.status === "PENDING" ? (
                                <span className="text-xs text-amber-600 font-medium">Menunggu Bayar</span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              {ord.agent_name ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Ref: {ord.agent_name}
                                  </span>
                                  {ord.promo_code && (
                                    <div className="text-[10px] text-purple-600 font-mono">Kode: {ord.promo_code}</div>
                                  )}
                                  {ord.agent_commission > 0 && (
                                    <div className="text-[10px] text-emerald-600 font-medium">
                                      Komisi: {formatRupiah(ord.agent_commission)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                  Direct Portal
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                              {ord.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={checkingOrderId === ord.order_id}
                                    onClick={() => handleCheckOrderStatus(ord.order_id)}
                                    className="px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded border border-amber-300 disabled:opacity-50 cursor-pointer shadow-xs inline-flex items-center gap-1"
                                    title="Periksa status transaksi ke Midtrans"
                                  >
                                    <RefreshCw className={cn("w-3 h-3", checkingOrderId === ord.order_id && "animate-spin")} />
                                    <span>{checkingOrderId === ord.order_id ? "Memeriksa..." : "Cek Status"}</span>
                                  </button>
                                  {ord.payment_url && (
                                    <a
                                      href={ord.payment_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-300 inline-flex items-center gap-1"
                                      title="Buka halaman pembayaran Midtrans"
                                    >
                                      <span>Link Bayar</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </>
                              )}

                              {ord.status === "PAID" && ord.voucher_code && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(ord.voucher_code, ord.id + "_act")}
                                    className="px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded border border-teal-200 cursor-pointer"
                                  >
                                    {copiedId === ord.id + "_act" ? "Tersalin!" : "Salin Kode"}
                                  </button>
                                  {ord.customer_phone && (
                                    <a
                                      href={`https://wa.me/${ord.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                        `Halo! Berikut kredensial voucher WiFi Anda:\n\nPaket: ${ord.package_name}\nKode Voucher: ${ord.voucher_code}\nOrder ID: ${ord.order_id}\nNominal: ${formatRupiah(ord.amount)}\n\nTerima kasih!`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 inline-flex items-center gap-1"
                                      title="Kirim kredensial via WhatsApp"
                                    >
                                      <span>Kirim WA</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </a>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Orders Pagination */}
                {ordersTotalPages > 1 && (
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
                    <div>
                      Menampilkan halaman <b>{ordersPage}</b> dari <b>{ordersTotalPages}</b> ({ordersTotalCount} total order)
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={ordersPage <= 1}
                        onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={ordersPage >= ordersTotalPages}
                        onClick={() => setOrdersPage((p) => Math.min(ordersTotalPages, p + 1))}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: VOUCHER ONLINE TERBIT */}
          {onlineSubTab === "vouchers" && (
            <div className="space-y-6">
              {/* Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-xs bg-teal-50/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Total Beli Online</span>
                  <div className="text-2xl font-black text-teal-800 mt-1">{totalCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Aktif Digunakan</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {vouchers.filter((v) => v.status === "ACTIVE").length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Menunggu Login (UNUSED)</span>
                  <div className="text-2xl font-black text-blue-700 mt-1">
                    {vouchers.filter((v) => v.status === "UNUSED").length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Via Referral Agen</span>
                  <div className="text-2xl font-black text-purple-700 mt-1">
                    {vouchers.filter((v) => !!v.agent_name || !!v.promo_code).length}
                  </div>
                </div>
              </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari kode online, nomor WA/HP, Order ID, promo agen..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari
                </button>
                {activeSearch && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium border border-slate-200 rounded-lg bg-slate-50 shrink-0"
                  >
                    Reset
                  </button>
                )}
              </form>

              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>Voucher otomatis diterbitkan setelah bayar QRIS di portal captive</span>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
              >
                <option value="">Semua Pembelian Online</option>
                <option value="ONLINE_REFERRAL">Khusus Referral / Promo Agen</option>
                <option value="ONLINE_DIRECT">Direct Portal (Tanpa Agen)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Semua Status</option>
                <option value="UNUSED">Belum Login (UNUSED)</option>
                <option value="ACTIVE">Sedang Aktif (ACTIVE)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                <option value="REVOKED">Dibatalkan (REVOKED)</option>
              </select>

              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
              >
                <option value="">Semua Agen Referral</option>
                <option value="none">Direct (Tanpa Referral)</option>
                <option value="any">Semua Mitra Agen</option>
                {agents.length > 0 && (
                  <optgroup label="Mitra Agen Spesifik">
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.code})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {activeSearch && (
                <div className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 ml-auto">
                  <span>Pencarian: <b>&quot;{activeSearch}&quot;</b> ({totalCount} ditemukan)</span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-teal-500 hover:text-teal-800"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Voucher Online */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Kode Voucher</th>
                    <th className="px-5 py-3.5">WhatsApp / Order ID</th>
                    <th className="px-5 py-3.5">Paket Internet</th>
                    <th className="px-5 py-3.5">Saluran & Referral</th>
                    <th className="px-5 py-3.5">Nominal Bayar</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Waktu Transaksi</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        Memuat data voucher online...
                      </td>
                    </tr>
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        {activeSearch ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-700">Tidak ada voucher online yang cocok dengan pencarian &quot;{activeSearch}&quot;</p>
                            <button
                              type="button"
                              onClick={handleClearSearch}
                              className="text-xs text-teal-600 hover:underline font-medium cursor-pointer"
                            >
                              Hapus filter pencarian
                            </button>
                          </div>
                        ) : (
                          "Belum ada transaksi pembelian voucher online mandiri"
                        )}
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-teal-700 text-base">{v.code}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(v.code, v.id)}
                              className="p-1 text-slate-400 hover:text-teal-700 transition-colors"
                              title="Salin kode voucher"
                            >
                              {copiedId === v.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {v.buyer_phone ? (
                            <a
                              href={`https://wa.me/${v.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Halo! Berikut kode voucher WiFi Anda:\n\nPaket: ${v.template_name || "Hotspot"}\nKode: ${v.code}\nPassword: ${v.password}\nOrder ID: ${v.order_id || "-"}\n\nTerima kasih!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-emerald-600 hover:underline block"
                              title="Buka Chat WhatsApp"
                            >
                              WA: {v.buyer_phone} ↗
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                          {v.order_id && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {v.order_id}
                            </div>
                          )}
                          {v.buyer_mac && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5" title="MAC Address Pembeli">
                              MAC: {v.buyer_mac}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{v.template_name}</div>
                        </td>
                        <td className="px-5 py-4">
                          {v.agent_name ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Ref: {v.agent_name}
                              </span>
                              {v.agent_commission !== undefined && v.agent_commission > 0 && (
                                <div className="text-[10px] text-emerald-600 font-medium">
                                  Komisi: {formatRupiah(v.agent_commission)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Direct Portal
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {formatRupiah(v.price)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                              v.status === "UNUSED" && "bg-blue-50 text-blue-700 border border-blue-200",
                              v.status === "ACTIVE" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              v.status === "EXPIRED" && "bg-slate-100 text-slate-500 border border-slate-200",
                              v.status === "REVOKED" && "bg-rose-50 text-rose-700 border border-rose-200"
                            )}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div>{formatDate(v.created_at)}</div>
                          {v.expires_at && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Exp: {formatDate(v.expires_at)}</div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(v.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded border border-cyan-200"
                            title="Periksa Detail Sesi & Riwayat Log Login"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(v.code, v.id)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded border border-teal-200"
                          >
                            {copiedId === v.id ? "Tersalin!" : "Salin Kode"}
                          </button>
                          {v.buyer_phone && (
                            <button
                              type="button"
                              disabled={resendLoadingId === v.id}
                              onClick={() => handleResendWA(v.id, v.buyer_phone)}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 disabled:opacity-50"
                              title="Kirim ulang pesan WhatsApp via Gateway Fonnte"
                            >
                              {resendLoadingId === v.id ? "Mengirim..." : "Kirim WA"}
                            </button>
                          )}
                          {v.buyer_mac && (
                            <button
                              type="button"
                              disabled={resetMACLoadingId === v.id}
                              onClick={() => handleResetMAC(v.id, v.code)}
                              className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded border border-amber-200 disabled:opacity-50"
                              title={`Reset Kuncian Perangkat (MAC: ${v.buyer_mac})`}
                            >
                              {resetMACLoadingId === v.id ? "Mereset..." : "Reset MAC"}
                            </button>
                          )}
                          {v.status !== "REVOKED" && v.status !== "EXPIRED" && (
                            <button
                              onClick={() => handleRevoke(v.id, v.code)}
                              className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded border border-rose-200"
                            >
                              Revoke
                            </button>
                          )}
                          {v.status === "REVOKED" && (
                            <button
                              type="button"
                              disabled={restoreLoadingId === v.id}
                              onClick={() => handleRestore(v.id, v.code)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-300 disabled:opacity-50"
                              title="Aktifkan kembali voucher ini"
                            >
                              {restoreLoadingId === v.id ? "Mengaktifkan..." : "Aktifkan"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {renderPagination()}
          </div>
        </div>
      )}
    </div>
  )}

      {/* TAB 3: VOUCHER GESEK (BLANKO SERIAL NUMBER & PIN BERPELINDUNG) */}
      {activeTab === "scratch" && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Total Kartu Gesek</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{totalCount}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Siap Digosok (UNUSED)</span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {vouchers.filter((v) => v.status === "UNUSED").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Sedang Dipakai</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {vouchers.filter((v) => v.status === "ACTIVE").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs bg-slate-50/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Blanko (Belum Injeksi)</span>
              <div className="text-2xl font-black text-slate-700 mt-1">
                {vouchers.filter((v) => v.is_blank || v.status === "BLANK").length}
              </div>
            </div>
          </div>

          {/* Search, Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              {/* Form Pencarian */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari Serial Number (SN), PIN, barcode, batch, agen..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari
                </button>
                {activeSearch && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium border border-slate-200 rounded-lg bg-slate-50 shrink-0"
                  >
                    Reset
                  </button>
                )}
              </form>

              {/* Action Buttons (Cetak Model Kartu ATM / Gesek) */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedVoucherIds.size > 0 ? (
                  <>
                    <button
                      onClick={() => handlePrintSelected("atm_wifi_id")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-lg shadow-sm transition-colors"
                      title="Cetak model kartu ATM WiFi.ID ukuran pas dompet"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Cetak ATM WiFi.ID ({selectedVoucherIds.size})
                    </button>
                    <button
                      onClick={() => handlePrintSelected("atm_split2")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg shadow-sm transition-colors"
                      title="Cetak model 2 kartu per lembar ATM"
                    >
                      Model 2-in-1 ({selectedVoucherIds.size})
                    </button>
                    <button
                      onClick={() => handlePrintSelected("scratch_card")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-300 transition-colors"
                      title="Cetak kartu gosok standar"
                    >
                      Standar Gosok
                    </button>
                    <button
                      onClick={() => setSelectedVoucherIds(new Set())}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    {latestBatch && (
                      <button
                        type="button"
                        onClick={handlePrintLatestBatch}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg border border-amber-200 transition-colors shadow-xs"
                        title={`Cetak kartu dari batch terakhir (${latestBatch.batch_number})`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Cetak Batch Terakhir</span>
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintSheet(50)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
                      title="Cetak 50 kartu gesek"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Cetak 50 Kartu
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
              <select
                value={selectedBatchID}
                onChange={(e) => {
                  setSelectedBatchID(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="">Semua Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} ({b.template_name || "Blanko / Campur"})
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="">Semua Status</option>
                <option value="BLANK">Blanko (Belum Diinjeksi Paket)</option>
                <option value="UNUSED">Siap Digosok (UNUSED)</option>
                <option value="ACTIVE">Aktif Digunakan (ACTIVE)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                <option value="REVOKED">Dibatalkan / Void (REVOKED)</option>
              </select>

              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              >
                <option value="">Semua Agen Aktivasi</option>
                <option value="none">Belum Diinjeksi / Kantor Pusat</option>
                <option value="any">Semua Mitra Agen</option>
                {agents.length > 0 && (
                  <optgroup label="Mitra Agen Spesifik">
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.code})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {activeSearch && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 ml-auto">
                  <span>Pencarian: <b>&quot;{activeSearch}&quot;</b> ({totalCount} ditemukan)</span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-amber-500 hover:text-amber-800"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Kartu Gesek */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={vouchers.length > 0 && selectedVoucherIds.size === vouchers.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        title="Pilih semua kartu gesek di halaman ini"
                      />
                    </th>
                    <th className="px-5 py-3.5">Serial Number (SN)</th>
                    <th className="px-5 py-3.5">PIN Rahasia (Digosok)</th>
                    <th className="px-5 py-3.5">Status Kartu</th>
                    <th className="px-5 py-3.5">Paket Terinjeksi</th>
                    <th className="px-5 py-3.5">Tarif</th>
                    <th className="px-5 py-3.5">Agen Aktivasi</th>
                    <th className="px-5 py-3.5">Batch & Dibuat</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                        Memuat data kartu gesek...
                      </td>
                    </tr>
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                        {activeSearch ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-700">Tidak ada kartu gesek yang cocok dengan pencarian &quot;{activeSearch}&quot;</p>
                            <button
                              type="button"
                              onClick={handleClearSearch}
                              className="text-xs text-amber-600 hover:underline font-medium cursor-pointer"
                            >
                              Hapus filter pencarian
                            </button>
                          </div>
                        ) : (
                          "Belum ada voucher kartu gesek yang digenerate"
                        )}
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const isRevealed = revealedPins.has(v.id);
                      const pinCode = v.password || v.code;
                      const sn = v.serial_number || v.code;
                      const isBlank = v.is_blank || v.status === "BLANK";
                      return (
                        <tr key={v.id} className={cn("hover:bg-slate-50/80 transition-colors", selectedVoucherIds.has(v.id) && "bg-amber-50/40")}>
                          <td className="px-4 py-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedVoucherIds.has(v.id)}
                              onChange={() => toggleSelectVoucher(v.id)}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-mono font-black text-slate-900 text-sm tracking-wider">
                              {sn}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              BARCODE: {sn.length >= 12 ? `${sn.slice(0, 4)}-${sn.slice(4, 8)}-${sn.slice(8)}` : sn}
                            </div>
                            {v.is_mac_locked === false ? (
                              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5" title="Bebas digunakan di perangkat apa saja tanpa kuncian MAC">
                                🔓 Bebas MAC
                              </div>
                            ) : v.buyer_mac ? (
                              <div className="text-[10px] text-amber-600 font-mono mt-0.5 flex items-center gap-1" title="Terkunci ke MAC ini">
                                🔒 MAC: {v.buyer_mac}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {isRevealed ? (
                                <span className="font-mono font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-sm tracking-widest">
                                  {pinCode}
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-sm tracking-widest select-none">
                                  ••••••••
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleRevealPin(v.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                                title={isRevealed ? "Tutup PIN" : "Lihat PIN"}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(pinCode, v.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                                title="Salin PIN"
                              >
                                {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isBlank ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                BLANKO
                              </span>
                            ) : v.status === "UNUSED" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                SIAP GOSOK
                              </span>
                            ) : v.status === "ACTIVE" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                AKTIF
                              </span>
                            ) : v.status === "REVOKED" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                VOID / BATAL
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                {v.status}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isBlank ? (
                              <span className="text-xs text-slate-400 italic">Belum Diinjeksi (Rp 0)</span>
                            ) : (
                              <div className="font-semibold text-slate-900 text-xs">
                                {v.template_name || "Paket Hotspot"}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {isBlank ? <span className="text-slate-400 font-medium">Rp 0</span> : formatRupiah(v.price)}
                          </td>
                          <td className="px-5 py-4">
                            {v.agent_name ? (
                              <div>
                                <div className="font-semibold text-slate-900 text-xs truncate max-w-[130px]" title={v.agent_name}>
                                  {v.agent_name}
                                </div>
                                {v.activated_at && (
                                  <div className="text-[10px] text-emerald-600 font-medium">
                                    Injeksi: {formatDate(v.activated_at)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Pusat / Distribusi</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {v.batch_number && <div className="font-mono text-slate-600">{v.batch_number}</div>}
                            <div className="text-[10px] text-slate-400">{formatDate(v.created_at)}</div>
                          </td>
                          <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(v.id)}
                              className="px-2 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded border border-cyan-200"
                              title="Periksa Detail Sesi & Riwayat Log Login"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => handlePrintSingle(v, "atm_wifi_id")}
                              className="px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded border border-amber-200"
                              title="Cetak model kartu ATM WiFi.ID"
                            >
                              ATM
                            </button>
                            <button
                              onClick={() => handlePrintSingle(v, "scratch_card")}
                              className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded border border-slate-200"
                              title="Cetak format kartu gosok"
                            >
                              Gosok
                            </button>
                            {v.buyer_mac && (
                              <button
                                type="button"
                                disabled={resetMACLoadingId === v.id}
                                onClick={() => handleResetMAC(v.id, sn)}
                                className="px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded border border-amber-200 disabled:opacity-50"
                                title={`Reset Kuncian Perangkat (MAC: ${v.buyer_mac})`}
                              >
                                {resetMACLoadingId === v.id ? "Mereset..." : "Reset MAC"}
                              </button>
                            )}
                            {v.status !== "REVOKED" && v.status !== "EXPIRED" && (
                              <button
                                onClick={() => handleRevoke(v.id, sn)}
                                className="px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded border border-rose-200"
                              >
                                Void
                              </button>
                            )}
                            {v.status === "REVOKED" && (
                              <button
                                type="button"
                                disabled={restoreLoadingId === v.id}
                                onClick={() => handleRestore(v.id, sn)}
                                className="px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-300 disabled:opacity-50"
                                title="Aktifkan kembali kartu voucher ini"
                              >
                                {restoreLoadingId === v.id ? "Mengaktifkan..." : "Aktifkan"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {renderPagination()}
          </div>
        </div>
      )}

      {/* Tab 2: Templates */}
      {activeTab === "templates" && (
        templates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="font-medium text-slate-700">Belum ada template paket voucher</p>
            <p className="text-xs text-slate-400 mt-1">Buat template paket untuk memudahkan generate voucher hotspot</p>
            <button
              onClick={openCreateTemplateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              + Buat Template Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                        {formatDurationHuman(t.duration_minutes)}
                      </span>
                      {t.is_available_online ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                          Offline
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-extrabold text-blue-600">{formatRupiah(t.price)}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{t.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{t.description || "Tidak ada deskripsi"}</p>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <div className="flex justify-between">
                      <span>Kecepatan Max:</span>
                      <span className="font-semibold text-slate-800">{formatBandwidth(t.download_kbps)} / {formatBandwidth(t.upload_kbps)}</span>
                    </div>
                    {((t.min_download_kbps || 0) > 0 || (t.min_upload_kbps || 0) > 0) && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>Jaminan Min (CIR):</span>
                        <span className="font-semibold">{formatBandwidth(t.min_download_kbps || 0)} / {formatBandwidth(t.min_upload_kbps || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Kuota Data:</span>
                      <span className="font-semibold text-slate-800">{t.data_limit_bytes > 0 ? `${t.data_limit_bytes / (1024 * 1024)} MB` : "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Masa Berlaku Belum Terpakai:</span>
                      <span className="font-semibold text-slate-800">{t.validity_days} Hari</span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi: Edit & Hapus */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEditTemplateModal(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab 3: Batches */}
      {activeTab === "batches" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Nomor Batch</th>
                <th className="px-5 py-3.5">Template Paket</th>
                <th className="px-5 py-3.5">Tipe Kunci MAC</th>
                <th className="px-5 py-3.5">Jumlah Voucher</th>
                <th className="px-5 py-3.5">Tanggal Dibuat</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">{b.batch_number}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{b.template_name}</td>
                  <td className="px-5 py-4">
                    {b.is_mac_locked === false ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        🔓 Bebas MAC
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        🔒 Kunci MAC (1 HP)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-blue-600">{b.quantity} Lembar</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{formatDate(b.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => openPrintForBatch(b.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                    >
                      Cetak Batch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Generate Batch */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Generate Batch Voucher Baru</h2>
            <p className="text-xs text-slate-500 mb-4">
              Konfigurasi kode voucher, mode login, dan format karakter secara fleksibel.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setBatchMode("standard")}
                className={cn(
                  "py-2 text-xs font-bold rounded-lg transition-all",
                  batchMode === "standard"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Paket Tetap (Reguler)
              </button>
              <button
                type="button"
                onClick={() => setBatchMode("blank_scratch")}
                className={cn(
                  "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  batchMode === "blank_scratch"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span>Blanko Gesek Universal</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/30 text-white font-mono font-bold">SN</span>
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-4 text-sm">
              {batchMode === "blank_scratch" ? (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>💡 Sistem Blanko Gesek Ala Telkomsel</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Voucher dicetak dalam keadaan kosong (Rp 0) dengan <b>Serial Number (SN 12-Digit)</b> dan <b>Kode PIN 6-Digit Angka</b> tertutup stiker gesek. Mitra agen dapat menginjeksi paket on-demand melalui portal agen sebelum dijual ke pelanggan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Jumlah Kartu Blanko *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        value={batchForm.quantity}
                        onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Rekomendasi cetak percetakan: 50 - 500 pcs</span>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Panjang PIN Gosok *</label>
                      <select
                        value={batchForm.code_length || 10}
                        onChange={(e) => setBatchForm({ ...batchForm, code_length: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={6}>6 Digit (Standar Cepat)</option>
                        <option value={8}>8 Digit</option>
                        <option value={10}>10 Digit (Standar Operator / Telkomsel)</option>
                        <option value={12}>12 Digit (Keamanan Tinggi)</option>
                        <option value={16}>16 Digit</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">Standar voucher gesek fisik: 10 Digit Angka</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Catatan Batch Blanko (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Cetak Percetakan Batch 01"
                      value={batchForm.notes || ""}
                      onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">Preview Kartu Blanko yang Dibuat:</span>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono text-slate-600">
                      <div className="flex justify-between">
                        <span>Format SN</span>
                        <b className="text-slate-900 font-bold">26xxxxxxxxxx (12 Digit Numeric)</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Format PIN</span>
                        <b className="text-amber-600 font-bold">{"9".repeat(batchForm.code_length || 10)} ({batchForm.code_length || 10} Digit Angka)</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Awal</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">BLANK (Rp 0)</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Pilih Template Paket *</label>
                    <select
                      required
                      value={batchForm.template_id}
                      onChange={(e) => setBatchForm({ ...batchForm, template_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {formatRupiah(t.price)} ({formatDurationHuman(t.duration_minutes)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pilihan Mode Login: Username = Password vs Terpisah */}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Mode Login Hotspot *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchForm({ ...batchForm, user_mode: "same" })}
                        className={cn(
                          "p-3 rounded-xl border text-left text-xs transition-all",
                          (batchForm.user_mode || "same") === "same"
                            ? "border-blue-500 bg-blue-50/80 text-blue-900 font-semibold ring-2 ring-blue-500/20"
                            : "border-slate-200 hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-slate-900">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                          Username = Password
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-1 leading-tight">
                          1 kode saja untuk login (paling praktis & standar mikrotik voucher)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBatchForm({ ...batchForm, user_mode: "separate" })}
                        className={cn(
                          "p-3 rounded-xl border text-left text-xs transition-all",
                          batchForm.user_mode === "separate"
                            ? "border-blue-500 bg-blue-50/80 text-blue-900 font-semibold ring-2 ring-blue-500/20"
                            : "border-slate-200 hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-slate-900">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                          Password Terpisah
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-1 leading-tight">
                          Username & Password di-generate secara independen
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Format Karakter & Panjang Kode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Format Karakter *</label>
                      <select
                        value={batchForm.char_type || "alphanumeric_upper"}
                        onChange={(e) => setBatchForm({ ...batchForm, char_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="alphanumeric_upper">Huruf Besar & Angka (ABC123)</option>
                        <option value="alphanumeric_lower">Huruf Kecil & Angka (abc123)</option>
                        <option value="numeric">Angka Saja (123456)</option>
                        <option value="alpha_upper">Huruf Besar Saja (ABCDEF)</option>
                        <option value="alpha_lower">Huruf Kecil Saja (abcdef)</option>
                        <option value="alphanumeric_mixed">Campuran Besar, Kecil & Angka</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Panjang Kode *</label>
                      <select
                        value={batchForm.code_length || 6}
                        onChange={(e) => setBatchForm({ ...batchForm, code_length: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={4}>4 Karakter (Sangat Singkat)</option>
                        <option value={5}>5 Karakter</option>
                        <option value={6}>6 Karakter (Standar Direkomendasikan)</option>
                        <option value={7}>7 Karakter</option>
                        <option value={8}>8 Karakter</option>
                        <option value={10}>10 Karakter</option>
                        <option value={12}>12 Karakter</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Jumlah Lembar *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={500}
                        value={batchForm.quantity}
                        onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Prefix Kode (Opsional)</label>
                      <input
                        type="text"
                        maxLength={8}
                        value={batchForm.prefix || ""}
                        onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                        placeholder="Misal: vc, VC, wifi, dsb"
                      />
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-700">Contoh Kode yang Dihasilkan:</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">
                        {(batchForm.user_mode || "same") === "same" ? "1 Kode Login" : "Username & Password"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-center font-mono font-bold text-sm text-blue-600 tracking-wider shadow-xs">
                        <span className="text-[9px] text-slate-400 block font-sans">KODE LOGIN</span>
                        {getSampleCode(batchForm.prefix || "", batchForm.char_type || "alphanumeric_upper", batchForm.code_length || 6)}
                      </div>
                      {batchForm.user_mode === "separate" && (
                        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-center font-mono font-bold text-sm text-slate-800 tracking-wider shadow-xs">
                          <span className="text-[9px] text-slate-400 block font-sans">PASSWORD</span>
                          {getSampleCode("", batchForm.char_type || "alphanumeric_upper", batchForm.code_length || 6)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Catatan Batch</label>
                    <input
                      type="text"
                      placeholder="Keterangan agen / lokasi penjualan"
                      value={batchForm.notes || ""}
                      onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  {/* Pilihan Tugaskan ke Mitra Agen (Opsional) */}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tugaskan ke Mitra Agen (Opsional)
                    </label>
                    <select
                      value={batchForm.agent_id || ""}
                      onChange={(e) => setBatchForm({ ...batchForm, agent_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">Kantor Pusat (Tanpa Agen / Penjualan Langsung)</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Jika dipilih, voucher di batch ini akan otomatis tercatat sebagai stok milik agen dan dapat dikelola/dicetak dari portal agen.
                    </p>
                  </div>
                </>
              )}

              {/* Opsi Kunci MAC Perangkat (Device Binding) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none mt-0.5">{batchForm.is_mac_locked !== false ? "🔒" : "🔓"}</span>
                    <div>
                      <div className="font-bold text-xs text-slate-800">
                        {batchForm.is_mac_locked !== false ? "Kunci MAC Aktif (1 Voucher = 1 HP)" : "Bebas MAC (Bisa Ganti HP / Multi-Device)"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {batchForm.is_mac_locked !== false
                          ? "Voucher otomatis terikat ke MAC HP pertama yang login. Tidak bisa dipakai di HP lain kecuali di-reset."
                          : "Voucher bebas dipakai bergantian antar HP / bebas kendala MAC Acak (Randomized MAC)."}
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={batchForm.is_mac_locked !== false}
                      onChange={(e) => setBatchForm({ ...batchForm, is_mac_locked: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Membangkitkan..." : "Generate Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Template Baru */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingTemplateId ? "Edit Template Paket Voucher" : "Buat Template Profil Voucher"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {editingTemplateId
                ? "Perbarui konfigurasi tarif, durasi, kuota, atau bandwidth paket ini."
                : "Tentukan profil durasi, batasan kuota, dan alokasi bandwidth untuk voucher."}
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Paket *</label>
                <input
                  type="text"
                  required
                  placeholder="Paket 3 Jam Hemat"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Harga (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={templateForm.price}
                    onChange={(e) => setTemplateForm({ ...templateForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Masa Aktif / Durasi *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={durationValue}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        setDurationValue(val);
                        setTemplateForm((prev) => ({
                          ...prev,
                          duration_minutes: calculateTotalMinutes(val, durationUnit),
                        }));
                      }}
                      className="w-1/2 px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-center text-sm"
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => {
                        const unit = e.target.value as "MINUTES" | "HOURS" | "DAYS" | "MONTHS";
                        setDurationUnit(unit);
                        setTemplateForm((prev) => ({
                          ...prev,
                          duration_minutes: calculateTotalMinutes(durationValue, unit),
                        }));
                      }}
                      className="w-1/2 px-2 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 text-xs"
                    >
                      <option value="MINUTES">Menit</option>
                      <option value="HOURS">Jam</option>
                      <option value="DAYS">Hari</option>
                      <option value="MONTHS">Bulan</option>
                    </select>
                  </div>
                  <span className="text-[11px] text-blue-600 block mt-1 font-semibold">
                    = {formatDurationHuman(calculateTotalMinutes(durationValue, durationUnit))} ({calculateTotalMinutes(durationValue, durationUnit).toLocaleString()} Menit)
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Bandwidth Hotspot (CIR & MIR)</span>
                  <span className="text-[11px] text-blue-600 font-semibold">Sistem "Up To"</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-xs">(Max) Download (Kbps) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={templateForm.download_kbps}
                      onChange={(e) => setTemplateForm({ ...templateForm, download_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-blue-700 text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      = {(templateForm.download_kbps / 1024).toFixed(1)} Mbps (Plafon)
                    </span>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-xs">(Max) Upload (Kbps) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={templateForm.upload_kbps}
                      onChange={(e) => setTemplateForm({ ...templateForm, upload_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-emerald-700 text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      = {(templateForm.upload_kbps / 1024).toFixed(1)} Mbps (Plafon)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-xs">(Min) Download (CIR)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0 = Best Effort"
                      value={templateForm.min_download_kbps || 0}
                      onChange={(e) => setTemplateForm({ ...templateForm, min_download_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {!templateForm.min_download_kbps ? "0 = Best effort" : `= ${(templateForm.min_download_kbps / 1024).toFixed(1)} Mbps (Garansi)`}
                    </span>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-xs">(Min) Upload (CIR)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0 = Best Effort"
                      value={templateForm.min_upload_kbps || 0}
                      onChange={(e) => setTemplateForm({ ...templateForm, min_upload_kbps: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {!templateForm.min_upload_kbps ? "0 = Best effort" : `= ${(templateForm.min_upload_kbps / 1024).toFixed(1)} Mbps (Garansi)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Batas Kuota Data (MB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0 = Unlimited"
                    value={quotaMB}
                    onChange={(e) => setQuotaMB(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {quotaMB === 0 ? "Unlimited (Tanpa batas kuota)" : `${(quotaMB / 1024).toFixed(1)} GB`}
                  </span>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Masa Berlaku Voucher (Hari) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={templateForm.validity_days}
                    onChange={(e) => setTemplateForm({ ...templateForm, validity_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Hangus jika belum dipakai dalam waktu tsb
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi / Catatan Paket</label>
                <textarea
                  rows={2}
                  placeholder="Misal: Kuota 2 GB aktif 1 hari, browsing hemat"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              {/* Toggle Ketersediaan Online */}
              <div className="flex items-center justify-between p-3.5 bg-teal-50/60 rounded-xl border border-teal-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Tersedia untuk Pembelian Online
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Paket ini akan ditampilkan di portal beli voucher mandiri (/hotspot/buy)
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateForm.is_available_online ?? false}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_available_online: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Menyimpan..." : editingTemplateId ? "Simpan Perubahan" : "Simpan Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Modal Cetak Lembar Voucher (Print Sheet) */}
      {isPrintSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:static print:block print:p-0 print:bg-white print:m-0 print:w-full print:h-auto print:overflow-visible">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto print:static print:block print:max-w-none print:shadow-none print:p-0 print:m-0 print:overflow-visible print:w-full print:h-auto print:max-h-none print:rounded-none">
            
            {/* Header & Controls (Hidden during print) */}
            <div className="pb-4 border-b border-slate-200 mb-5 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Lembar Cetak Voucher</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {vouchersToPrint.length} Lembar
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih template desain voucher atau kustomisasi HTML sendiri sebelum mencetak.
                    {vouchersToPrint.length > 50 && (
                      <span className="block text-amber-600 font-medium mt-0.5">
                        ⚠️ Tips: Mencetak {vouchersToPrint.length} lembar dapat menghasilkan banyak halaman kertas. Gunakan opsi batas di bawah jika perlu.
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-2">
                    <span className="font-semibold text-slate-700 text-[11px]">Batas Cetak:</span>
                    <button
                      type="button"
                      onClick={() => setVouchersToPrint((prev) => prev.slice(0, 20))}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                    >
                      Maks 20 Lembar
                    </button>
                    <button
                      type="button"
                      onClick={() => setVouchersToPrint((prev) => prev.slice(0, 50))}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                    >
                      Maks 50 Lembar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const unusedOnly = vouchersToPrint.filter((v) => v.status === "UNUSED");
                        if (unusedOnly.length > 0) setVouchersToPrint(unusedOnly);
                      }}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-blue-700"
                    >
                      Hanya yang Belum Terpakai ({vouchersToPrint.filter((v) => v.status === "UNUSED").length})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {printTheme === "custom" && (
                    <button
                      type="button"
                      onClick={() => setIsEditingCustomHtml(!isEditingCustomHtml)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5",
                        isEditingCustomHtml
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      {isEditingCustomHtml ? "Tutup Editor HTML" : "Edit HTML & CSS"}
                    </button>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Sekarang
                  </button>

                  <button
                    onClick={() => setIsPrintSheetOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Template Picker Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 print:hidden">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs font-semibold text-slate-500 mr-1 whitespace-nowrap">Template:</span>
                  {[
                    { id: "modern", label: "Modern Card" },
                    { id: "minimal", label: "Minimalist (Hemat Tinta)" },
                    { id: "scratch_card", label: "Kartu Blanko Gesek (Ala Telkomsel)" },
                    { id: "atm_wifi_id", label: "Kartu ATM Stik 4-in-1 (Ala WiFi.ID)" },
                    { id: "atm_split2", label: "Kartu ATM 2-in-1 (Dual Snap)" },
                    { id: "atm_full", label: "Kartu ATM Full (CR80)" },
                    { id: "thermal", label: "Struk Thermal (58/80mm)" },
                    { id: "compact", label: "Mikhmon Compact" },
                    { id: "custom", label: "Custom HTML" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setPrintTheme(t.id as any);
                        if (t.id === "custom") {
                          setIsEditingCustomHtml(true);
                        } else {
                          setIsEditingCustomHtml(false);
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                        printTheme === t.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {printTheme !== "thermal" && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="text-slate-500 font-medium">Kolom:</span>
                    {[2, 3, 4].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPrintCols(c)}
                        className={cn(
                          "w-7 h-7 rounded font-semibold text-xs border transition-colors",
                          printCols === c
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-Editor: Custom HTML & CSS Editor */}
              {printTheme === "custom" && isEditingCustomHtml && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white border border-slate-800 print:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <span>Editor Template HTML & CSS</span>
                      <span className="text-[10px] text-blue-400 font-mono">(Live Preview di bawah)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Reset template custom ke kode awal?")) {
                          setCustomHtml(DEFAULT_CUSTOM_HTML);
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("ispsync_voucher_custom_html");
                          }
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 underline"
                    >
                      Reset ke Template Bawaan
                    </button>
                  </div>

                  {/* Chips for variables */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <span className="text-[10px] text-slate-400 self-center">Klik tag untuk menyisipkan:</span>
                    {[
                      "{{code}}",
                      "{{password}}",
                      "{{price}}",
                      "{{template_name}}",
                      "{{duration}}",
                      "{{data_limit}}",
                      "{{speed}}",
                      "{{batch_number}}",
                      "{{date}}",
                      "{{#if_separate}}...{{/if_separate}}",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const updated = customHtml + "\n" + tag;
                          setCustomHtml(updated);
                          if (typeof window !== "undefined") {
                            localStorage.setItem("ispsync_voucher_custom_html", updated);
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono border border-slate-700"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={customHtml}
                    onChange={(e) => {
                      setCustomHtml(e.target.value);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("ispsync_voucher_custom_html", e.target.value);
                      }
                    }}
                    className="w-full p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                    placeholder="Tulis kode HTML dan tag <style>..."
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Template ini otomatis tersimpan di browser Anda sehingga tidak hilang saat menutup halaman.
                  </div>
                </div>
              )}
            </div>

            {/* Tips Cetak A4 */}
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1.5 print:hidden">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <span className="text-base">💡</span>
                <span className="text-sm font-extrabold">Panduan Setelan Cetak Rapi Anti-Ngegantung (Kertas A4):</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-1 text-amber-900/90 pl-1 font-medium leading-relaxed">
                <li>Di bilah kanan jendela cetak browser (EPSON L5190), <b>hilangkan centang (uncheck) "Headers and footers"</b> agar tanggal/URL tidak memakan batas margin kertas.</li>
                <li>Atur <b>Margins</b> ke <b>"Minimum"</b> atau <b>"None"</b>.</li>
                <li>Sistem otomatis mengunci setiap kartu agar tidak pernah terbelah antar lembar (pindah utuh ke lembar berikutnya).</li>
              </ul>
            </div>

            {/* Printable Voucher Grid Sheet */}
            <div id="printable-voucher-sheet">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 6mm 5mm 6mm 5mm !important;
                  }
                  html, body {
                    background: white !important;
                    color: black !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  nav, header, aside, .sidebar, [role="navigation"], .print\\:hidden, .no-print {
                    display: none !important;
                  }
                  #printable-voucher-sheet {
                    display: block !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .scratch-card-grid {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    justify-content: flex-start !important;
                    align-content: flex-start !important;
                    gap: 6px !important;
                    width: 100% !important;
                  }
                  .scratch-card-item {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    break-after: auto !important;
                    page-break-after: auto !important;
                    overflow: visible !important;
                    box-sizing: border-box !important;
                    min-height: auto !important;
                  }
                  .scratch-cols-2 .scratch-card-item {
                    width: calc(50% - 6px) !important;
                    max-width: calc(50% - 6px) !important;
                  }
                  .scratch-cols-3 .scratch-card-item {
                    width: calc(33.333% - 6px) !important;
                    max-width: calc(33.333% - 6px) !important;
                  }
                  .scratch-cols-4 .scratch-card-item {
                    width: calc(25% - 6px) !important;
                    max-width: calc(25% - 6px) !important;
                  }
                  .atm-wifi-grid {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    justify-content: flex-start !important;
                    align-content: flex-start !important;
                    gap: 3px !important;
                    width: 100% !important;
                  }
                  .atm-wifi-item {
                    width: calc(50% - 3px) !important;
                    max-width: calc(50% - 3px) !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    box-sizing: border-box !important;
                  }
                  .atm-split2-grid {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    justify-content: flex-start !important;
                    align-content: flex-start !important;
                    gap: 4px !important;
                    width: 100% !important;
                  }
                  .atm-split2-item {
                    width: calc(50% - 4px) !important;
                    max-width: calc(50% - 4px) !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    box-sizing: border-box !important;
                  }
                  .atm-full-grid {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    justify-content: flex-start !important;
                    align-content: flex-start !important;
                    gap: 6px !important;
                    width: 100% !important;
                  }
                  .atm-full-item {
                    width: calc(50% - 6px) !important;
                    max-width: calc(50% - 6px) !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    box-sizing: border-box !important;
                  }
                }
              `}} />
              {/* Mode Custom HTML */}
              {printTheme === "custom" && (
                <div
                  className={cn(
                    "grid gap-3 print:gap-2",
                    printCols === 2 && "grid-cols-1 sm:grid-cols-2 print:grid-cols-2",
                    printCols === 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3",
                    printCols === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4"
                  )}
                >
                  {vouchersToPrint.map((v) => (
                    <div
                      key={v.id}
                      dangerouslySetInnerHTML={{
                        __html: renderCustomHTML(
                          customHtml,
                          v,
                          templates.find((t) => t.id === v.template_id)
                        ),
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Mode Modern Card */}
              {printTheme === "modern" && (
                <div
                  className={cn(
                    "grid gap-3 print:gap-2",
                    printCols === 2 && "grid-cols-1 sm:grid-cols-2 print:grid-cols-2",
                    printCols === 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3",
                    printCols === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4"
                  )}
                >
                  {vouchersToPrint.map((v) => {
                    const isSame = !v.password || v.password === v.code;
                    const tpl = templates.find((t) => t.id === v.template_id);
                    return (
                      <div
                        key={v.id}
                        className="border-2 border-dashed border-blue-400 rounded-2xl p-3.5 bg-white text-center flex flex-col justify-between shadow-xs print:shadow-none break-inside-avoid"
                      >
                        <div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                              ISPSYNC WIFI
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {formatRupiah(v.price)}
                            </span>
                          </div>

                          <div className="text-xs font-extrabold text-slate-900 mb-2">
                            {v.template_name}
                          </div>

                          {isSame ? (
                            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 mb-2 font-mono">
                              <span className="text-[9px] font-bold text-blue-600 block uppercase tracking-wider">
                                KODE LOGIN (USER & PASS)
                              </span>
                              <span className="text-base font-black text-blue-900 tracking-wider">
                                {v.code}
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 mb-2 font-mono text-left">
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                <span className="text-[8px] text-slate-400 block font-bold">USERNAME</span>
                                <span className="text-xs font-bold text-blue-600">{v.code}</span>
                              </div>
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                <span className="text-[8px] text-slate-400 block font-bold">PASSWORD</span>
                                <span className="text-xs font-bold text-slate-800">{v.password}</span>
                              </div>
                            </div>
                          )}

                          {tpl && (
                            <div className="flex justify-around items-center text-[9.5px] font-semibold text-slate-500 bg-slate-50 py-1 rounded-md mb-2">
                              <span>⏱ {formatDurationHuman(tpl.duration_minutes)}</span>
                              <span>⚡ {tpl.data_limit_bytes > 0 ? `${tpl.data_limit_bytes / (1024 * 1024)} MB` : "Unlimited"}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-[8.5px] text-slate-400 border-t border-slate-100 pt-1.5">
                          Hubungkan ke WiFi & masukkan kode di atas
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Minimalist Clean (Hemat Tinta) */}
              {printTheme === "minimal" && (
                <div
                  className={cn(
                    "grid gap-3 print:gap-2",
                    printCols === 2 && "grid-cols-1 sm:grid-cols-2 print:grid-cols-2",
                    printCols === 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3",
                    printCols === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4"
                  )}
                >
                  {vouchersToPrint.map((v) => {
                    const isSame = !v.password || v.password === v.code;
                    const tpl = templates.find((t) => t.id === v.template_id);
                    return (
                      <div
                        key={v.id}
                        className="border border-slate-900 rounded-lg p-3 bg-white text-center flex flex-col justify-between break-inside-avoid font-mono"
                      >
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-300 pb-1 mb-1.5">
                            <span>HOTSPOT VOUCHER</span>
                            <span>{formatRupiah(v.price)}</span>
                          </div>

                          <div className="text-xs font-bold text-slate-900 font-sans mb-1.5">
                            {v.template_name}
                          </div>

                          {isSame ? (
                            <div className="border border-slate-800 rounded p-1.5 my-1.5">
                              <span className="text-[8px] block font-sans font-bold">KODE LOGIN:</span>
                              <span className="text-sm font-bold tracking-widest">{v.code}</span>
                            </div>
                          ) : (
                            <div className="border border-slate-800 rounded p-1.5 my-1.5 text-xs text-left">
                              <div>USER: <b>{v.code}</b></div>
                              <div>PASS: <b>{v.password}</b></div>
                            </div>
                          )}

                          {tpl && (
                            <div className="text-[9px] text-slate-600 font-sans mt-1">
                              Aktif: {formatDurationHuman(tpl.duration_minutes)} | Kuota: {tpl.data_limit_bytes > 0 ? `${tpl.data_limit_bytes / (1024 * 1024)} MB` : "Tanpa Batas"}
                            </div>
                          )}
                        </div>

                        <div className="text-[8px] text-slate-500 font-sans border-t border-slate-200 pt-1 mt-1">
                          Login via browser: ketik kode di atas
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Thermal POS Struk (58mm / 80mm) */}
              {printTheme === "thermal" && (
                <div className="flex flex-col items-center gap-4">
                  {vouchersToPrint.map((v) => {
                    const isSame = !v.password || v.password === v.code;
                    const tpl = templates.find((t) => t.id === v.template_id);
                    return (
                      <div
                        key={v.id}
                        className="w-[280px] p-4 bg-white font-mono text-center border border-dashed border-slate-400 break-inside-avoid shadow-xs print:shadow-none print:border-b-2 print:border-black"
                      >
                        <div className="text-xs font-bold tracking-wider">*** HOTSPOT INTERNET ***</div>
                        <div className="text-[10px] text-slate-500">ISPSYNC HIGH SPEED</div>
                        <div className="my-1.5 text-slate-400 text-xs">--------------------------------</div>

                        <div className="text-xs font-extrabold text-slate-900 font-sans">{v.template_name}</div>
                        <div className="text-sm font-black text-slate-900">{formatRupiah(v.price)}</div>

                        <div className="my-1.5 text-slate-400 text-xs">--------------------------------</div>

                        {isSame ? (
                          <div className="my-2">
                            <div className="text-[9px] font-sans font-bold text-slate-600">KODE LOGIN</div>
                            <div className="text-lg font-black tracking-widest text-slate-900 py-1 bg-slate-50 border border-slate-300 rounded my-1">
                              {v.code}
                            </div>
                            <div className="text-[8.5px] text-slate-500 font-sans">(Username = Password)</div>
                          </div>
                        ) : (
                          <div className="my-2 text-left bg-slate-50 p-2 border border-slate-300 rounded text-xs">
                            <div>USERNAME: <b className="text-sm">{v.code}</b></div>
                            <div>PASSWORD: <b className="text-sm">{v.password}</b></div>
                          </div>
                        )}

                        <div className="my-1.5 text-slate-400 text-xs">--------------------------------</div>

                        {tpl && (
                          <div className="text-[9px] text-slate-600 font-sans space-y-0.5">
                            <div>Masa Aktif: <b>{formatDurationHuman(tpl.duration_minutes)}</b></div>
                            <div>Kuota: <b>{tpl.data_limit_bytes > 0 ? `${tpl.data_limit_bytes / (1024 * 1024)} MB` : "Unlimited"}</b></div>
                            <div>Kecepatan: {formatBandwidth(tpl.download_kbps)}</div>
                          </div>
                        )}

                        <div className="mt-3 text-[8px] text-slate-400 font-sans">
                          Terima Kasih atas Kunjungan Anda
                        </div>
                        <div className="mt-2 text-[9px] text-slate-300 font-mono print:hidden">
                          ✂ - - - - - - - - - - - - - - - - - - -
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Mikhmon Compact Grid */}
              {printTheme === "compact" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2.5 print:grid-cols-3 print:gap-2">
                  {vouchersToPrint.map((v) => {
                    const isSame = !v.password || v.password === v.code;
                    const tpl = templates.find((t) => t.id === v.template_id);
                    return (
                      <div
                        key={v.id}
                        className="border border-slate-300 rounded-lg p-2.5 bg-white text-center flex flex-col justify-between break-inside-avoid shadow-xs print:shadow-none"
                      >
                        <div>
                          <div className="flex items-center justify-between bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold mb-1.5">
                            <span className="truncate">{v.template_name}</span>
                            <span className="ml-1 whitespace-nowrap">{formatRupiah(v.price)}</span>
                          </div>

                          {isSame ? (
                            <div className="bg-slate-100 border border-slate-300 rounded py-1.5 px-1 my-1.5 font-mono">
                              <span className="text-[8px] text-slate-500 block font-bold">KODE VOUCHER</span>
                              <span className="text-sm font-black text-slate-900 tracking-wider">{v.code}</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1 my-1.5 font-mono text-left text-[10px]">
                              <div className="bg-slate-100 border border-slate-300 rounded p-1">
                                <span className="text-[7.5px] text-slate-500 block">USER</span>
                                <span className="font-bold truncate block">{v.code}</span>
                              </div>
                              <div className="bg-slate-100 border border-slate-300 rounded p-1">
                                <span className="text-[7.5px] text-slate-500 block">PASS</span>
                                <span className="font-bold truncate block">{v.password}</span>
                              </div>
                            </div>
                          )}

                          {tpl && (
                            <div className="text-[8.5px] text-slate-500">
                              {formatDurationHuman(tpl.duration_minutes)} • {tpl.data_limit_bytes > 0 ? `${tpl.data_limit_bytes / (1024 * 1024)} MB` : "Unlimited"}
                            </div>
                          )}
                        </div>

                        <div className="text-[7.5px] text-slate-400 mt-1 border-t border-slate-100 pt-0.5">
                          Hubungkan WiFi & Login
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Kartu Gesek Blanko (Telkomsel Style) */}
              {printTheme === "scratch_card" && (
                <div
                  className={cn(
                    "grid gap-3 scratch-card-grid",
                    printCols === 2 && "grid-cols-1 sm:grid-cols-2 scratch-cols-2",
                    printCols === 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 scratch-cols-3",
                    printCols === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 scratch-cols-4"
                  )}
                >
                  {vouchersToPrint.map((v) => {
                    const tpl = templates.find((t) => t.id === v.template_id);
                    const formattedPin = v.code.length === 10 ? `${v.code.slice(0, 5)} ${v.code.slice(5)}` : v.code;
                    return (
                      <div
                        key={v.id}
                        className="scratch-card-item border-2 border-slate-800 rounded-xl p-2.5 bg-white text-slate-900 flex flex-col justify-between shadow-xs print:shadow-none print:border print:border-slate-800 print:rounded-lg print:p-2 break-inside-avoid relative overflow-hidden"
                        style={{ minHeight: "150px" }}
                      >
                        {/* Card Top / Header */}
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1 print:pb-0.5 print:mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                            <span className="text-[10px] font-black tracking-wider text-slate-900 uppercase print:text-[9px]">
                              ISPSYNC WIFI
                            </span>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-900 text-white rounded print:text-[7.5px]">
                            KARTU GESEK
                          </span>
                        </div>

                        {/* Serial Number & Barcode Area */}
                        <div className="bg-slate-50 border border-slate-300 rounded p-1 text-center mb-1 print:p-0.5 print:mb-0.5">
                          <div className="text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-wider print:text-[6.5px]">
                            SERIAL NUMBER (SN)
                          </div>
                          <div className="text-[11px] font-mono font-black text-slate-900 tracking-wider print:text-[10px]">
                            {v.serial_number || "SN: " + v.code}
                          </div>
                          {/* Fake / CSS Barcode lines simulation */}
                          <div className="flex justify-center items-center gap-[2px] h-3.5 mt-0.5 opacity-80 print:h-2.5">
                            {Array.from({ length: 32 }).map((_, i) => (
                              <div
                                key={i}
                                className="bg-slate-900 h-full"
                                style={{ width: i % 3 === 0 ? "2px" : i % 2 === 0 ? "1px" : "1.5px" }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Area Gosok / Scratch Area (40x8mm scratch sticker guide) */}
                        <div className="my-1 border-2 border-dashed border-amber-500 bg-amber-50/50 rounded-lg p-1 text-center relative print:my-0.5 print:p-0.5">
                          <div className="text-[7px] font-black text-amber-700 uppercase tracking-widest mb-0.5 print:text-[6.5px]">
                            AREA GOSOK (GOSOK PERLAHAN)
                          </div>
                          <div className="text-xs font-mono font-black tracking-wider text-slate-900 bg-white border border-amber-300 py-1 rounded shadow-inner print:text-[11px] print:py-0.5">
                            {formattedPin}
                          </div>
                          <div className="text-[6.5px] text-amber-600 mt-0.5 font-medium print:text-[6px]">
                            *Tutup dengan stiker scratch-off 40x8mm sebelum diedarkan
                          </div>
                        </div>

                        {/* Universal Blanko Info or Pre-assigned Info */}
                        {v.is_blank || !v.template_id ? (
                          <div className="text-[8.5px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded p-1 space-y-0.5 mb-1 print:p-0.5 print:space-y-0.5 print:text-[7.5px] print:mb-0.5">
                            <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                              <span className="text-slate-500">PAKET:</span>
                              <span className="font-bold underline">_________________</span>
                            </div>
                            <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                              <span className="text-slate-500">DURASI:</span>
                              <span className="font-bold underline">_________________</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">HARGA:</span>
                              <span className="font-bold">Rp _______________</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[9px] font-sans text-slate-700 bg-slate-50 border border-slate-200 rounded p-1 space-y-0.5 mb-1 print:p-0.5 print:text-[8px] print:mb-0.5">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Paket:</span>
                              <span className="font-black text-slate-900">{v.template_name}</span>
                            </div>
                            {tpl && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Masa Aktif:</span>
                                <span className="font-bold text-slate-800">{formatDurationHuman(tpl.duration_minutes)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Harga:</span>
                              <span className="font-black text-blue-700">{formatRupiah(v.price)}</span>
                            </div>
                          </div>
                        )}

                        {/* Card Footer Instruction */}
                        <div className="text-[7px] text-slate-500 border-t border-slate-200 pt-0.5 text-center font-medium print:text-[6px]">
                          Konek WiFi @ISPSYNC-HOTSPOT &bull; Ketik kode hasil gosok di halaman login
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Kartu ATM Stik 4-in-1 Ala WiFi.ID */}
              {printTheme === "atm_wifi_id" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 atm-wifi-grid">
                  {vouchersToPrint.map((v) => {
                    const tpl = templates.find((t) => t.id === v.template_id);
                    const formattedPin = v.code.length === 10 ? `${v.code.slice(0, 5)} ${v.code.slice(5)}` : v.code;
                    return (
                      <div
                        key={v.id}
                        className="atm-wifi-item border border-slate-800 rounded bg-white text-slate-900 px-2 py-1 flex items-center justify-between gap-1 shadow-2xs print:shadow-none print:border print:border-slate-800 print:rounded-none print:px-1.5 print:py-1 break-inside-avoid relative overflow-hidden"
                        style={{ minHeight: "44px" }}
                      >
                        {/* Left: Brand Mini */}
                        <div className="flex flex-col justify-center min-w-[75px] max-w-[85px] border-r border-slate-300 pr-1.5 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block shrink-0" />
                            <span className="text-[9px] font-black tracking-wider text-slate-900 uppercase truncate">
                              ISPSYNC
                            </span>
                          </div>
                          <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-tight">
                            WIFI STIK GESEK
                          </span>
                        </div>

                        {/* Mid-Left: SN & Mini Barcode */}
                        <div className="flex flex-col justify-center text-center px-1 border-r border-slate-200 shrink-0">
                          <span className="text-[6px] font-mono text-slate-400 font-bold uppercase leading-none">
                            SERIAL NO.
                          </span>
                          <span className="text-[8px] font-mono font-black text-slate-900 tracking-tight leading-tight">
                            {v.serial_number || v.code}
                          </span>
                          <div className="flex justify-center items-center gap-[1px] h-2 mt-0.5 opacity-70">
                            {Array.from({ length: 22 }).map((_, i) => (
                              <div
                                key={i}
                                className="bg-slate-900 h-full"
                                style={{ width: i % 3 === 0 ? "1.5px" : "1px" }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Mid-Right: Paket / Blanko */}
                        <div className="flex-1 min-w-0 px-1 text-[7.5px] flex flex-col justify-center leading-tight">
                          {v.is_blank || !v.template_id ? (
                            <div className="font-mono text-slate-600 space-y-0.5">
                              <div className="truncate"><span className="text-slate-400">PKT:</span> ________</div>
                              <div className="truncate"><span className="text-slate-400">RP:</span> ________</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900 truncate text-[8px]">{v.template_name}</div>
                              <div className="font-bold text-blue-700">{formatRupiah(v.price)}</div>
                              {tpl && <div className="text-[6.5px] text-slate-500 truncate">{formatDurationHuman(tpl.duration_minutes)}</div>}
                            </div>
                          )}
                        </div>

                        {/* Right: Area Gosok Stiker Mini */}
                        <div className="border border-dashed border-amber-500 bg-amber-50/60 rounded px-1.5 py-0.5 text-center shrink-0 min-w-[105px]">
                          <span className="text-[5.5px] font-bold text-amber-800 uppercase block tracking-wider leading-none">
                            AREA GOSOK (GOSOK PERLAHAN)
                          </span>
                          <span className="text-[10px] font-mono font-black text-slate-900 tracking-wider block bg-white px-1 py-0.5 rounded border border-amber-300 shadow-inner mt-0.5 leading-none">
                            {formattedPin}
                          </span>
                          <span className="text-[5px] text-amber-600 block leading-none mt-0.5">
                            *Tutup stiker 25x6mm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Kartu ATM 2-in-1 (Dual Snap) */}
              {printTheme === "atm_split2" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 atm-split2-grid">
                  {vouchersToPrint.map((v) => {
                    const tpl = templates.find((t) => t.id === v.template_id);
                    const formattedPin = v.code.length === 10 ? `${v.code.slice(0, 5)} ${v.code.slice(5)}` : v.code;
                    return (
                      <div
                        key={v.id}
                        className="atm-split2-item border-2 border-slate-800 rounded-lg p-2 bg-white text-slate-900 flex flex-col justify-between shadow-2xs print:shadow-none print:border print:border-slate-800 print:rounded print:p-1.5 break-inside-avoid relative overflow-hidden"
                        style={{ minHeight: "92px" }}
                      >
                        {/* Header Mini Dual */}
                        <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                            <span className="text-[9.5px] font-black tracking-wider uppercase text-slate-900">
                              ISPSYNC WIFI
                            </span>
                          </div>
                          <span className="text-[7px] font-bold bg-slate-900 text-white px-1 py-0.2 rounded">
                            DUAL SNAP (1/2 ATM)
                          </span>
                        </div>

                        {/* Mid Row: Left SN/Barcode, Right Scratch Area */}
                        <div className="grid grid-cols-2 gap-1.5 items-center my-0.5">
                          {/* SN & Barcode */}
                          <div className="bg-slate-50 border border-slate-200 rounded p-1 text-center">
                            <span className="text-[6.5px] font-mono text-slate-400 block font-bold">SERIAL NUMBER</span>
                            <span className="text-[9px] font-mono font-black text-slate-900 tracking-tight block">
                              {v.serial_number || v.code}
                            </span>
                            <div className="flex justify-center items-center gap-[1px] h-2.5 mt-0.5 opacity-75">
                              {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="bg-slate-900 h-full" style={{ width: i % 3 === 0 ? "1.5px" : "1px" }} />
                              ))}
                            </div>
                          </div>

                          {/* Scratch Box */}
                          <div className="border border-dashed border-amber-500 bg-amber-50/60 rounded p-1 text-center">
                            <span className="text-[6px] font-black text-amber-700 uppercase block tracking-wider leading-none">
                              AREA GOSOK (GOSOK PERLAHAN)
                            </span>
                            <span className="text-[10.5px] font-mono font-black text-slate-900 block bg-white py-0.5 rounded border border-amber-300 mt-0.5 shadow-inner">
                              {formattedPin}
                            </span>
                            <span className="text-[5.5px] text-amber-600 block leading-none mt-0.5">
                              *Stiker scratch 30x8mm
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Package & Guide */}
                        <div className="flex items-center justify-between text-[8px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mt-1">
                          {v.is_blank || !v.template_id ? (
                            <span className="font-mono text-slate-500 text-[7.5px]">Paket: ________ | Rp: ________</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{v.template_name}</span>
                              <span className="font-black text-blue-700">{formatRupiah(v.price)}</span>
                              {tpl && <span className="text-slate-500">({formatDurationHuman(tpl.duration_minutes)})</span>}
                            </div>
                          )}
                          <span className="text-[6.5px] text-slate-400">WiFi @ISPSYNC-HOTSPOT</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode Kartu ATM Full (Standar CR80 85.6 x 54 mm) */}
              {printTheme === "atm_full" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 atm-full-grid">
                  {vouchersToPrint.map((v) => {
                    const tpl = templates.find((t) => t.id === v.template_id);
                    const formattedPin = v.code.length === 10 ? `${v.code.slice(0, 5)} ${v.code.slice(5)}` : v.code;
                    return (
                      <div
                        key={v.id}
                        className="atm-full-item border-2 border-slate-900 rounded-2xl p-3 bg-white text-slate-900 flex flex-col justify-between shadow-xs print:shadow-none print:border-2 print:border-slate-900 print:rounded-xl print:p-2.5 break-inside-avoid relative overflow-hidden"
                        style={{ minHeight: "185px" }}
                      >
                        {/* Background watermark / chip simulation */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            {/* Smartcard Chip Simulation */}
                            <div className="w-8 h-6 rounded bg-amber-100 border border-amber-400 p-0.5 flex flex-col justify-between shadow-2xs shrink-0">
                              <div className="flex justify-between border-b border-amber-300 pb-0.5">
                                <div className="w-2 h-1 bg-amber-400 rounded-xs"></div>
                                <div className="w-2 h-1 bg-amber-400 rounded-xs"></div>
                              </div>
                              <div className="flex justify-between">
                                <div className="w-2 h-1 bg-amber-400 rounded-xs"></div>
                                <div className="w-2 h-1 bg-amber-400 rounded-xs"></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                                <span className="text-xs font-black tracking-wider uppercase text-slate-900">
                                  ISPSYNC WIFI
                                </span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                                PREPAID SMART VOUCHER
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-extrabold px-2 py-0.5 bg-slate-900 text-white rounded-md tracking-wider">
                              CR80 ATM
                            </span>
                          </div>
                        </div>

                        {/* Mid Section: SN & Area Gosok */}
                        <div className="grid grid-cols-2 gap-2 my-1.5 items-center">
                          {/* Serial Number & Barcode */}
                          <div className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-center">
                            <div className="text-[7.5px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                              SERIAL NUMBER (SN)
                            </div>
                            <div className="text-[12px] font-mono font-black text-slate-900 tracking-wider">
                              {v.serial_number || v.code}
                            </div>
                            <div className="flex justify-center items-center gap-[1.5px] h-3.5 mt-1 opacity-80">
                              {Array.from({ length: 30 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="bg-slate-900 h-full"
                                  style={{ width: i % 3 === 0 ? "2px" : "1px" }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Scratch Box */}
                          <div className="border-2 border-dashed border-amber-500 bg-amber-50/60 rounded-xl p-1.5 text-center">
                            <div className="text-[7.5px] font-black text-amber-700 uppercase tracking-widest mb-0.5">
                              AREA GOSOK (GOSOK PERLAHAN)
                            </div>
                            <div className="text-sm font-mono font-black tracking-wider text-slate-900 bg-white border border-amber-300 py-1 rounded-lg shadow-inner">
                              {formattedPin}
                            </div>
                            <div className="text-[6.5px] text-amber-600 mt-0.5 font-medium">
                              *Tutup stiker scratch-off 40x8mm
                            </div>
                          </div>
                        </div>

                        {/* Package Info Area */}
                        {v.is_blank || !v.template_id ? (
                          <div className="text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 space-y-0.5">
                            <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                              <span className="text-slate-500">PAKET:</span>
                              <span className="font-bold underline">_________________________</span>
                            </div>
                            <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                              <span className="text-slate-500">MASA AKTIF:</span>
                              <span className="font-bold underline">_________________________</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">HARGA:</span>
                              <span className="font-bold text-blue-700">Rp ___________________</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[9.5px] font-sans text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Paket Hotspot:</span>
                              <span className="font-black text-slate-900">{v.template_name}</span>
                            </div>
                            {tpl && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Masa Aktif:</span>
                                <span className="font-bold text-slate-800">{formatDurationHuman(tpl.duration_minutes)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-500">Harga:</span>
                              <span className="font-black text-blue-700 text-[11px]">{formatRupiah(v.price)}</span>
                            </div>
                          </div>
                        )}

                        {/* Card Footer Instruction */}
                        <div className="text-[7.5px] text-slate-400 border-t border-slate-200 pt-1 text-center font-medium mt-1">
                          Hubungkan WiFi @ISPSYNC-HOTSPOT &bull; Masukkan kode PIN yang digosok di halaman login
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      {/* Voucher Detail & Session Inspection Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Ambient Aurora Glows */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="relative px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  INSPEKSI SESI VOUCHER
                </span>
                {detailVoucher && (
                  <span className="font-mono text-lg font-black text-white tracking-wide">
                    {detailVoucher.code}
                  </span>
                )}
                {detailVoucher && (
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      detailVoucher.status === "ACTIVE"
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                        : detailVoucher.status === "UNUSED"
                        ? "bg-cyan-950/80 text-cyan-400 border-cyan-800"
                        : detailVoucher.status === "EXPIRED"
                        ? "bg-amber-950/80 text-amber-400 border-amber-800"
                        : "bg-rose-950/80 text-rose-400 border-rose-800"
                    )}
                  >
                    {detailVoucher.status}
                  </span>
                )}
                {detailVoucher && (
                  detailVoucher.is_currently_online ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ONLINE SEKARANG
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      OFFLINE
                    </span>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
              {detailLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400">Memuat status sesi FreeRADIUS & riwayat login...</p>
                </div>
              ) : !detailVoucher ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Data voucher tidak ditemukan.
                </div>
              ) : (
                <>
                  {/* Grid 3 Kartu Ringkasan Telco */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Kartu 1: Status Sesi & Gateway */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" /> Sesi Koneksi
                        </span>
                        {detailVoucher.is_currently_online ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                            AKTIF TERHUBUNG
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            TIDAK AKTIF
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">IP Client:</span>
                          <span className="font-mono font-semibold text-slate-100">
                            {detailVoucher.active_session?.framedipaddress || detailVoucher.sessions[0]?.framedipaddress || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Gateway NAS:</span>
                          <span className="font-mono text-slate-300">
                            {detailVoucher.active_session?.nasipaddress || detailVoucher.sessions[0]?.nasipaddress || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Login Terakhir:</span>
                          <span className="text-slate-200">
                            {detailVoucher.first_used_at ? formatDate(detailVoucher.first_used_at) : "Belum Pernah"}
                          </span>
                        </div>
                      </div>
                      {detailVoucher.is_currently_online && (
                        <button
                          type="button"
                          disabled={kickLoadingId === detailVoucher.id}
                          onClick={() => handleKickSession(detailVoucher.id, detailVoucher.code)}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Power className="w-3.5 h-3.5" />
                          {kickLoadingId === detailVoucher.id ? "Memutuskan Sesi..." : "Putuskan Sesi (Kick CoA)"}
                        </button>
                      )}
                    </div>

                    {/* Kartu 2: Kuncian Perangkat (MAC Lock) */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-cyan-400" /> Kuncian Perangkat
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border",
                            detailVoucher.buyer_mac
                              ? "bg-cyan-950/60 text-cyan-400 border-cyan-800"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          )}
                        >
                          {detailVoucher.buyer_mac ? "TERKUNCI (1 MAC)" : "BELUM TERIKAT"}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">MAC Terikat:</span>
                          <span className="font-mono font-bold text-cyan-300">
                            {detailVoucher.buyer_mac || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Proteksi MAC:</span>
                          <span className="text-slate-200">
                            {detailVoucher.is_mac_locked ? "Aktif (Terkunci)" : "Nonaktif"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Perangkat Sesi:</span>
                          <span className="font-mono text-slate-400 text-[11px]">
                            {detailVoucher.active_session?.callingstationid || detailVoucher.sessions[0]?.callingstationid || "—"}
                          </span>
                        </div>
                      </div>
                      {detailVoucher.buyer_mac && (
                        <button
                          type="button"
                          disabled={resetMACLoadingId === detailVoucher.id}
                          onClick={async () => {
                            await handleResetMAC(detailVoucher.id, detailVoucher.code);
                            const updated = await voucherApi.getDetailByID(detailVoucher.id);
                            setDetailVoucher(updated);
                          }}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-600/90 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {resetMACLoadingId === detailVoucher.id ? "Mereset..." : "Reset Kuncian MAC"}
                        </button>
                      )}
                    </div>

                    {/* Kartu 3: Penggunaan Kuota & Masa Aktif */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" /> Kuota & Durasi
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {detailVoucher.template_name || "Paket Hotspot"}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Durasi Terpakai:</span>
                          <span className="font-semibold text-slate-100">
                            {formatSeconds(detailVoucher.used_seconds)} / {formatDurationHuman(detailVoucher.duration_minutes)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Traffic:</span>
                          <span className="font-mono text-cyan-300">
                            {formatBytes(detailVoucher.used_bytes)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Batas Waktu:</span>
                          <span className="text-slate-200">
                            {detailVoucher.expires_at ? formatDate(detailVoucher.expires_at) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Bandwidth Profil:</span>
                          <span className="font-mono text-slate-300">
                            {formatBandwidth(detailVoucher.download_kbps)} DL / {formatBandwidth(detailVoucher.upload_kbps)} UL
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Riwayat Sesi Login (FreeRADIUS Accounting) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">Riwayat Sesi Login</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                          {detailVoucher.sessions.length} Sesi Tercatat
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Sumber data: FreeRADIUS Accounting (`radius_sessions`)
                      </span>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5">Waktu Mulai</th>
                            <th className="px-4 py-2.5">Waktu Selesai</th>
                            <th className="px-4 py-2.5">Durasi</th>
                            <th className="px-4 py-2.5">IP Client</th>
                            <th className="px-4 py-2.5">MAC Perangkat</th>
                            <th className="px-4 py-2.5 text-right">Upload</th>
                            <th className="px-4 py-2.5 text-right">Download</th>
                            <th className="px-4 py-2.5">Status / Penyebab Putus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {detailVoucher.sessions.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans text-xs">
                                Belum ada riwayat sesi login pada FreeRADIUS untuk voucher ini.
                              </td>
                            </tr>
                          ) : (
                            detailVoucher.sessions.map((sess) => (
                              <tr key={sess.radacctid} className="hover:bg-slate-800/40 transition">
                                <td className="px-4 py-2.5 text-slate-200">
                                  {formatDate(sess.acctstarttime)}
                                </td>
                                <td className="px-4 py-2.5">
                                  {sess.is_online ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      ONLINE
                                    </span>
                                  ) : sess.acctstoptime ? (
                                    <span className="text-slate-400">{formatDate(sess.acctstoptime)}</span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-slate-300 font-sans">
                                  {formatSeconds(sess.acctsessiontime)}
                                </td>
                                <td className="px-4 py-2.5 text-slate-200">
                                  {sess.framedipaddress || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-cyan-300">
                                  {sess.callingstationid || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-300">
                                  {formatBytes(sess.upload_bytes)}
                                </td>
                                <td className="px-4 py-2.5 text-right text-cyan-400 font-semibold">
                                  {formatBytes(sess.download_bytes)}
                                </td>
                                <td className="px-4 py-2.5 font-sans">
                                  {sess.is_online ? (
                                    <span className="text-emerald-400 text-[11px] font-medium">Sesi Berjalan</span>
                                  ) : sess.terminate_cause ? (
                                    <span className="text-slate-400 text-[11px]">{sess.terminate_cause}</span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {detailVoucher && detailVoucher.status === "REVOKED" && (
                  <button
                    type="button"
                    disabled={restoreLoadingId === detailVoucher.id}
                    onClick={async () => {
                      await handleRestore(detailVoucher.id, detailVoucher.code);
                      const updated = await voucherApi.getDetailByID(detailVoucher.id);
                      setDetailVoucher(updated);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/60 rounded-lg border border-emerald-700 transition"
                  >
                    Aktifkan Kembali Voucher
                  </button>
                )}
                {detailVoucher && detailVoucher.status !== "REVOKED" && detailVoucher.status !== "EXPIRED" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleRevoke(detailVoucher.id, detailVoucher.code);
                      const updated = await voucherApi.getDetailByID(detailVoucher.id);
                      setDetailVoucher(updated);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/60 rounded-lg border border-rose-800 transition"
                  >
                    Revoke Voucher
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
