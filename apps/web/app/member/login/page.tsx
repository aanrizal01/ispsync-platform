"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "../context";
import Link from "next/link";
import {
  Mail,
  Lock,
  ArrowRight,
  Activity,
  CheckCircle2,
  Globe,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useMember();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.push("/member/dashboard");
      } else {
        setError(result.error || "Autentikasi gagal. Silakan periksa kembali email & password Anda.");
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat masuk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left Column: Modern Minimalist Login Form ───────────────── */}
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
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors hidden sm:block"
          >
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* Center: Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome Back to ISPSYNC
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Sign in to manage your carrier-grade network, billing &amp; RADIUS operations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <a
                  href="https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20lupa%20password%20Member%20Portal"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot Password?
                </a>
              </div>
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
              <span>{loading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Belum punya akun SaaS?{" "}
              <Link
                href="/member/register"
                className="text-blue-600 font-bold hover:underline"
              >
                Daftar Akun Baru (Free Trial 14 Hari)
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 pt-6">
          <span>&copy; {new Date().getFullYear()} ISPSYNC Platform &mdash; PT. Inovasi Sistem Pintar. All rights reserved.</span>
          <Link href="/" className="hover:text-slate-600 sm:hidden">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* ── Right Column: Dark Telemetry & Network Operations Panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-slate-950 text-white flex-col justify-between p-12 lg:p-16 relative overflow-hidden border-l border-slate-900">
        {/* Glow ambient background */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Status */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-400 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Global Network Status: Active</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Carrier SLA 99.98%</span>
        </div>

        {/* Center: Live Telemetry Cards (Matches Mockup #1) */}
        <div className="relative z-10 my-auto py-8 space-y-5">
          {/* Card 1 & 2 Grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Network Traffic Card (3 cols) */}
            <div className="col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-bold text-slate-200">Network Traffic (Gbps)</div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Real-time • 248.5 Gbps Peak</span>
                  </div>
                </div>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>

              {/* Simulated traffic wave graph */}
              <div className="h-24 w-full flex items-end gap-1.5 pt-4">
                {[45, 60, 40, 75, 55, 90, 65, 80, 70, 95, 85, 100, 78, 92, 88].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${h}%` }}
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/40 via-cyan-500/70 to-cyan-400 transition-all duration-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800/60">
                <span>08:00</span>
                <span>10:00</span>
                <span>12:00</span>
                <span>14:00</span>
                <span>Live</span>
              </div>
            </div>

            {/* Server Uptime Card (2 cols) */}
            <div className="col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Server Uptime</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="my-auto py-2 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 text-center mx-auto my-1">
                  <span className="text-base font-black text-white font-mono">99.98%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Global Core POPs</div>
              </div>

              <div className="text-[10px] text-emerald-400 font-medium text-center bg-emerald-950/40 py-1 rounded-lg border border-emerald-900/40">
                All 7 Regions Active
              </div>
            </div>
          </div>

          {/* Card 3: Connected Nodes & Carrier Infrastructure */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  Telecom Backbone &amp; Connected Nodes
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                Connected Nodes: 1,480
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400">Active BGP Sessions</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">38 Peers</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400">RADIUS AAA Throughput</div>
                <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">14,200 req/s</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400">Automated Billing</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">Zero Lag</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="relative z-10 pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Carrier-Grade Triple-Engine Architecture</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Failover Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
