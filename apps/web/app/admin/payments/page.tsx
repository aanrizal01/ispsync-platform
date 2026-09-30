"use client";

import { useEffect, useState, useCallback } from "react";
import { paymentApi, type Payment, type CreateManualPaymentInput } from "@/lib/api/payments";
import { billingApi, type Invoice } from "@/lib/api/billing";
import { customerApi, type Customer } from "@/lib/api/customers";
import {
  settingsApi,
  type InvoiceTemplateSettings,
  defaultInvoiceTemplateSettings,
} from "@/lib/api/settings";
import { ReceiptPrintDocument } from "@/components/receipt/ReceiptPrintDocument";
import { InvoicePrintDocument } from "@/components/invoice/InvoicePrintDocument";
import { formatDate, formatRupiah, cn } from "@/lib/utils";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Printing & Document States
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<"receipt" | "invoice">("receipt");
  const [printPaperMode, setPrintPaperMode] = useState<"a4" | "thermal">("a4");
  const [thermalWidth, setThermalWidth] = useState<"80mm" | "58mm">("80mm");
  const [templateSettings, setTemplateSettings] =
    useState<InvoiceTemplateSettings>(defaultInvoiceTemplateSettings);
  const [loadingPrintData, setLoadingPrintData] = useState(false);

  // Form State
  const [form, setForm] = useState<{
    invoice_id: string;
    amount: number;
    payment_method: "MANUAL" | "QRIS" | "VA_BCA" | "VA_BNI" | "VA_MANDIRI" | "VA_BRI";
    notes: string;
  }>({
    invoice_id: "",
    amount: 0,
    payment_method: "MANUAL",
    notes: "",
  });

  useEffect(() => {
    settingsApi
      .getInvoiceTemplate()
      .then((data) => {
        if (data && data.brand_name) {
          setTemplateSettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice template settings:", err);
      });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [payRes, invRes] = await Promise.all([
        paymentApi.list({ status: statusFilter || undefined }),
        billingApi.list(),
      ]);
      setPayments(payRes || []);
      // Filter invoices that still have amount due
      const pending = (invRes || []).filter(
        (i) => (i.status === "ISSUED" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID") && i.amount_due > 0
      );
      setUnpaidInvoices(pending);
    } catch (err) {
      console.error("Failed to load payments data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectInvoice = (invID: string) => {
    const selected = unpaidInvoices.find((i) => i.id === invID);
    setForm({
      ...form,
      invoice_id: invID,
      amount: selected ? selected.amount_due : 0,
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const payload: CreateManualPaymentInput = {
        invoice_id: form.invoice_id,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        notes: form.notes || undefined,
      };

      await paymentApi.createManual(payload);
      setIsModalOpen(false);
      setForm({
        invoice_id: "",
        amount: 0,
        payment_method: "MANUAL",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mencatat pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrint = async (payment: Payment) => {
    setSelectedPayment(payment);
    setPrintDocType("receipt");
    setLoadingPrintData(true);
    setIsPrintModalOpen(true);

    try {
      // 1. Fetch customer details
      if (payment.customer_id) {
        try {
          const cust = await customerApi.getByID(payment.customer_id);
          setSelectedCustomer(cust);
        } catch {
          setSelectedCustomer(null);
        }
      } else {
        setSelectedCustomer(null);
      }

      // 2. Fetch linked invoice details
      if (payment.invoice_id) {
        try {
          const inv = await billingApi.getByID(payment.invoice_id);
          setSelectedInvoice(inv);
        } catch {
          setSelectedInvoice(null);
        }
      } else {
        setSelectedInvoice(null);
      }
    } finally {
      setLoadingPrintData(false);
    }
  };

  // Metrics
  const totalCompleted = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Pembayaran</h1>
          <p className="text-slate-500 text-sm mt-1">
            Catatan transaksi pembayaran tunai, transfer, dan gateway (Midtrans / QRIS)
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Catat Pembayaran Manual
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total Pembayaran Diterima</p>
          <p className="text-2xl font-extrabold text-emerald-600">{formatRupiah(totalCompleted)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total Transaksi</p>
          <p className="text-2xl font-extrabold text-slate-900">{payments.length} Pembayaran</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
        <span className="text-sm font-medium text-slate-700">Filter Status Pembayaran:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Semua Status</option>
          <option value="COMPLETED">Berhasil (COMPLETED)</option>
          <option value="PENDING">Menunggu (PENDING)</option>
          <option value="FAILED">Gagal (FAILED)</option>
          <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Nomor Transaksi</th>
                <th className="px-5 py-3.5">Faktur Terkait</th>
                <th className="px-5 py-3.5">Pelanggan</th>
                <th className="px-5 py-3.5">Metode</th>
                <th className="px-5 py-3.5">Jumlah Bayar</th>
                <th className="px-5 py-3.5">Waktu Transaksi</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Belum ada riwayat pembayaran
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                      {p.payment_number}
                    </td>
                    <td className="px-5 py-4 font-mono text-blue-600">
                      {p.invoice_number || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{p.customer_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{p.customer_number}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-600">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {p.paid_at ? formatDate(p.paid_at, "dd MMM yyyy HH:mm") : formatDate(p.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          p.status === "COMPLETED" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          p.status === "PENDING" && "bg-amber-50 text-amber-700 border border-amber-200",
                          p.status === "FAILED" && "bg-rose-50 text-rose-700 border border-rose-200"
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenPrint(p)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        title="Cetak Ulang Kwitansi / Struk / Faktur"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        <span>Cetak</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Pembayaran Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Catat Penerimaan Pembayaran</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Faktur Tagihan *</label>
                <select
                  required
                  value={form.invoice_id}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">-- Pilih Faktur yang Belum Lunas --</option>
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.customer_name} (Sisa: {formatRupiah(inv.amount_due)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Metode Penerimaan</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="MANUAL">Tunai / Kasir (MANUAL)</option>
                    <option value="VA_BCA">Transfer Bank BCA</option>
                    <option value="VA_MANDIRI">Transfer Bank Mandiri</option>
                    <option value="VA_BNI">Transfer Bank BNI</option>
                    <option value="VA_BRI">Transfer Bank BRI</option>
                    <option value="QRIS">QRIS Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jumlah Diterima (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan Transaksi</label>
                <input
                  type="text"
                  placeholder="Bukti transfer / nomor resi kasir"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-emerald-400"
                >
                  {submitting ? "Memproses..." : "Konfirmasi Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Pembayaran / Kwitansi / Faktur (Print / PDF Preview) */}
      {isPrintModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          {/* Dynamic Print CSS Styling */}
          <style>{`
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-receipt-doc, #printable-receipt-doc * {
                visibility: visible !important;
              }
              #printable-receipt-doc {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: ${printPaperMode === "thermal" ? (thermalWidth === "58mm" ? "58mm" : "80mm") : "100%"} !important;
                max-width: ${printPaperMode === "thermal" ? (thermalWidth === "58mm" ? "58mm" : "80mm") : "210mm"} !important;
                margin: 0 !important;
                padding: ${printPaperMode === "thermal" ? "2mm" : "10mm 12mm"} !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
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
            className={`bg-white rounded-2xl ${
              printPaperMode === "thermal" ? "max-w-xl" : "max-w-4xl"
            } w-full shadow-2xl max-h-[95vh] flex flex-col overflow-hidden my-auto border border-slate-200 transition-all`}
          >
            {/* Modal Action Bar (Hidden on print) */}
            <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">{printDocType === "receipt" ? "🧾" : "📄"}</span>
                <div>
                  <h2 className="text-sm font-bold tracking-wide">
                    {printDocType === "receipt"
                      ? printPaperMode === "thermal"
                        ? "Cetak Struk Pembayaran Kasir (Thermal POS)"
                        : "Cetak Kwitansi Pembayaran Resmi (A4)"
                      : printPaperMode === "thermal"
                      ? "Cetak Faktur Tagihan (Thermal POS)"
                      : "Cetak Faktur Tagihan Resmi (A4)"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    No. Transaksi: <strong className="text-white">{selectedPayment.payment_number}</strong>
                    {selectedPayment.invoice_number && (
                      <> &bull; Faktur: <span className="text-blue-300">{selectedPayment.invoice_number}</span></>
                    )}
                  </p>
                </div>
              </div>

              {/* Mode & Switcher Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Document Type Switcher */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintDocType("receipt")}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      printDocType === "receipt"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🧾 Kwitansi Bukti Bayar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!selectedPayment.invoice_id}
                    onClick={() => setPrintDocType("invoice")}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      printDocType === "invoice"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                    title={!selectedPayment.invoice_id ? "Tidak ada faktur terkait" : "Cetak Faktur Tagihan"}
                  >
                    <span>📄 Faktur Tagihan</span>
                  </button>
                </div>

                {/* Paper Mode Toggle */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintPaperMode("a4")}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      printPaperMode === "a4"
                        ? "bg-slate-700 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>📄 A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPaperMode("thermal")}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      printPaperMode === "thermal"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🧾 POS Kasir</span>
                  </button>
                </div>

                {/* Thermal Width Selector (if thermal) */}
                {printPaperMode === "thermal" && (
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setThermalWidth("80mm")}
                      className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                        thermalWidth === "80mm"
                          ? "bg-slate-700 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setThermalWidth("58mm")}
                      className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                        thermalWidth === "58mm"
                          ? "bg-slate-700 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      58mm
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div
              className={`overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center ${
                printPaperMode === "thermal" ? "items-start" : ""
              }`}
            >
              {loadingPrintData ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  Menyiapkan dokumen pencetakan...
                </div>
              ) : printDocType === "receipt" ? (
                <ReceiptPrintDocument
                  template={templateSettings}
                  payment={selectedPayment}
                  customer={{
                    customer_name: selectedPayment.customer_name || selectedCustomer?.full_name,
                    customer_number: selectedPayment.customer_number || selectedCustomer?.customer_number,
                    phone: selectedCustomer?.phone,
                    email: selectedCustomer?.email,
                    address:
                      selectedCustomer?.addresses && selectedCustomer.addresses.length > 0
                        ? selectedCustomer.addresses.find((a) => a.is_primary)?.street ||
                          selectedCustomer.addresses[0].street
                        : undefined,
                  }}
                  invoice={selectedInvoice}
                  elementId="printable-receipt-doc"
                  overrideLayout={printPaperMode}
                  thermalWidth={thermalWidth}
                />
              ) : selectedInvoice ? (
                <InvoicePrintDocument
                  template={templateSettings}
                  invoice={selectedInvoice}
                  customer={{
                    customer_name: selectedInvoice.customer_name || selectedCustomer?.full_name,
                    customer_number: selectedInvoice.customer_number || selectedCustomer?.customer_number,
                    phone: selectedInvoice.customer_phone || selectedCustomer?.phone,
                    email: selectedCustomer?.email,
                    address:
                      selectedCustomer?.addresses && selectedCustomer.addresses.length > 0
                        ? selectedCustomer.addresses.find((a) => a.is_primary)?.street ||
                          selectedCustomer.addresses[0].street
                        : undefined,
                  }}
                  elementId="printable-receipt-doc"
                  overrideLayout={printPaperMode === "thermal" ? "thermal" : undefined}
                  thermalWidth={thermalWidth}
                />
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
                  Data faktur tidak ditemukan untuk transaksi ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
