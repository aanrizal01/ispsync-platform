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
  ExternalLink,
  Sliders,
  Check,
  Copy
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

export default function PlatformSettingsPage() {
  const { member } = useMember();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<SmtpConfig>({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    provider: "google_workspace",
    is_active: true
  });

  // Test Email State
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    latencyMs?: number;
  } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/member/settings");
      const data = await res.json();
      if (data.success && data.smtp) {
        setForm(data.smtp);
        if (!testEmail && data.smtp.smtp_user) {
          setTestEmail(data.smtp.smtp_user);
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

  // Quick Preset Handlers
  const applyPreset = (preset: "google" | "mailgun" | "sendgrid" | "custom") => {
    if (preset === "google") {
      setForm(prev => ({
        ...prev,
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        provider: "google_workspace",
        smtp_from: prev.smtp_user ? `ISPSYNC Platform <${prev.smtp_user}>` : prev.smtp_from
      }));
    } else if (preset === "mailgun") {
      setForm(prev => ({
        ...prev,
        smtp_host: "smtp.mailgun.org",
        smtp_port: 587,
        provider: "mailgun"
      }));
    } else if (preset === "sendgrid") {
      setForm(prev => ({
        ...prev,
        smtp_host: "smtp.sendgrid.net",
        smtp_port: 587,
        smtp_user: "apikey",
        provider: "sendgrid"
      }));
    } else {
      setForm(prev => ({
        ...prev,
        provider: "custom"
      }));
    }
  };

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
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
          ...form
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || "Pengaturan SMTP berhasil disimpan.");
        setForm(data.smtp);
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setActionError(data.error || "Gagal menyimpan pengaturan.");
      }
    } catch (err: any) {
      setActionError("Terjadi kesalahan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Test Send Email
  const handleTestEmail = async (e: React.FormEvent) => {
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
          ...form
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          latencyMs: data.latencyMs
        });
        fetchSettings();
      } else {
        setTestResult({
          success: false,
          error: data.error
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: "Gagal mengirim request: " + err.message
      });
    } finally {
      setTestLoading(false);
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
                PLATFORM CONFIGURATION
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                SaaS System Gateway &amp; Mailer
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-cyan-600" />
              <span>Pengaturan Platform &amp; Mail Server (SMTP)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
              Kelola kredensial server email keluar (outgoing mailer) untuk pengiriman notifikasi invoice tagihan SaaS, aktivasi akun tenant, reset password, dan uji coba live delivery.
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

        {/* Action Messages */}
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

        {/* Main Content Grid */}
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

              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Host SMTP
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: smtp.gmail.com"
                      value={form.smtp_host}
                      onChange={e => setForm({ ...form, smtp_host: e.target.value })}
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
                      onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value, 10) })}
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
                      onChange={e => {
                        const val = e.target.value;
                        setForm({
                          ...form,
                          smtp_user: val,
                          smtp_from: form.smtp_from ? form.smtp_from : `ISPSYNC Platform <${val}>`
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
                        onChange={e => setForm({ ...form, smtp_pass: e.target.value })}
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
                    onChange={e => setForm({ ...form, smtp_from: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-600 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: <span className="font-mono">Nama Perusahaan &lt;email@domain.com&gt;</span>
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
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
                    <li>Buka menu keamanan akun Google di: <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="font-bold underline text-cyan-800">myaccount.google.com/security</a>.</li>
                    <li>Pastikan fitur <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> sudah Aktif.</li>
                    <li>Cari dan klik menu <strong>Sandi Aplikasi (App Passwords)</strong>.</li>
                    <li>Beri nama aplikasi, contoh: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-950 font-bold">ISPSYNC Platform</code>.</li>
                    <li>Salin kode 16 huruf yang muncul (tanpa spasi) dan tempelkan ke kolom <strong>Password / Sandi Aplikasi</strong> di atas.</li>
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

              <form onSubmit={handleTestEmail} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Tujuan Uji Coba
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email-anda.com"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
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
                  <span className="font-mono font-bold text-slate-800">{form.smtp_host}:{form.smtp_port}</span>
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
      </div>
    </MemberNav>
  );
}
