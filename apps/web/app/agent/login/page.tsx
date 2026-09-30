"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { type ApiError } from "@/lib/api/client";
import {
  Store,
  Sparkles,
  TrendingUp,
  Wallet,
  Percent,
  Smartphone,
  CheckCircle2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";

export default function AgentLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // AuthContext will automatically redirect to /agent/dashboard for agent roles
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Email atau kata sandi agen tidak cocok. Silakan periksa kembali.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ========================================================
          LEFT SIDE: PROMO & ADS BANNER KEMITRAAN AGEN
         ======================================================== */}
      <div className="lg:w-7/12 xl:w-2/3 relative flex flex-col justify-between p-8 sm:p-12 lg:p-14 bg-linear-to-br from-slate-950 via-slate-900 to-amber-950/40 text-white overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Glow ambient background */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-xl shadow-black/40 ring-1 ring-white/20 shrink-0">
              <img src="/logo.png" alt="ISPSYNC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white">ISPSYNC</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PARTNER PROGRAM
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 tracking-wider">
                Sistem Kemitraan Agen Resmi Voucher Hotspot WiFi
              </p>
            </div>
          </div>
          <Link
            href="/hotspot/buy"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-blue-400 border border-slate-700 hover:border-blue-500/50 transition-colors shadow-xs"
          >
            <span>🛒 Beli Voucher Online</span>
          </Link>
        </div>

        {/* Middle: Promotional Ad Content */}
        <div className="relative z-10 my-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            Peluang Cuan Tambahan untuk Konter Pulsa, Toko &amp; Warung
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Jadi Mitra Agen WiFi Hotspot,{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 via-orange-400 to-yellow-300">
                Untung Tiap Hari!
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Dapatkan komisi penjualan voucher internet tanpa modal besar. Kelola penjualan langsung lewat HP dengan sistem serba otomatis!
            </p>
          </div>

          {/* 3 Keuntungan Agen (Ad Highlight Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-md hover:border-amber-500/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Cetak Offline</div>
                <div className="text-lg font-black text-white">Cashback 15%</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Saldo terpotong harga bersih saat cetak voucher fisik di konter Anda.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/20 backdrop-blur-md hover:border-blue-500/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Promo Harian</div>
                <div className="text-lg font-black text-white">Komisi 10%</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Bagikan kode promo 6 digit, pembeli dapat diskon 10%, Anda dapat komisi 10%!
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-md hover:border-emerald-500/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Serba Praktis</div>
                <div className="text-lg font-black text-white">Cukup dari HP</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Top-up saldo transfer bank, cek mutasi, dan salin kode promo langsung dari HP.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial / Profit Simulation Badge */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-4 text-xs">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-slate-200">
              <span className="font-bold text-amber-300 block text-sm">Simulasi Keuntungan Agen:</span>
              Jual 30 voucher/hari seharga Rp 10.000 dengan cashback 15% = Potensi laba bersih <span className="text-amber-400 font-bold">Rp 1.350.000 / bulan</span> tanpa resiko basi!
            </div>
          </div>
        </div>

        {/* Bottom: Footer Info */}
        <div className="relative z-10 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} PT ISPSYNC TEKNOLOGI NUSANTARA • Program Kemitraan WiFi Hotspot</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Sistem Resmi Terverifikasi
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT SIDE: DEDICATED AGENT LOGIN FORM
         ======================================================== */}
      <div className="lg:w-5/12 xl:w-1/3 flex flex-col justify-center px-6 py-10 sm:px-12 bg-white text-slate-900 shadow-2xl">
        <div className="max-w-md w-full mx-auto space-y-7">
          {/* Header Form */}
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
              <Store className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Portal Mitra Agen
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Masuk dengan email dan password akun agen Anda untuk membuka dashboard penjualan dan saldo voucher.
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-in fade-in">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Terdaftar Agen
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama.agen@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
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
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard Agen</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Info Bantuan / Daftar Baru */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Belum Terdaftar sebagai Mitra Agen?</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pendaftaran agen dilakukan oleh Administrator ISPSYNC. Silakan hubungi tim kami untuk pengajuan kemitraan &amp; pengisian saldo perdana.
              </p>
              <div className="pt-2">
                <a
                  href="https://wa.me/628110000000?text=Halo%20Admin%20ISPSYNC%2C%20saya%20tertarik%20mendaftar%20jadi%20Mitra%20Agen%20Voucher%20Hotspot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Hubungi CS Kemitraan via WhatsApp
                </a>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 pt-1">
              Ingin membeli voucher WiFi?{" "}
              <Link href="/hotspot/buy" className="text-blue-600 hover:underline font-bold">
                Beli Voucher Online Disini →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
