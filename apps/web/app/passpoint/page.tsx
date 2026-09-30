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
  QrCode,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  X,
  Clock,
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

export default function PasspointOnboardingPage() {
  const [pageMode, setPageMode] = useState<"BUY" | "LOOKUP">("BUY");

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
        profile_name: "GOGIGA Passpoint WiFi",
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
      // Refresh credential status to ACTIVE
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-4">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Next-Gen Hotspot 2.0 / Passpoint Wi-Fi
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
            Koneksi Otomatis Tanpa Captive Portal
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto">
            Nikmati akses internet berkecepatan tinggi dengan enkripsi WPA2/WPA3 Enterprise (EAP-TTLS).
            Sekali pasang profil, perangkat Anda langsung terhubung otomatis di seluruh area jangkauan kami.
          </p>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8">
        {/* Mode Selector Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setPageMode("BUY")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              pageMode === "BUY"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Beli Akses Passpoint Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setPageMode("LOOKUP")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              pageMode === "LOOKUP"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Pasang Ulang Profil (Sudah Punya ID)</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <Info className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── MODE A: Beli Akses Baru ─────────────────────────── */}
        {pageMode === "BUY" && (
          <div className="space-y-6">
            {buyStep === "SELECT" && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  Langkah 1: Pilih Paket Langganan Passpoint
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mb-6">
                  Pilih paket roaming otomatis yang sesuai. Berlaku di seluruh jaringan WiFi Passpoint ISP kami.
                </p>

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
                            ? "border-blue-600 bg-blue-50/40 shadow-md"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        {pkg.is_popular && (
                          <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider shadow-xs">
                            Paling Laris
                          </span>
                        )}
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900 mb-1">{pkg.name}</h3>
                          <div className="text-2xl font-black text-blue-600 mb-2">
                            {formatRupiah(pkg.price)}
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{pkg.description}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>{pkg.speed_limit}</span>
                          <span className="text-blue-600 font-bold">{pkg.duration_days} Hari</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Buyer Form */}
                <form onSubmit={handleCreateOrder} className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Nama Lengkap Anda *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Budi Santoso"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Nomor WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 08123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedPkg}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                  >
                    <span>Lanjut Pembayaran ({selectedPkg ? formatRupiah(selectedPkg.price) : ""})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Step QRIS Payment */}
            {buyStep === "PAY" && order && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Total Pembayaran Passpoint:</p>
                  <p className="text-3xl font-black text-slate-900">{formatRupiah(order.amount)}</p>
                  <p className="text-xs font-medium text-blue-600 mt-1">{order.package_name}</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 inline-block">
                  <img
                    src={order.qr_image_url}
                    alt="QRIS Passpoint"
                    className="w-56 h-56 object-contain rounded-lg mx-auto"
                  />
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">Order: {order.order_id}</p>
                </div>

                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Scan kode QR di atas menggunakan aplikasi <strong>BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay</strong>.
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmPayment}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{loading ? "Memverifikasi..." : "SAYA SUDAH BAYAR / VERIFIKASI SEKARANG"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBuyStep("SELECT")}
                  className="text-xs text-slate-400 hover:text-slate-600 pt-2 block mx-auto"
                >
                  ← Batalkan atau ganti paket
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MODE B: Lookup ID yang Sudah Ada ─────────────────── */}
        {pageMode === "LOOKUP" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-blue-600" />
              Masukkan ID Kredensial Passpoint Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              ID kredensial didapatkan melalui SMS/WhatsApp notifikasi pendaftaran pelanggan atau riwayat pembelian.
            </p>

            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Contoh: 123e4567-e89b-12d3-a456-426614174000"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? "Memeriksa..." : "Cari Profil"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ── HASIL KREDENSIAL & PANDUAN INSTALASI PERANGKAT ───── */}
        {credential && (
          <div className="space-y-6 mt-6">
            {/* Status Card */}
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="font-extrabold text-slate-900 text-base">Profil Passpoint Aktif & Siap Dipasang</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 uppercase">
                  {credential.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block">Nama Pemilik:</span>
                  <span className="font-bold text-slate-800">{credential.customer_name || customerName || "Pelanggan Passpoint"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Identitas EAP (Username):</span>
                  <span className="font-mono font-bold text-slate-800">{credential.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ID Kredensial:</span>
                  <span className="font-mono text-[11px] text-slate-600 truncate block">{credential.id}</span>
                </div>
              </div>

              {/* Renewal Action Bar */}
              <div className="mt-4 pt-3 border-t border-emerald-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-emerald-800">
                  <span className="font-bold">Masa aktif hampir habis atau ingin menambah kuota?</span> Perpanjang langsung tanpa perlu ganti profil di perangkat Anda.
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
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ Perpanjang Masa Aktif Profil Ini</span>
                </button>
              </div>
            </div>

            {/* Success Banner if Renewed */}
            {renewSuccess && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">{renewSuccess.message}</p>
                  <p className="text-xs text-teal-100 mt-1">
                    Masa aktif baru hingga: <strong>{new Date(renewSuccess.new_expires_at).toLocaleString("id-ID")}</strong>. Profil WiFi di smartphone/laptop Anda tetap sama dan otomatis aktif kembali!
                  </p>
                </div>
              </div>
            )}

            {/* Device Installation Guide */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-blue-600" />
                Langkah 2: Pilih Jenis Perangkat & Pasang Profil
              </h2>

              {/* OS Selector Tabs */}
              <div className="flex border-b border-slate-200 mb-6 gap-2 sm:gap-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("apple")}
                  className={`pb-3 px-2 font-semibold text-sm flex items-center gap-2 border-b-2 transition shrink-0 ${
                    activeTab === "apple"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Apple className="w-4 h-4" />
                  Apple (iPhone / iPad / Mac)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("android")}
                  className={`pb-3 px-2 font-semibold text-sm flex items-center gap-2 border-b-2 transition shrink-0 ${
                    activeTab === "android"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Android (Hotspot 2.0)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`pb-3 px-2 font-semibold text-sm flex items-center gap-2 border-b-2 transition shrink-0 ${
                    activeTab === "manual"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  Windows & Manual
                </button>
              </div>

              {/* Tab Apple */}
              {activeTab === "apple" && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base mb-1">
                        Unduh Profil Apple Langsung (.mobileconfig)
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md">
                        Konfigurasi otomatis jaringan Passpoint untuk perangkat iPhone, iPad, dan Mac.
                      </p>
                    </div>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center gap-2 shrink-0 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Profil Apple
                    </a>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">Petunjuk Instalasi di iPhone / iPad:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      <li>Buka halaman ini menggunakan <strong>Safari</strong> di iPhone atau iPad Anda.</li>
                      <li>Klik tombol <strong>Unduh Profil Apple</strong> di atas, lalu pilih <strong>Allow (Izinkan)</strong>.</li>
                      <li>Buka aplikasi <strong>Settings (Pengaturan)</strong> di iPhone Anda.</li>
                      <li>Pilih menu <strong>Profile Downloaded (Profil Diunduh)</strong> di bagian atas.</li>
                      <li>Klik <strong>Install</strong> di pojok kanan atas, masukkan Passcode HP Anda, lalu konfirmasi.</li>
                      <li>Selesai! Perangkat Anda akan langsung otomatis terhubung ke WiFi Passpoint saat berada di area jangkauan.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab Android */}
              {activeTab === "android" && (
                <div className="space-y-5">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <strong>Catatan Android:</strong> Masuk ke <strong>Pengaturan Wi-Fi</strong> &gt; Pilih jaringan Passpoint / Hotspot 2.0 kami &gt; Masukkan konfigurasi EAP di bawah ini.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-xs">Metode EAP:</span>
                      <span className="font-bold text-slate-900">TTLS</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-xs">Otentikasi Tahap 2:</span>
                      <span className="font-bold text-slate-900">MSCHAPV2</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-xs">Identitas (Username):</span>
                      <span className="font-mono font-bold text-blue-600">{credential.username}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-xs">Kata Sandi (Password):</span>
                      <span className="font-mono font-bold text-slate-900">{credential.password || "••••••••"}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-xs">Domain / Realm:</span>
                      <span className="font-bold text-slate-900">gigabill.net</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-xs">Sertifikat CA:</span>
                      <span className="font-bold text-slate-900">Gunakan sertifikat sistem</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Manual */}
              {activeTab === "manual" && (
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Untuk perangkat laptop Windows atau Linux, pilih SSID Wi-Fi Enterprise, pilih metode <strong>EAP-TTLS</strong>, masukkan username <code>{credential.username}</code> dan kata sandi Anda.
                  </p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Perpanjang Masa Aktif Profil</h3>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-[240px]">
                      User: {credential.username}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRenewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!renewOrder ? (
                /* Sub-step 1: Choose Renewal Package */
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
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
                              ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">{pkg.name}</span>
                              {pkg.is_popular && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-900">
                                  Paling Hemat
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {pkg.speed_limit} • Kuota Tanpa Batas ({pkg.duration_days} Hari)
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-700 block">
                              {formatRupiah(pkg.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">+{pkg.duration_days} Hari</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={renewLoading || !renewPkg}
                    onClick={handleRenewSubmit}
                    className="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <span>Lanjut Bayar ({renewPkg ? formatRupiah(renewPkg.price) : ""})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Sub-step 2: QRIS Payment for Renewal */
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs text-slate-500">Nominal Pembayaran Perpanjangan:</p>
                    <p className="text-2xl font-black text-emerald-800">{formatRupiah(renewOrder.amount)}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {renewOrder.package_name} (+{renewOrder.duration_days} Hari)
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-slate-200 inline-block">
                    <img
                      src={renewOrder.qr_image_url}
                      alt="QRIS Renewal"
                      className="w-48 h-48 object-contain rounded-lg mx-auto"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">Order: {renewOrder.order_id}</p>
                  </div>

                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Scan via BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, DANA, atau aplikasi e-wallet apa pun.
                  </p>

                  <button
                    type="button"
                    disabled={renewLoading}
                    onClick={handleConfirmRenewPayment}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{renewLoading ? "Memverifikasi..." : "SAYA SUDAH BAYAR / KONFIRMASI"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewOrder(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 block mx-auto"
                  >
                    ← Ganti Paket Lain
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

