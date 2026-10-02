"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { type ApiError } from "@/lib/api/client";
import {
  CreditCard,
  FileText,
  Settings2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Server,
  Layers,
  CheckCircle2,
} from "lucide-react";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

function getInitialTenantInfo() {
  if (typeof window === "undefined") {
    return {
      name: "ISPMU",
      legalName: "PT. Mitra Usaha Data",
      slug: "ispmu",
      logo: "/web/ispmu_logo.svg",
      isTenant: true,
    };
  }
  const h = window.location.hostname.toLowerCase();
  if (h === "ispsync.id" || h === "www.ispsync.id") {
    return { name: "ISPSYNC", legalName: "", slug: "", logo: "", isTenant: false };
  }
  const parts = h.split(".");
  let slug = "";
  if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3) {
    if (parts[0] === "ledger" || parts[0] === "hotspot") {
      slug = parts[1].toLowerCase();
    } else if (parts[0] !== "www") {
      slug = parts[0].toLowerCase();
    }
  } else if (parts.length >= 3 && parts[0] !== "ledger" && parts[0] !== "www") {
    slug = parts[0].toLowerCase();
  }

  if (slug && slug !== "ispsync") {
    const upper = slug.toUpperCase();
    return {
      name: upper,
      legalName: TENANT_LEGAL_MAP[slug] || `PT. ${upper} Data Nusantara`,
      slug: slug,
      logo: `/web/${slug}_logo.svg`,
      isTenant: true,
    };
  }

  return { name: "ISPSYNC", legalName: "", slug: "", logo: "", isTenant: false };
}

export default function LoginPage() {
  const { login } = useAuth();
  const initial = getInitialTenantInfo();
  const [tenantName, setTenantName] = useState(initial.name);
  const [tenantLegalName, setTenantLegalName] = useState(initial.legalName);
  const [tenantSlug, setTenantSlug] = useState(initial.slug);
  const [tenantLogo, setTenantLogo] = useState(initial.logo);
  const [isTenant, setIsTenant] = useState(initial.isTenant);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname.toLowerCase();
      if (h === "ispsync.id" || h === "www.ispsync.id") {
        window.location.href = "/member/login";
        return;
      }
      
      const info = getInitialTenantInfo();
      setTenantSlug(info.slug);
      setTenantName(info.name);
      setTenantLegalName(info.legalName);
      setTenantLogo(info.logo);
      setIsTenant(info.isTenant);

      if (info.isTenant) {
        document.title = `Masuk | ${info.name} Ledger`;
        const iconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (iconEl && info.slug) {
          iconEl.href = `/web/${info.slug}_favicon.svg`;
        }
      } else {
        document.title = "Masuk ke Dashboard";
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Email atau kata sandi tidak cocok. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <title>{tenantName && tenantName !== "ISPSYNC" ? `Masuk | ${tenantName} Ledger` : "Masuk ke Dashboard"}</title>
      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* ========================================================
          LEFT SIDE: Showcase (Dynamic: Demo vs Member Portal)
         ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 relative flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 text-white overflow-hidden border-r border-slate-800/80">
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt="Logo"
                className="h-10 w-auto brightness-0 invert"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-white/20 flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black tracking-tight text-white uppercase cust-brand-name-dynamic">
                  {tenantName}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  {isTenant ? "LEDGER & BILLING" : "PORTAL MEMBER"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                {isTenant ? `Backoffice Operasional & Billing ${tenantName}` : "Kelola Langganan & Layanan Akun"}
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Feature Highlights */}
        <div className="relative z-10 my-10 max-w-xl space-y-6">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Dashboard Operasional &amp;{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              Billing {tenantName}
            </span>
            .
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            {isTenant
              ? `Akses backoffice terpusat untuk manajemen pelanggan internet, penagihan invoice otomatis, paket bandwidth, dan voucher hotspot ${tenantName}.`
              : "Akses portal terpusat untuk memantau masa aktif langganan, rincian paket, riwayat tagihan bulanan, dan pengaturan layanan Anda."}
          </p>

          <div className="mt-8 space-y-3.5">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Manajemen Pelanggan &amp; Layanan</h4>
                <p className="text-xs text-slate-400 mt-0.5">Database pelanggan PPPoE, IPoE, ODP fiber, serta aktivasi layanan otomatis.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Billing, Faktur &amp; Pembayaran</h4>
                <p className="text-xs text-slate-400 mt-0.5">Generate tagihan bulanan, pembayaran QRIS/VA otomatis, dan cetak kwitansi resmi.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Radius AAA &amp; Hotspot Engine</h4>
                <p className="text-xs text-slate-400 mt-0.5">Sinkronisasi pool IP, isolir pelanggan jatuh tempo, dan generator voucher hotspot.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Footer Info */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} {tenantLegalName || (tenantName === "ISPMU" ? "PT. Mitra Usaha Data" : (tenantName === "ISPKU" ? "PT. ISP Kita Nusantara" : "PT. Mitra Usaha Data"))}. All rights reserved.</p>
        </div>
      </div>

      {/* ========================================================
          RIGHT SIDE: Login Form
         ======================================================== */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white relative">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt="Logo"
                className="h-9 w-auto"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xl text-slate-900 tracking-tight uppercase">
                  {tenantName}
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-cyan-800 border border-slate-200">
                  {isTenant ? "LEDGER & BILLING" : "PORTAL MEMBER"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {isTenant ? `Backoffice Operasional ${tenantName}` : "Kelola Langganan & Layanan"}
              </p>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Login Administrator {tenantName}
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Masuk ke backoffice untuk mengelola operasional, pelanggan, dan penagihan {tenantName}.
            </p>
          </div>

          {/* Demo Account Box for Demo Mode */}
          {tenantSlug === "ispku" && (
            <div className="mb-6 p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-cyan-900">admin@{tenantSlug}.ispsync.id</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">Password:</span>
                <span className="font-bold text-cyan-900">Admin123456!</span>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3 shadow-sm animate-in fade-in">
              <svg className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-rose-800 text-xs uppercase tracking-wider mb-0.5">Autentikasi Gagal</p>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Email Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tenantSlug ? `admin@${tenantSlug}.ispsync.id` : "admin@ispsync.id"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 text-sm transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>Ingat sesi login saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-cyan-400 disabled:to-blue-400 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-4 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Memverifikasi Sesi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard {tenantName}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Support Note */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 text-xs justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Koneksi Aman &bull; TLS 1.3 &amp; Enkripsi Sesi</span>
            </div>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              Butuh bantuan akses atau reset akun? Hubungi administrator internal {tenantName}.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}