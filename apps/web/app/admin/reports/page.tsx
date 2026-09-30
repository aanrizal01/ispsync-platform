"use client";

import { useEffect, useState } from "react";
import {
  reportsApi,
  FinancialSummary,
  PlanRevenue,
  RevenueTrend,
  TrafficStats,
  BHPUSOReport,
} from "@/lib/api/reports";
import { formatRupiah } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  BarChart3,
  Landmark,
  Radio,
  Coins,
  Home,
  Globe,
  Store,
  Receipt,
  CreditCard,
  Lock,
  Scale,
  Download,
  Upload,
  Activity,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
  AlertCircle,
  FileSpreadsheet,
  FileDown,
  Layers,
  Calendar,
  Percent,
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "bhp_uso">("overview");
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [plans, setPlans] = useState<PlanRevenue[]>([]);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [traffic, setTraffic] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthsRange, setMonthsRange] = useState<number>(6);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingTaxCsv, setExportingTaxCsv] = useState(false);

  // BHP & USO State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [bhpReport, setBhpReport] = useState<BHPUSOReport | null>(null);
  const [loadingBhp, setLoadingBhp] = useState<boolean>(false);
  const [exportingBhpCsv, setExportingBhpCsv] = useState<boolean>(false);

  useEffect(() => {
    fetchReports(monthsRange);
  }, [monthsRange]);

  useEffect(() => {
    if (activeTab === "bhp_uso") {
      fetchBHPReport(selectedYear);
    }
  }, [activeTab, selectedYear]);

  const fetchBHPReport = async (yr: number) => {
    try {
      setLoadingBhp(true);
      const res = await reportsApi.getBHPUSOReport(yr);
      setBhpReport(res);
    } catch (err: any) {
      console.error("Gagal memuat data BHP/USO:", err);
    } finally {
      setLoadingBhp(false);
    }
  };

  const handleExportBhpCSV = async () => {
    try {
      setExportingBhpCsv(true);
      await reportsApi.exportBHPUSOCsv(selectedYear);
    } catch (err: any) {
      alert(err?.message || "Gagal mengekspor laporan BHP/USO.");
    } finally {
      setExportingBhpCsv(false);
    }
  };

  const fetchReports = async (months: number) => {
    try {
      setLoading(true);
      setError(null);
      const [finRes, planRes, trendRes, trafRes] = await Promise.all([
        reportsApi.getFinancialSummary(),
        reportsApi.getPlanRevenue(),
        reportsApi.getRevenueTrends(months),
        reportsApi.getTrafficStats(),
      ]);
      setFinancial(finRes);
      setPlans(planRes);
      setTrends(trendRes);
      setTraffic(trafRes);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data laporan.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCsv(true);
      await reportsApi.exportCsv();
    } catch (err: any) {
      alert(err?.message || "Gagal mengekspor data CSV Faktur.");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportVoucherTaxCSV = async () => {
    try {
      setExportingTaxCsv(true);
      await reportsApi.exportVoucherTaxCsv();
    } catch (err: any) {
      alert(err?.message || "Gagal mengekspor data Pajak Voucher PMK 6.");
    } finally {
      setExportingTaxCsv(false);
    }
  };

  const chartData = (trends || []).map((t) => ({
    bulan: t.month,
    Tagihan: t.invoiced,
    Terbayar: t.collected,
  }));

  const planChartData = (plans || []).map((p) => ({
    name: p.plan_name,
    Pendapatan: p.monthly_revenue,
    Pelanggan: p.subscriber_count,
  }));

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white font-mono uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>ISPSYNC BILLING ENGINE</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono uppercase">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Akuntansi & Analitik Keuangan ISP</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Laporan & Analitik Keuangan ISP
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Statistik pendapatan bulanan (MRR/ARR), margin kontribusi, komposisi voucher & kepatuhan pajak PMK 6/2021, serta kalkulator resmi BHP & USO Kominfo.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <select
              value={monthsRange}
              onChange={(e) => setMonthsRange(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-700 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value={3}>3 Bulan Terakhir</option>
              <option value={6}>6 Bulan Terakhir</option>
              <option value={12}>12 Bulan Terakhir</option>
            </select>

            <button
              onClick={handleExportCSV}
              disabled={exportingCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
              title="Ekspor Laporan Faktur & Langganan Bulanan"
            >
              {exportingCsv ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{exportingCsv ? "Mengekspor..." : "Ekspor Faktur (CSV)"}</span>
            </button>

            <button
              onClick={handleExportVoucherTaxCSV}
              disabled={exportingTaxCsv}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
              title="Ekspor Rekapitulasi Pajak PPN Voucher sesuai PMK 6/2021"
            >
              {exportingTaxCsv ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{exportingTaxCsv ? "Mengekspor..." : "Pajak Voucher (PMK 6)"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto mt-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-md"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-md"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Ikhtisar Keuangan & Trafik</span>
          </button>
          <button
            onClick={() => setActiveTab("bhp_uso")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "bhp_uso"
                ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-md"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-md"
            }`}
          >
            <Landmark className="w-4 h-4 text-slate-600" />
            <span>Kalkulator & Laporan BHP / USO (PP 43/2023)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Resmi
            </span>
          </button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 p-4 border border-rose-200 text-xs font-mono text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Seksi 1: Executive Financial Scorecards (4 Kartu) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: MRR & ARR */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                    Omset Berulang (MRR)
                  </span>
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.mrr) : "—"}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">ARR (Tahunan):</span>
                <span className="font-mono font-bold text-slate-800">
                  {financial ? formatRupiah(financial.arr) : "—"}
                </span>
              </div>
            </div>

            {/* Card 2: ARPU & Pelanggan Aktif */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                    ARPU (Avg Revenue / User)
                  </span>
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.arpu) : "—"}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Pelanggan Aktif:</span>
                <span className="font-mono font-bold text-slate-800">
                  {financial?.active_subscribers || 0} Langganan
                </span>
              </div>
            </div>

            {/* Card 3: Realisasi Penerimaan (Total Collected) */}
            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/20 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-emerald-800 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                    Total Diterima / Terbayar
                  </span>
                  <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-800 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.total_collected) : "—"}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-200/50 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700">Collection Rate:</span>
                <span className="font-mono font-bold text-emerald-800 px-1.5 py-0.2 rounded bg-emerald-100">
                  {financial ? financial.collection_rate_percent.toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Card 4: Tunggakan & Churn */}
            <div className="rounded-lg border border-rose-200/70 bg-rose-50/20 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-rose-800 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                    Tunggakan Belum Dibayar
                  </span>
                  <div className="w-7 h-7 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-700 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.outstanding_due) : "—"}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-rose-200/50 flex items-center justify-between text-[11px]">
                <span className="text-rose-700">Churn Rate 30 Hari:</span>
                <span className="font-mono font-bold text-rose-800 px-1.5 py-0.2 rounded bg-rose-100">
                  {financial ? financial.churn_rate_percent.toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Seksi 2: Profitabilitas & Beban Jartaplok Wholesale (2 Kolom) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Beban Jartaplok */}
            <div className="rounded-lg border border-rose-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-800">
                        Beban Jartaplok (HPP Jaringan)
                      </span>
                      <p className="text-[11px] text-slate-500">Sewa port last-mile & bitstream rekanan wholesale</p>
                    </div>
                  </div>
                  <a
                    href="https://rekan.ispsync.id"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-rose-600 hover:text-rose-800 font-mono font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>Portal Rekan</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-2xl font-black text-rose-800 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.jartaplok_cogs || 0) : "—"}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Biaya sewa port wholesale • <span className="font-mono font-bold text-slate-800">{financial?.jartaplok_active_ports || 0}</span> port aktif ({financial?.jartaplok_partner_name || "PT GNET BIARO DATA"})
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Alokasi Beban Pokok Transmisi</span>
                <span className="font-mono font-bold text-rose-700">Dihitung otomatis via Modul ISP</span>
              </div>
            </div>

            {/* Laba Kotor (Gross Profit) */}
            <div className="rounded-lg border border-emerald-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
                        Laba Kotor (Gross Profit)
                      </span>
                      <p className="text-[11px] text-slate-500">Pendapatan bersih setelah PPN, HPP port & komisi agen</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Margin {financial ? (financial.gross_margin_percent || 0).toFixed(1) : "0"}%
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-800 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.gross_profit || 0) : "—"}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Total Diterima bersih setelah dipotong PPN, Beban Jartaplok & Beban Komisi Mitra
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Formula: (Omset - PPN) - Jartaplok - Komisi</span>
                <span className="font-mono font-bold text-emerald-700">Laba Operasional Bersih</span>
              </div>
            </div>
          </div>

          {/* Seksi 3: Rincian Komposisi Omset & Pajak Voucher PMK 6/2021 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h2 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                  Komposisi Pendapatan & Pajak (Langganan vs Voucher Hotspot)
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Kepatuhan PMK No. 6/2021
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pendapatan Langganan */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-700">
                    Langganan Bulanan (PPPoE)
                  </span>
                  <Home className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-900 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.subscription_collected || 0) : "—"}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-blue-700 font-mono">
                  PPN 11%: {financial ? formatRupiah(financial.subscription_tax || 0) : "—"}
                </div>
              </div>

              {/* Voucher Hotspot Online */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700">
                    Voucher Hotspot Online
                  </span>
                  <Globe className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-900 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.voucher_online_collected || 0) : "—"}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Beli Mandiri QRIS (Net Diskon)
                </div>
              </div>

              {/* Voucher Grosir Agen */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-700">
                    Grosir Batch Agen
                  </span>
                  <Store className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.voucher_offline_collected || 0) : "—"}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Penjualan ke Mitra Konter/Warung
                </div>
              </div>

              {/* Pajak PPN Voucher & Beban Komisi */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700">
                    PPN Voucher (11%)
                  </span>
                  <Receipt className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-black text-teal-900 font-mono tracking-tight">
                  {financial ? formatRupiah(financial.voucher_tax || 0) : "—"}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-teal-700 font-mono">
                  Beban Komisi: {financial ? formatRupiah(financial.total_agent_commission || 0) : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Seksi 4: Saldo Titipan, Jaminan & Liabilitas Pajak */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
              Posisi Saldo Titipan, Jaminan & Liabilitas Pajak
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Saldo Titipan Pelanggan */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                      Saldo Titipan User
                    </span>
                    <CreditCard className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {financial ? formatRupiah(financial.total_active_credits || 0) : "—"}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  Liabilitas / Siap Memotong Tagihan
                </div>
              </div>

              {/* Deposit Saldo Mitra Agen */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                      Deposit Saldo Agen
                    </span>
                    <Store className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-black text-indigo-900 font-mono tracking-tight">
                    {financial ? formatRupiah(financial.total_agent_deposits || 0) : "—"}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span>Saldo Mengendap</span>
                  <a
                    href="/admin/agents"
                    className="hover:underline font-mono font-bold text-indigo-700 flex items-center gap-0.5"
                    title="Buka menu Agen Voucher untuk melihat mutasi saldo"
                  >
                    <span>Rincian</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Deposit Jaminan Dibekukan */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                      Deposit Jaminan (Hold)
                    </span>
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-amber-900 font-mono tracking-tight">
                    {financial ? formatRupiah(financial.total_held_deposits || 0) : "—"}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  Titipan Jaminan Pelanggan
                </div>
              </div>

              {/* Jaminan Disita / Pinalti */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                      Jaminan Disita / Pinalti
                    </span>
                    <Scale className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-black text-purple-900 font-mono tracking-tight">
                    {financial ? formatRupiah(financial.total_forfeited_deposits || 0) : "—"}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  Pendapatan Lain-lain (Wanprestasi)
                </div>
              </div>

              {/* PPN 11% Terkumpul */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                      PPN 11% Terkumpul
                    </span>
                    <Landmark className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-xl font-black text-teal-900 font-mono tracking-tight">
                    {financial ? formatRupiah(financial.total_tax_collected || 0) : "—"}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                  Hutang Pajak Faktur Lunas
                </div>
              </div>
            </div>
          </div>

          {/* Seksi 5: Charts & RADIUS Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Area Chart */}
            <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase text-slate-900">
                    Tren Tagihan & Pembayaran
                  </h2>
                  <p className="text-xs text-slate-500">Komparasi nominal faktur yang terbit vs nominal terbayar</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {monthsRange} Bulan Terakhir
                </span>
              </div>

              <div className="h-72 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatRupiah(Number(value) || 0), ""]}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Area
                        type="monotone"
                        dataKey="Tagihan"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorInvoiced)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Terbayar"
                        stroke="#059669"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPaid)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Belum ada data transaksi pada periode ini
                  </div>
                )}
              </div>
            </div>

            {/* Traffic Stats Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-mono font-bold uppercase text-slate-900 mb-1">
                  Aktivitas Jaringan & RADIUS
                </h2>
                <p className="text-xs text-slate-500 mb-4">Statistik pemakaian bandwidth dan sesi online</p>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Total Trafik Akuntansi</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {traffic ? traffic.total_gigabytes.toFixed(2) : "0.00"} GB
                    </span>
                  </div>

                  <div className="p-2.5 bg-blue-50/50 rounded-md border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">Unduhan (Download)</span>
                    </div>
                    <span className="text-sm font-bold text-blue-900 font-mono">
                      {traffic ? traffic.download_gigabytes.toFixed(2) : "0.00"} GB
                    </span>
                  </div>

                  <div className="p-2.5 bg-purple-50/50 rounded-md border border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-800">Unggahan (Upload)</span>
                    </div>
                    <span className="text-sm font-bold text-purple-900 font-mono">
                      {traffic ? traffic.upload_gigabytes.toFixed(2) : "0.00"} GB
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-50/50 rounded-md border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-800">Sesi Aktif Online</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-900 font-mono">
                      {traffic ? traffic.active_sessions : 0} Sesi
                    </span>
                  </div>

                  <div className="p-2.5 bg-amber-50/50 rounded-md border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-800">Rata-rata Durasi Sesi</span>
                    </div>
                    <span className="text-sm font-bold text-amber-900 font-mono">
                      {traffic ? traffic.avg_session_minutes : 0} Menit
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seksi 6: Plan Breakdown & Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-xs font-mono font-bold uppercase text-slate-900 mb-1">
                Pendapatan per Paket
              </h2>
              <p className="text-xs text-slate-500 mb-4">Grafik komparasi nominal omset per paket</p>
              <div className="h-64 w-full">
                {planChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={planChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#334155" }}
                        width={90}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatRupiah(Number(val) || 0), "Pendapatan"]}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      />
                      <Bar dataKey="Pendapatan" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Belum ada data paket
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-xs overflow-hidden">
              <h2 className="text-xs font-mono font-bold uppercase text-slate-900 mb-1">
                Rincian Paket & Pelanggan
              </h2>
              <p className="text-xs text-slate-500 mb-4">Tabel distribusi pelanggan dan kontribusi pendapatan berulang</p>

              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Nama Paket</th>
                      <th className="px-4 py-2.5 text-right">Pelanggan Aktif</th>
                      <th className="px-4 py-2.5 text-right">Harga Bulanan</th>
                      <th className="px-4 py-2.5 text-right">Total Pendapatan / Bln</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {plans.length > 0 ? (
                      plans.map((p) => (
                        <tr key={p.plan_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-900">{p.plan_name}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800">{p.subscriber_count} user</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{formatRupiah(p.monthly_price)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                            {formatRupiah(p.monthly_revenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-mono">
                          Belum ada data langganan paket.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: BHP & USO Kominfo (PP 43/2023) */}
      {activeTab === "bhp_uso" && (
        <div className="space-y-6">
          {/* Subheader & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white border border-slate-200 rounded-lg shadow-xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  REGULASI RESMI PP 43/2023
                </span>
                <span className="text-xs text-slate-500 font-medium">Portal e-PNBP SIMS Kominfo</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                Kalkulator & Rekapitulasi BHP & USO (Kominfo)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Biaya Hak Penyelenggaraan (0,5%) dan Kontribusi Pelayanan Universal (1,25%) atas Dasar Pengenaan Tarif (DPT).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-xs font-mono font-bold text-slate-700">Tahun:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono font-bold text-slate-900 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExportBhpCSV}
                disabled={exportingBhpCsv || loadingBhp}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
                title="Unduh Rekapitulasi Format e-PNBP Kominfo"
              >
                {exportingBhpCsv ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{exportingBhpCsv ? "Mengekspor..." : "Ekspor CSV e-PNBP"}</span>
              </button>
            </div>
          </div>

          {/* Info Alert PNBP */}
          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-lg flex items-start gap-3">
            <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-sans">
              <strong>Ketentuan Resmi PNBP Kominfo:</strong> Dasar Pengenaan Tarif (DPT) = Pendapatan Kotor Objek Telko (Langganan PPPoE DPP + Penjualan Voucher DPP) dikurangi Pengurang yang Sah (Beban Sewa Jaringan/Jartaplok/Transmisi Upstream & Piutang Macet). Pajak PPN 11% dan penjualan perangkat keras (ONT/Router) otomatis dikeluarkan. Tarif resmi: <strong>BHP Telekomunikasi 0,5%</strong> + <strong>Kontribusi USO (KPU) 1,25%</strong> = <strong>Total 1,75%</strong>.
            </div>
          </div>

          {loadingBhp ? (
            <div className="py-16 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
              <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-mono font-bold text-slate-700">Menghitung kalkulasi BHP & USO Tahun {selectedYear}...</p>
            </div>
          ) : bhpReport ? (
            <>
              {/* Annual KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Total Pendapatan Kotor (Gross)
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {formatRupiah(bhpReport.annual_summary.gross_revenue)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 font-mono">
                    Langganan: {formatRupiah(bhpReport.annual_summary.subscription_revenue)} | Voucher: {formatRupiah(bhpReport.annual_summary.voucher_revenue)}
                  </div>
                </div>

                <div className="rounded-lg border border-rose-200/80 bg-rose-50/20 p-4 shadow-xs">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700">
                    Pengurang Sah (Deductibles)
                  </div>
                  <div className="mt-2 text-2xl font-black text-rose-700 font-mono tracking-tight">
                    {formatRupiah(bhpReport.annual_summary.total_deductibles)}
                  </div>
                  <div className="mt-1 text-[11px] text-rose-600">
                    Sewa Jartaplok / Transmisi + Piutang Macet
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200/80 bg-blue-50/20 p-4 shadow-xs">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-700">
                    Dasar Pengenaan Tarif (DPT)
                  </div>
                  <div className="mt-2 text-2xl font-black text-blue-800 font-mono tracking-tight">
                    {formatRupiah(bhpReport.annual_summary.tariff_base_amount)}
                  </div>
                  <div className="mt-1 text-[11px] text-blue-600">
                    Basis Pengali BHP & USO Tahun {selectedYear}
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/20 p-4 shadow-xs">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span>Total Setoran PNBP (1,75%)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold">1,75%</span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-800 font-mono tracking-tight">
                    {formatRupiah(bhpReport.annual_summary.total_payable)}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700 flex justify-between font-mono">
                    <span>BHP (0,5%): {formatRupiah(bhpReport.annual_summary.bhp_amount)}</span>
                    <span>USO (1,25%): {formatRupiah(bhpReport.annual_summary.uso_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Quarters Grid (Q1 - Q4) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase text-slate-900">
                      Rekapitulasi per Triwulan (Jadwal Setor Kominfo)
                    </h3>
                    <p className="text-xs text-slate-500">Setoran PNBP wajib dilaporkan melalui portal SIMS Kominfo tiap akhir kuartal</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {bhpReport.quarters.map((q) => {
                    const isPast = q.status === "PAST_DUE" || q.status === "CLOSED";
                    const isActive = q.status === "ACTIVE";
                    return (
                      <div
                        key={q.period_code}
                        className={`rounded-lg border p-4 shadow-xs flex flex-col justify-between transition-all ${
                          isActive
                            ? "border-blue-600 bg-white ring-1 ring-blue-600"
                            : isPast
                            ? "border-slate-200 bg-white"
                            : "border-slate-200/60 bg-slate-50/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div>
                              <span className="text-xs font-mono font-bold text-slate-900">{q.period_name}</span>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">{q.start_date} s/d {q.end_date}</div>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                                isActive
                                  ? "bg-blue-100 text-blue-800"
                                  : isPast
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isActive ? "Sedang Berjalan" : isPast ? "Tutup Periode" : "Mendatang"}
                            </span>
                          </div>

                          <div className="py-2.5 space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between text-slate-500">
                              <span className="font-sans">Pendapatan Kotor:</span>
                              <span className="font-bold text-slate-800">{formatRupiah(q.gross_revenue)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-sans">Pengurang Sah:</span>
                              <span className="font-bold text-rose-600">
                                {q.total_deductibles > 0 ? `-${formatRupiah(q.total_deductibles)}` : "Rp 0"}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-dashed border-slate-200">
                              <span className="font-sans">DPT Triwulan:</span>
                              <span className="text-blue-700">{formatRupiah(q.tariff_base_amount)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-3 rounded-b-lg">
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <div className="text-[10px] font-sans text-slate-400">Total Setoran (1,75%):</div>
                              <div className="text-sm font-black font-mono text-emerald-800">{formatRupiah(q.total_payable)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-sans text-slate-400">Jatuh Tempo:</div>
                              <div className="text-[11px] font-mono font-bold text-slate-700">{q.due_date}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-200/50">
                            <span>BHP: {formatRupiah(q.bhp_amount)}</span>
                            <span>USO: {formatRupiah(q.uso_amount)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KSO Readiness Card */}
              <div className="p-4 rounded-lg border border-indigo-100 bg-indigo-50/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-100 text-indigo-800">
                      KSO / KEMITRAAN READY
                    </span>
                    <span className="text-xs font-bold text-slate-800">Pemisahan Omset Mandiri vs Kemitraan KSO</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Saat kemitraan reseller / KSO diaktifkan, formula bagi hasil otomatis memotong 1,75% PNBP terlebih dahulu agar ISP induk tidak menanggung beban regulasi.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0 font-mono">
                  <div className="p-3 bg-white rounded-md border border-indigo-100 shadow-2xs">
                    <div className="text-[10px] font-sans text-slate-400">Pelanggan Mandiri ISP</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {formatRupiah(bhpReport.annual_summary.self_subscription_revenue)}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-md border border-indigo-100 shadow-2xs">
                    <div className="text-[10px] font-sans text-slate-400">Pelanggan Mitra KSO</div>
                    <div className="font-bold text-indigo-700 mt-0.5">
                      {formatRupiah(bhpReport.annual_summary.partner_kso_revenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown Table */}
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase text-slate-900">
                      Rincian Bulanan Tahun {selectedYear}
                    </h3>
                    <p className="text-xs text-slate-500">Tabel rekonsiliasi rinci 12 bulan untuk audit akuntan publik & SIMS Kominfo</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">Bulan</th>
                        <th className="px-3 py-2.5 text-right">Langganan (DPP)</th>
                        <th className="px-3 py-2.5 text-right">Voucher (DPP)</th>
                        <th className="px-3 py-2.5 text-right">Gross Telko</th>
                        <th className="px-3 py-2.5 text-right">Pengurang Sah</th>
                        <th className="px-3 py-2.5 text-right">DPT</th>
                        <th className="px-3 py-2.5 text-right">BHP (0,5%)</th>
                        <th className="px-3 py-2.5 text-right">USO (1,25%)</th>
                        <th className="px-3 py-2.5 text-right text-emerald-800 font-bold">Total (1,75%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {bhpReport.monthly_breakdown.map((m) => (
                        <tr key={m.period_code} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 font-sans font-bold text-slate-900">{m.period_name}</td>
                          <td className="px-3 py-2 text-right">{formatRupiah(m.subscription_revenue)}</td>
                          <td className="px-3 py-2 text-right">{formatRupiah(m.voucher_revenue)}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800">{formatRupiah(m.gross_revenue)}</td>
                          <td className="px-3 py-2 text-right text-rose-600">
                            {m.total_deductibles > 0 ? `-${formatRupiah(m.total_deductibles)}` : "Rp 0"}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-blue-700">{formatRupiah(m.tariff_base_amount)}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{formatRupiah(m.bhp_amount)}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{formatRupiah(m.uso_amount)}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-800 bg-emerald-50/30">
                            {formatRupiah(m.total_payable)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-mono font-bold text-slate-900 text-xs">
                      <tr>
                        <td className="px-3 py-2.5 font-sans">TOTAL TAHUNAN</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(bhpReport.annual_summary.subscription_revenue)}</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(bhpReport.annual_summary.voucher_revenue)}</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(bhpReport.annual_summary.gross_revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-rose-600">
                          {bhpReport.annual_summary.total_deductibles > 0 ? `-${formatRupiah(bhpReport.annual_summary.total_deductibles)}` : "Rp 0"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-blue-800">{formatRupiah(bhpReport.annual_summary.tariff_base_amount)}</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(bhpReport.annual_summary.bhp_amount)}</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(bhpReport.annual_summary.uso_amount)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-800 font-black bg-emerald-100/50">
                          {formatRupiah(bhpReport.annual_summary.total_payable)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 font-mono bg-white rounded-lg border border-slate-200">
              Data BHP/USO belum tersedia untuk tahun {selectedYear}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
