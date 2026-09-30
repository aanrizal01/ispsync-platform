"use client";

import { useEffect, useState, useCallback } from "react";
import {
  expenseApi,
  type Expense,
  type ExpenseSummary,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  expenseCategories,
  expensePaymentMethods,
  type ExpenseCategory,
  type ExpensePaymentMethod,
} from "@/lib/api/expenses";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  Tag,
  Building2,
  CreditCard,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function AdminExpensesPage() {
  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, total_pages: 1 });
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isBhpFilter, setIsBhpFilter] = useState<string>("ALL"); // "ALL" | "TRUE" | "FALSE"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Year/Month for summary
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Expense | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Expense | null>(null);

  // Form states
  const todayStr = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState<CreateExpenseInput>({
    category: "UPSTREAM_BANDWIDTH",
    title: "",
    amount: 0,
    expense_date: todayStr,
    vendor_name: "",
    payment_method: "BANK_TRANSFER",
    bank_account: "",
    reference_number: "",
    is_bhp_deductible: true,
    notes: "",
  });

  // Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // ── Fetch Data ──────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async (page = 1) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await expenseApi.list({
        page,
        limit: 15,
        search: search || undefined,
        category: categoryFilter || undefined,
        is_bhp_deductible: isBhpFilter === "TRUE" ? true : isBhpFilter === "FALSE" ? false : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setExpenses(res.data || []);
      setMeta(res.meta || { page: 1, limit: 15, total: 0, total_pages: 1 });
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memuat data pengeluaran");
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, isBhpFilter, startDate, endDate]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await expenseApi.getSummary(selectedYear, selectedMonth);
      setSummary(res);
    } catch (err) {
      console.error("Gagal memuat ringkasan pengeluaran", err);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchExpenses(1);
  }, [fetchExpenses]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormData({
      category: "UPSTREAM_BANDWIDTH",
      title: "",
      amount: 0,
      expense_date: new Date().toISOString().split("T")[0],
      vendor_name: "",
      payment_method: "BANK_TRANSFER",
      bank_account: "BCA Operasional",
      reference_number: "",
      is_bhp_deductible: true,
      notes: "",
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setShowEditModal(exp);
    setFormData({
      category: exp.category,
      title: exp.title,
      amount: exp.amount,
      expense_date: exp.expense_date,
      vendor_name: exp.vendor_name || "",
      payment_method: exp.payment_method,
      bank_account: exp.bank_account || "",
      reference_number: exp.reference_number || "",
      is_bhp_deductible: exp.is_bhp_deductible,
      notes: exp.notes || "",
    });
  };

  const handleCategoryChange = (cat: ExpenseCategory) => {
    const preset = expenseCategories.find((c) => c.value === cat);
    setFormData((prev) => ({
      ...prev,
      category: cat,
      is_bhp_deductible: preset ? preset.isBhpDeductibleDefault : prev.is_bhp_deductible,
    }));
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      setErrorMessage("Nominal pengeluaran harus lebih dari Rp 0");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const created = await expenseApi.create({
        ...formData,
        vendor_name: formData.vendor_name || undefined,
        bank_account: formData.bank_account || undefined,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
      });
      showSuccess(`Pengeluaran "${created.title}" (${formatRupiah(created.amount)}) berhasil dicatat!`);
      setShowCreateModal(false);
      fetchExpenses(meta.page);
      fetchSummary();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    if (formData.amount <= 0) {
      setErrorMessage("Nominal pengeluaran harus lebih dari Rp 0");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await expenseApi.update(showEditModal.id, {
        ...formData,
        vendor_name: formData.vendor_name || undefined,
        bank_account: formData.bank_account || undefined,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
      });
      showSuccess(`Pengeluaran "${formData.title}" berhasil diperbarui!`);
      setShowEditModal(null);
      fetchExpenses(meta.page);
      fetchSummary();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await expenseApi.delete(showDeleteModal.id);
      showSuccess(`Pengeluaran "${showDeleteModal.title}" berhasil dihapus.`);
      setShowDeleteModal(null);
      fetchExpenses(meta.page);
      fetchSummary();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menghapus pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const url = expenseApi.exportCSVUrl({
      search: search || undefined,
      category: categoryFilter || undefined,
      is_bhp_deductible: isBhpFilter === "TRUE" ? true : isBhpFilter === "FALSE" ? false : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    window.open(url, "_blank");
  };

  const getCategoryInfo = (cat: ExpenseCategory) => {
    return (
      expenseCategories.find((c) => c.value === cat) || {
        value: cat,
        label: cat,
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        isBhpDeductibleDefault: false,
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-rose-600" />
            Buku Kas Pengeluaran Operasional
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catat dan pantau seluruh beban operasional ISP (Sewa Upstream/Bandwidth, Sewa Tiang, Gaji Teknisi, Listrik NOC, Material FO) serta integrasi pengurang resmi BHP & USO Kominfo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors"
            title="Ekspor CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Ekspor CSV
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Catat Pengeluaran Baru
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengeluaran Bulan Ini</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{formatRupiah(summary?.total_expenses_month || 0)}</span>
            <div className="text-xs text-slate-400 mt-1">
              {summary?.count_month || 0} transaksi kas keluar bulan ini
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengeluaran Tahun Ini</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{formatRupiah(summary?.total_expenses_year || 0)}</span>
            <div className="text-xs text-slate-400 mt-1">Tahun buku {selectedYear}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Pengurang Sah BHP & USO</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-700">{formatRupiah(summary?.total_bhp_deductible || 0)}</span>
            <div className="text-xs text-emerald-600 font-medium mt-1">
              Diakui resmi memotong DPT Kominfo (PP 43/2023)
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Beban Terbesar Bulan Ini</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-slate-900 truncate">
              {summary?.top_category_month ? getCategoryInfo(summary.top_category_month as ExpenseCategory).label : "Belum ada"}
            </div>
            <div className="text-xs font-bold text-amber-700 mt-1">
              {summary?.top_category_amount ? formatRupiah(summary.top_category_amount) : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi, vendor, bukti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 bg-white"
            >
              <option value="">Semua Kategori</option>
              {expenseCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* BHP Deductible Filter */}
          <div>
            <select
              value={isBhpFilter}
              onChange={(e) => setIsBhpFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 bg-white font-medium"
            >
              <option value="ALL">Semua Jenis Biaya</option>
              <option value="TRUE">Hanya Pengurang Sah BHP/USO</option>
              <option value="FALSE">Bukan Pengurang BHP/USO</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 bg-white"
              title="Tanggal Mulai"
            />
          </div>

          {/* Date Range End */}
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 bg-white"
              title="Tanggal Selesai"
            />
            {(search || categoryFilter || isBhpFilter !== "ALL" || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("");
                  setIsBhpFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors shrink-0"
                title="Reset Filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal & No. Kas</th>
                <th className="py-3 px-4">Kategori Pengeluaran</th>
                <th className="py-3 px-4">Keterangan & Vendor</th>
                <th className="py-3 px-4">Pengurang BHP/USO</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4 text-right">Nominal (IDR)</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Memuat data kas pengeluaran...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada catatan pengeluaran kas yang sesuai filter.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const catInfo = getCategoryInfo(exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{formatDate(exp.expense_date)}</div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">{exp.expense_number}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                            catInfo.badge
                          )}
                        >
                          {catInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={exp.title}>
                          {exp.title}
                        </div>
                        {exp.vendor_name ? (
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{exp.vendor_name}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px] italic mt-0.5">Tanpa vendor</div>
                        )}
                        {exp.notes && (
                          <div className="text-slate-400 text-[10px] truncate mt-0.5" title={exp.notes}>
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {exp.is_bhp_deductible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Pengurang Sah
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {exp.payment_method === "BANK_TRANSFER"
                            ? "Transfer Bank"
                            : exp.payment_method === "CASH"
                            ? "Kas Tunai"
                            : exp.payment_method === "PETTY_CASH"
                            ? "Petty Cash"
                            : "Lainnya"}
                        </div>
                        {exp.bank_account && (
                          <div className="text-slate-400 text-[11px] font-mono mt-0.5">{exp.bank_account}</div>
                        )}
                        {exp.reference_number && (
                          <div className="text-slate-500 text-[10px] mt-0.5">Ref: {exp.reference_number}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-sm font-bold text-rose-700">
                          {formatRupiah(exp.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Pengeluaran"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(exp)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.total_pages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Menampilkan {expenses.length} dari total {meta.total} transaksi pengeluaran
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => fetchExpenses(meta.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700">
                Halaman {meta.page} dari {meta.total_pages}
              </span>
              <button
                disabled={meta.page >= meta.total_pages}
                onClick={() => fetchExpenses(meta.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: CATAT / TAMBAH PENGELUARAN ──────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                Catat Pengeluaran Kas Baru
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Biaya Operasional *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Perihal Pengeluaran *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sewa Bandwidth 1 Gbps PT Telkom Indonesia"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Kas Keluar (IDR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={1000}
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-rose-700"
                  placeholder="Rp 0"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[500000, 1000000, 2500000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: amt })}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Penerima Dana</label>
                  <input
                    type="text"
                    placeholder="Contoh: PT Telkom / Toko Listrik"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Payment Method & Bank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as ExpensePaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {expensePaymentMethods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Akun Sumber Dana / Rekening</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rek BCA 12345678"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Bukti Transfer / Invoice Vendor</label>
                <input
                  type="text"
                  placeholder="Contoh: INV-TLK-2026-09 atau Ref Transfer m-Banking"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              {/* BHP/USO Deductible Checkbox */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bhp_deductible}
                    onChange={(e) => setFormData({ ...formData, is_bhp_deductible: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-emerald-900 block text-xs">
                      Pengurang Sah BHP Telekomunikasi & USO (Kominfo PP 43/2023)
                    </span>
                    <span className="text-[11px] text-emerald-700 leading-relaxed block mt-0.5">
                      Centang jika biaya ini merupakan sewa jaringan transmisi, sewa jalur fiber optic, sewa tiang/jartaplok, atau bandwidth upstream wholesale dari penyelenggara berizin. Otomatis mengisi pengurang DPT pada Laporan BHP/USO.
                    </span>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan keperluan atau rincian transaksi..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || formData.amount <= 0 || !formData.title}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT PENGELUARAN ────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Data Pengeluaran ({showEditModal.expense_number})
              </h3>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Biaya *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Perihal *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Kas Keluar (IDR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={1000}
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-rose-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Penerima</label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as ExpensePaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {expensePaymentMethods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Akun Sumber Dana</label>
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Bukti / Invoice Vendor</label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bhp_deductible}
                    onChange={(e) => setFormData({ ...formData, is_bhp_deductible: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-emerald-900 block text-xs">
                      Pengurang Sah BHP Telekomunikasi & USO (Kominfo PP 43/2023)
                    </span>
                    <span className="text-[11px] text-emerald-700 block mt-0.5">
                      Sewa jaringan upstream/transmisi yang diakui memotong DPT Kominfo.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || formData.amount <= 0 || !formData.title}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Perbarui Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: KONFIRMASI HAPUS ─────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Hapus Data Pengeluaran?</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus catatan pengeluaran{" "}
                <span className="font-semibold text-slate-800 font-mono">{showDeleteModal.expense_number}</span> -{" "}
                <span className="font-semibold text-slate-800">"{showDeleteModal.title}"</span> senilai{" "}
                <span className="font-bold text-rose-600">{formatRupiah(showDeleteModal.amount)}</span>?
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus Pengeluaran"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
