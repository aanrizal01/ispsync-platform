"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck, Zap, AlertCircle } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Tautan reset tidak valid. Pastikan Anda membuka tautan langsung dari email.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Kata sandi tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "Kata sandi berhasil diatur ulang.");
        setTimeout(() => {
          router.push("/member/login");
        }, 3000);
      } else {
        setError(data.error || "Gagal mengatur ulang kata sandi.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left Column: Form ───────────────── */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Top: Brand Logo */}
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
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors hidden sm:block"
          >
            ← Kembali ke Login
          </Link>
        </div>

        {/* Center: Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Reset Password
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Masukkan kata sandi baru untuk akun Anda.
            </p>
          </div>

          {!token ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <span>{error || "Token tidak ditemukan."}</span>
            </div>
          ) : !message ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? "Menyimpan..." : "Simpan Password Baru"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-700 flex flex-col items-center gap-3 text-center">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
              <span>{message}</span>
              <p className="text-xs text-emerald-600/80">Mengarahkan ke halaman login...</p>
            </div>
          )}
        </div>

        {/* Bottom copyright */}
        <div className="text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 pt-6">
          <span>&copy; {new Date().getFullYear()} ISPSYNC Platform &mdash; PT. Inovasi Sistem Pintar. All rights reserved.</span>
          <Link href="/member/login" className="hover:text-slate-600 sm:hidden">
            ← Kembali ke Login
          </Link>
        </div>
      </div>

      {/* ── Right Column: Dark Panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-slate-950 text-white flex-col justify-between p-12 lg:p-16 relative overflow-hidden border-l border-slate-900">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-400 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Secure Password Recovery</span>
          </div>
        </div>
        
        <div className="relative z-10 my-auto py-8">
           <h2 className="text-2xl font-bold tracking-tight text-white">Buat Sandi Kuat</h2>
           <p className="text-slate-400 mt-2 max-w-sm text-sm">
             Pastikan Anda menggunakan kata sandi yang kuat dan unik untuk menjaga keamanan infrastruktur ISP dan data pelanggan Anda.
           </p>
        </div>

        <div className="relative z-10 pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>SHA-256 Hashing Encryption</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Updated Instantly</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Memuat...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
