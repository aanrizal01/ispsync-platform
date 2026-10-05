"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Printer,
  RefreshCw,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  FileText,
  X,
  History,
  Check,
} from "lucide-react";
import { billingApi, type Invoice } from "@/lib/api/billing";
import { paymentApi, type Payment } from "@/lib/api/payments";
import { customerApi, type Customer } from "@/lib/api/customers";
import { settingsApi, type InvoiceTemplateSettings, defaultInvoiceTemplateSettings } from "@/lib/api/settings";
import { ReceiptPrintDocument, type PaymentReceiptData, type ReceiptCustomerData } from "@/components/receipt/ReceiptPrintDocument";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";

export default function FastPosCashierPage() {
  const { user: currentUser } = useAuth();

  // Data states
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<Payment[]>([]);
  const [templateSettings, setTemplateSettings] = useState<InvoiceTemplateSettings>(defaultInvoiceTemplateSettings);

  // Search & Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  // Cashier Calculator
  const [paymentMethod, setPaymentMethod] = useState<"MANUAL" | "QRIS" | "VA_BCA" | "VA_BNI" | "VA_MANDIRI" | "VA_BRI">("MANUAL");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  // Print & Receipt Modal
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [printPaperMode, setPrintPaperMode] = useState<"thermal" | "a4">("thermal");
  const [thermalWidth, setThermalWidth] = useState<"80mm" | "58mm">("80mm");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  const loadData = async () => {
    setLoadingInvoices(true);
    setPosError(null);
    try {
      const [invRes, payRes, tplRes] = await Promise.all([
        billingApi.list(),
        paymentApi.list({ limit: 10 }),
        settingsApi.getInvoiceTemplate().catch(() => defaultInvoiceTemplateSettings),
      ]);

      const pending = (invRes || []).filter(
        (i) => (i.status === "ISSUED" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID") && i.amount_due > 0
      );
      setUnpaidInvoices(pending);
      setRecentTransactions(payRes || []);
      if (tplRes && tplRes.brand_name) {
        setTemplateSettings(tplRes);
      }
    } catch (err: any) {
      setPosError(err.message || "Gagal memuat data tagihan dan kasir");
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto focus search input on mount
    searchInputRef.current?.focus();
  }, []);

  // Filtered unpaid invoices based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return unpaidInvoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_number?.toLowerCase().includes(q) ||
        inv.customer_phone?.toLowerCase().includes(q) ||
        inv.notes?.toLowerCase().includes(q)
    );
  }, [unpaidInvoices, searchQuery]);

  // When an invoice is clicked
  const handleSelectInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setSearchQuery("");
    setCashReceived(inv.amount_due); // default to exact amount
    setPosError(null);

    // Fetch full customer details
    if (inv.customer_id) {
      setLoadingCustomer(true);
      try {
        const cust = await customerApi.getByID(inv.customer_id);
        setSelectedCustomer(cust);
      } catch (err) {
        console.warn("Gagal memuat detail pelanggan:", err);
      } finally {
        setLoadingCustomer(false);
      }
    }
  };

  // Reset for next customer in line
  const handleResetPos = () => {
    setSelectedInvoice(null);
    setSelectedCustomer(null);
    setSearchQuery("");
    setCashReceived(0);
    setNotes("");
    setPosError(null);
    setIsReceiptModalOpen(false);
    setCompletedPayment(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  // Keyboard shortcut listener: Enter to pay, Esc to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isReceiptModalOpen) {
          handleResetPos();
        } else if (selectedInvoice) {
          handleResetPos();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReceiptModalOpen, selectedInvoice]);

  // Calculations
  const totalDue = selectedInvoice ? selectedInvoice.amount_due : 0;
  const changeAmount = Math.max(0, cashReceived - totalDue);
  const isCashShort = paymentMethod === "MANUAL" && cashReceived < totalDue;

  // Process Payment
  const handleProcessPayment = async () => {
    if (!selectedInvoice) return;
    if (paymentMethod === "MANUAL" && cashReceived < totalDue) {
      setPosError("Nominal uang yang diterima kurang dari total tagihan!");
      return;
    }

    setIsProcessing(true);
    setPosError(null);

    try {
      const cashierNote = [
        `Loket Kasir POS: ${currentUser?.full_name || "Kasir"}`,
        paymentMethod === "MANUAL" ? `(Uang Tunai: ${formatRupiah(cashReceived)}, Kembali: ${formatRupiah(changeAmount)})` : "",
        notes.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      const result = await paymentApi.createManual({
        invoice_id: selectedInvoice.id,
        amount: totalDue,
        payment_method: paymentMethod,
        notes: cashierNote,
      });

      setCompletedPayment(result);
      setIsReceiptModalOpen(true);
      // Refresh background data
      loadData();
    } catch (err: any) {
      setPosError(err.message || "Gagal memproses pembayaran di loket");
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger browser print
  const handleTriggerPrint = () => {
    const printEl = document.getElementById("pos-thermal-receipt-container");
    if (!printEl) {
      window.print();
      return;
    }
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Struk Pembayaran Loket</title>
          <style>
            @page { margin: 0; size: ${thermalWidth === "58mm" ? "58mm auto" : "80mm auto"}; }
            body { margin: 0; padding: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          ${printEl.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
        </html>
      `);
      win.document.close();
    } else {
      window.print();
    }
  };

  // Quick Cash amount helper
  const handleQuickCash = (amt: number) => {
    setCashReceived(amt);
  };

  // Prepare Receipt Print Data
  const receiptPaymentData: PaymentReceiptData = useMemo(() => {
    return {
      payment_number: completedPayment?.payment_number || `PAY-LOKET-${Date.now().toString().slice(-6)}`,
      invoice_number: selectedInvoice?.invoice_number || "-",
      amount: completedPayment?.amount || totalDue,
      payment_method: paymentMethod,
      status: "COMPLETED",
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      notes: notes || `Kasir: ${currentUser?.full_name || "Petugas Loket"}`,
    };
  }, [completedPayment, selectedInvoice, totalDue, paymentMethod, notes, currentUser]);

  const customerAddress = useMemo(() => {
    if (!selectedCustomer) return "-";
    if (selectedCustomer.addresses && selectedCustomer.addresses.length > 0) {
      const addr = selectedCustomer.addresses[0];
      return [addr.street, addr.district, addr.city].filter(Boolean).join(", ");
    }
    return "-";
  }, [selectedCustomer]);

  const receiptCustomerData: ReceiptCustomerData = useMemo(() => {
    return {
      customer_name: selectedCustomer?.full_name || selectedInvoice?.customer_name || "Pelanggan Loket",
      customer_number: selectedCustomer?.customer_number || selectedInvoice?.customer_number || "-",
      phone: selectedCustomer?.phone || selectedInvoice?.customer_phone || "-",
      address: customerAddress,
    };
  }, [selectedCustomer, selectedInvoice, customerAddress]);

  return (
    <div className="space-y-6 select-none">
      {/* Top Bar: Title & Shift Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Loket Kasir POS (Fast Checkout)
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Sistem Kasir Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Penerimaan pembayaran tagihan internet pelanggan, cetak struk thermal kasir POS, dan hitung kembalian instan.
            </p>
          </div>
        </div>

        {/* Shift Badge & Back to Payments */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-800 shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Petugas:</span>
            <span className="font-bold text-cyan-300">{currentUser?.full_name || "Kasir Utama"}</span>
          </div>

          <Link
            href="/admin/payments"
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Riwayat Pembayaran</span>
          </Link>

          <button
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Refresh Data Tagihan"
          >
            <RefreshCw className={`w-4 h-4 ${loadingInvoices ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* POS Alert Notifications */}
      {posError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{posError}</span>
          </div>
          <button onClick={() => setPosError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main POS Interface (Split Screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================
            LEFT COLUMN (7 Cols): Search & Invoice Details
           ======================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Customer & Invoice Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Pencarian Tagihan / Pelanggan
            </label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik Nama Pelanggan, ID (CUST-...), No. HP, atau No. Invoice..."
                className="w-full pl-11 pr-4 py-2.5 text-sm font-semibold border-2 border-slate-300 focus:border-blue-600 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 max-h-80 overflow-y-auto p-2">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Tidak ada tagihan tertunggak yang cocok dengan &quot;{searchQuery}&quot;.
                  </div>
                ) : (
                  searchResults.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="p-3 hover:bg-blue-50/80 rounded-xl cursor-pointer transition border border-transparent hover:border-blue-200 flex items-center justify-between gap-3 mb-1"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">{inv.customer_name || "Pelanggan"}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                            {inv.customer_number || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-mono">
                          <span>{inv.invoice_number}</span>
                          <span>&bull;</span>
                          <span>Jatuh Tempo: {formatDate(inv.due_date)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-extrabold text-slate-900 text-sm">
                          {formatRupiah(inv.amount_due)}
                        </p>
                        <span
                          className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            inv.status === "OVERDUE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {inv.status === "OVERDUE" ? "Jatuh Tempo" : "Belum Lunas"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Customer & Bill Card */}
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-md p-5 space-y-4 animate-in fade-in">
              {/* Header Box */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedCustomer?.full_name || selectedInvoice.customer_name || "Pelanggan Terpilih"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span>ID: {selectedCustomer?.customer_number || selectedInvoice.customer_number || "-"}</span>
                      {selectedCustomer?.phone && (
                        <>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {selectedCustomer.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleResetPos}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition flex items-center gap-1"
                  title="Ganti Pelanggan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                </button>
              </div>

              {/* Customer Address & Details */}
              {customerAddress !== "-" && (
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{customerAddress}</span>
                </div>
              )}

              {/* Invoice Breakdown */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <span>Rincian Tagihan ({selectedInvoice.invoice_number})</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Jatuh Tempo: {formatDate(selectedInvoice.due_date)}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  <div className="p-3 flex items-center justify-between bg-slate-50">
                    <span className="text-slate-600 font-medium">Subtotal Biaya Layanan</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(selectedInvoice.subtotal)}</span>
                  </div>

                  {selectedInvoice.tax_amount > 0 && (
                    <div className="p-2.5 flex items-center justify-between bg-white">
                      <span className="text-slate-500">Pajak (PPN 11%)</span>
                      <span className="font-mono text-slate-700">+{formatRupiah(selectedInvoice.tax_amount)}</span>
                    </div>
                  )}

                  {selectedInvoice.late_fee_amount > 0 && (
                    <div className="p-2.5 flex items-center justify-between bg-rose-50 text-rose-800">
                      <span className="font-medium">Denda Keterlambatan</span>
                      <span className="font-mono font-bold">+{formatRupiah(selectedInvoice.late_fee_amount)}</span>
                    </div>
                  )}

                  {selectedInvoice.discount_amount > 0 && (
                    <div className="p-2.5 flex items-center justify-between bg-emerald-50 text-emerald-800">
                      <span className="font-medium">Potongan Promo / Diskon</span>
                      <span className="font-mono font-bold">-{formatRupiah(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}

                  <div className="p-3 flex items-center justify-between bg-blue-50/50">
                    <span className="font-bold text-slate-900">Total Piutang Berjalan</span>
                    <span className="font-mono font-black text-blue-700 text-sm">
                      {formatRupiah(selectedInvoice.amount_due)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State Guide */
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Pelanggan Dipilih</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Ketik nama pelanggan, ID pelanggan, nomor WhatsApp, atau scan nomor barcode invoice pada kotak pencarian di atas untuk memulai transaksi pembayaran loket.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>Tips: Tekan</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                  Esc
                </kbd>
                <span>untuk reset transaksi kapan saja.</span>
              </div>
            </div>
          )}

          {/* Quick List: Invoices Due Today / Overdue */}
          {!selectedInvoice && unpaidInvoices.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Antrean Tagihan Tertunggak ({unpaidInvoices.length})
                </h4>
                <span className="text-[11px] text-slate-400">Klik baris untuk memilih</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {unpaidInvoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className="py-2.5 px-2 hover:bg-slate-50 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{inv.customer_name || "Pelanggan"}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{inv.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-slate-900">{formatRupiah(inv.amount_due)}</p>
                      <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        Jatuh Tempo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            RIGHT COLUMN (5 Cols): Cashier Payment & Change Calculator
           ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-6">
            {/* Total Amount Due Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/60 text-white shadow-md relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Tagihan Harus Dibayar
              </p>
              <h2 className="text-3xl sm:text-4xl font-black font-mono mt-2 tracking-tight text-cyan-300">
                {formatRupiah(totalDue)}
              </h2>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {selectedInvoice ? `Faktur: ${selectedInvoice.invoice_number}` : "Menunggu pilihan pelanggan..."}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("MANUAL")}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === "MANUAL"
                      ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span>Tunai / Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === "QRIS"
                      ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <QrCode className="w-5 h-5 text-purple-600" />
                  <span>QRIS Loket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("VA_BCA")}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod.startsWith("VA_")
                      ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building className="w-5 h-5 text-blue-600" />
                  <span>Transfer / VA</span>
                </button>
              </div>
            </div>

            {/* Cash Calculator (When Cash Method Selected) */}
            {paymentMethod === "MANUAL" && (
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Uang Diterima dari Pelanggan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={cashReceived || ""}
                      onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 text-lg font-black font-mono border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Quick Cash Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(totalDue)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 transition cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(50000)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(100000)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    100.000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(200000)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    200.000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(500000)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    500.000
                  </button>
                </div>

                {/* Change Due Box */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isCashShort
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-emerald-50 border-emerald-200 text-emerald-950"
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isCashShort ? "Uang Masih Kurang" : "Kembalian Pelanggan"}
                  </span>
                  <span className="font-mono font-black text-xl">
                    {isCashShort ? formatRupiah(totalDue - cashReceived) : formatRupiah(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Catatan Transaksi (Opsional)
              </label>
              <input
                type="text"
                placeholder="Misal: Diterima oleh orang tua / transfer BCA"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Process Payment Button */}
            <button
              type="button"
              disabled={!selectedInvoice || isProcessing || isCashShort}
              onClick={handleProcessPayment}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 transition cursor-pointer ${
                !selectedInvoice || isCashShort
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-500/25 active:scale-[0.98]"
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Memproses Pembayaran...</span>
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  <span>Bayar &amp; Cetak Struk Kasir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          RECENT TRANSACTIONS TABLE (Today's Shift)
         ======================================================== */}
      {recentTransactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Transaksi Pembayaran Terkini
              </h3>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Lihat Semua Transaksi &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">No. Transaksi</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Faktur</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.slice(0, 5).map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{pay.payment_number}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{pay.customer_name || "-"}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{pay.invoice_number || "-"}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold font-mono text-[10px]">
                        {pay.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                      {formatRupiah(pay.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {pay.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setCompletedPayment(pay);
                          setIsReceiptModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Cetak Struk</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Struk Pembayaran Kasir POS (Receipt Dialog)
         ======================================================== */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pembayaran Berhasil Dilunasi</h3>
                  <p className="text-xs text-slate-500">Struk bukti transaksi loket siap dicetak.</p>
                </div>
              </div>
              <button
                onClick={handleResetPos}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Paper Size & Layout Switcher */}
            <div className="py-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Mode Cetak:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setPrintPaperMode("thermal")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      printPaperMode === "thermal" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                    }`}
                  >
                    🧾 Thermal POS
                  </button>
                  <button
                    onClick={() => setPrintPaperMode("a4")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      printPaperMode === "a4" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                    }`}
                  >
                    📄 Standar A4
                  </button>
                </div>
              </div>

              {printPaperMode === "thermal" && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setThermalWidth("80mm")}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border cursor-pointer transition ${
                      thermalWidth === "80mm"
                        ? "bg-slate-900 text-cyan-400 border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    onClick={() => setThermalWidth("58mm")}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border cursor-pointer transition ${
                      thermalWidth === "58mm"
                        ? "bg-slate-900 text-cyan-400 border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    58mm
                  </button>
                </div>
              )}
            </div>

            {/* Struk Document Preview (Scrollable) */}
            <div className="overflow-y-auto py-4 flex-1 flex justify-center bg-slate-100/70 rounded-2xl my-3 p-4">
              <div
                id="pos-thermal-receipt-container"
                className="bg-white shadow-md p-2 rounded-lg"
                style={{
                  width: printPaperMode === "thermal" ? (thermalWidth === "58mm" ? "240px" : "320px") : "100%",
                }}
              >
                <ReceiptPrintDocument
                  template={templateSettings}
                  payment={receiptPaymentData}
                  customer={receiptCustomerData}
                  invoice={
                    selectedInvoice
                      ? {
                          ...selectedInvoice,
                          invoice_number: selectedInvoice.invoice_number,
                          items: selectedInvoice.items || [],
                        }
                      : null
                  }
                  overrideLayout={printPaperMode}
                  thermalWidth={thermalWidth}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResetPos}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Transaksi Baru (Esc)</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
