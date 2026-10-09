"use client";

import { useState, useEffect } from "react";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  Mail,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Save,
  ShieldCheck,
  HelpCircle,
  Sliders,
  Check,
  Copy,
  RotateCcw,
  FileText,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";

type SmtpConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  provider?: string;
  is_active?: boolean;
  last_tested_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
};

type EmailTemplates = {
  otp: {
    subject: string;
    header_title: string;
    header_subtitle: string;
    greeting: string;
    body_message: string;
    otp_box_label: string;
    expiry_notice: string;
    ignore_notice: string;
    security_note: string;
    footer_copyright: string;
  };
  welcome: {
    subject: string;
    header_title: string;
    badge_text: string;
    greeting_message: string;
    support_note: string;
    footer_copyright: string;
  };
};

const DEFAULT_TEMPLATES: EmailTemplates = {
  otp: {
    subject: "[ISPSYNC] Kode Verifikasi Pendaftaran: {otp_code}",
    header_title: "ISPSYNC Platform",
    header_subtitle: "Carrier-Grade ISP Automation & Network Ledger",
    greeting: "Halo, {name}!",
    body_message: "Terima kasih telah mendaftar di Platform ISPSYNC. Gunakan kode verifikasi (OTP) berikut untuk menyelesaikan pendaftaran akun Anda:",
    otp_box_label: "KODE VERIFIKASI OTP ANDA",
    expiry_notice: "Berlaku selama 15 menit",
    ignore_notice: "Jika Anda tidak merasa melakukan pendaftaran akun di platform ISPSYNC, Anda dapat mengabaikan email ini dengan aman.",
    security_note: "Keamanan Akun: Jangan pernah memberikan kode OTP ini kepada siapa pun termasuk staf ISPSYNC.",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
  welcome: {
    subject: "[ISPSYNC] Selamat Datang! Akun Cloud Anda Telah Aktif",
    header_title: "Selamat Datang di ISPSYNC",
    badge_text: "TRIAL ENTERPRISE AKTIF (14 HARI)",
    greeting_message: "Halo {name}, akun cloud enterprise ISPSYNC Anda untuk {company} telah berhasil diverifikasi dan aktif. Lingkungan terisolasi Anda telah dipersiapkan dengan 3 engine utama:",
    support_note: "Jika Anda memerlukan bantuan konfigurasi awal (RADIUS, WhatsApp Gateway, atau OLT bridge), silakan balas email ini atau hubungi tim teknis kami.",
    footer_copyright: "© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.",
  },
};

export default function PlatformSettingsPage() {
  const { member } = useMember();
  const [activeTab, setActiveTab] = useState<"smtp" | "templates">("smtp");
  const [activeTemplateTab, setActiveTemplateTab] = useState<"otp" | "welcome">("otp");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [resettingTemplates, setResettingTemplates] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Form State: SMTP
  const [form, setForm] = useState<SmtpConfig>({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    provider: "google_workspace",
    is_active: true,
  });

  // Form State: Templates
  const [templates, setTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);

  // Test Email State
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    latencyMs?: number;
  } | null>(null);

  // Test Template Email State
  const [testTemplateEmail, setTestTemplateEmail] = useState("");
  const [testTemplateLoading, setTestTemplateLoading] = useState(false);
  const [testTemplateResult, setTestTemplateResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/member/settings");
      const data = await res.json();
      if (data.success) {
        if (data.smtp) {
          setForm(data.smtp);
          if (!testEmail && data.smtp.smtp_user) {
            setTestEmail(data.smtp.smtp_user);
          }
          if (!testTemplateEmail && data.smtp.smtp_user) {
            setTestTemplateEmail(data.smtp.smtp_user);
          }
        }
        if (data.email_templates) {
          setTemplates(data.email_templates);
        }
      }
    } catch (err: any) {
      setActionError("Gagal memuat pengaturan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Quick Preset Handlers for SMTP
  const applyPreset = (preset: "google" | "mailgun" | "sendgrid" | "custom") => {
    if (preset === "google") {
      setForm((prev) => ({
        ...prev,
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        provider: "google_workspace",
        smtp_from: prev.smtp_user ? `ISPSYNC Platform <${prev.smtp_user}>` : prev.smtp_from,
      }));
    } else if (preset === "mailgun") {
      setForm((prev) => ({
        ...prev,
        smtp_host: "smtp.mailgun.org",
        smtp_port: 587,
        provider: "mailgun",
      }));
    } else if (preset === "sendgrid") {
      setForm((prev) => ({
        ...prev,
        smtp_host: "smtp.sendgrid.net",
        smtp_port: 587,
        smtp_user: "apikey",
        provider: "sendgrid",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        provider: "custom",
      }));
    }
  };

  // Save SMTP Settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch("/api/member/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_smtp",
          ...form,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || "Pengaturan SMTP berhasil disimpan.");
        setForm(data.smtp);
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setActionError(data.error || "Gagal menyimpan pengaturan SMTP.");
      }
    } catch (err: any) {
      setActionError("Terjadi kesalahan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save Email Templates
  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch("/api/member/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_email_templates",
          templates,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || "Template email berhasil disimpan.");
        if (data.email_templates) setTemplates(data.email_templates);
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setActionError(data.error || "Gagal menyimpan template email.");
      }
    } catch (err: any) {
      setActionError("Terjadi kesalahan: " + err.message);
    } finally {
      setSavingTemplates(false);
    }
  };

  // Reset Email Template to Default
  const handleResetTemplates = async (type?: "otp" | "welcome") => {
    const confirmMsg = type
      ? `Kembalikan template ${type.toUpperCase()} ke pengaturan standar platform?`
      : "Kembalikan semua template email ke format standar sistem?";
    if (!confirm(confirmMsg)) return;

    setResettingTemplates(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch("/api/member/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_email_templates",
          template_type: type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || "Template email berhasil direset ke standar.");
        if (data.email_templates) setTemplates(data.email_templates);
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setActionError(data.error || "Gagal mereset template.");
      }
    } catch (err: any) {
      setActionError("Terjadi kesalahan: " + err.message);
    } finally {
      setResettingTemplates(false);
    }
  };

  // Send Test Email for SMTP Handshake
  const handleTestSmtpEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      alert("Masukkan alamat email tujuan pengujian.");
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/member/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_email",
          to_email: testEmail.trim(),
          ...form,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          latencyMs: data.latencyMs,
        });
        fetchSettings();
      } else {
        setTestResult({
          success: false,
          error: data.error,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: "Gagal mengirim request: " + err.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Send Test Preview Email for Current Template
  const handleSendTestTemplate = async () => {
    if (!testTemplateEmail.trim()) {
      alert("Masukkan alamat email tujuan pratinjau.");
      return;
    }

    setTestTemplateLoading(true);
    setTestTemplateResult(null);

    try {
      const res = await fetch("/api/member/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_template_email",
          template_type: activeTemplateTab,
          to_email: testTemplateEmail.trim(),
          templates,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestTemplateResult({
          success: true,
          message: data.message,
        });
      } else {
        setTestTemplateResult({
          success: false,
          error: data.error,
        });
      }
    } catch (err: any) {
      setTestTemplateResult({
        success: false,
        error: "Gagal mengirim pratinjau: " + err.message,
      });
    } finally {
      setTestTemplateLoading(false);
    }
  };

  const copyVariable = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedVariable(tag);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  // Helper to format string replacement for live preview
  const previewFormat = (text: string, vars: Record<string, string>) => {
    let res = text || "";
    for (const [k, v] of Object.entries(vars)) {
      res = res.replace(new RegExp(`{${k}}`, "g"), v);
    }
    return res;
  };

  // Preview Variables Sample
  const otpPreviewVars = {
    name: "Aan Rizal",
    otp_code: "592814",
  };

  const welcomePreviewVars = {
    name: "Aan Rizal",
    company: "PT Solusi Jaringan Nusantara",
    subdomain: "sjn-net",
  };

  return (
    <MemberNav>
      <div className="flex-1 min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-cyan-700 border border-slate-200">
                PLATFORM CONFIGURATION
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                SaaS System Gateway &amp; Mailer
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-cyan-600" />
              <span>Pengaturan Platform &amp; Layanan Email</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
              Kelola kredensial mail server outgoing (SMTP) dan kustomisasi teks template email otomatis (Kode OTP &amp; Sambutan Aktivasi Tenant) secara visual dengan pratinjau real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchSettings}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer shrink-0"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Action Messages */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800 flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
        )}

        {/* Primary Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab("smtp")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-l border-r ${
              activeTab === "smtp"
                ? "bg-white text-cyan-700 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-500 hover:text-slate-900 border-transparent"
            }`}
          >
            <Server className="w-4 h-4 text-cyan-600" />
            <span>Konfigurasi Server SMTP</span>
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-l border-r ${
              activeTab === "templates"
                ? "bg-white text-cyan-700 border-slate-200 border-b-white -mb-px shadow-xs"
                : "bg-transparent text-slate-500 hover:text-slate-900 border-transparent"
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-600" />
            <span>Editor Template Email (Visual)</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
              Live Preview
            </span>
          </button>
        </div>

        {/* TAB 1: SMTP CONFIGURATION */}
        {activeTab === "smtp" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Form Settings */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-cyan-600" />
                    <div>
                      <h2 className="font-black text-slate-900 text-sm">Konfigurasi SMTP Mail Server</h2>
                      <p className="text-[11px] text-slate-500">Kredensial email outgoing untuk pengiriman sistem platform</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Preset:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset("google")}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-amber-600" />
                      <span>Google Workspace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("custom")}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveSmtp} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Host SMTP
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: smtp.gmail.com"
                        value={form.smtp_host}
                        onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Port SMTP
                      </label>
                      <select
                        value={form.smtp_port}
                        onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-cyan-600 focus:bg-white"
                      >
                        <option value="587">587 (TLS / STARTTLS)</option>
                        <option value="465">465 (SSL / SMTPS)</option>
                        <option value="25">25 (Standard Non-SSL)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Username / Email Pengirim
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: admin@ispsync.id"
                        value={form.smtp_user}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm({
                            ...form,
                            smtp_user: val,
                            smtp_from: form.smtp_from ? form.smtp_from : `ISPSYNC Platform <${val}>`,
                          });
                        }}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Password / Sandi Aplikasi (App Password)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Google App Password (16 karakter)"
                          value={form.smtp_pass}
                          onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nama &amp; Format Pengirim (From Header)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: ISPSYNC Platform <admin@ispsync.id>"
                      value={form.smtp_from}
                      onChange={(e) => setForm({ ...form, smtp_from: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Format: <span className="font-mono">Nama Pengirim &lt;email@domain.com&gt;</span>
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <label htmlFor="is_active" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        Aktifkan Pengiriman Email Otomatis Platform
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Simpan Pengaturan SMTP</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Google Workspace Guide Card */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs text-amber-900 leading-relaxed">
                    <h3 className="font-extrabold text-sm text-amber-950">
                      Cara Mendapatkan Google App Password (Sandi Aplikasi):
                    </h3>
                    <p>
                      Google Workspace tidak mengizinkan login menggunakan password akun biasa untuk SMTP. Anda wajib membuat <strong>Sandi Aplikasi (16 karakter)</strong>:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 font-medium text-amber-900/90">
                      <li>
                        Buka menu keamanan akun Google di:{" "}
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline text-cyan-800"
                        >
                          myaccount.google.com/security
                        </a>
                        .
                      </li>
                      <li>
                        Pastikan fitur <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> sudah Aktif.
                      </li>
                      <li>
                        Cari dan klik menu <strong>Sandi Aplikasi (App Passwords)</strong>.
                      </li>
                      <li>
                        Beri nama aplikasi, contoh:{" "}
                        <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-950 font-bold">
                          ISPSYNC Platform
                        </code>
                        .
                      </li>
                      <li>
                        Salin kode 16 huruf yang muncul (tanpa spasi) dan tempelkan ke kolom <strong>Password / Sandi Aplikasi</strong> di atas.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Test Mailer & Status */}
            <div className="space-y-6">
              {/* Live Test Mailer Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Send className="w-4 h-4 text-cyan-600" />
                  <h3 className="font-black text-slate-900 text-sm">Uji Kirim Email (Live Test)</h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Uji apakah konfigurasi SMTP server Anda sudah berhasil mengirim email ke inbox secara langsung.
                </p>

                <form onSubmit={handleTestSmtpEmail} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Email Tujuan Uji Coba
                    </label>
                    <input
                      type="email"
                      placeholder="nama@email-anda.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testLoading}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengirim Email Uji Coba...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Email Percobaan</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Test Result Box */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {testResult.success ? "Pengiriman Berhasil!" : "Pengiriman Gagal"}
                        </div>
                        <div className="mt-1 text-[11px]">
                          {testResult.success ? testResult.message : testResult.error}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Last Tested Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status SMTP</span>
                  {form.last_test_status === "SUCCESS" ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      TERVERIFIKASI
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      BELUM DIUJI
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Server Host:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {form.smtp_host}:{form.smtp_port}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Akun Pengirim:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[170px]" title={form.smtp_user}>
                      {form.smtp_user || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Terakhir Diuji:</span>
                    <span className="text-[11px] text-slate-700">
                      {form.last_tested_at ? new Date(form.last_tested_at).toLocaleString("id-ID") : "Belum pernah"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EMAIL TEMPLATE EDITOR */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            {/* Template Selector Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Template:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab("otp")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTemplateTab === "otp"
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>1. Email Kode OTP Verifikasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab("welcome")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTemplateTab === "welcome"
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>2. Email Sambutan &amp; Link Engine</span>
                  </button>
                </div>
              </div>

              {/* Actions on bar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetTemplates(activeTemplateTab)}
                  disabled={resettingTemplates}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Kembalikan template ini ke standar sistem"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resettingTemplates ? "animate-spin" : ""}`} />
                  <span>Reset ke Standar</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplates}
                  disabled={savingTemplates}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTemplates ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>

            {/* Main Split Grid: Editor (Left) & Live Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Editor (5 cols) */}
              <div className="lg:col-span-6 space-y-4">
                {/* Variable Helper Pills */}
                <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Variabel Dinamis Tersedia (Klik untuk Salin):
                    </span>
                    {copiedVariable && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Disalin!
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTemplateTab === "otp" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => copyVariable("{otp_code}")}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono font-bold text-cyan-700 hover:border-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Kode OTP 6 Digit"
                        >
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          {"{otp_code}"}
                          <span className="text-[9px] text-slate-400 font-sans font-normal">(Kode OTP)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyVariable("{name}")}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono font-bold text-cyan-700 hover:border-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Nama Pendaftar"
                        >
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          {"{name}"}
                          <span className="text-[9px] text-slate-400 font-sans font-normal">(Nama Lengkap)</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => copyVariable("{name}")}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono font-bold text-cyan-700 hover:border-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Nama Pendaftar"
                        >
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          {"{name}"}
                          <span className="text-[9px] text-slate-400 font-sans font-normal">(Nama)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyVariable("{company}")}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono font-bold text-cyan-700 hover:border-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Nama Perusahaan / PT"
                        >
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          {"{company}"}
                          <span className="text-[9px] text-slate-400 font-sans font-normal">(Perusahaan)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyVariable("{subdomain}")}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-mono font-bold text-cyan-700 hover:border-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Subdomain Tenant"
                        >
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          {"{subdomain}"}
                          <span className="text-[9px] text-slate-400 font-sans font-normal">(Subdomain)</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Form Fields: OTP Template */}
                {activeTemplateTab === "otp" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Subjek Email (Subject Line)
                      </label>
                      <input
                        type="text"
                        value={templates.otp.subject}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            otp: { ...templates.otp, subject: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Judul Header Banner
                        </label>
                        <input
                          type="text"
                          value={templates.otp.header_title}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              otp: { ...templates.otp, header_title: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Sub-Judul Header
                        </label>
                        <input
                          type="text"
                          value={templates.otp.header_subtitle}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              otp: { ...templates.otp, header_subtitle: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Sapaan Penerima (Greeting)
                      </label>
                      <input
                        type="text"
                        value={templates.otp.greeting}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            otp: { ...templates.otp, greeting: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Pesan Tubuh / Pengantar (Body Message)
                      </label>
                      <textarea
                        rows={3}
                        value={templates.otp.body_message}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            otp: { ...templates.otp, body_message: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed focus:outline-none focus:border-cyan-600 focus:bg-white resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Label Kotak Kode OTP
                        </label>
                        <input
                          type="text"
                          value={templates.otp.otp_box_label}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              otp: { ...templates.otp, otp_box_label: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Keterangan Masa Berlaku
                        </label>
                        <input
                          type="text"
                          value={templates.otp.expiry_notice}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              otp: { ...templates.otp, expiry_notice: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Pemberitahuan Abaikan (Bila Bukan Dia)
                      </label>
                      <input
                        type="text"
                        value={templates.otp.ignore_notice}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            otp: { ...templates.otp, ignore_notice: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Catatan Keamanan (Security Note)
                      </label>
                      <input
                        type="text"
                        value={templates.otp.security_note}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            otp: { ...templates.otp, security_note: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Copyright Footer Resmi
                      </label>
                      <input
                        type="text"
                        value={templates.otp.footer_copyright}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            otp: { ...templates.otp, footer_copyright: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Form Fields: Welcome Template */}
                {activeTemplateTab === "welcome" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Subjek Email (Subject Line)
                      </label>
                      <input
                        type="text"
                        value={templates.welcome.subject}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            welcome: { ...templates.welcome, subject: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Judul Header Banner
                        </label>
                        <input
                          type="text"
                          value={templates.welcome.header_title}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              welcome: { ...templates.welcome, header_title: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Teks Badge Status
                        </label>
                        <input
                          type="text"
                          value={templates.welcome.badge_text}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              welcome: { ...templates.welcome, badge_text: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Pesan Sambutan Utama (Greeting Message)
                      </label>
                      <textarea
                        rows={3}
                        value={templates.welcome.greeting_message}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            welcome: { ...templates.welcome, greeting_message: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed focus:outline-none focus:border-cyan-600 focus:bg-white resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Catatan Layanan Dukungan Teknis (Support Note)
                      </label>
                      <textarea
                        rows={2}
                        value={templates.welcome.support_note}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            welcome: { ...templates.welcome, support_note: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed focus:outline-none focus:border-cyan-600 focus:bg-white resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Copyright Footer Resmi
                      </label>
                      <input
                        type="text"
                        value={templates.welcome.footer_copyright}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            welcome: { ...templates.welcome, footer_copyright: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-cyan-600 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Test Send Preview Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-600" />
                    <h3 className="font-black text-slate-900 text-sm">Kirim Pratinjau ke Email Nyata</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Kirim contoh email sesuai template saat ini langsung ke kotak masuk (inbox) Anda untuk memeriksa tampilan di aplikasi Gmail, Apple Mail, atau Outlook.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="email-anda@domain.com"
                      value={testTemplateEmail}
                      onChange={(e) => setTestTemplateEmail(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestTemplate}
                      disabled={testTemplateLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {testTemplateLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Kirim Uji Coba</span>
                    </button>
                  </div>

                  {testTemplateResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        testTemplateResult.success
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {testTemplateResult.success ? testTemplateResult.message : testTemplateResult.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Interactive Visual Preview (6 cols) */}
              <div className="lg:col-span-6 space-y-3 sticky top-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Pratinjau Langsung (Live Visual Preview)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Contoh Render Klien Email
                  </span>
                </div>

                {/* Simulated Email Client Frame */}
                <div className="rounded-2xl border border-slate-300 shadow-md bg-white overflow-hidden">
                  {/* Mail Client Header Bar */}
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">Subjek:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[320px]">
                          {activeTemplateTab === "otp"
                            ? previewFormat(templates.otp.subject, otpPreviewVars)
                            : previewFormat(templates.welcome.subject, welcomePreviewVars)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Baru saja</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-slate-700">Dari:</span>
                        <span className="font-mono text-slate-600 truncate">
                          {form.smtp_from || "ISPSYNC Platform <cloud@ispsync.id>"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <span>Kepada:</span>
                        <span className="font-mono text-slate-600">
                          {activeTemplateTab === "otp" ? "aan@solusiisp.id" : "aan@solusiisp.id"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mail Body Container */}
                  <div className="bg-slate-100/60 p-4 md:p-6 overflow-y-auto max-h-[700px]">
                    {/* OTP PREVIEW */}
                    {activeTemplateTab === "otp" && (
                      <div className="max-w-[540px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
                        {/* Header Banner */}
                        <div className="p-6 bg-gradient-to-r from-sky-600 to-blue-600 text-center text-white">
                          <h1 className="text-xl font-extrabold tracking-tight">
                            {previewFormat(templates.otp.header_title, otpPreviewVars)}
                          </h1>
                          <p className="text-xs text-sky-100 mt-1 font-medium">
                            {previewFormat(templates.otp.header_subtitle, otpPreviewVars)}
                          </p>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                          <h2 className="text-base font-bold text-slate-900">
                            {previewFormat(templates.otp.greeting, otpPreviewVars)}
                          </h2>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {previewFormat(templates.otp.body_message, otpPreviewVars)}
                          </p>

                          {/* OTP Code Box */}
                          <div className="bg-sky-50 border-2 border-dashed border-sky-500 rounded-xl p-5 text-center my-4">
                            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-widest block mb-1">
                              {previewFormat(templates.otp.otp_box_label, otpPreviewVars)}
                            </span>
                            <span className="font-mono text-3xl font-black tracking-widest text-sky-600 inline-block my-1">
                              592814
                            </span>
                            <span className="block text-[11px] text-slate-500 mt-1">
                              {previewFormat(templates.otp.expiry_notice, otpPreviewVars)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            {previewFormat(templates.otp.ignore_notice, otpPreviewVars)}
                          </p>

                          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                            <strong>{previewFormat(templates.otp.security_note, otpPreviewVars)}</strong>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 space-y-1">
                          <div>{previewFormat(templates.otp.footer_copyright, otpPreviewVars)}</div>
                          <div>
                            Layanan resmi otomatisasi ISP &middot;{" "}
                            <span className="text-sky-600 underline">ispsync.id</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WELCOME PREVIEW */}
                    {activeTemplateTab === "welcome" && (
                      <div className="max-w-[540px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
                        {/* Header Banner */}
                        <div className="p-6 bg-slate-900 text-center text-white">
                          <span className="inline-block bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-400/30 uppercase tracking-wider mb-2">
                            {previewFormat(templates.welcome.badge_text, welcomePreviewVars)}
                          </span>
                          <h1 className="text-xl font-extrabold tracking-tight">
                            {previewFormat(templates.welcome.header_title, welcomePreviewVars)}
                          </h1>
                          <p className="text-xs text-slate-400 mt-1">
                            {previewFormat("{company}", welcomePreviewVars)}
                          </p>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {previewFormat(templates.welcome.greeting_message, welcomePreviewVars)}
                          </p>

                          {/* 3 Engine Cards */}
                          <div className="space-y-2.5 my-3">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <div className="font-bold text-sky-700 text-xs">1. Billing &amp; RADIUS Ledger</div>
                              <div className="text-[11px] text-slate-500 leading-normal">
                                Manajemen invoice, isolasi pembayaran, paket internet, dan sinkronisasi MikroTik AAA.
                              </div>
                              <div className="pt-1">
                                <span className="inline-block px-2.5 py-1 bg-sky-600 text-white rounded text-[10px] font-bold">
                                  Buka Ledger &rarr;
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <div className="font-bold text-indigo-700 text-xs">2. NOC &amp; Customer Portal Nexus</div>
                              <div className="text-[11px] text-slate-500 leading-normal">
                                Selfcare pelanggan, portal aduan tiket, notifikasi WhatsApp Gateway, dan monitoring.
                              </div>
                              <div className="pt-1">
                                <span className="inline-block px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold">
                                  Buka Nexus &rarr;
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <div className="font-bold text-emerald-700 text-xs">3. FTTX OLT &amp; CWMP FiberGrid</div>
                              <div className="text-[11px] text-slate-500 leading-normal">
                                Auto-provisioning ONT TR-069, peta ODC/ODP interaktif, redaman fiber optic live.
                              </div>
                              <div className="pt-1">
                                <span className="inline-block px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                  Buka FiberGrid &rarr;
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* SaaS Portal Access */}
                          <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1">
                            <div className="font-bold text-slate-900">Portal Manajemen SaaS Member:</div>
                            <div className="text-[11px]">
                              Kelola langganan, DNS zone kustom, tiket bantuan, dan profil perusahaan Anda melalui:
                            </div>
                            <div className="font-bold text-sky-700 underline text-[11px]">
                              https://member.ispsync.id
                            </div>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            {previewFormat(templates.welcome.support_note, welcomePreviewVars)}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 space-y-1">
                          <div>{previewFormat(templates.welcome.footer_copyright, welcomePreviewVars)}</div>
                          <div>
                            Layanan resmi otomatisasi ISP &middot;{" "}
                            <span className="text-sky-600 underline">ispsync.id</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MemberNav>
  );
}
