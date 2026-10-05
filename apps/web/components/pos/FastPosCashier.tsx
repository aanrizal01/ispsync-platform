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

interface FastPosCashierProps {
  onViewHistory?: () => void;
  hideHeaderBack?: boolean;
}

export function FastPosCashier({ onViewHistory, hideHeaderBack = false }: FastPosCashierProps) {
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
          setIsReceiptModalOpen(false);
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
  const handleSetExactCash = () => {
    setCashReceived(totalDue);
  };
  const handleAddCash = (nominal: number) => {
    setCashReceived((prev) => prev + nominal);
  };

  // Prepare Receipt Print Data
  const receiptPaymentData: PaymentReceiptData | null = useMemo(() => {
    if (!completedPayment && !selectedInvoice) return null;
    return {
      id: completedPayment?.id || "PREVIEW-ID",
      payment_number: completedPayment?.payment_number || `POS-${Date.now().toString().slice(-6)}`,
      invoice_id: selectedInvoice?.id,
      invoice_number: selectedInvoice?.invoice_number,
      amount: completedPayment?.amount || totalDue,
      payment_method: completedPayment?.payment_method || paymentMethod,
      status: "COMPLETED",
      paid_at: completedPayment?.paid_at || new Date().toISOString(),
      created_at: completedPayment?.created_at || new Date().toISOString(),
      notes: completedPayment?.notes || notes,
    };
  }, [completedPayment, selectedInvoice, totalDue, paymentMethod, notes]);

  const customerAddress = useMemo(() => {
    if (!selectedCustomer?.addresses?.length) return "-";
    const primary = selectedCustomer.addresses.find((a) => a.is_primary) || selectedCustomer.addresses[0];
    return [primary.street, primary.district, primary.city, primary.province].filter(Boolean).join(", ") || "-";
  }, [selectedCustomer]);

  const receiptCustomerData: ReceiptCustomerData | null = useMemo(() => {
    if (!selectedInvoice && !selectedCustomer) return null;
    return {
      customer_name: selectedCustomer?.full_name || selectedInvoice?.customer_name || "Pelanggan Loket",
      customer_number: selectedCustomer?.customer_number || selectedInvoice?.customer_number || "-",
      phone: selectedCustomer?.phone || selectedInvoice?.customer_phone || "-",
      address: customerAddress !== "-" ? customerAddress : undefined,
    };
  }, [selectedCustomer, selectedInvoice, customerAddress]);

  return (
    <div className="space-y-6 select-none">
      {/* POS Alert Notifications */}
      {posError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{posError}</span>
          </div>
          <button onClick={() => setPosError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left (Invoice Search & Customer) | Right (Checkout & Cash Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Customer & Invoice Lookup (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Invoice Search Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Cari Tagihan Pelanggan (Pindai Barcode / Ketik Nama)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {unpaidInvoices.length} Tagihan Menunggu
                </span>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  title="Segarkan Data Tagihan"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", loadingInvoices ? "animate-spin text-blue-600" : "")} />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Masukkan Nomor Faktur, ID Pelanggan, Nama, atau No HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Autocomplete Dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-72 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Tidak ditemukan tagihan belum lunas dengan kata kunci &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  searchResults.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600">
                            {inv.customer_name || "Tanpa Nama"}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {inv.customer_number || "-"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                          <span>Faktur: <b className="font-mono text-slate-700">{inv.invoice_number}</b></span>
                          <span>Jatuh Tempo: {formatDate(inv.due_date)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-blue-600">
                          {formatRupiah(inv.amount_due)}
                        </div>
                        <span className="text-[10px] text-slate-400">Klik untuk Pilih</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Invoice Details Card */}
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border-2 border-blue-500/40 p-5 shadow-sm space-y-4 animate-in fade-in-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                    Tagihan Terpilih di Kasir
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetPos}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Batal / Reset (Esc)</span>
                </button>
              </div>

              {/* Customer Profile Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedInvoice.customer_name ? selectedInvoice.customer_name[0].toUpperCase() : "P"}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                      {selectedInvoice.customer_name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No. Pelanggan: <span className="font-mono font-bold text-slate-700">{selectedInvoice.customer_number || "-"}</span> | Telp: <span className="font-mono text-slate-700">{selectedInvoice.customer_phone || selectedCustomer?.phone || "-"}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      Alamat: {customerAddress}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status Layanan</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {selectedCustomer?.status || "AKTIF"}
                  </span>
                </div>
              </div>

              {/* Invoice Breakdown Details */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">Nomor Faktur:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">Periode Tagihan:</span>
                  <span className="font-medium text-slate-800">
                    {selectedInvoice.billing_period_start && selectedInvoice.billing_period_end
                      ? `${formatDate(selectedInvoice.billing_period_start)} s/d ${formatDate(selectedInvoice.billing_period_end)}`
                      : formatDate(selectedInvoice.issue_date || selectedInvoice.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">Jatuh Tempo:</span>
                  <span className="font-bold text-rose-600">{formatDate(selectedInvoice.due_date)}</span>
                </div>

                {/* Items List */}
                {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Rincian Paket & Layanan</span>
                    <div className="bg-slate-50 rounded-xl p-2.5 divide-y divide-slate-200/60 text-xs">
                      {selectedInvoice.items.map((item, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between">
                          <span className="text-slate-700">{item.description} ({item.quantity}x)</span>
                          <span className="font-bold text-slate-900">{formatRupiah(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State: Standby Prompt */
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Loket Siap Melayani Pelanggan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Ketik nama pelanggan atau pindai nomor faktur pada kolom pencarian di atas untuk memulai transaksi loket kasir.
              </p>
            </div>
          )}

          {/* Quick List: 5 Antrean Tagihan Belum Bayar Teratas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Daftar Cepat Tagihan Belum Terbayar</span>
              </h4>
              <span className="text-[11px] text-slate-400">Klik baris untuk bayar</span>
            </div>

            <div className="divide-y divide-slate-100 overflow-hidden">
              {unpaidInvoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => handleSelectInvoice(inv)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center font-bold text-xs transition">
                      {inv.customer_name ? inv.customer_name[0].toUpperCase() : "P"}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                        {inv.customer_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.invoice_number} • JT: {formatDate(inv.due_date)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600">
                      {formatRupiah(inv.amount_due)}
                    </div>
                    <span className="text-[10px] text-amber-600 font-semibold">{inv.status}</span>
                  </div>
                </div>
              ))}
              {unpaidInvoices.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  Semua tagihan pelanggan telah lunas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: POS Checkout Counter & Payment Engine (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-5 sticky top-20">
            
            {/* Total Billing Display (Cash Register Style) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Total Yang Harus Dibayar
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                  {formatRupiah(totalDue)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800">
                  <span>Pelanggan: <b className="text-white">{selectedInvoice?.customer_name || "-"}</b></span>
                  <span>Faktur: <b className="text-white font-mono">{selectedInvoice?.invoice_number || "-"}</b></span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "MANUAL", label: "Tunai / Cash", icon: Banknote },
                  { id: "QRIS", label: "QRIS Dinamis", icon: QrCode },
                  { id: "VA_BCA", label: "Transfer BCA", icon: Building },
                  { id: "VA_MANDIRI", label: "Transfer Mandiri", icon: Building },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                        isSel
                          ? "border-blue-600 bg-blue-50/70 text-blue-700 font-bold shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSel ? "text-blue-600" : "text-slate-400"}`} />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Calculator (Only Active when Method = TUNAI) */}
            {paymentMethod === "MANUAL" && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Uang Diterima dari Pelanggan</label>
                  <button
                    type="button"
                    onClick={handleSetExactCash}
                    disabled={!selectedInvoice}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    Uang Pas ({formatRupiah(totalDue)})
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    disabled={!selectedInvoice}
                    value={cashReceived || ""}
                    onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>

                {/* Quick Cash Presets (Pecahan Rupiah) */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[50000, 100000, 150000, 200000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      disabled={!selectedInvoice}
                      onClick={() => setCashReceived(nominal)}
                      className="px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer text-center"
                    >
                      {formatRupiah(nominal).replace(",00", "")}
                    </button>
                  ))}
                </div>

                {/* Change Due Display */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Kembalian Kasir:</span>
                  <span
                    className={`text-lg font-black ${
                      isCashShort ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {isCashShort ? "Uang Kurang!" : formatRupiah(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Note Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Catatan Loket (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Titip tetangga, transfer via BCA kasir..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>

            {/* Action Checkout Button */}
            <button
              type="button"
              disabled={!selectedInvoice || isProcessing || isCashShort}
              onClick={handleProcessPayment}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                !selectedInvoice || isProcessing || isCashShort
                  ? "bg-slate-300 cursor-not-allowed text-slate-500 shadow-none"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 active:scale-[0.98]"
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Memproses Transaksi Loket...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Bayar &amp; Cetak Struk (Enter)</span>
                </>
              )}
            </button>

            {/* Hint shortcut */}
            <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <span className="font-semibold text-slate-500">Shortcut:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px]">Esc</kbd>
              <span>Reset loket</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PRINT STRUK KASIR THERMAL & A4 */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Pembayaran Berhasil Dicatat!</h3>
                  <p className="text-[11px] text-slate-500">Pratinjau Struk Kasir &amp; Pengaturan Cetak</p>
                </div>
              </div>
              <button
                onClick={handleResetPos}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Controls Bar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrintPaperMode("thermal")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    printPaperMode === "thermal"
                      ? "bg-white text-blue-600 shadow-2xs border border-slate-200 font-extrabold"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  Thermal POS
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPaperMode("a4")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    printPaperMode === "a4"
                      ? "bg-white text-blue-600 shadow-2xs border border-slate-200 font-extrabold"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  Faktur Standar (A4)
                </button>
              </div>

              {printPaperMode === "thermal" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[11px]">Lebar:</span>
                  <select
                    value={thermalWidth}
                    onChange={(e) => setThermalWidth(e.target.value as any)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700"
                  >
                    <option value="80mm">80 mm (Standard)</option>
                    <option value="58mm">58 mm (Mini)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Receipt Preview Area */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <div
                id="pos-thermal-receipt-container"
                className="bg-white shadow-md p-2 rounded-lg"
                style={{
                  width: printPaperMode === "thermal" ? (thermalWidth === "58mm" ? "240px" : "320px") : "100%",
                }}
              >
                {receiptPaymentData && receiptCustomerData && (
                  <ReceiptPrintDocument
                    template={templateSettings}
                    payment={receiptPaymentData}
                    customer={receiptCustomerData}
                    invoice={
                      selectedInvoice
                        ? {
                            invoice_number: selectedInvoice.invoice_number,
                            issue_date: selectedInvoice.issue_date,
                            created_at: selectedInvoice.created_at,
                            due_date: selectedInvoice.due_date,
                            status: selectedInvoice.status,
                            billing_period_start: selectedInvoice.billing_period_start,
                            billing_period_end: selectedInvoice.billing_period_end,
                            subtotal: selectedInvoice.subtotal,
                            tax_amount: selectedInvoice.tax_amount,
                            late_fee_amount: selectedInvoice.late_fee_amount,
                            total_amount: selectedInvoice.total_amount,
                            amount_paid: selectedInvoice.amount_paid,
                            amount_due: selectedInvoice.amount_due,
                            notes: selectedInvoice.notes,
                            items: (selectedInvoice.items || []).map((it) => ({
                              id: it.id,
                              description: it.description,
                              quantity: it.quantity,
                              unit_price: it.unit_price,
                              total: it.total,
                            })),
                          }
                        : null
                    }
                    overrideLayout={printPaperMode}
                    thermalWidth={thermalWidth}
                  />
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 p-4 bg-white">
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
