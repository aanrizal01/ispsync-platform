"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  Globe,
  Server,
  Plus,
  RefreshCw,
  Search,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Edit2,
  FileCode,
  Zap,
  Terminal,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Layers,
  HelpCircle
} from "lucide-react";

type DnsRecord = {
  id: string;
  name: string;
  type: string;
  value: string;
  ttl: number;
  priority?: number;
  isSystem?: boolean;
  comment?: string;
};

type DnsStats = {
  total: number;
  a: number;
  cname: number;
  txt: number;
  mx: number;
  caa: number;
  system: number;
  custom: number;
};

export default function DnsManagementPage() {
  const { member } = useMember();
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState("ispsync.id");
  const [nameservers, setNameservers] = useState<string[]>([]);
  const [serverIpv4, setServerIpv4] = useState("103.179.65.73");
  const [serverIpv6, setServerIpv6] = useState("2001:df1:1cc0:65::73");
  const [stats, setStats] = useState<DnsStats | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [rawCorefile, setRawCorefile] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal State: Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formId, setFormId] = useState("");
  const [formType, setFormType] = useState("A");
  const [formName, setFormName] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formTtl, setFormTtl] = useState("300");
  const [formPriority, setFormPriority] = useState("0");
  const [formComment, setFormComment] = useState("");

  // Modal State: Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<DnsRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal State: Raw Corefile Viewer
  const [isCorefileModalOpen, setIsCorefileModalOpen] = useState(false);

  // Modal State: Google Workspace Quick Preset
  const [isGooglePresetModalOpen, setIsGooglePresetModalOpen] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);

  // Modal State: Live Dig Diagnostic
  const [isDigModalOpen, setIsDigModalOpen] = useState(false);
  const [digDomain, setDigDomain] = useState("");
  const [digType, setDigType] = useState("A");
  const [digLoading, setDigLoading] = useState(false);
  const [digResult, setDigResult] = useState<any>(null);

  const fetchDnsData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/member/dns");
      const data = await res.json();
      if (data.success) {
        setZone(data.zone);
        setNameservers(data.nameservers || []);
        setServerIpv4(data.serverIpv4 || "103.179.65.73");
        setServerIpv6(data.serverIpv6 || "2001:df1:1cc0:65::73");
        setStats(data.stats);
        setRecords(data.records || []);
        setRawCorefile(data.rawCorefile || "");
      } else {
        setActionError(data.error || "Gagal memuat data DNS.");
      }
    } catch (err: any) {
      setActionError(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDnsData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Add Modal
  const openAddModal = (defaultType = "A") => {
    setIsEditMode(false);
    setFormId("");
    setFormType(defaultType);
    setFormName("");
    setFormValue("");
    setFormTtl("300");
    setFormPriority("0");
    setFormComment("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: DnsRecord) => {
    setIsEditMode(true);
    setFormId(rec.id);
    setFormType(rec.type);
    setFormName(rec.name);
    setFormValue(rec.value);
    setFormTtl(String(rec.ttl || 300));
    setFormPriority(String(rec.priority || 0));
    setFormComment(rec.comment || "");
    setIsModalOpen(true);
  };

  // Save Record (Create or Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formValue.trim()) {
      alert("Nama host dan nilai record wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        action: isEditMode ? "update" : "create",
        name: formName.trim(),
        type: formType,
        value: formValue.trim(),
        ttl: parseInt(formTtl) || 300,
        priority: formType === "MX" ? (parseInt(formPriority) || 0) : 0,
        comment: formComment.trim()
      };
      if (isEditMode) payload.id = formId;

      const res = await fetch("/api/member/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setActionMessage(data.message || "Record DNS berhasil disimpan.");
        fetchDnsData();
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        alert(data.error || "Gagal menyimpan record.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/member/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteTarget.id, force: true })
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        setActionMessage(data.message || "Record DNS berhasil dihapus.");
        fetchDnsData();
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        alert(data.error || "Gagal menghapus record.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick Preset Google Workspace
  const handleApplyGooglePreset = async () => {
    setPresetLoading(true);
    try {
      const res = await fetch("/api/member/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quick_preset", preset: "google_workspace" })
      });
      const data = await res.json();
      if (data.success) {
        setIsGooglePresetModalOpen(false);
        setActionMessage(data.message || "Preset Google Workspace berhasil diterapkan.");
        fetchDnsData();
        setTimeout(() => setActionMessage(null), 6000);
      } else {
        alert(data.error || "Gagal menerapkan preset.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setPresetLoading(false);
    }
  };

  // Run Dig Diagnostic
  const runDigDiagnostic = async (domainToTest: string, recordType = "A") => {
    setDigDomain(domainToTest);
    setDigType(recordType);
    setIsDigModalOpen(true);
    setDigLoading(true);
    setDigResult(null);

    try {
      const res = await fetch("/api/member/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dig", domain: domainToTest, type: recordType })
      });
      const data = await res.json();
      setDigResult(data);
    } catch (err: any) {
      setDigResult({ success: false, message: err.message });
    } finally {
      setDigLoading(false);
    }
  };

  // Filter & Search records
  const filteredRecords = records.filter(r => {
    // Type filter
    if (filterType === "A_AAAA" && r.type !== "A" && r.type !== "AAAA") return false;
    if (filterType === "CNAME" && r.type !== "CNAME") return false;
    if (filterType === "TXT" && r.type !== "TXT") return false;
    if (filterType === "MX" && r.type !== "MX") return false;
    if (filterType === "CAA" && r.type !== "CAA") return false;
    if (filterType === "SYSTEM" && !r.isSystem) return false;
    if (filterType === "CUSTOM" && r.isSystem) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchVal = r.value.toLowerCase().includes(q);
      const matchComment = (r.comment || "").toLowerCase().includes(q);
      const matchType = r.type.toLowerCase().includes(q);
      return matchName || matchVal || matchComment || matchType;
    }
    return true;
  });

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "A":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "AAAA":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "CNAME":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "TXT":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "MX":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "CAA":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "NS":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <MemberNav>
      <div className="flex-1 min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-cyan-700 border border-slate-200">
                PLATFORM CORE DNS
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Authoritative Nameserver • CoreDNS
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Globe className="w-6 h-6 text-cyan-600" />
              <span>DNS Server &amp; Zone Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
              Manajemen zona DNS authoritative domain <span className="text-cyan-700 font-bold font-mono">ispsync.id</span>, konfigurasi nameserver, routing wildcard tenant, serta verifikasi domain pihak ketiga (Google Workspace, Mail MX, SSL CAA).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsGooglePresetModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Setup Google Workspace</span>
            </button>
            <button
              onClick={() => setIsCorefileModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span>Lihat Corefile</span>
            </button>
            <button
              onClick={() => openAddModal("A")}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Tambah Record</span>
            </button>
            <button
              onClick={fetchDnsData}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer shrink-0"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Notification Banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Nameservers */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Authoritative NS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                ACTIVE
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-slate-800 font-mono flex items-center justify-between">
                <span>ns1.{zone}</span>
                <span className="text-[10px] text-cyan-600 font-mono">{serverIpv4}</span>
              </div>
              <div className="text-sm font-extrabold text-slate-800 font-mono flex items-center justify-between">
                <span>ns2.{zone}</span>
                <span className="text-[10px] text-cyan-600 font-mono">{serverIpv4}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Nameserver resmi terdaftar di registry PANDI (.id)
            </div>
          </div>

          {/* Card 2: Wildcard Fallback */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Apex &amp; Wildcard</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                ROUTED
              </span>
            </div>
            <div>
              <div className="text-base font-black text-slate-800 font-mono">
                *.{zone} &rarr; Edge
              </div>
              <div className="text-xs text-cyan-600 font-mono mt-0.5 font-bold">
                {serverIpv4}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Otomatis mengarahkan seluruh subdomain klien SaaS
            </div>
          </div>

          {/* Card 3: Total Records */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total DNS Records</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                ZONE ACTIVE
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats?.total || records.length}</span>
              <span className="text-xs text-slate-500">
                ({stats?.custom || 0} kustom, {stats?.system || 0} core)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-2">
              <span>TXT: {stats?.txt || 0}</span>
              <span>•</span>
              <span>CNAME: {stats?.cname || 0}</span>
              <span>•</span>
              <span>MX: {stats?.mx || 0}</span>
            </div>
          </div>

          {/* Card 4: Hot-Reload Status */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Mekanisme Reload</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                LIVE
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Auto-Reload 5s
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Zero Downtime Hot-Reload
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Perubahan record langsung berlaku tanpa restart server
            </div>
          </div>
        </div>

        {/* Filter Tabs and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "ALL", label: "Semua Record" },
              { id: "A_AAAA", label: "A / AAAA" },
              { id: "CNAME", label: "CNAME" },
              { id: "TXT", label: "TXT & Verifikasi" },
              { id: "MX", label: "MX / Email" },
              { id: "CAA", label: "CAA & SSL" },
              { id: "CUSTOM", label: "Kustom Saja" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterType === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari host, tipe, nilai..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* DNS Records Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-20">Tipe</th>
                  <th className="py-3 px-4 w-48">Host / Nama</th>
                  <th className="py-3 px-4">Nilai / Target Record</th>
                  <th className="py-3 px-4 w-28">TTL / Prioritas</th>
                  <th className="py-3 px-4 w-52">Keterangan / Fungsi</th>
                  <th className="py-3 px-4 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-600 mb-2" />
                      Memuat katalog DNS records...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada DNS record yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(rec => {
                    const fullFqdn = rec.name === "@" ? zone : `${rec.name}.${zone}`;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Type Badge */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-md border ${getTypeBadgeClass(rec.type)}`}>
                            {rec.type}
                          </span>
                        </td>

                        {/* Name / Host */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                            <span>{rec.name}</span>
                            {rec.isSystem && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                CORE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {fullFqdn}
                          </div>
                        </td>

                        {/* Value / Target */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 group max-w-md">
                            <span className="font-mono text-xs text-slate-800 truncate select-all">
                              {rec.value}
                            </span>
                            <button
                              onClick={() => copyToClipboard(rec.value, rec.id)}
                              className="text-slate-400 hover:text-cyan-600 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                              title="Salin Nilai"
                            >
                              {copiedId === rec.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* TTL & Priority */}
                        <td className="py-3 px-4 font-mono text-slate-500">
                          <div>{rec.ttl}s</div>
                          {rec.type === "MX" && (
                            <div className="text-[10px] text-amber-700 font-semibold">Prioritas: {rec.priority || 0}</div>
                          )}
                        </td>

                        {/* Comment */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {rec.comment || <span className="text-slate-300">-</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => runDigDiagnostic(fullFqdn, rec.type === "CAA" ? "A" : rec.type)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer"
                              title="Test Resolusi DNS (Dig)"
                            >
                              <Terminal className="w-3.5 h-3.5" />
                            </button>

                            {!rec.isSystem ? (
                              <>
                                <button
                                  onClick={() => openEditModal(rec)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Edit Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(rec)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Hapus Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => openEditModal(rec)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Lihat Detail Core Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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

        {/* Modal: Tambah / Edit Record */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    {isEditMode ? "Edit DNS Record" : "Tambah DNS Record Baru"}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRecord} className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Tipe Record
                    </label>
                    <select
                      value={formType}
                      onChange={e => setFormType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-cyan-600 focus:bg-white"
                    >
                      <option value="A">A (IPv4)</option>
                      <option value="AAAA">AAAA (IPv6)</option>
                      <option value="CNAME">CNAME (Alias)</option>
                      <option value="TXT">TXT (Teks / Auth)</option>
                      <option value="MX">MX (Mail Server)</option>
                      <option value="CAA">CAA (SSL Auth)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nama Host / Subdomain
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="@ untuk domain utama, atau nama subdomain"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      FQDN: <span className="font-mono text-cyan-600 font-bold">{formName.trim() === "@" || !formName.trim() ? zone : `${formName.trim()}.${zone}`}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Nilai / Target Record
                  </label>
                  <textarea
                    rows={formType === "TXT" ? 3 : 2}
                    placeholder={
                      formType === "A"
                        ? "Contoh: 103.179.65.73"
                        : formType === "CNAME"
                        ? "Contoh: gv-slkmet6ytw7fvh.dv.googlehosted.com."
                        : formType === "MX"
                        ? "Contoh: SMTP.GOOGLE.COM."
                        : formType === "TXT"
                        ? "Contoh: google-site-verification=... atau v=spf1 include:_spf.google.com ~all"
                        : "Target / Nilai record"
                    }
                    value={formValue}
                    onChange={e => setFormValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      TTL (Detik)
                    </label>
                    <select
                      value={formTtl}
                      onChange={e => setFormTtl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                    >
                      <option value="60">60 detik (1 menit - Cepat)</option>
                      <option value="300">300 detik (5 menit - Standar)</option>
                      <option value="1800">1800 detik (30 menit)</option>
                      <option value="3600">3600 detik (1 jam)</option>
                      <option value="86400">86400 detik (1 hari)</option>
                    </select>
                  </div>

                  {formType === "MX" ? (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Prioritas MX
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formPriority}
                        onChange={e => setFormPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Keterangan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Google Auth, Subdomain App"
                        value={formComment}
                        onChange={e => setFormComment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>
                  )}
                </div>

                {formType === "MX" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Keterangan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Google Workspace Mail"
                      value={formComment}
                      onChange={e => setFormComment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isEditMode ? "Simpan Perubahan" : "Simpan &amp; Terapkan"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Hapus Record */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-5 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="font-black text-slate-900 text-base">Hapus DNS Record?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus record <span className="font-mono font-bold text-cyan-700">{deleteTarget.type}</span> untuk host <span className="font-mono font-bold text-slate-900">{deleteTarget.name}</span>?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600 truncate">
                {deleteTarget.value}
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteRecord}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Hapus Record</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Google Workspace Preset */}
        {isGooglePresetModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-slate-900 text-base">Setup Cepat Google Workspace</h3>
                </div>
                <button onClick={() => setIsGooglePresetModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
                <p>
                  Preset ini secara otomatis menambahkan record resmi Google Workspace untuk domain <span className="font-mono font-bold text-cyan-700">{zone}</span>:
                </p>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-800 font-mono">1. Gmail MX Gateway</span>
                      <span className="text-[10px] text-slate-500">Prioritas 1</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-700">
                      Host: @ &bull; Type: MX &bull; Nilai: <span className="text-emerald-700 font-bold">SMTP.GOOGLE.COM.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-800 font-mono">2. SPF Anti-Spoofing</span>
                      <span className="text-[10px] text-slate-500">TXT Record</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-700">
                      Host: @ &bull; Type: TXT &bull; Nilai: <span className="text-emerald-700 font-bold">v=spf1 include:_spf.google.com ~all</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900">
                  <span className="font-bold">Catatan:</span> Kode verifikasi kepemilikan domain (TXT &amp; CNAME) Anda sudah aktif terpasang di sistem.
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setIsGooglePresetModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleApplyGooglePreset}
                    disabled={presetLoading}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {presetLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Terapkan Preset Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Live Dig Diagnostic */}
        {isDigModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-600" />
                  <h3 className="font-black text-slate-900 text-base">Uji Resolusi DNS (Dig Live)</h3>
                </div>
                <button onClick={() => setIsDigModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={digDomain}
                    onChange={e => setDigDomain(e.target.value)}
                    placeholder="Domain / Subdomain untuk diuji"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                  />
                  <select
                    value={digType}
                    onChange={e => setDigType(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-cyan-600 focus:bg-white"
                  >
                    <option value="A">A</option>
                    <option value="AAAA">AAAA</option>
                    <option value="CNAME">CNAME</option>
                    <option value="TXT">TXT</option>
                    <option value="MX">MX</option>
                    <option value="NS">NS</option>
                  </select>
                  <button
                    onClick={() => runDigDiagnostic(digDomain, digType)}
                    disabled={digLoading}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {digLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Uji"}
                  </button>
                </div>

                {digResult && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Hasil Resolusi:</span>
                      {digResult.resolved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          RESOLVED ({digResult.latencyMs}ms)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          GAGAL / PENDING
                        </span>
                      )}
                    </div>
                    <pre className="font-mono text-[11px] text-cyan-900 bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto select-all max-h-48 whitespace-pre-wrap">
                      {Array.isArray(digResult.results)
                        ? JSON.stringify(digResult.results, null, 2)
                        : digResult.message}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Raw Corefile Viewer */}
        {isCorefileModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-cyan-600" />
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Corefile Aktif (/etc/coredns/Corefile)</h3>
                    <p className="text-[11px] text-slate-500">Konfigurasi yang disajikan langsung ke mesin CoreDNS port 53</p>
                  </div>
                </div>
                <button onClick={() => setIsCorefileModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="relative">
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-96 select-all">
                    {rawCorefile}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(rawCorefile, "corefile_modal")}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === "corefile_modal" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Corefile</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>File ini dimutakhirkan secara otomatis saat Anda melakukan aksi di GUI.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MemberNav>
  );
}
