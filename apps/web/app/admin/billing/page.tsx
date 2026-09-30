"use client";

import { useEffect, useState, useCallback } from "react";
import { billingApi, type Invoice, type CreateManualInvoiceInput } from "@/lib/api/billing";
import { customerApi, type Customer } from "@/lib/api/customers";
import {
  settingsApi,
  type InvoiceTemplateSettings,
  defaultInvoiceTemplateSettings,
} from "@/lib/api/settings";
import { InvoicePrintDocument } from "@/components/invoice/InvoicePrintDocument";
import { formatDate, formatRupiah, cn } from "@/lib/utils";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printCustomer, setPrintCustomer] = useState<Customer | null>(null);
  const [templateSettings, setTemplateSettings] =
    useState<InvoiceTemplateSettings>(defaultInvoiceTemplateSettings);
  const [printPaperMode, setPrintPaperMode] = useState<"a4" | "thermal">("a4");
  const [thermalWidth, setThermalWidth] = useState<"80mm" | "58mm">("80mm");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getInvoiceTemplate()
      .then((data) => {
        if (data && data.brand_name) {
          setTemplateSettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice template in admin billing:", err);
      });
  }, []);

  // Form State Invoice Manual
  const [manualForm, setManualForm] = useState<{
    customer_id: string;
    due_date: string;
    notes: string;
    item_type: "SUBSCRIPTION" | "INSTALLATION" | "ACTIVATION" | "OTHER";
    description: string;
    quantity: number;
    unit_price: number;
    tax_percent: number;
  }>({
    customer_id: "",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    item_type: "SUBSCRIPTION",
    description: "Biaya Layanan Internet",
    quantity: 1,
    unit_price: 150000,
    tax_percent: 1100,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, custRes] = await Promise.all([
        billingApi.list({ status: statusFilter || undefined }),
        customerApi.list({ limit: 100 }),
      ]);
      setInvoices(invRes || []);
      setCustomers(custRes || []);
    } catch (err) {
      console.error("Failed to load billing data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const payload: CreateManualInvoiceInput = {
        customer_id: manualForm.customer_id,
        due_date: new Date(manualForm.due_date).toISOString(),
        notes: manualForm.notes || undefined,
        items: [
          {
            item_type: manualForm.item_type,
            description: manualForm.description,
            quantity: Number(manualForm.quantity),
            unit_price: Number(manualForm.unit_price),
            tax_percent: Number(manualForm.tax_percent),
          },
        ],
      };

      await billingApi.createManual(payload);
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async (id: string) => {
    if (!confirm("Terbitkan invoice ini kepada pelanggan (status ISSUED)?")) return;
    try {
      await billingApi.issue(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menerbitkan invoice");
    }
  };

  const handleVoid = async (id: string) => {
    const reason = prompt("Masukkan alasan pembatalan invoice (VOID):");
    if (!reason) return;
    try {
      await billingApi.void(id, reason);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan invoice");
    }
  };

  const openDetail = async (id: string) => {
    try {
      const inv = await billingApi.getByID(id);
      setSelectedInvoice(inv);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Gagal memuat rincian invoice");
    }
  };

  const openPrintInvoice = async (id: string) => {
    try {
      const inv = await billingApi.getByID(id);
      setSelectedInvoice(inv);
      if (inv.customer_id) {
        try {
          const cust = await customerApi.getByID(inv.customer_id);
          setPrintCustomer(cust);
        } catch {
          setPrintCustomer(customers.find((c) => c.id === inv.customer_id) || null);
        }
      } else {
        setPrintCustomer(null);
      }
      setIsPrintModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Gagal memuat rincian invoice untuk dicetak");
    }
  };

  // Metrics
  const totalOutstanding = invoices
    .filter((i) => i.status === "ISSUED" || i.status === "OVERDUE" || i.status === "PARTIALLY_PAID")
    .reduce((sum, i) => sum + i.amount_due, 0);

  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Faktur Tagihan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pengelolaan invoice berkala, pajak PPN, proration, dan status pembayaran pelanggan
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Faktur Manual
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total Tagihan Berjalan</p>
          <p className="text-2xl font-extrabold text-slate-900">{formatRupiah(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-rose-100 p-5 shadow-sm bg-rose-50/20">
          <p className="text-xs text-rose-600 mb-1 font-semibold uppercase">Faktur Overdue</p>
          <p className="text-2xl font-extrabold text-rose-700">{overdueCount} Faktur</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total Invoice Diterbitkan</p>
          <p className="text-2xl font-extrabold text-blue-600">{invoices.length}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
        <span className="text-sm font-medium text-slate-700">Filter Status Tagihan:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Semua Status</option>
          <option value="ISSUED">Diterbitkan (ISSUED)</option>
          <option value="OVERDUE">Jatuh Tempo (OVERDUE)</option>
          <option value="PAID">Lunas (PAID)</option>
          <option value="PARTIALLY_PAID">Sebagian (PARTIALLY_PAID)</option>
          <option value="DRAFT">Draft</option>
          <option value="VOID">Dibatalkan (VOID)</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Nomor Faktur</th>
                <th className="px-5 py-3.5">Pelanggan</th>
                <th className="px-5 py-3.5">Jatuh Tempo</th>
                <th className="px-5 py-3.5">Total Tagihan</th>
                <th className="px-5 py-3.5">Sisa Bayar</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Memuat data tagihan...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada faktur ditemukan
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-blue-600">
                      <button onClick={() => openDetail(inv.id)} className="hover:underline text-left">
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{inv.customer_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{inv.customer_number}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {formatRupiah(inv.total_amount)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-rose-600">
                      {formatRupiah(inv.amount_due)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          inv.status === "PAID" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          inv.status === "ISSUED" && "bg-blue-50 text-blue-700 border border-blue-200",
                          inv.status === "OVERDUE" && "bg-rose-50 text-rose-700 border border-rose-200",
                          inv.status === "DRAFT" && "bg-amber-50 text-amber-700 border border-amber-200",
                          inv.status === "VOID" && "bg-slate-100 text-slate-500 border border-slate-200"
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(inv.id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200"
                        >
                          Rincian
                        </button>
                        <button
                          onClick={() => openPrintInvoice(inv.id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 inline-flex items-center gap-1"
                          title="Cetak Faktur (Print / PDF)"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          <span>Cetak</span>
                        </button>
                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => handleIssue(inv.id)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                          >
                            Terbitkan
                          </button>
                        )}
                        {inv.status !== "PAID" && inv.status !== "VOID" && (
                          <button
                            onClick={() => handleVoid(inv.id)}
                            className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Batalkan (VOID)"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Rincian Faktur */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedInvoice.invoice_number}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pelanggan: {selectedInvoice.customer_name} ({selectedInvoice.customer_number})
                </p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4 border border-slate-200">
              <div>
                <span className="text-slate-400 block">Jatuh Tempo:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedInvoice.due_date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status Pembayaran:</span>
                <span className="font-semibold text-slate-800">{selectedInvoice.status}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <h3 className="font-bold text-slate-800 text-sm mb-2">Rincian Komponen Tagihan</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">Deskripsi</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Harga Satuan</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoice.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5">
                        <div className="font-medium text-slate-900">{it.description}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{it.item_type}</span>
                      </td>
                      <td className="p-2.5 text-center">{it.quantity}</td>
                      <td className="p-2.5 text-right">{formatRupiah(it.unit_price)}</td>
                      <td className="p-2.5 text-right font-semibold">{formatRupiah(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Calculation Breakdown */}
            <div className="space-y-1.5 text-xs text-right border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatRupiah(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>PPN / Pajak:</span>
                <span>{formatRupiah(selectedInvoice.tax_amount)}</span>
              </div>
              {selectedInvoice.late_fee_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Denda Keterlambatan (Late Fee):</span>
                  <span>+{formatRupiah(selectedInvoice.late_fee_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Tagihan:</span>
                <span>{formatRupiah(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-rose-600">
                <span>Sisa Tagihan (Amount Due):</span>
                <span>{formatRupiah(selectedInvoice.amount_due)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openPrintInvoice(selectedInvoice.id);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Cetak Faktur (Print / PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Faktur Manual */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Buat Faktur Tagihan Manual</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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

            <form onSubmit={handleCreateManualInvoice} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Pelanggan *</label>
                <select
                  required
                  value={manualForm.customer_id}
                  onChange={(e) => setManualForm({ ...manualForm, customer_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_number} — {c.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Jatuh Tempo *</label>
                <input
                  type="date"
                  required
                  value={manualForm.due_date}
                  onChange={(e) => setManualForm({ ...manualForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <h3 className="font-semibold text-slate-800 text-xs uppercase">Komponen Item Tagihan</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipe Item</label>
                  <select
                    value={manualForm.item_type}
                    onChange={(e) => setManualForm({ ...manualForm, item_type: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                  >
                    <option value="SUBSCRIPTION">Subscription / Langganan</option>
                    <option value="INSTALLATION">Biaya Pasang (Installation)</option>
                    <option value="ACTIVATION">Biaya Aktivasi</option>
                    <option value="OTHER">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi Item *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tarif Satuan (Rp) *</label>
                    <input
                      type="number"
                      required
                      value={manualForm.unit_price}
                      onChange={(e) => setManualForm({ ...manualForm, unit_price: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah (Qty) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={manualForm.quantity}
                      onChange={(e) => setManualForm({ ...manualForm, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Catatan pada faktur"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Menyimpan..." : "Buat Faktur (Draft)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Faktur (Print / PDF Preview) */}
      {isPrintModalOpen && selectedInvoice && (
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
              #printable-invoice, #printable-invoice * {
                visibility: visible !important;
              }
              #printable-invoice {
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
                <span className="text-lg">{printPaperMode === "thermal" ? "🧾" : "🖨️"}</span>
                <div>
                  <h2 className="text-sm font-bold tracking-wide">
                    {printPaperMode === "thermal" ? "Cetak Struk POS Thermal" : "Pratinjau Faktur Tagihan"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {printPaperMode === "thermal"
                      ? `Printer Kasir / Thermal ${thermalWidth}`
                      : "Format A4 Resmi"} &bull; {selectedInvoice.invoice_number}
                  </p>
                </div>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Paper Mode Toggle */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintPaperMode("a4")}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      printPaperMode === "a4"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>📄 Lembar A4</span>
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
                    <span>🧾 Struk POS</span>
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
              <InvoicePrintDocument
                template={templateSettings}
                invoice={selectedInvoice}
                customer={{
                  customer_name: selectedInvoice.customer_name,
                  customer_number: selectedInvoice.customer_number,
                  phone: selectedInvoice.customer_phone || printCustomer?.phone,
                  email: printCustomer?.email,
                  address:
                    printCustomer?.addresses && printCustomer.addresses.length > 0
                      ? printCustomer.addresses.find((a) => a.is_primary)?.street ||
                        printCustomer.addresses[0].street
                      : undefined,
                }}
                elementId="printable-invoice"
                overrideLayout={printPaperMode === "thermal" ? "thermal" : undefined}
                thermalWidth={thermalWidth}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
