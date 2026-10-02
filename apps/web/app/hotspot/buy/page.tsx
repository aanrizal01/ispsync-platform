"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  hotspotApi,
  VoucherPackage,
  PurchaseResponse,
  ClaimResponse,
  ValidatePromoResponse,
} from "@/lib/api/hotspot";
import { formatRupiah } from "@/lib/utils";
import {
  Wifi,
  Store,
  ArrowRight,
  LogIn,
  Search,
  ShieldCheck,
  Lock,
  CreditCard,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

function HotspotBuyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Router redirect parameters
  const clientIP = searchParams.get("ip") || "";
  const clientMAC = searchParams.get("mac") || "";
  const linkLogin = searchParams.get("link-login") || "";
  const linkOrig = searchParams.get("link-orig") || "";

  const [packages, setPackages] = useState<VoucherPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<VoucherPackage | null>(null);
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [step, setStep] = useState<"SELECT" | "PAY" | "SUCCESS" | "RECOVER">("SELECT");
  const [order, setOrder] = useState<PurchaseResponse | null>(null);
  const [claimedVoucher, setClaimedVoucher] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tenantLogo, setTenantLogo] = useState("");
  const [tenantName, setTenantName] = useState("ISPSYNC");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.host.split('.');
      if (parts.length >= 3) {
        const slug = parts[1].toUpperCase();
        setTenantName(slug);
        setTenantLogo(https:///web/_logo.svg);
      }
    }
  }, []);


  // Recovery State
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverOrderID, setRecoverOrderID] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverBlockedResult, setRecoverBlockedResult] = useState<{
    maskedPhone: string;
    message: string;
    sentToWA: boolean;
  } | null>(null);

  // Promo Code State
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<ValidatePromoResponse | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  

  // Save router redirect parameters to sessionStorage so they persist across PG redirects
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (clientIP) sessionStorage.setItem("hs_ip", clientIP);
      if (clientMAC) sessionStorage.setItem("hs_mac", clientMAC);
      if (linkLogin) sessionStorage.setItem("hs_link_login", linkLogin);
      if (linkOrig) sessionStorage.setItem("hs_link_orig", linkOrig);
    }
  }, [clientIP, clientMAC, linkLogin, linkOrig]);

  // Handle returning from Payment Gateway redirect (e.g. ?order_id=ORD-...)
  useEffect(() => {
    const orderIdParam = searchParams.get("order_id");
    if (orderIdParam && !claimedVoucher) {
      setLoading(true);
      hotspotApi
        .checkPurchase({
          order_id: orderIdParam,
          simulate_pay: false,
        })
        .then((res) => {
          if (res && res.code) {
            setClaimedVoucher(res);
            setStep("SUCCESS");
          } else {
            setError("Pembayaran belum terdeteksi atau masih dalam proses verifikasi. Jika Anda sudah membayar, silakan tunggu beberapa saat.");
          }
        })
        .catch((err: any) => {
          setError(err?.message || "Gagal memverifikasi status pembayaran pesanan " + orderIdParam);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [searchParams]);

  // Polling status pembayaran otomatis saat berada di step PAY
  useEffect(() => {
    if (step !== "PAY" || !order?.order_id) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await hotspotApi.checkPurchase({
          order_id: order.order_id,
          simulate_pay: false,
        });
        if (isSubscribed && res && res.code) {
          clearInterval(interval);
          setClaimedVoucher(res);
          setStep("SUCCESS");
          // Tutup pop-up snap jika masih terbuka
          if (typeof window !== "undefined" && (window as any).snap?.hide) {
            (window as any).snap.hide();
          }
        }
      } catch (e) {
        // Polling background silence
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [step, order?.order_id]);

  useEffect(() => {
    async function loadPackages() {
      try {
        const pkgs = await hotspotApi.getPackages();
        setPackages(pkgs);
        if (pkgs.length > 0) {
          setSelectedPkg(pkgs[0]);
        }
      } catch (err: any) {
        setError(err?.message || "Gagal memuat katalog paket.");
      }
    }
    loadPackages();
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoMsg(null);
    try {
      const res = await hotspotApi.validatePromo(promoCode.trim());
      if (res.valid) {
        setAppliedPromo(res);
        setPromoMsg(`✅ Diskon ${res.online_discount_pct}% diterapkan dari Agen ${res.agent_name}!`);
      } else {
        setAppliedPromo(null);
        setPromoMsg(`❌ ${res.message}`);
      }
    } catch (err: any) {
      setAppliedPromo(null);
      setPromoMsg(err.message || "Gagal memvalidasi kode promo");
    } finally {
      setPromoLoading(false);
    }
  };

  const triggerSnapModal = (snapToken?: string, paymentUrl?: string, orderId?: string) => {
    const token = snapToken || order?.snap_token;
    const pUrl = paymentUrl || order?.payment_url;
    const oId = orderId || order?.order_id || "";

    const isSandbox = pUrl?.includes('sandbox.midtrans.com');
    const snapScriptUrl = isSandbox ? "https://app.sandbox.midtrans.com/snap/snap.js" : "https://app.midtrans.com/snap/snap.js";
    const clientKey = "Mid-client-lbXcAlC7QYsCLR3R";

    const loadAndPay = () => {
      if (typeof window !== "undefined" && (window as any).snap && token) {
        try {
          (window as any).snap.pay(token, {
            onSuccess: function (result: any) {
              if (oId) {
                setStep("SUCCESS");
              }
            },
            onPending: function (result: any) {
              console.log("Midtrans payment pending:", result);
            },
            onError: function (result: any) {
              console.error("Midtrans payment error:", result);
              setError("Pembayaran gagal atau dibatalkan.");
            },
            onClose: function () {
              console.log("Customer closed the Midtrans Snap modal");
            },
          });
          return;
        } catch (err) {
          console.error("Failed to open snap modal:", err);
        }
      }
      if (pUrl && typeof window !== "undefined") {
        window.open(pUrl, "_blank");
      }
    };

    if (!document.querySelector(script[src=""])) {
      const script = document.createElement("script");
      script.src = snapScriptUrl;
      script.setAttribute("data-client-key", clientKey);
      script.async = true;
      script.onload = loadAndPay;
      document.body.appendChild(script);
    } else {
      loadAndPay();
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedPkg) return;
    setLoading(true);
    setError(null);
    try {
      const res = await hotspotApi.purchase({
        template_id: selectedPkg.id,
        phone: phone.trim().replace(/\D/g, "").replace(/^0/, "62"),
        payment_method: paymentMethod,
        client_ip: clientIP,
        client_mac: clientMAC,
        promo_code: appliedPromo ? appliedPromo.promo_code : promoCode.trim() || undefined,
      });
      setOrder(res);
      setStep("PAY");

      // LANGSUNG buka modal Midtrans Snap otomatis!
      if (res.snap_token) {
        setTimeout(() => {
          triggerSnapModal(res.snap_token, res.payment_url, res.order_id);
        }, 200);
      } else if (res.payment_url) {
        window.open(res.payment_url, "_blank");
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memproses pembelian.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (customOrderId?: string) => {
    const targetOrderId = customOrderId || order?.order_id;
    if (!targetOrderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await hotspotApi.checkPurchase({
        order_id: targetOrderId,
        template_id: selectedPkg?.id,
        phone: phone.trim().replace(/\D/g, "").replace(/^0/, "62"),
        promo_code: order?.promo_code || appliedPromo?.promo_code || undefined,
        simulate_pay: false,
      });
      if (res && res.code) {
        setClaimedVoucher(res);
        setStep("SUCCESS");
      } else {
        setError("Pembayaran belum terverifikasi. Jika Anda baru saja membayar, tunggu beberapa detik lalu tekan tombol verifikasi kembali.");
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memverifikasi pembayaran.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConnect = async () => {
    if (!claimedVoucher) return;
    setLoading(true);

    const activeIP = clientIP || (typeof window !== "undefined" ? sessionStorage.getItem("hs_ip") || "" : "");
    const activeMAC = clientMAC || (typeof window !== "undefined" ? sessionStorage.getItem("hs_mac") || "" : "");
    const activeLinkLogin = linkLogin || (typeof window !== "undefined" ? sessionStorage.getItem("hs_link_login") || "" : "");
    const activeLinkOrig = linkOrig || (typeof window !== "undefined" ? sessionStorage.getItem("hs_link_orig") || "" : "");

    try {
      const res = await hotspotApi.login({
        mode: "VOUCHER",
        code: claimedVoucher.code,
        password: claimedVoucher.password,
        client_ip: activeIP,
        client_mac: activeMAC,
      });

      if (res.success && activeLinkLogin) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = activeLinkLogin;

        const userInput = document.createElement("input");
        userInput.type = "hidden";
        userInput.name = "username";
        userInput.value = res.username;
        form.appendChild(userInput);

        const passInput = document.createElement("input");
        passInput.type = "hidden";
        passInput.name = "password";
        passInput.value = res.password || "";
        form.appendChild(passInput);

        if (activeLinkOrig) {
          const dstInput = document.createElement("input");
          dstInput.type = "hidden";
          dstInput.name = "dst";
          dstInput.value = activeLinkOrig;
          form.appendChild(dstInput);
        }

        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Fallback ke status
      router.push(`/hotspot/status?username=${encodeURIComponent(claimedVoucher.code)}&ip=${encodeURIComponent(activeIP)}&mac=${encodeURIComponent(activeMAC)}`);
    } catch (err: any) {
      setError(err?.message || "Otentikasi otomatis gagal. Silakan masukkan kode manual di halaman login.");
    } finally {
      setLoading(false);
    }
  };

  const copyVoucherCode = () => {
    if (!claimedVoucher) return;
    navigator.clipboard.writeText(claimedVoucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRecoverVoucher = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recoverPhone.trim() && !recoverOrderID.trim()) {
      setError("Masukkan nomor WhatsApp atau Order ID pembelian Anda.");
      return;
    }
    setRecoverLoading(true);
    setError(null);
    setRecoverBlockedResult(null);

    const activeIP = clientIP || (typeof window !== "undefined" ? sessionStorage.getItem("hs_ip") || "" : "");
    const activeMAC = clientMAC || (typeof window !== "undefined" ? sessionStorage.getItem("hs_mac") || "" : "");

    try {
      const res = await hotspotApi.recoverVoucher({
        phone: recoverPhone.trim().replace(/\D/g, "").replace(/^0/, "62"),
        order_id: recoverOrderID.trim(),
        client_ip: activeIP,
        client_mac: activeMAC,
      });

      if (!res.success) {
        setError(res.message);
        return;
      }

      if (res.authorized && res.code) {
        setClaimedVoucher({
          status: "PAID",
          code: res.code,
          password: res.password,
          plan_name: res.plan_name || "Voucher Hotspot",
          time_limit_seconds: res.time_limit_seconds || 86400,
          message: res.message,
        });
        setStep("SUCCESS");
      } else {
        // Blocked: different device detected without Order ID
        setRecoverBlockedResult({
          maskedPhone: res.masked_phone || "",
          message: res.message,
          sentToWA: res.sent_to_whatsapp,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Gagal melakukan pencarian voucher.");
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between items-center p-4 py-6">
      {/* Top Header Navigation */}
      <header className="w-full max-w-md flex items-center justify-between py-2 px-1 mb-3 text-xs">
        <Link href="/hotspot/buy" className="flex items-center gap-2 text-white font-bold tracking-tight">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
            <Wifi className="w-4 h-4 text-white" />
          </div>
          <span className="tracking-wide">GOGIGA HOTSPOT</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/hotspot/login?ip=${encodeURIComponent(clientIP)}&mac=${encodeURIComponent(clientMAC)}&link-login=${encodeURIComponent(linkLogin)}&link-orig=${encodeURIComponent(linkOrig)}`}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-medium"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Hotspot</span>
          </Link>
          <Link
            href="/agent/login"
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-1 font-bold"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Portal Agen</span>
          </Link>
        </div>
      </header>

      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Beli Voucher WiFi</h1>
          <p className="text-slate-500 text-xs mt-1">
            Pembayaran instan online via QRIS atau e-Wallet langsung aktif
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1: Pilih Paket */}
        {step === "SELECT" && (
          <div className="space-y-4">
            {/* Banner: Sudah Bayar? Ambil Kode */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Sudah bayar via QRIS?</p>
                  <p className="text-[11px] text-slate-500">Layar tertutup saat buka m-Banking?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRecoverBlockedResult(null);
                  setStep("RECOVER");
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
              >
                Ambil Kode
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Pilih Paket Internet
              </label>
              <div className="space-y-2.5">
                {packages.map((pkg) => {
                  const isSelected = selectedPkg?.id === pkg.id;
                  const speedMbps = (pkg.download_kbps / 1000).toFixed(0);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-sm"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{pkg.name}</span>
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            {speedMbps} Mbps
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-blue-600">
                          {formatRupiah(pkg.price)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {pkg.duration_minutes >= 1440
                            ? `${(pkg.duration_minutes / 1440).toFixed(0)} Hari`
                            : `${(pkg.duration_minutes / 60).toFixed(0)} Jam`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nomor WhatsApp (Untuk Kirim Struk)
              </label>
              <input
                type="tel"
                placeholder="Contoh: 08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`p-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === "QRIS"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>📱</span>
                  <span>QRIS Semua Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("GOPAY")}
                  className={`p-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === "GOPAY"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>💳</span>
                  <span>e-Wallet / VA</span>
                </button>
              </div>
            </div>

            {/* Promo Code Agen */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Punya Kode Promo Agen?
                </label>
                <span className="text-[10px] text-emerald-600 font-semibold">Hemat 10%</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kode 6 digit (contoh: 7K9P2X)"
                  maxLength={10}
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setAppliedPromo(null);
                    setPromoMsg(null);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                >
                  {promoLoading ? "Cek..." : "Pakai"}
                </button>
              </div>
              {promoMsg && (
                <p className={`text-[11px] mt-1.5 font-medium ${appliedPromo ? "text-emerald-600" : "text-rose-500"}`}>
                  {promoMsg}
                </p>
              )}
            </div>

            {(() => {
              const basePrice = selectedPkg ? selectedPkg.price : 0;
              const discount = appliedPromo ? Math.round(basePrice * (appliedPromo.online_discount_pct / 100)) : 0;
              const finalPrice = Math.max(0, basePrice - discount);
              return (
                <button
                  type="button"
                  disabled={loading || !selectedPkg}
                  onClick={handleCreateOrder}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/25 disabled:bg-blue-400 mt-2"
                >
                  {loading ? "Memproses..." : `Lanjut Bayar (${formatRupiah(finalPrice)})`}
                  {discount > 0 && (
                    <span className="block text-[11px] font-normal text-blue-100">
                      Termasuk hemat {formatRupiah(discount)}
                    </span>
                  )}
                </button>
              );
            })()}

            <div className="text-center mt-3">
              <Link
                href={`/hotspot/login?ip=${encodeURIComponent(clientIP)}&mac=${encodeURIComponent(clientMAC)}&link-login=${encodeURIComponent(linkLogin)}&link-orig=${encodeURIComponent(linkOrig)}`}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Sudah punya kode voucher? Masuk disini
              </Link>
            </div>
          </div>
        )}

        {/* STEP: Ambil / Recovery Voucher */}
        {step === "RECOVER" && (
          <div className="space-y-4">
            <div className="text-center pb-1">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-teal-200 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">Cek / Ambil Kode Voucher</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifikasi otomatis untuk mengambil kembali kode voucher yang sudah Anda bayar
              </p>
            </div>

            {recoverBlockedResult ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-900">Proteksi Anti-Pencurian Aktif</h3>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {recoverBlockedResult.message}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/90 border border-amber-200/60 rounded-xl space-y-1.5 text-xs">
                  <p className="font-semibold text-slate-700">Punya Bukti Bayar Bank?</p>
                  <p className="text-[11px] text-slate-500">
                    Masukkan <b>Order ID</b> dari struk bank untuk membuka kode di layar ini:
                  </p>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Contoh: ORD-2026..."
                      value={recoverOrderID}
                      onChange={(e) => setRecoverOrderID(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <button
                      type="button"
                      disabled={recoverLoading || !recoverOrderID.trim()}
                      onClick={() => handleRecoverVoucher()}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      {recoverLoading ? "Cek..." : "Buka Kode"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRecoverBlockedResult(null)}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium block mx-auto pt-1"
                >
                  ← Coba nomor lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverVoucher} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nomor WhatsApp Pembeli
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    value={recoverPhone}
                    onChange={(e) => setRecoverPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nomor WhatsApp yang Anda masukkan saat membuat pesanan voucher
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Order ID Bank <span className="font-normal text-slate-400">(Opsional jika dari HP yang sama)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: ORD-20260928..."
                    value={recoverOrderID}
                    onChange={(e) => setRecoverOrderID(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Wajib jika Anda membuka dari HP lain/teman untuk membuktikan kepemilikan Anda
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={recoverLoading || (!recoverPhone.trim() && !recoverOrderID.trim())}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-teal-500/25 disabled:bg-teal-400 flex items-center justify-center gap-2 mt-2"
                >
                  {recoverLoading ? (
                    <span>Mencari...</span>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>CARI KODE VOUCHER SAYA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("SELECT");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 block mx-auto pt-1"
                >
                  ← Kembali ke Menu Beli
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: Layar Pembayaran Midtrans */}
        {step === "PAY" && order && (
          <div className="text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Total yang harus dibayar:</p>
              <p className="text-2xl font-black text-slate-900">{formatRupiah(order.amount)}</p>
              {order.discount_amount && order.discount_amount > 0 ? (
                <div className="mt-1 text-xs text-emerald-600 font-medium">
                  Hemat {formatRupiah(order.discount_amount)} via Promo {order.promo_code}
                  {order.agent_name && ` (${order.agent_name})`}
                </div>
              ) : null}
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{order.template_name}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-1">Order ID: {order.order_id}</p>
            </div>

            {/* Kotak Petunjuk & Tombol Buka Pop-up Midtrans */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/70 rounded-2xl border border-blue-200 space-y-3 text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/25">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pembayaran Online Midtrans</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tersedia <b>QRIS Resmi (BCA, BRI, Mandiri, BNI, GoPay, OVO, Dana, ShopeePay)</b> dan <b>Transfer Bank (Virtual Account)</b>.
                </p>
              </div>

              {/* Tombol Utama: Buka Pop-up Midtrans */}
              <button
                type="button"
                onClick={() => triggerSnapModal()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buka Pop-up Pembayaran Midtrans</span>
              </button>

              {/* Tombol Cadangan: Buka di Tab Baru */}
              {order.payment_url && (
                <a
                  href={order.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Buka Halaman Checkout Midtrans (Tab Baru)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
            </div>

            {/* Indikator Status Otomatis */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-800 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Menunggu pembayaran... Voucher otomatis aktif setelah dibayar.</span>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleConfirmPayment()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-emerald-500/20 disabled:bg-emerald-400 flex items-center justify-center gap-2"
            >
              {loading ? "Memverifikasi..." : "✓ Cek Status Pembayaran Sekarang"}
            </button>

            <button
              type="button"
              onClick={() => setStep("SELECT")}
              className="text-xs text-slate-400 hover:text-slate-600 block mx-auto pt-1"
            >
              ← Ganti paket atau batalkan
            </button>
          </div>
        )}

        {/* STEP 3: Sukses & Kode Voucher Aktif */}
        {step === "SUCCESS" && claimedVoucher && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Pembayaran Berhasil!</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Voucher internet Anda sudah aktif dan siap digunakan
              </p>
            </div>

            {/* Voucher Card Box */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-blue-200 rounded-2xl space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Kode Voucher Anda (12 Angka)
              </span>
              <div className="text-3xl font-mono font-black text-slate-900 tracking-wider py-1">
                {claimedVoucher.code}
              </div>
              <p className="text-[11px] text-slate-500">
                Gunakan kode 12 angka di atas untuk login WiFi (Username = Password)
              </p>
              <div>
                <button
                  type="button"
                  onClick={copyVoucherCode}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-xs transition-colors"
                >
                  <span>📋</span>
                  <span>{copied ? "Berhasil Disalin!" : "Salin Kode Voucher"}</span>
                </button>
              </div>
            </div>

            {/* Auto Connect Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleAutoConnect}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-base transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>{loading ? "Menghubungkan..." : "HUBUNGKAN KE INTERNET SEKARANG"}</span>
            </button>

            <p className="text-[11px] text-slate-400">
              {phone ? `Salinan kode juga dikirimkan ke WhatsApp: ${phone}` : "Simpan kode voucher ini jika sewaktu-waktu perangkat Anda terputus."}
            </p>
          </div>
        )}
      </div>

      {/* Footer Banner & Agent Link */}
      <footer className="w-full max-w-md mt-6 text-center space-y-2.5">
        <Link
          href="/agent/login"
          className="inline-flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-amber-400 text-xs font-semibold transition-all group shadow-sm"
        >
          <Store className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Ingin jadi agen voucher? Raih cashback 15% &amp; komisi 10%</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <p className="text-[11px] text-slate-500">
          © {new Date().getFullYear()} ISPSYNC • Layanan Hotspot &amp; Voucher Digital
        </p>
      </footer>
    </div>
  );
}

export default function HotspotBuyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Memuat Katalog...</div>}>
      <HotspotBuyForm />
    </Suspense>
  );
}
