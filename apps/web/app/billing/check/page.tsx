"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Receipt,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  User,
  Phone,
  Hash,
  Wifi,
  RefreshCw,
  Lock,
  Wallet,
  CreditCard,
  X,
  Globe,
  MessageSquare,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  billingApi,
  type Invoice,
  type PublicInvoiceLookupResponse,
  type PublicPayInvoiceResponse,
  type PublicTopUpDepositResponse,
} from "@/lib/api/billing";
import {
  settingsApi,
  type InvoiceTemplateSettings,
  defaultInvoiceTemplateSettings,
} from "@/lib/api/settings";
import { InvoicePrintDocument } from "@/components/invoice/InvoicePrintDocument";
import { formatRupiah, formatDate } from "@/lib/utils";

export default function PublicBillingCheckPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<PublicInvoiceLookupResponse | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Selected Invoice for Payment
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payOrder, setPayOrder] = useState<PublicPayInvoiceResponse | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  // Print Formal Invoice Modal State & Template Settings
  const [isPrintInvoiceModalOpen, setIsPrintInvoiceModalOpen] = useState(false);
  const [templateSettings, setTemplateSettings] =
    useState<InvoiceTemplateSettings>(defaultInvoiceTemplateSettings);
  const [printPaperMode, setPrintPaperMode] = useState<"a4" | "thermal">("a4");
  const [thermalWidth, setThermalWidth] = useState<"80mm" | "58mm">("80mm");

  useEffect(() => {
    settingsApi
      .getInvoiceTemplate()
      .then((data) => {
        if (data && data.brand_name) {
          setTemplateSettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice template:", err);
      });

    // Auto lookup jika dibuka via scan QR Code (?q=INV-... atau ?inv=...)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const invoiceParam = urlParams.get("q") || urlParams.get("inv") || urlParams.get("invoice");
      if (invoiceParam && invoiceParam.trim()) {
        const queryTerm = invoiceParam.trim();
        setQuery(queryTerm);
        setLoading(true);
        setError(null);
        billingApi
          .publicLookup(queryTerm)
          .then((res) => {
            setLookupResult(res);
            if (res.invoices && res.invoices.length > 0) {
              const matched =
                res.invoices.find((i) => i.invoice_number.toLowerCase() === queryTerm.toLowerCase()) ||
                res.invoices.find(
                  (i) => i.status === "ISSUED" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID"
                ) ||
                res.invoices[0];
              setSelectedInvoice(matched);
            }
          })
          .catch((err: any) => {
            setError(err.message || "Faktur tidak ditemukan atau sudah tidak aktif");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, []);

  // Top Up Deposit State
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(259000);
  const [topUpStep, setTopUpStep] = useState<"select" | "qris" | "success">("select");
  const [topUpQrisData, setTopUpQrisData] = useState<PublicTopUpDepositResponse | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenTopUp = (preset?: number) => {
    setTopUpAmount(preset || 259000);
    setTopUpStep("select");
    setTopUpQrisData(null);
    setTopUpSuccessMsg(null);
    setIsTopUpModalOpen(true);
  };

  const handleSubmitTopUp = async () => {
    if (!lookupResult || topUpAmount < 10000) {
      alert("Nominal pengisian deposit minimal Rp 10.000");
      return;
    }
    setTopUpLoading(true);
    try {
      const res = await billingApi.publicTopUpDeposit({
        query: query.trim() || lookupResult.phone || lookupResult.customer_number,
        amount: topUpAmount,
        simulate_pay: false,
      });
      setTopUpQrisData(res);
      setTopUpStep("qris");
      if (res.payment_url) {
        window.open(res.payment_url, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Gagal memproses QRIS deposit");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleConfirmTopUp = async () => {
    if (!lookupResult) return;
    setTopUpLoading(true);
    try {
      const res = await billingApi.publicTopUpDeposit({
        query: query.trim() || lookupResult.phone || lookupResult.customer_number,
        amount: topUpAmount,
        simulate_pay: true,
      });
      setTopUpSuccessMsg(res.message);
      setTopUpStep("success");
      const updated = await billingApi.publicLookup(query.trim() || lookupResult.phone);
      setLookupResult(updated);
    } catch (err: any) {
      alert(err.message || "Gagal memverifikasi top up");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedInvoice(null);
    setPayOrder(null);
    setPaySuccess(null);

    try {
      const res = await billingApi.publicLookup(query.trim());
      setLookupResult(res);
      if (res.invoices && res.invoices.length > 0) {
        const unpaid = res.invoices.find(
          (i) => i.status === "ISSUED" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID"
        );
        setSelectedInvoice(unpaid || res.invoices[0]);
      }
    } catch (err: any) {
      setError(err.message || "Data tagihan tidak ditemukan. Pastikan Nomor Pelanggan atau Nomor HP sudah benar.");
      setLookupResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setQuery("");
    setLookupResult(null);
    setSelectedInvoice(null);
    setPayOrder(null);
    setError(null);
    setPaySuccess(null);
  };

  const handleInitiatePay = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPayLoading(true);
    setError(null);
    try {
      const res = await billingApi.publicPayInvoice(invoice.id, false);
      setPayOrder(res);
    } catch (err: any) {
      setError(err.message || "Gagal memproses kode QRIS pembayaran");
    } finally {
      setPayLoading(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!selectedInvoice) return;
    setPayLoading(true);
    setError(null);
    try {
      const res = await billingApi.publicPayInvoice(selectedInvoice.id, true);
      setPaySuccess(res.message);
      setPayOrder(null);
      const updated = await billingApi.publicLookup(query.trim());
      setLookupResult(updated);
      const updatedInv = updated.invoices.find((i) => i.id === selectedInvoice.id);
      if (updatedInv) setSelectedInvoice(updatedInv);
    } catch (err: any) {
      setError(err.message || "Gagal memverifikasi pembayaran");
    } finally {
      setPayLoading(false);
    }
  };

  const rawPhone = templateSettings?.phone || "08116601234";
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
  const brandName = templateSettings?.brand_name || "ISPSYNC";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ======================================================== */}
      {/* CLEAN HEADER                                             */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt={brandName}
              className="h-9 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                {brandName}
              </h1>
              <p className="text-xs text-slate-500">
                Portal Pembayaran Tagihan & Layanan Internet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Halo Bantuan ${brandName}, saya ingin bertanya tentang tagihan internet saya.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bantuan WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER                                           */}
      {/* ======================================================== */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Search Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Cek Tagihan Internet
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Masukkan Nomor Pelanggan, Nomor WhatsApp yang terdaftar, atau Nomor Faktur untuk melihat rincian tagihan Anda.
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: CUS-2026-00001 atau 08123456789"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <span>Cari Tagihan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              *ID pelanggan dapat dilihat pada pesan konfirmasi WhatsApp saat pemasangan WiFi pertama kali.
            </p>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Tagihan Tidak Ditemukan</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {paySuccess && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Pembayaran Berhasil Dikonfirmasi!</p>
              <p className="text-xs text-emerald-700 mt-0.5">{paySuccess}</p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* HASIL PENCARIAN (LOOKUP RESULT)                      */}
        {/* ---------------------------------------------------- */}
        {lookupResult ? (
          <div className="space-y-5">
            {/* Customer Header Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {lookupResult.customer_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Aktif
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <span>ID:</span>
                    <strong className="font-mono text-slate-800">
                      {lookupResult.customer_number || "-"}
                    </strong>
                    {lookupResult.customer_number && (
                      <button
                        type="button"
                        onClick={() => handleCopy(lookupResult.customer_number, "id")}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        title="Salin ID"
                      >
                        {copiedText === "id" ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {lookupResult.phone && (
                    <div className="flex items-center gap-1">
                      <span>No. HP:</span>
                      <strong className="font-mono text-slate-800">{lookupResult.phone}</strong>
                      <button
                        type="button"
                        onClick={() => handleCopy(lookupResult.phone!, "phone")}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        title="Salin No. HP"
                      >
                        {copiedText === "phone" ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetSearch}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition self-start sm:self-auto flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ganti Pencarian</span>
              </button>
            </div>

            {/* Invoices List & Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Kolom Kiri: Daftar Faktur */}
              <div className="md:col-span-1 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                  Daftar Faktur:
                </h3>

                {lookupResult.invoices && lookupResult.invoices.length > 0 ? (
                  lookupResult.invoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    const isPaid = inv.status === "PAID";
                    const isOverdue = inv.status === "OVERDUE";

                    return (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setPayOrder(null);
                          setPaySuccess(null);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-600 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {inv.invoice_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : isOverdue
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isPaid ? "Lunas" : isOverdue ? "Jatuh Tempo" : "Belum Bayar"}
                          </span>
                        </div>

                        <div className="text-base font-bold font-mono text-slate-900">
                          {formatRupiah(inv.amount_due > 0 ? inv.amount_due : inv.total_amount)}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                          <span>Jatuh Tempo:</span>
                          <span className="font-medium text-slate-700">{formatDate(inv.due_date)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    Tidak ada tagihan terdaftar.
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Rincian Faktur Terpilih */}
              <div className="md:col-span-2">
                {selectedInvoice ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 block">Nomor Faktur</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <h4 className="text-lg font-bold font-mono text-slate-900">
                            {selectedInvoice.invoice_number}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsPrintInvoiceModalOpen(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition"
                            title="Cetak Faktur PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Cetak PDF</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 block">Total Tagihan</span>
                        <span className="text-xl font-bold font-mono text-blue-600">
                          {formatRupiah(
                            selectedInvoice.amount_due > 0
                              ? selectedInvoice.amount_due
                              : selectedInvoice.total_amount
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Item Rincian */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Rincian Layanan:
                      </span>
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden text-xs">
                        {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                          selectedInvoice.items.map((item) => (
                            <div key={item.id} className="p-3 flex justify-between items-center bg-slate-50/50">
                              <div>
                                <p className="font-semibold text-slate-800">{item.description}</p>
                                <p className="text-[11px] text-slate-400">Qty: {item.quantity}x</p>
                              </div>
                              <span className="font-mono font-semibold text-slate-900">
                                {formatRupiah(item.total)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-slate-500">Tagihan Layanan Internet Bulanan</div>
                        )}
                      </div>
                    </div>

                    {/* Ringkasan Subtotal */}
                    <div className="bg-slate-50 rounded-lg p-3.5 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal (DPP)</span>
                        <span className="font-mono">{formatRupiah(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PPN (11%)</span>
                        <span className="font-mono">{formatRupiah(selectedInvoice.tax_amount || 0)}</span>
                      </div>
                      {selectedInvoice.late_fee_amount > 0 && (
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Denda Keterlambatan</span>
                          <span className="font-mono">+{formatRupiah(selectedInvoice.late_fee_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                        <span>Sisa Harus Dibayar:</span>
                        <span className="font-mono text-blue-600">
                          {formatRupiah(
                            selectedInvoice.status === "PAID"
                              ? 0
                              : selectedInvoice.amount_due > 0
                              ? selectedInvoice.amount_due
                              : Math.max(0, (selectedInvoice.total_amount || 0) - (selectedInvoice.amount_paid || 0))
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Pembayaran QRIS */}
                    {selectedInvoice.status !== "PAID" &&
                    selectedInvoice.status !== "VOID" &&
                    selectedInvoice.status !== "CANCELLED" ? (
                      <div className="pt-1">
                        {!payOrder ? (
                          <button
                            type="button"
                            disabled={payLoading}
                            onClick={() => handleInitiatePay(selectedInvoice)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>{payLoading ? "Menyiapkan QRIS..." : "Bayar Sekarang via QRIS"}</span>
                          </button>
                        ) : (
                          <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 text-center space-y-4">
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">Scan QRIS Tagihan</h5>
                              <p className="text-xs text-slate-500">
                                Gunakan aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, ShopeePay, DANA).
                              </p>
                            </div>

                            <div className="inline-block p-3 bg-white rounded-xl shadow-xs border border-slate-200 mx-auto">
                              <img
                                src={payOrder.qr_image_url}
                                alt="QRIS Tagihan"
                                className="w-48 h-48 object-contain mx-auto"
                              />
                              <div className="mt-2 text-center">
                                <span className="text-xs text-slate-500 block">Total Pembayaran:</span>
                                <strong className="text-base font-bold text-slate-900 font-mono">
                                  {formatRupiah(payOrder.amount)}
                                </strong>
                              </div>
                            </div>

                            {payOrder.payment_url && (
                              <a
                                href={payOrder.payment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                              >
                                <span>Bayar via Midtrans (Virtual Account / E-Wallet)</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              disabled={payLoading}
                              onClick={handleConfirmPay}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{payLoading ? "Memverifikasi..." : "Saya Sudah Bayar / Cek Status"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : selectedInvoice.status === "PAID" ? (
                      <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Faktur ini sudah lunas dibayar. Layanan internet aktif.</span>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
                        Faktur ini telah dibatalkan / tidak berlaku lagi.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                    Pilih salah satu faktur di sebelah kiri untuk melihat rincian pembayaran.
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* ---------------------------------------------------- */
          /* PANDUAN RINGKAS (LANDING STATE TANPA LOOKUP)         */
          /* ---------------------------------------------------- */
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                Cara Mudah Bayar Tagihan Internet
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-2">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Cari Tagihan</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ketik Nomor Pelanggan atau Nomor WhatsApp yang terdaftar pada form di atas.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-2">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Scan QRIS Dinamis</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Buka m-Banking atau E-Wallet apa pun lalu scan kode QRIS tagihan yang tampil.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mb-2">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Otomatis Lunas</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sistem mendeteksi pembayaran seketika dan masa aktif langganan langsung diperpanjang.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
              <span className="text-xs font-semibold text-slate-500 block mb-3">
                Mendukung Pembayaran QRIS dari Semua Bank & E-Wallet:
              </span>
              <div className="flex flex-wrap justify-center items-center gap-2 text-xs font-medium text-slate-700">
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">BCA</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">Mandiri</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">BRI</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">BNI</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">BSI</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">GoPay</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">OVO</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">ShopeePay</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">DANA</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">LinkAja</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <p className="text-xs font-bold text-slate-800">Butuh Bantuan Customer Service?</p>
                <p className="text-xs text-slate-500">Hubungi kami jika nomor pelanggan belum ditemukan atau ada kendala pembayaran.</p>
              </div>
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shrink-0 inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TOP UP DEPOSIT MODAL                                     */}
        {/* ======================================================== */}
        {isTopUpModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] text-slate-900">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Isi Saldo Deposit</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {topUpStep === "select" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Pilih Nominal Pengisian:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[50000, 100000, 259000, 500000].map((amt) => {
                          const isSel = topUpAmount === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setTopUpAmount(amt)}
                              className={`p-3 rounded-lg border text-left transition ${
                                isSel
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-900"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="text-[11px] text-slate-500">
                                {amt === 259000 ? "Paket 1 Bulan" : "Deposit"}
                              </div>
                              <div className="text-sm font-bold font-mono text-slate-900">
                                {formatRupiah(amt)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Atau Masukkan Nominal Lain:
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Rp
                        </span>
                        <input
                          type="number"
                          min="10000"
                          step="5000"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(Number(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={topUpLoading}
                      onClick={handleSubmitTopUp}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                    >
                      {topUpLoading ? "Menghubungkan Midtrans..." : "Lanjutkan Pembayaran via QRIS"}
                    </button>
                  </div>
                )}

                {topUpStep === "qris" && topUpQrisData && (
                  <div className="space-y-4 text-center">
                    <div>
                      <span className="text-xs text-slate-500">Nominal Deposit:</span>
                      <div className="text-xl font-mono font-bold text-emerald-700">
                        {formatRupiah(topUpAmount)}
                      </div>
                    </div>

                    {topUpQrisData.qr_image_url && (
                      <div className="inline-block p-3 bg-white rounded-xl border border-slate-200">
                        <img
                          src={topUpQrisData.qr_image_url}
                          alt="QRIS Top Up"
                          className="w-48 h-48 object-contain mx-auto"
                        />
                      </div>
                    )}

                    {topUpQrisData.payment_url && (
                      <a
                        href={topUpQrisData.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition block"
                      >
                        Buka Pembayaran Midtrans (VA/E-Wallet)
                      </a>
                    )}

                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={topUpLoading}
                        onClick={handleConfirmTopUp}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                      >
                        {topUpLoading ? "Memverifikasi..." : "Saya Sudah Bayar / Cek Status"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopUpStep("select")}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        ← Ubah Nominal
                      </button>
                    </div>
                  </div>
                )}

                {topUpStep === "success" && (
                  <div className="py-4 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h5 className="font-bold text-slate-900 text-sm">Top Up Berhasil!</h5>
                    <p className="text-xs text-slate-500">{topUpSuccessMsg}</p>
                    <button
                      type="button"
                      onClick={() => setIsTopUpModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL PRINTABLE INVOICE / PDF                            */}
        {/* ======================================================== */}
        {isPrintInvoiceModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
            <style jsx global>{`
              @media print {
                body {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #public-printable-invoice,
                #public-printable-invoice * {
                  visibility: visible !important;
                }
                #public-printable-invoice {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${printPaperMode === "thermal" ? (thermalWidth === "58mm" ? "58mm" : "80mm") : "100%"} !important;
                  max-width: ${printPaperMode === "thermal" ? (thermalWidth === "58mm" ? "58mm" : "80mm") : "210mm"} !important;
                  margin: 0 !important;
                  padding: ${printPaperMode === "thermal" ? "2mm" : "10mm 15mm"} !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  z-index: 999999 !important;
                }
                .no-print {
                  display: none !important;
                }
                @page {
                  size: ${printPaperMode === "thermal" ? `${thermalWidth} auto` : "A4 portrait"};
                  margin: ${printPaperMode === "thermal" ? "0mm" : "8mm"};
                }
              }
            `}</style>

            <div
              className={`bg-white rounded-xl w-full ${
                printPaperMode === "thermal" ? "max-w-xl" : "max-w-4xl"
              } max-h-[92vh] flex flex-col shadow-xl overflow-hidden print:max-h-none print:shadow-none print:rounded-none`}
            >
              <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold">Cetak Faktur Tagihan ({selectedInvoice.invoice_number})</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setPrintPaperMode("a4")}
                      className={`px-2.5 py-1 rounded transition ${
                        printPaperMode === "a4" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      A4
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintPaperMode("thermal")}
                      className={`px-2.5 py-1 rounded transition ${
                        printPaperMode === "thermal" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Thermal
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintInvoiceModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                className={`overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center print:p-0 print:bg-white ${
                  printPaperMode === "thermal" ? "items-start" : ""
                }`}
              >
                <InvoicePrintDocument
                  template={templateSettings}
                  invoice={selectedInvoice}
                  customer={{
                    customer_name: lookupResult?.customer_name || selectedInvoice.customer_name,
                    customer_number: lookupResult?.customer_number || selectedInvoice.customer_number,
                    phone: lookupResult?.phone || selectedInvoice.customer_phone,
                  }}
                  elementId="public-printable-invoice"
                  overrideLayout={printPaperMode === "thermal" ? "thermal" : undefined}
                  thermalWidth={thermalWidth}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MINIMAL FOOTER                                           */}
      {/* ======================================================== */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>© 2026 PT ISPSYNC TEKNOLOGI NUSANTARA • Layanan Bantuan: {cleanPhone}</p>
      </footer>
    </div>
  );
}
