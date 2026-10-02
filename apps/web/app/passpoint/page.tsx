"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  Apple,
  Smartphone,
  Laptop,
  ShieldCheck,
  Download,
  CheckCircle2,
  Info,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
  X,
  Clock,
  Zap,
} from "lucide-react";
import {
  passpointApi,
  PasspointCredential,
  PasspointPackage,
  PasspointPurchaseResponse,
  PasspointRenewResponse,
  PasspointCheckRenewResponse,
} from "@/lib/api/passpoint";
import { formatRupiah } from "@/lib/utils";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

export default function PasspointOnboardingPage() {
  const [pageMode, setPageMode] = useState<"BUY" | "LOOKUP">("BUY");

  // Dynamic tenant state
  const [tenantSlug, setTenantSlug] = useState("ispku");
  const [tenantName, setTenantName] = useState("ISPKU");
  const [tenantLegalName, setTenantLegalName] = useState("PT. ISP Kita Nusantara");
  const [tenantLogo, setTenantLogo] = useState("/web/ispku_logo.svg");

  // Lookup state
  const [credentialId, setCredentialId] = useState("");
  const [credential, setCredential] = useState<PasspointCredential | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"apple" | "android" | "manual">("apple");

  // Buy state
  const [packages, setPackages] = useState<PasspointPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PasspointPackage | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [buyStep, setBuyStep] = useState<"SELECT" | "PAY" | "DONE">("SELECT");
  const [order, setOrder] = useState<PasspointPurchaseResponse | null>(null);

  // Renewal state
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewPkg, setRenewPkg] = useState<PasspointPackage | null>(null);
  const [renewOrder, setRenewOrder] = useState<PasspointRenewResponse | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<PasspointCheckRenewResponse | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname.toLowerCase();
      const parts = h.split(".");
      let detectedSlug = "";

      if (parts.length >= 4 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length === 3 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot")) {
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
        document.title = `Passpoint Wi-Fi | ${upper} Hotspot 2.0`;
      } else {
        document.title = "Akses WiFi Otomatis Passpoint | ISPSYNC";
      }

      const iconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (iconEl && detectedSlug) {
        iconEl.href = `/web/${detectedSlug}_favicon.svg`;
      }
    }
  }, []);

  useEffect(() => {
    async function loadPackages() {
      try {
        const pkgs = await passpointApi.getPackages();
        setPackages(pkgs);
        if (pkgs.length > 0) {
          const popular = pkgs.find((p) => p.is_popular) || pkgs[0];
          setSelectedPkg(popular);
        }
      } catch (err) {
        // Fallback default
        setPackages([
          {
            id: "pkg-passpoint-7d",
            name: "Passpoint Mingguan 7 Hari",
            description: "Akses otomatis roaming WiFi berkecepatan tinggi selama 1 minggu penuh",
            duration_days: 7,
            price: 25000,
            speed_limit: "15 Mbps Unlimited",
            is_popular: false,
          },
          {
            id: "pkg-passpoint-30d",
            name: "Passpoint Bulanan 30 Hari",
            description: "Paket favorit koneksi otomatis tanpa ribet untuk pekerja & mahasiswa",
            duration_days: 30,
            price: 50000,
            speed_limit: "25 Mbps Unlimited",
            is_popular: true,
          },
          {
            id: "pkg-passpoint-90d",
            name: "Passpoint Seasonal 90 Hari",
            description: "Roaming 3 bulan hemat tanpa batas di seluruh jaringan ISP",
            duration_days: 90,
            price: 120000,
            speed_limit: "35 Mbps Unlimited",
            is_popular: false,
          },
        ]);
      }
    }
    loadPackages();
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialId.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await passpointApi.getCredential(credentialId.trim());
      setCredential(res);
    } catch (err: any) {
      setError(err.message || "Kredensial Passpoint tidak ditemukan atau tidak valid");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !customerName.trim() || !phone.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await passpointApi.purchase({
        package_id: selectedPkg.id,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        payment_method: "QRIS",
      });
      setOrder(res);
      setBuyStep("PAY");
    } catch (err: any) {
      setError(err.message || "Gagal memproses pesanan Passpoint");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    setLoading(true);
    setError(null);
    try {
      const res = await passpointApi.checkPurchase({
        order_id: order.order_id,
        simulate_pay: true,
      });

      // Inject into credential state
      setCredential({
        id: res.credential_id,
        customer_id: "00000000-0000-0000-0000-000000000000",
        customer_name: customerName,
        profile_id: "00000000-0000-0000-0000-000000000001",
        profile_name: `${tenantName} Passpoint Wi-Fi`,
        username: res.username,
        password: res.password,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setBuyStep("DONE");
    } catch (err: any) {
      setError(err.message || "Gagal memverifikasi pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubmit = async () => {
    if (!credential || !renewPkg) return;
    setRenewLoading(true);
    setError(null);
    try {
      const res = await passpointApi.renew({
        credential_id: credential.id,
        package_id: renewPkg.id,
        payment_method: "QRIS",
      });
      setRenewOrder(res);
    } catch (err: any) {
      setError(err.message || "Gagal memproses tagihan perpanjangan profil");
    } finally {
      setRenewLoading(false);
    }
  };

  const handleConfirmRenewPayment = async () => {
    if (!renewOrder) return;
    setRenewLoading(true);
    setError(null);
    try {
      const res = await passpointApi.checkRenew({
        order_id: renewOrder.order_id,
        simulate_pay: true,
      });
      setRenewSuccess(res);
      setRenewOrder(null);
      setIsRenewOpen(false);
      if (credential) {
        setCredential({
          ...credential,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message || "Gagal memverifikasi pembayaran perpanjangan");
    } finally {
      setRenewLoading(false);
    }
  };

  const downloadUrl = credential ? passpointApi.getAppleProfileUrl(credential.id) : "#";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-20">
      {/* ========================================================
          HERO HEADER: Linear Telco Dark Brand Banner
         ======================================================== */}
      <header className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 overflow-hidden">
        {/* Ambient Radial Glows (Aurora Effect) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-4">
          {/* Top Brand & Badge */}
          <div className="flex items-center justify-center gap-3">
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt="Logo"
                className="h-10 w-auto brightness-0 invert object-contain"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-white/20 shrink-0">
                <Wifi className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white uppercase">{tenantName}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  WIFI PASSPOINT HS2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Next-Gen Seamless Wi-Fi Roaming • {tenantName}
              </p>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] pt-2">
            Koneksi Otomatis{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
              Tanpa Captive Portal.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Internet cepat terenkripsi standar industri WPA2/WPA3 Enterprise (EAP-TTLS).
            Sekali pasang profil, iPhone, iPad, Mac, dan Android Anda langsung tersambung otomatis saat berada di jangkauan hotspot {tenantName}.
          </p>
        </div>
      </header>

      {/* ========================================================
          MAIN INTERACTION CONTAINER
         ======================================================== */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 space-y-6">
        {/* Mode Selector Tabs */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setPageMode("BUY")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              pageMode === "BUY"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white shadow-md shadow-cyan-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Beli Akses Passpoint Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setPageMode("LOOKUP")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              pageMode === "LOOKUP"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white shadow-md shadow-cyan-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Pasang Ulang Profil (Sudah Ada ID)</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
            <Info className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ── MODE A: Beli Akses Baru ─────────────────────────── */}
        {pageMode === "BUY" && (
          <div className="space-y-6">
            {buyStep === "SELECT" && (
              <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <ShoppingBag className="w-5 h-5 text-cyan-400" />
                    <span>Langkah 1: Pilih Paket Langganan Passpoint</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Pilih paket roaming otomatis yang sesuai. Berlaku di seluruh jaringan WiFi Hotspot Passpoint {tenantName}.
                  </p>
                </div>

                {/* Package Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {packages.map((pkg) => {
                    const isSelected = selectedPkg?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`relative rounded-2xl p-5 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-cyan-500 bg-slate-800/90 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                            : "border-slate-800 hover:border-slate-700 bg-slate-900/50"
                        }`}
                      >
                        {pkg.is_popular && (
                          <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs">
                            Paling Laris
                          </span>
                        )}
                        <div>
                          <h3 className="font-extrabold text-base text-white mb-1">{pkg.name}</h3>
                          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono mb-2">
                            {formatRupiah(pkg.price)}
                          </div>
                          <p className="text-xs text-slate-400 mb-3">{pkg.description}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                          <span className="text-cyan-400">{pkg.speed_limit}</span>
                          <span className="text-slate-400 font-mono font-bold">{pkg.duration_days} Hari</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Buyer Form */}
                <form onSubmit={handleCreateOrder} className="space-y-4 pt-6 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Nama Lengkap Anda *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm font-sans outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Nomor WhatsApp Aktif *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm font-sans outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedPkg}
                    className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    <span>Lanjut ke Pembayaran QRIS ({selectedPkg ? formatRupiah(selectedPkg.price) : ""})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Sub-step 2: QRIS Payment Display */}
            {buyStep === "PAY" && order && (
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center space-y-6">
                <div>
                  <h2 className="text-xl font-black text-white">Selesaikan Pembayaran QRIS</h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Scan kode QRIS di bawah menggunakan m-Banking atau aplikasi e-wallet apa pun.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 inline-block max-w-sm w-full">
                  <p className="text-xs text-slate-400 mb-1">Total Pembayaran Passpoint:</p>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
                    {formatRupiah(order.amount)}
                  </p>
                  <p className="text-xs font-semibold text-slate-300 mt-1">{order.package_name}</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border-2 border-slate-700 inline-block">
                  <img
                    src={order.qr_image_url}
                    alt="QRIS Passpoint"
                    className="w-56 h-56 object-contain rounded-lg mx-auto"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Order: {order.order_id}</p>
                </div>

                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, DANA, LinkAja, dsb.
                </p>

                <div className="max-w-md mx-auto pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirmPayment}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? "Memverifikasi..." : "SAYA SUDAH MEMBAYAR / CEK STATUS"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyStep("SELECT")}
                    className="mt-3 text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    &larr; Batalkan atau ganti paket
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODE B: Lookup ID yang Sudah Ada ─────────────────── */}
        {pageMode === "LOOKUP" && (
          <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5 mb-2">
              <Wifi className="w-5 h-5 text-cyan-400" />
              <span>Masukkan ID Kredensial Passpoint Anda</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              ID kredensial didapatkan melalui notifikasi WhatsApp pendaftaran pelanggan atau riwayat pembelian paket Passpoint {tenantName}.
            </p>

            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Contoh: 123e4567-e89b-12d3-a456-426614174000"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {loading ? "Memeriksa..." : "CARI PROFIL"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ── HASIL KREDENSIAL & PANDUAN INSTALASI PERANGKAT ───── */}
        {credential && (
          <div className="space-y-6 mt-6">
            {/* Status Card */}
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-cyan-500/40 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="font-extrabold text-white text-base">Profil Passpoint Aktif &amp; Siap Dipasang</span>
                </div>
                <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  {credential.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-xs">Nama Pemilik:</span>
                  <span className="font-bold text-white">{credential.customer_name || customerName || "Pelanggan Passpoint"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-xs">Identitas EAP (Username):</span>
                  <span className="font-mono font-bold text-cyan-400">{credential.username}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-xs">ID Kredensial:</span>
                  <span className="font-mono text-[11px] text-slate-300 truncate block">{credential.id}</span>
                </div>
              </div>

              {/* Renewal Action Bar */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-slate-200">Masa aktif hampir habis?</span> Perpanjang langsung tanpa perlu ganti profil di perangkat Anda.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenewOpen(true);
                    setRenewOrder(null);
                    setRenewSuccess(null);
                    if (packages.length > 0 && !renewPkg) {
                      setRenewPkg(packages.find((p) => p.is_popular) || packages[0]);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>PERPANJANG MASA AKTIF PROFIL</span>
                </button>
              </div>
            </div>

            {/* Success Banner if Renewed */}
            {renewSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-white shadow-md flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <div className="text-sm">
                  <p className="font-bold text-emerald-300">{renewSuccess.message}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Masa aktif baru hingga: <strong>{new Date(renewSuccess.new_expires_at).toLocaleString("id-ID")}</strong>. Profil WiFi di smartphone/laptop Anda tetap sama dan otomatis aktif kembali!
                  </p>
                </div>
              </div>
            )}

            {/* Device Installation Guide */}
            <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5 mb-4">
                <Download className="w-5 h-5 text-cyan-400" />
                <span>Langkah 2: Pilih Jenis Perangkat &amp; Pasang Profil</span>
              </h2>

              {/* OS Selector Tabs */}
              <div className="flex border-b border-slate-800 mb-6 gap-2 sm:gap-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("apple")}
                  className={`pb-3 px-2 font-semibold text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
                    activeTab === "apple"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Apple className="w-4 h-4" />
                  Apple (iPhone / iPad / Mac)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("android")}
                  className={`pb-3 px-2 font-semibold text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
                    activeTab === "android"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Android (Hotspot 2.0)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`pb-3 px-2 font-semibold text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
                    activeTab === "manual"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  Windows &amp; Manual
                </button>
              </div>

              {/* Tab Apple */}
              {activeTab === "apple" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-white text-base mb-1">
                        Unduh Profil Apple Langsung (.mobileconfig)
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md">
                        Konfigurasi otomatis jaringan Passpoint {tenantName} untuk perangkat iPhone, iPad, dan Mac.
                      </p>
                    </div>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 shrink-0 text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      UNDUH PROFIL APPLE
                    </a>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-200 text-sm">Petunjuk Instalasi di iPhone / iPad:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                      <li>Buka halaman ini menggunakan browser <strong>Safari</strong> di iPhone atau iPad Anda.</li>
                      <li>Klik tombol <strong>Unduh Profil Apple</strong> di atas, lalu pilih <strong>Allow (Izinkan)</strong>.</li>
                      <li>Buka aplikasi <strong>Settings (Pengaturan)</strong> di iPhone Anda.</li>
                      <li>Pilih menu <strong>Profile Downloaded (Profil Diunduh)</strong> di bagian paling atas.</li>
                      <li>Klik <strong>Install</strong> di pojok kanan atas, masukkan Passcode HP Anda, lalu konfirmasi.</li>
                      <li>Selesai! Perangkat Anda akan langsung otomatis terhubung ke WiFi Passpoint saat berada di area jangkauan {tenantName}.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab Android */}
              {activeTab === "android" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <strong>Petunjuk Android:</strong> Masuk ke <strong>Pengaturan Wi-Fi</strong> &gt; Pilih jaringan <strong>{tenantName} Passpoint</strong> (Hotspot 2.0) &gt; Masukkan konfigurasi EAP di bawah ini.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs">Metode EAP:</span>
                      <span className="font-bold text-white font-mono">TTLS</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs">Otentikasi Tahap 2:</span>
                      <span className="font-bold text-white font-mono">MSCHAPV2</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs">Identitas (Username):</span>
                      <span className="font-mono font-bold text-cyan-400">{credential.username}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs">Kata Sandi (Password):</span>
                      <span className="font-mono font-bold text-white">{credential.password || "••••••••"}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs">Domain / Realm:</span>
                      <span className="font-bold text-white font-mono">{tenantSlug}.ispsync.id</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs">Sertifikat CA:</span>
                      <span className="font-bold text-white">Gunakan sertifikat sistem</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Manual */}
              {activeTab === "manual" && (
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                    Untuk laptop Windows atau Linux, pilih SSID Wi-Fi Enterprise, pilih metode <strong>EAP-TTLS</strong>, masukkan username <code>{credential.username}</code> dan kata sandi Anda.
                  </p>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                    <div>SSID Type: WPA2-Enterprise / WPA3-Enterprise</div>
                    <div>EAP Method: EAP-TTLS</div>
                    <div>Inner Authentication: MSCHAPv2</div>
                    <div>Identity: {credential.username}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL PERPANJANG MASA AKTIF PROFIL (RENEWAL) ───── */}
        {isRenewOpen && credential && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Perpanjang Masa Aktif Profil</h3>
                    <p className="text-xs text-slate-400 font-mono truncate max-w-[240px]">
                      User: {credential.username}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRenewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!renewOrder ? (
                /* Sub-step 1: Choose Renewal Package */
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Pilih paket perpanjangan masa aktif. Kredensial di HP/Laptop Anda <strong>tetap sama</strong> dan tidak perlu mengunduh ulang profil konfigurasi:
                  </p>

                  <div className="space-y-2.5">
                    {packages.map((pkg) => {
                      const isSel = renewPkg?.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setRenewPkg(pkg)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                            isSel
                              ? "border-cyan-500 bg-slate-800/90 shadow-md ring-1 ring-cyan-500/30"
                              : "border-slate-800 hover:border-slate-700 bg-slate-950/50"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white">{pkg.name}</span>
                              {pkg.is_popular && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                                  Paling Hemat
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {pkg.speed_limit} • Kuota Tanpa Batas ({pkg.duration_days} Hari)
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono block">
                              {formatRupiah(pkg.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold font-mono">+{pkg.duration_days} Hari</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={renewLoading || !renewPkg}
                    onClick={handleRenewSubmit}
                    className="w-full mt-4 py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-50 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Lanjut Bayar ({renewPkg ? formatRupiah(renewPkg.price) : ""})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Sub-step 2: QRIS Payment for Renewal */
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400">Nominal Pembayaran Perpanjangan:</p>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
                      {formatRupiah(renewOrder.amount)}
                    </p>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">
                      {renewOrder.package_name} (+{renewOrder.duration_days} Hari)
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border-2 border-slate-700 inline-block">
                    <img
                      src={renewOrder.qr_image_url}
                      alt="QRIS Renewal"
                      className="w-48 h-48 object-contain rounded-lg mx-auto"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">Order: {renewOrder.order_id}</p>
                  </div>

                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Scan via BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, DANA, atau aplikasi e-wallet apa pun.
                  </p>

                  <button
                    type="button"
                    disabled={renewLoading}
                    onClick={handleConfirmRenewPayment}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{renewLoading ? "Memverifikasi..." : "SAYA SUDAH BAYAR / KONFIRMASI"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewOrder(null)}
                    className="text-xs text-slate-400 hover:text-white block mx-auto transition"
                  >
                    &larr; Ganti Paket Lain
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Footer */}
        <footer className="pt-10 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
          <p>&copy; {new Date().getFullYear()} {tenantLegalName}. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Enkripsi WPA2/WPA3-Enterprise EAP-TTLS</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
