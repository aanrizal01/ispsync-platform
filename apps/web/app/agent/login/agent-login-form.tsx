"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { type ApiError } from "@/lib/api/client";
import {
  Store,
  Wallet,
  Percent,
  Smartphone,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  UserPlus,
} from "lucide-react";

export type TenantInfo = {
  name: string;
  legalName: string;
  slug: string;
  logo: string;
  isTenant: boolean;
};

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

const TENANT_CONTACT_MAP: Record<string, string> = {
  ispmu: "6281377776666",
  ispku: "6281288889999",
  dev: "6281100002026",
};

export default function AgentLoginForm({ initialTenant }: { initialTenant: TenantInfo }) {
  const { login } = useAuth();
  const [tenantName, setTenantName] = useState(initialTenant.name);
  const [tenantLegalName, setTenantLegalName] = useState(initialTenant.legalName);
  const [tenantSlug, setTenantSlug] = useState(initialTenant.slug);
  const [tenantLogo, setTenantLogo] = useState(initialTenant.logo);
  const [isTenant, setIsTenant] = useState(initialTenant.isTenant);
  const [waPhone, setWaPhone] = useState(TENANT_CONTACT_MAP[initialTenant.slug] || "6281100002026");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname.toLowerCase();
      const parts = h.split(".");
      let detectedSlug = "";

      if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi" || parts[0] === "agent")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length === 3 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi" || parts[0] === "agent")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length >= 3 && parts[0] !== "www") {
        detectedSlug = parts[0].toLowerCase();
      }

      if (detectedSlug && detectedSlug !== "ispsync") {
        const upper = detectedSlug.toUpperCase();
        setTenantSlug(detectedSlug);
        setTenantName(upper);
        setTenantLegalName(TENANT_LEGAL_MAP[detectedSlug] || `PT. ${upper} Data Nusantara`);
        setTenantLogo(`/web/${detectedSlug}_logo.svg`);
        setIsTenant(true);
        if (TENANT_CONTACT_MAP[detectedSlug]) {
          setWaPhone(TENANT_CONTACT_MAP[detectedSlug]);
        }
      }

      const activeUpper = detectedSlug && detectedSlug !== "ispsync" ? detectedSlug.toUpperCase() : tenantName;
      document.title = `Masuk | ${activeUpper} Portal Agen`;

      const iconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (iconEl && (detectedSlug || tenantSlug)) {
        iconEl.href = `/web/${detectedSlug || tenantSlug}_favicon.svg`;
      }
    }
  }, [tenantSlug, tenantName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Email atau kata sandi agen tidak cocok. Silakan periksa kembali.");
    } finally {
      setIsLoading(false);
    }
  }

  const dynamicPlaceholder = tenantSlug ? `agent@${tenantSlug}.ispsync.id atau email agen` : "agent@ispsync.id";

  return (
    <>
      <title>{`Masuk | ${tenantName} Portal Agen`}</title>
      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sans selection:bg-cyan-500 selection:text-slate-950">
        {/* ========================================================
            LEFT SIDE: Showcase (Carrier-Grade Linear Telco Dark)
           ======================================================== */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 relative flex-col justify-between p-10 xl:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 text-white overflow-hidden border-r border-slate-800/80">
          {/* Ambient Radial Glows (Aurora Effect) */}
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
                  className="h-10 w-auto brightness-0 invert object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-white/20 shrink-0">
                  <Store className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                    {tenantName}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                    PORTAL MITRA AGEN
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Program Kemitraan Voucher Hotspot &amp; Reseller {tenantName}
                </p>
              </div>
            </div>
          </div>

          {/* Middle: Hero Messaging & Highlights */}
          <div className="relative z-10 my-auto py-10 space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Kemitraan Agen &amp;{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
                  Reseller WiFi Hotspot.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed font-sans">
                Akses resmi mitra agen untuk cetak lembar voucher fisik, bagi kode promo diskon, dan pantau mutasi komisi saldo secara real-time.
              </p>
            </div>

            {/* Feature Cards (Uniform Carrier-Grade Telco Design) */}
            <div className="space-y-3 pt-2 max-w-xl">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Cetak Voucher Fisik &amp; Cashback</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Potongan harga langsung saat cetak voucher fisik untuk pelanggan konter, toko, atau warung Anda.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Kode Promo &amp; Bagi Hasil Digital</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Bagikan kode promo unik via WhatsApp, pembeli dapat diskon dan Anda peroleh komisi otomatis.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Top-Up &amp; Mutasi Saldo Otomatis</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Pantau saldo deposit, mutasi transaksi, dan rekap keuntungan harian langsung dari smartphone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Footer Info */}
          <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} {tenantLegalName || `PT. ${tenantName} Data Nusantara`}. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Akses Kemitraan Terverifikasi</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT SIDE: DEDICATED AGENT AUTH FORM
           ======================================================== */}
        <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white relative min-h-screen">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {tenantLogo ? (
                <img src={tenantLogo} alt="Logo" className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight uppercase">{tenantName}</h3>
                <p className="text-[11px] text-slate-500 font-mono">PORTAL MITRA AGEN</p>
              </div>
            </div>
          </div>

          {/* Centered Form Container */}
          <div className="max-w-md w-full mx-auto my-auto py-4">
            {/* Form Title */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Portal Kemitraan Agen {tenantName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
                Masukkan email dan kata sandi akun agen Anda untuk membuka dashboard penjualan dan saldo voucher.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-in fade-in">
                <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  !
                </div>
                <div>
                  <p className="font-bold text-rose-900">Gagal Masuk</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Email Terdaftar Agen</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">Email / ID Agen</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dynamicPlaceholder}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-10 pr-4 py-3 text-sm font-sans outline-none focus:bg-white focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 transition shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                    <span>Kata Sandi Agen</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">PIN / Kata Sandi</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun agen"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-10 pr-11 py-3 text-sm font-sans outline-none focus:bg-white focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4" />
                    <span>MASUK KE DASHBOARD AGEN</span>
                  </>
                )}
              </button>
            </form>

            {/* Info Pendaftaran Agen Baru */}
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">Belum Terdaftar sebagai Mitra Agen?</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">
                    Daftar mandiri secara online dan dapatkan komisi penjualan voucher WiFi, Passpoint, serta loket pembayaran resmi {tenantName}.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Link
                    href="/agent/register"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Daftar Jadi Mitra Agen Baru
                  </Link>
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Halo Admin ${tenantName}, saya tertarik mendaftar jadi Mitra Agen Voucher Hotspot.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-emerald-600 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Tanya CS via WA
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-slate-100 mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Pertanyaan seputar kemitraan agen?</span>
              <span className="text-slate-600 font-medium">Hubungi Tim Operasional {tenantName}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
