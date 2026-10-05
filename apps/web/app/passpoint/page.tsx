"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Store,
  Tag,
  Check,
  Copy,
  QrCode,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  passpointApi,
  PasspointCredential,
  PasspointPackage,
  PasspointPurchaseResponse,
  PasspointRenewResponse,
  PasspointCheckRenewResponse,
  ValidatePromoResponse,
} from "@/lib/api/passpoint";
import { formatRupiah } from "@/lib/utils";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

export default function PasspointOnboardingPage() {
  const [pageMode, setPageMode] = useState<"BUY" | "RENEW" | "LOOKUP">("BUY");

  // Dynamic tenant state
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantName, setTenantName] = useState("ISPSYNC");
  const [tenantLegalName, setTenantLegalName] = useState("ISPSYNC Carrier System");
  const [tenantLogo, setTenantLogo] = useState("");

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
  const [copiedCode, setCopiedCode] = useState(false);

  // Renewal state
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewPkg, setRenewPkg] = useState<PasspointPackage | null>(null);
  const [renewOrder, setRenewOrder] = useState<PasspointRenewResponse | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<PasspointCheckRenewResponse | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);

  // Referral / Promo Code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<ValidatePromoResponse | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Android interactive guide state
  const [androidBrand, setAndroidBrand] = useState<"samsung" | "xiaomi" | "oppo" | "generic">("samsung");
  const [showAndroidPassword, setShowAndroidPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = (text: string, fieldKey: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const copyAllAndroidConfig = (c: PasspointCredential) => {
    const text = "KONFIGURASI WI-FI PASSPOINT ANDROID\n" +
      "Operator: " + tenantName + "\n" +
      "Metode EAP: TTLS\n" +
      "Otentikasi Tahap 2: MSCHAPv2\n" +
      "Sertifikat CA: Gunakan sertifikat sistem / Jangan validasi\n" +
      "Domain: " + tenantSlug + ".ispsync.id\n" +
      "Identitas (Username): " + c.username + "\n" +
      "Kata Sandi: " + (c.password || "") + "\n" +
      "Identitas Anonim: anonymous@" + tenantSlug + ".ispsync.id";
    copyText(text, "ALL_CONFIG");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname.toLowerCase();
      const parts = h.split(".");
      let detectedSlug = "";

      if (parts.length >= 4 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length === 3 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi")) {
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

      // Detect referral code from URL: ?ref=... or ?promo=... or ?agent=...
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get("ref") || urlParams.get("promo") || urlParams.get("agent");
      if (refParam) {
        const cleaned = refParam.toUpperCase().trim();
        setPromoCode(cleaned);
        passpointApi
          .validateReferral(cleaned)
          .then((res) => {
            if (res && res.valid) {
              setAppliedPromo(res);
            }
          })
          .catch(() => {});
      }

      const modeParam = urlParams.get("mode") || urlParams.get("tab");
      if (modeParam && (modeParam.toUpperCase() === "RENEW" || modeParam.toUpperCase() === "LOOKUP")) {
        setPageMode(modeParam.toUpperCase() as any);
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

  const handleApplyPromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promoCode.trim()) return;

    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await passpointApi.validateReferral(promoCode.trim());
      if (res && res.valid) {
        setAppliedPromo(res);
        setPromoError(null);
      } else {
        setPromoError(res?.message || "Kode referral agen tidak valid atau sudah kedaluwarsa.");
        setAppliedPromo(null);
      }
    } catch (err: any) {
      setPromoError(err?.message || "Gagal memverifikasi kode referral agen.");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError(null);
  };

  const getDiscountedPrice = (price: number) => {
    if (!appliedPromo || appliedPromo.online_discount_pct <= 0) return price;
    const discount = Math.round((price * appliedPromo.online_discount_pct) / 100);
    return Math.max(0, price - discount);
  };

  const renderPromoBox = () => (
    <div className="pt-2">
      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-cyan-400" />
          Kode Referral Agen / Promo (Opsional)
        </span>
        {appliedPromo && (
          <span className="text-emerald-400 text-[11px] font-bold">
            Hemat {appliedPromo.online_discount_pct}%
          </span>
        )}
      </label>

      {appliedPromo ? (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-emerald-300 block">
                Referral Agen: {appliedPromo.agent_name}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Kode {appliedPromo.promo_code} • Potongan {appliedPromo.online_discount_pct}% Terpasang
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemovePromo}
            className="text-xs text-rose-400 hover:text-rose-300 hover:underline shrink-0 font-medium cursor-pointer"
          >
            Hapus
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Punya kode referral? Contoh: AG-BUDI"
              className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-xs font-mono uppercase tracking-wider outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
            />
            <button
              type="button"
              disabled={promoLoading || !promoCode.trim()}
              onClick={() => handleApplyPromo()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition cursor-pointer"
            >
              {promoLoading ? "Cek..." : "Gunakan"}
            </button>
          </div>
          {promoError && (
            <p className="text-rose-400 text-[11px] mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {promoError}
            </p>
          )}
        </div>
      )}
    </div>
  );

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
        phone: phone.trim().replace(/\D/g, "").replace(/^0/, "62"),
        payment_method: "QRIS",
        promo_code: appliedPromo ? appliedPromo.promo_code : promoCode.trim() || undefined,
      });
      setOrder(res);
      setBuyStep("PAY");
    } catch (err: any) {
      setError(err.message || "Gagal memproses pesanan Passpoint");
    } finally {
      setLoading(false);
    }
  };

  // Auto-poll status when waiting for payment (both QRIS and COUNTER)
  useEffect(() => {
    if (buyStep !== "PAY" || !order) return;
    const interval = setInterval(async () => {
      try {
        const res = await passpointApi.checkPurchase({
          order_id: order.order_id,
        });
        if (res.status === "PAID") {
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
        }
      } catch (e) {
        // silent polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [buyStep, order, customerName, tenantName]);

  // Auto-poll status when waiting for renewal payment
  useEffect(() => {
    if (!renewOrder) return;
    const interval = setInterval(async () => {
      try {
        const res = await passpointApi.checkRenew({
          order_id: renewOrder.order_id,
        });
        if (res.status === "PAID") {
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
        }
      } catch (e) {
        // silent polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [renewOrder, credential]);

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
        promo_code: appliedPromo ? appliedPromo.promo_code : promoCode.trim() || undefined,
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

  const handleSelectMode = (mode: "BUY" | "RENEW" | "LOOKUP") => {
    setPageMode(mode);
    setError(null);
    if (mode === "RENEW") {
      setRenewOrder(null);
      setRenewSuccess(null);
      if (packages.length > 0 && !renewPkg) {
        setRenewPkg(packages.find((p) => p.is_popular) || packages[0]);
      }
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
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSelectMode("BUY")}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              pageMode === "BUY"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white shadow-md shadow-cyan-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Beli Akses</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("RENEW")}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              pageMode === "RENEW"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white shadow-md shadow-cyan-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Zap className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Perpanjang</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("LOOKUP")}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              pageMode === "LOOKUP"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white shadow-md shadow-cyan-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Pasang Ulang</span>
          </button>

          <Link
            href="/passpoint/status"
            className="py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60"
          >
            <Clock className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Cek Status</span>
          </Link>
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
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
                              {formatRupiah(getDiscountedPrice(pkg.price))}
                            </span>
                            {appliedPromo && appliedPromo.online_discount_pct > 0 && (
                              <span className="text-xs text-slate-500 line-through font-mono">
                                {formatRupiah(pkg.price)}
                              </span>
                            )}
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

                  {/* Referral Code Box */}
                  {renderPromoBox()}

                  {/* Info Pembayaran QRIS */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Pembayaran QRIS Otomatis</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Instan &amp; Mandiri
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Dukung BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, DANA &amp; semua aplikasi m-Banking.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedPkg}
                    className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      Lanjut ke Pembayaran QRIS -{" "}
                      {selectedPkg ? formatRupiah(getDiscountedPrice(selectedPkg.price)) : ""}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Sub-step 2: Payment Display (QRIS Mandiri) */}
            {buyStep === "PAY" && order && (
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center space-y-6">
                <div className="space-y-6">
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
                    {order.discount_amount && order.discount_amount > 0 ? (
                      <div className="text-[11px] text-emerald-400 font-mono mt-1">
                        Hemat {formatRupiah(order.discount_amount)} via Agen {order.agent_name || appliedPromo?.agent_name}
                      </div>
                    ) : null}
                    <p className="text-xs font-semibold text-slate-300 mt-1">{order.package_name}</p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-700 inline-block shadow-2xl">
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
                </div>

                <div className="max-w-md mx-auto pt-2 space-y-2">
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
                    className="text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    &larr; Batalkan atau ganti paket
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODE B: Perpanjang Masa Aktif Paket (RENEW) ───────── */}
        {pageMode === "RENEW" && (
          <div className="space-y-6">
            {!credential ? (
              /* Step 1: Input Credential / ID lookup */
              <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Perpanjang Masa Aktif Paket Passpoint</h2>
                    <p className="text-xs text-slate-400">
                      Perpanjang langganan tanpa perlu unduh ulang atau pasang ulang profil di perangkat Anda.
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-400 mt-4 mb-6 leading-relaxed">
                  Masukkan ID Kredensial Passpoint Anda yang tertera di pesan WhatsApp pendaftaran atau riwayat aktivasi sebelumnya di jaringan {tenantName}.
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
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Memeriksa..." : "CEK AKUN & PERPANJANG"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* Step 2: Credential Found -> Show Renewal Selection or QRIS or Success */
              <div className="space-y-6">
                {/* Active Account Identity Bar */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm sm:text-base">
                          {credential.customer_name || "Pelanggan Passpoint"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {credential.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        EAP User: <span className="text-cyan-400 font-bold">{credential.username}</span> • ID: <span className="text-slate-300">{credential.id.slice(0, 8)}...</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCredential(null);
                      setRenewOrder(null);
                      setRenewSuccess(null);
                      setCredentialId("");
                    }}
                    className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer shrink-0"
                  >
                    Ganti ID Akun Lain
                  </button>
                </div>

                {/* Sub-step A: Success Banner */}
                {renewSuccess ? (
                  <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/50 shadow-2xl text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{renewSuccess.message || "Perpanjangan Berhasil!"}</h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg mx-auto">
                        Masa aktif baru akun Anda berlaku hingga:{" "}
                        <strong className="text-emerald-400 font-mono text-base block mt-1">
                          {new Date(renewSuccess.new_expires_at).toLocaleString("id-ID")}
                        </strong>
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Profil Wi-Fi di smartphone dan laptop Anda <strong>otomatis langsung aktif kembali</strong> di seluruh jangkauan hotspot {tenantName} tanpa perlu menyetel ulang apa pun.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRenewSuccess(null);
                          setRenewOrder(null);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-cyan-600/20 cursor-pointer"
                      >
                        Perpanjang Paket Lain
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectMode("LOOKUP")}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Lihat Panduan Perangkat
                      </button>
                    </div>
                  </div>
                ) : renewOrder ? (
                  /* Sub-step B: Payment Display for Renewal (QRIS) */
                  <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center space-y-6">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-black text-white">Selesaikan Pembayaran QRIS Perpanjangan</h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          Scan kode QRIS di bawah menggunakan m-Banking atau aplikasi e-wallet apa pun.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 inline-block max-w-xs w-full mx-auto">
                        <p className="text-xs text-slate-400 mb-1">Total Pembayaran Perpanjangan:</p>
                        <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono mb-1">
                          {formatRupiah(renewOrder.amount)}
                        </p>
                        {renewOrder.discount_amount && renewOrder.discount_amount > 0 ? (
                          <div className="text-[11px] text-emerald-400 font-mono mb-1">
                            Hemat {formatRupiah(renewOrder.discount_amount)} via Agen {renewOrder.agent_name || appliedPromo?.agent_name}
                          </div>
                        ) : null}
                        <p className="text-xs font-semibold text-slate-300">
                          {renewOrder.package_name} (+{renewOrder.duration_days} Hari)
                        </p>
                      </div>

                      <div className="p-4 bg-white rounded-3xl border-4 border-slate-700 inline-block shadow-2xl">
                        <img
                          src={renewOrder.qr_image_url}
                          alt="QRIS Perpanjangan Passpoint"
                          className="w-56 h-56 object-contain rounded-xl mx-auto"
                        />
                        <p className="text-[10px] text-slate-500 mt-2 font-mono">Invoice Order: {renewOrder.order_id}</p>
                      </div>
                    </div>

                    <div className="max-w-md mx-auto space-y-3 pt-2">
                      <button
                        type="button"
                        disabled={renewLoading}
                        onClick={handleConfirmRenewPayment}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{renewLoading ? "Memverifikasi..." : "SAYA SUDAH MEMBAYAR / CEK SEKARANG"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRenewOrder(null)}
                        className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        &larr; Batalkan atau ganti pilihan paket
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Sub-step C: Choose Package to Renew */
                  <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span>Pilih Paket Perpanjangan Masa Aktif</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Pilih paket perpanjangan kuota &amp; masa aktif. Masa aktif akan otomatis diakumulasikan ke akun Anda.
                      </p>
                    </div>

                    {/* Package Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {packages.map((pkg) => {
                        const isSelected = renewPkg?.id === pkg.id;
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => setRenewPkg(pkg)}
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
                              <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
                                  {formatRupiah(getDiscountedPrice(pkg.price))}
                                </span>
                                {appliedPromo && appliedPromo.online_discount_pct > 0 && (
                                  <span className="text-xs text-slate-500 line-through font-mono">
                                    {formatRupiah(pkg.price)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mb-3">{pkg.description}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                              <span className="text-cyan-400">{pkg.speed_limit}</span>
                              <span className="text-slate-400 font-mono font-bold">+{pkg.duration_days} Hari</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Referral / Promo Code Box */}
                    <div className="mb-6">
                      {renderPromoBox()}
                    </div>

                    <button
                      type="button"
                      disabled={renewLoading || !renewPkg}
                      onClick={handleRenewSubmit}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>
                        Lanjut ke Pembayaran QRIS - {renewPkg ? formatRupiah(getDiscountedPrice(renewPkg.price)) : ""}
                      </span>
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MODE C: Lookup ID yang Sudah Ada ─────────────────── */}
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

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <span className="text-slate-400">Tidak tahu atau lupa ID Kredensial UUID Anda?</span>
              <Link
                href="/passpoint/status"
                className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 transition"
              >
                <span>Cari dengan Nomor WhatsApp atau Username EAP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ── HASIL KREDENSIAL & PANDUAN INSTALASI PERANGKAT ───── */}
        {credential && pageMode !== "RENEW" && (
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
                  onClick={() => handleSelectMode("RENEW")}
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
                <div className="space-y-6">
                  {/* Brand Selector Buttons */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Pilih Merek Perangkat Android Anda:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setAndroidBrand("samsung")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          androidBrand === "samsung"
                            ? "bg-slate-800 border-cyan-500 text-cyan-400 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Samsung Galaxy
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndroidBrand("xiaomi")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          androidBrand === "xiaomi"
                            ? "bg-slate-800 border-cyan-500 text-cyan-400 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Xiaomi / POCO
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndroidBrand("oppo")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          androidBrand === "oppo"
                            ? "bg-slate-800 border-cyan-500 text-cyan-400 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Oppo / Vivo / Realme
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndroidBrand("generic")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          androidBrand === "generic"
                            ? "bg-slate-800 border-cyan-500 text-cyan-400 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Android Lainnya
                      </button>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions per Brand */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <h4 className="font-bold text-slate-200">
                      {androidBrand === "samsung" && "Langkah Koneksi Samsung Galaxy (One UI):"}
                      {androidBrand === "xiaomi" && "Langkah Koneksi Xiaomi / POCO / Redmi (HyperOS / MIUI):"}
                      {androidBrand === "oppo" && "Langkah Koneksi Oppo / Realme / Vivo (ColorOS / Funtouch):"}
                      {androidBrand === "generic" && "Langkah Koneksi Android Standar (AOSP / Pixel):"}
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                      <li>Buka <strong>Pengaturan &gt; Wi-Fi</strong> pada ponsel Anda.</li>
                      <li>
                        {androidBrand === "samsung" && (
                          <span>Pilih jaringan <strong>Passpoint / {tenantName}</strong> (biasanya memiliki label Wi-Fi Hotspot 2.0).</span>
                        )}
                        {androidBrand === "xiaomi" && (
                          <span>Pilih sinyal Wi-Fi <strong>{tenantName} Passpoint</strong>. Jika muncul dialog opsi lanjutan, buka untuk mengatur parameter EAP.</span>
                        )}
                        {androidBrand === "oppo" && (
                          <span>Pilih Wi-Fi <strong>{tenantName} Passpoint</strong>. Ketuk Opsi Lanjutan jika pengaturan EAP belum muncul.</span>
                        )}
                        {androidBrand === "generic" && (
                          <span>Pilih jaringan Wi-Fi <strong>{tenantName} Passpoint</strong> atau tambah jaringan secara manual.</span>
                        )}
                      </li>
                      <li>
                        Atur <strong>Metode EAP</strong> menjadi <strong className="text-cyan-400 font-mono">TTLS</strong> dan <strong>Otentikasi Tahap 2</strong> menjadi <strong className="text-cyan-400 font-mono">MSCHAPV2</strong>.
                      </li>
                      <li>
                        {androidBrand === "samsung" && (
                          <span>Pada <strong>Sertifikat CA</strong>, pilih <em>Gunakan sertifikat sistem</em> dan isi kolom <strong>Domain</strong> dengan <code className="text-white font-mono">{tenantSlug}.ispsync.id</code>.</span>
                        )}
                        {androidBrand === "xiaomi" && (
                          <span>Pada <strong>Sertifikat CA</strong>, pilih <em>Jangan validasi</em> (atau pilih sertifikat sistem jika diminta mengisi domain).</span>
                        )}
                        {androidBrand === "oppo" && (
                          <span>Pada <strong>Sertifikat CA</strong>, pilih <em>Jangan validasi</em> atau <em>Gunakan sertifikat sistem</em>.</span>
                        )}
                        {androidBrand === "generic" && (
                          <span>Pada <strong>Sertifikat CA</strong>, pilih <em>Jangan validasi</em> atau isi Domain dengan <code className="text-white font-mono">{tenantSlug}.ispsync.id</code>.</span>
                        )}
                      </li>
                      <li>Salin dan tempel <strong>Identitas (Username)</strong> dan <strong>Kata Sandi</strong> dari kotak di bawah, lalu klik <strong>Sambungkan</strong>.</li>
                    </ol>
                  </div>

                  {/* Interactive Parameter Cards with Quick-Copy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Method EAP */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">1. Metode EAP:</span>
                        <span className="font-bold text-white font-mono text-sm">TTLS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText("TTLS", "EAP_METHOD")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[11px] transition inline-flex items-center gap-1"
                      >
                        {copiedField === "EAP_METHOD" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedField === "EAP_METHOD" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>

                    {/* Phase 2 Auth */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">2. Otentikasi Tahap 2:</span>
                        <span className="font-bold text-white font-mono text-sm">MSCHAPV2</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText("MSCHAPV2", "PHASE2")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[11px] transition inline-flex items-center gap-1"
                      >
                        {copiedField === "PHASE2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedField === "PHASE2" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>

                    {/* CA Certificate */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">3. Sertifikat CA:</span>
                        <span className="font-bold text-slate-200 text-xs">Gunakan sertifikat sistem / Jangan validasi</span>
                      </div>
                    </div>

                    {/* Domain */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">4. Domain / Realm:</span>
                        <span className="font-bold text-white font-mono text-xs">{tenantSlug}.ispsync.id</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(`${tenantSlug}.ispsync.id`, "DOMAIN")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[11px] transition inline-flex items-center gap-1"
                      >
                        {copiedField === "DOMAIN" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedField === "DOMAIN" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>

                    {/* Identity (Username) */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">5. Identitas (Username):</span>
                        <span className="font-bold text-cyan-400 font-mono text-sm">{credential.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(credential.username, "USERNAME")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[11px] transition inline-flex items-center gap-1"
                      >
                        {copiedField === "USERNAME" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedField === "USERNAME" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>

                    {/* Password */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">6. Kata Sandi (Password):</span>
                        <span className="font-bold text-white font-mono text-sm">
                          {showAndroidPassword ? credential.password : "••••••••"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAndroidPassword(!showAndroidPassword)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                          title={showAndroidPassword ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showAndroidPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(credential.password || "", "PASSWORD")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[11px] transition inline-flex items-center gap-1"
                        >
                          {copiedField === "PASSWORD" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedField === "PASSWORD" ? "Tersalin" : "Salin"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Copy All Button */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => copyAllAndroidConfig(credential)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      {copiedField === "ALL_CONFIG" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === "ALL_CONFIG" ? "Seluruh Konfigurasi Tersalin!" : "Salin Semua Konfigurasi ke Catatan"}</span>
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono">Standar WPA2/WPA3-Enterprise</span>
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
          <p>&copy; {new Date().getFullYear()} {tenantLegalName || (tenantName ? `PT. ${tenantName} Data Nusantara` : "ISPSYNC Carrier System")}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/passpoint/status"
              className="text-slate-400 hover:text-cyan-400 transition underline underline-offset-4"
            >
              Cek Status Layanan
            </Link>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enkripsi WPA2/WPA3-Enterprise EAP-TTLS</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
