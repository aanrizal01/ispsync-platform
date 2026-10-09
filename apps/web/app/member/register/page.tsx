"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "../context";
import {
  Mail,
  Lock,
  Building2,
  User,
  Phone,
  Globe,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Server,
  Network,
  Zap,
  HelpCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function MemberRegisterPage() {
  const router = useRouter();
  const { refreshMember } = useMember();

  // Form Step: 1 = Form Input, 2 = OTP Verification, 3 = Success & Provisioned
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [company, setCompany] = useState("");
  const [picName, setPicName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [registeredMember, setRegisteredMember] = useState<any>(null);

  // Auto-generate subdomain suggestion from company name
  function handleCompanyChange(val: string) {
    setCompany(val);
    if (!subdomain || subdomain === slugify(company)) {
      const slug = slugify(val);
      if (slug.length <= 20) {
        setSubdomain(slug);
      }
    }
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/pt\b|cv\b/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // STEP 1: Submit Registration Request (Generates OTP and sends email)
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_request",
          company,
          picName,
          subdomain,
          email,
          phone,
          password,
        }),
      });

      const data = await res.json().catch(() => ({ error: "Gagal memproses data server." }));

      if (!res.ok || !data.success) {
        setError(data.error || "Pendaftaran gagal. Silakan periksa kembali data Anda.");
        setLoading(false);
        return;
      }

      setSuccessMsg(data.message || `Kode OTP 6-digit telah dikirimkan ke ${email}.`);
      setStep(2);
      setResendCooldown(45);
    } catch (err: any) {
      setError(err?.message || "Koneksi ke server gagal. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_verify",
          email,
          code: otpCode,
        }),
      });

      const data = await res.json().catch(() => ({ error: "Gagal memproses verifikasi server." }));

      if (!res.ok || !data.success) {
        setError(data.error || "Kode verifikasi salah atau telah kedaluwarsa.");
        setLoading(false);
        return;
      }

      // Store token in localStorage and sync member context
      if (data.token) {
        localStorage.setItem("member-token", data.token);
        await refreshMember();
      }

      setRegisteredMember(data.member);
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "Koneksi gagal saat memverifikasi kode.");
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP action
  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_resend_otp",
          email,
        }),
      });

      const data = await res.json().catch(() => ({ error: "Gagal memproses pengiriman ulang." }));

      if (!res.ok || !data.success) {
        setError(data.error || "Gagal mengirim ulang kode OTP.");
        setLoading(false);
        return;
      }

      setSuccessMsg(`Kode OTP baru telah dikirim ke ${email}.`);
      setResendCooldown(45);
    } catch (err: any) {
      setError(err?.message || "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white text-slate-800">
      {/* ── Left Column: Form & Verification Wizard ───────────────── */}
      <div className="w-full lg:w-7/12 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top: Brand Logo & Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/logo-prism.png"
              alt="ISPSYNC"
              className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-black tracking-wider text-slate-900 font-sans">
              ISPSYNC
            </span>
          </Link>

          <Link
            href="/member/login"
            className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            <span>Sudah punya akun? Masuk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Center: Interactive Wizard */}
        <div className="w-full max-w-xl mx-auto my-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className={step >= 1 ? "text-blue-600 font-extrabold" : ""}>1. Data Tenant</span>
              <span className={step >= 2 ? "text-blue-600 font-extrabold" : ""}>2. Verifikasi Email</span>
              <span className={step >= 3 ? "text-emerald-600 font-extrabold" : ""}>3. Siap Beroperasi</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  step === 1 ? "w-1/3 bg-blue-600" : step === 2 ? "w-2/3 bg-blue-600" : "w-full bg-emerald-600"
                }`}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: Registration Form
             ══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Pendaftaran Akun Baru
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                  Dapatkan akses instan ke 3 engine cloud: Ledger (Billing &amp; RADIUS), Nexus (Selfcare &amp; NOC), dan FiberGrid (FTTX &amp; OLT).
                </p>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Perusahaan & PIC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nama Brand / ISP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        placeholder="Contoh: Solusi Net Nusantara"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Penanggung Jawab (PIC) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={picName}
                        onChange={(e) => setPicName(e.target.value)}
                        placeholder="Nama lengkap Anda"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Subdomain Input with Dynamic Domain Preview */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Subdomain Pilihan <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">3-30 karakter alfanumerik</span>
                  </div>
                  <div className="relative flex rounded-xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent">
                    <span className="inline-flex items-center px-3.5 bg-slate-50 text-slate-500 text-xs border-r border-slate-200 select-none">
                      https://
                    </span>
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="solusinet"
                      required
                      className="w-full px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <span className="inline-flex items-center px-3.5 bg-slate-50 text-slate-600 text-xs font-semibold border-l border-slate-200 select-none">
                      .ispsync.id
                    </span>
                  </div>

                  {/* Subdomain Preview Badges */}
                  {subdomain && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-700">Domain engine otomatis Anda:</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-blue-600">
                        ledger.{subdomain}.ispsync.id
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-indigo-600">
                        nexus.{subdomain}.ispsync.id
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-emerald-600">
                        fibergrid.{subdomain}.ispsync.id
                      </span>
                    </div>
                  )}
                </div>

                {/* Email Resmi & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Alamat Email Resmi <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@ispanda.com"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Kode OTP 6-digit akan dikirimkan ke email ini.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      No. WhatsApp / HP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Untuk koordinasi aktivasi &amp; support teknis.
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kata Sandi Akun <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0 mt-1.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {loading ? (
                    <span>Memproses &amp; Mengirim OTP...</span>
                  ) : (
                    <>
                      <span>Lanjut ke Verifikasi Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Dengan mendaftar, Anda menyetujui Ketentuan Layanan &amp; Kebijakan Privasi ISPSYNC. Data Anda dienkripsi penuh dan terisolasi secara multi-tenant.
                </p>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: OTP Verification Form
             ══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div>
              <div className="mb-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-3">
                  <Mail className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Periksa Kotak Masuk Email Anda
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                  Kami telah mengirimkan kode verifikasi 6-digit ke:
                </p>
                <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-800 text-sm">
                  {email}
                </div>
              </div>

              {successMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center tracking-[12px] font-mono text-2xl font-black py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 placeholder:text-slate-300"
                  />
                  <span className="text-[11px] text-slate-400 text-center block mt-1.5">
                    Kode berlaku selama 15 menit. Jika tidak ada di inbox, periksa folder Spam / Promosi.
                  </span>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0 mt-1.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Memverifikasi Akun...</span>
                  ) : (
                    <>
                      <span>Verifikasi &amp; Aktifkan Akun</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    &larr; Ubah Email / Data
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-blue-600 hover:text-blue-700 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {resendCooldown > 0
                        ? `Kirim Ulang (${resendCooldown}s)`
                        : "Kirim Ulang Kode OTP"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: Provisioning Success
             ══════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Selamat Datang di ISPSYNC!
              </h1>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Akun tenant <strong>{company}</strong> telah berhasil dibuat. Silakan menuju dashboard untuk mengaktifkan paket berlangganan dan mulai menggunakan infrastruktur ISPSYNC.
              </p>

              {/* Direct to Dashboard Button */}
              <div className="mt-8 space-y-3">
                <Link
                  href="/member/dashboard"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Buka Dashboard Member SaaS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-xs text-slate-400">
                  Rincian akun &amp; panduan onboarding telah kami kirimkan ke email <strong>{email}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>&copy; 2026 ISPSYNC Platform &mdash; PT. Inovasi Sistem Pintar. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-slate-600">Beranda</Link>
            <Link href="/member/login" className="hover:text-slate-600">Login Member</Link>
            <a href="mailto:cloud@ispsync.id" className="hover:text-slate-600">Bantuan Teknis</a>
          </div>
        </div>
      </div>

      {/* ── Right Column: Enterprise Capabilities Showcase (Light Telco Theme) ── */}
      <div className="hidden lg:flex w-5/12 bg-slate-50 border-l border-slate-200 p-12 flex-col justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug mb-3">
            Infrastruktur ISP Terpadu dalam Satu Platform
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            Didesain khusus untuk operasional ISP modern di Indonesia. Dari manajemen radius ribuan pelanggan hingga peta jaringan fiber optic lapangan.
          </p>

          {/* Feature Highlights Cards */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Carrier-Grade MikroTik &amp; RADIUS</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                  Sinkronisasi CoA MikroTik otomatis, isolasi pelanggan menunggak realtime, dan manajemen paket FUP.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Auto-Provisioning OLT &amp; CWMP TR-069</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                  Dukungan multi-vendor ZTE, Huawei, Fiberhome, VSOL, dan HiOSO dengan integrasi redaman live.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Otomatisasi Tagihan &amp; WhatsApp Gateway</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                  Pengiriman invoice otomatis via WhatsApp, QRIS Payment Gateway instan, dan selfcare pelanggan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Quote */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-amber-400 text-xs">★</span>
            ))}
            <span className="text-[11px] font-bold text-slate-600 ml-1">99.98% SLA Uptime</span>
          </div>
          <p className="text-xs text-slate-600 italic">
            &ldquo;Semua domain engine terisolasi dan tersinkronisasi otomatis via CoreDNS. Tidak perlu setup server manual lagi.&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-700">Platform ISPSYNC Cloud</span>
            <span>&middot;</span>
            <span>Ready for Production</span>
          </div>
        </div>
      </div>
    </div>
  );
}
