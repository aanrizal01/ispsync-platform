"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { hotspotApi } from "@/lib/api/hotspot";
import { cn } from "@/lib/utils";
import { Wifi, CreditCard, Store } from "lucide-react";

function HotspotLoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Router redirect parameters
  const clientIP = searchParams.get("ip") || "";
  const clientMAC = searchParams.get("mac") || "";
  const linkLogin = searchParams.get("link-login") || "";
  const linkOrig = searchParams.get("link-orig") || "";

  const [mode, setMode] = useState<"VOUCHER" | "MEMBER">("VOUCHER");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherPassword, setVoucherPassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Device Lock / Reset State
  const [resetState, setResetState] = useState<{
    active: boolean;
    channel: "ONLINE" | "OFFLINE";
    message: string;
    boundMAC: string;
  } | null>(null);
  const [resetKey, setResetKey] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

  const [tenantLogo, setTenantLogo] = useState("");
  const [tenantName, setTenantName] = useState("WiFi Hotspot");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.host.split('.');
      if (parts.length >= 3) {
        const tenantSlug = parts[1].toLowerCase();
        const tenantUpper = parts[1].toUpperCase();
        setTenantName(tenantUpper);
        
        const logoUrl = `/web/${tenantSlug}_logo.svg`;
        const faviconUrl = `/web/${tenantSlug}_favicon.svg`;
        setTenantLogo(logoUrl);

        document.title = `Hotspot Login | ${tenantUpper}`;

        try {
          const oldIcons = document.querySelectorAll(
            "link[rel*='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
          );
          oldIcons.forEach((el) => el.parentNode?.removeChild(el));

          const newLink = document.createElement("link");
          newLink.rel = "icon";
          newLink.type = "image/svg+xml";
          newLink.href = `${faviconUrl}?v=${Date.now()}`;
          document.head.appendChild(newLink);
        } catch (e) {
          console.error("Failed to update favicon:", e);
        }
      }
    }
  }, []);

  const submitToRouter = (u: string, p: string) => {
    if (linkLogin) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = linkLogin;

      const userInput = document.createElement("input");
      userInput.type = "hidden";
      userInput.name = "username";
      userInput.value = u;
      form.appendChild(userInput);

      const passInput = document.createElement("input");
      passInput.type = "hidden";
      passInput.name = "password";
      passInput.value = p || "";
      form.appendChild(passInput);

      if (linkOrig) {
        const dstInput = document.createElement("input");
        dstInput.type = "hidden";
        dstInput.name = "dst";
        dstInput.value = linkOrig;
        form.appendChild(dstInput);
      }

      document.body.appendChild(form);
      form.submit();
      return;
    }

    router.push(`/hotspot/status?username=${encodeURIComponent(u)}&ip=${encodeURIComponent(clientIP)}&mac=${encodeURIComponent(clientMAC)}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await hotspotApi.login({
        mode,
        code: mode === "VOUCHER" ? voucherCode.trim() : undefined,
        username: mode === "MEMBER" ? username.trim() : undefined,
        password: mode === "VOUCHER" ? voucherPassword : password,
        client_ip: clientIP,
        client_mac: clientMAC,
      });

      if (res.require_reset) {
        setResetState({
          active: true,
          channel: res.channel || "OFFLINE",
          message: res.message,
          boundMAC: res.bound_mac || "",
        });
        return;
      }

      if (res.success) {
        submitToRouter(res.username, res.password || voucherPassword);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Otentikasi gagal. Periksa kembali kredensial Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetKey.trim()) {
      setResetError("Harap masukkan data verifikasi untuk reset");
      return;
    }
    setResetError(null);
    setResetLoading(true);

    try {
      const res = await hotspotApi.resetDevice({
        code: voucherCode.trim(),
        reset_key: resetKey.trim(),
        client_mac: clientMAC,
        client_ip: clientIP,
      });

      if (res.success) {
        setResetState(null);
        submitToRouter(res.username, res.password || voucherPassword);
      } else {
        setResetError(res.message || "Gagal mereset perangkat");
      }
    } catch (err: any) {
      setResetError(err.message || "Gagal mereset perangkat. Periksa kembali input Anda.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mx-auto mb-4">
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt="Logo"
                className="h-10 w-auto"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
                <Wifi className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            WiFi Hotspot {tenantName}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Selamat datang! Masukkan voucher atau login akun untuk terhubung ke internet.
          </p>
        </div>

        {resetState?.active ? (
          <form onSubmit={handleResetDevice} className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-2 mb-2 font-bold text-sm text-amber-800">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Perangkat Baru Terdeteksi</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                {resetState.message}
              </p>
              {resetState.boundMAC && (
                <div className="mt-2 text-[10px] text-amber-600/80 font-mono">
                  MAC Terdaftar: {resetState.boundMAC}
                </div>
              )}
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{resetError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {resetState.channel === "ONLINE"
                  ? "Nomor WhatsApp Pembelian / Order ID *"
                  : "Serial Number (SN) Voucher *"}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={
                  resetState.channel === "ONLINE"
                    ? "Contoh: 08123456789 atau ORD-xxx"
                    : "Contoh: SN-82910..."
                }
                value={resetKey}
                onChange={(e) => setResetKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-amber-300 bg-amber-50/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                {resetState.channel === "ONLINE"
                  ? "Masukkan nomor WhatsApp pembelian atau kode Order ID untuk memindahkan voucher ke perangkat ini."
                  : "Lihat Serial Number (SN) yang tercetak pada kartu fisik / barcode voucher Anda."}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/25 disabled:bg-amber-400"
              >
                {resetLoading ? "Mereset Perangkat..." : "🔓 Reset Kuncian & Hubungkan"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetState(null);
                  setResetError(null);
                  setResetKey("");
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
              >
                Kembali ke Login Voucher
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("VOUCHER");
                  setErrorMessage(null);
                }}
                className={cn(
                  "py-2.5 rounded-lg transition-all",
                  mode === "VOUCHER" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                VOUCHER HOTSPOT
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("MEMBER");
                  setErrorMessage(null);
                }}
                className={cn(
                  "py-2.5 rounded-lg transition-all",
                  mode === "MEMBER" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                AKUN MEMBER
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {mode === "VOUCHER" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Kode Voucher (12 Digit Angka) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    placeholder="Masukkan 12 digit kode voucher"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.trim())}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 font-mono text-center text-xl font-black tracking-wider text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-1.5">
                    Cukup masukkan kode voucher saja untuk langsung terhubung
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="username pelanggan"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/25 disabled:bg-blue-400 mt-2"
              >
                {loading ? "Menghubungkan..." : "TERHUBUNG SEKARANG"}
              </button>
            </form>
          </>
        )}

        {/* Online Purchase & Agent Shortcut */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-center">
          <p className="text-xs text-slate-500 mb-2">Belum memiliki kode voucher?</p>
          <button
            type="button"
            onClick={() => {
              router.push(`/hotspot/buy?ip=${encodeURIComponent(clientIP)}&mac=${encodeURIComponent(clientMAC)}&link-login=${encodeURIComponent(linkLogin)}&link-orig=${encodeURIComponent(linkOrig)}`);
            }}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>🛒</span>
            <span>Beli Voucher Online (QRIS / e-Wallet)</span>
          </button>
          <Link
            href="/agent/login"
            className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <span>🏪</span>
            <span>Portal Kemitraan &amp; Login Agen</span>
          </Link>
        </div>

        {/* Device Information footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-mono space-y-0.5">
          {clientIP && <div>IP Anda: {clientIP}</div>}
          {clientMAC && <div>MAC: {clientMAC}</div>}
        </div>
      </div>
    </div>
  );
}

export default function HotspotLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Memuat Portal...</div>}>
      <HotspotLoginForm />
    </Suspense>
  );
}
