import { request, downloadFile } from "./client";

export interface FinancialSummary {
  mrr: number;
  arr: number;
  arpu: number;
  active_subscribers: number;
  total_customers: number;
  total_invoiced: number;
  total_collected: number;
  subscription_collected?: number;
  voucher_online_collected?: number;
  voucher_offline_collected?: number;
  outstanding_due: number;
  churn_rate_percent: number;
  collection_rate_percent: number;
  total_active_credits: number;
  total_agent_deposits?: number;
  total_held_deposits: number;
  total_forfeited_deposits: number;
  total_tax_collected: number;
  subscription_tax?: number;
  voucher_tax?: number;
  total_agent_commission?: number;
  jartaplok_cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  jartaplok_partner_name?: string;
  jartaplok_active_ports?: number;
}

export interface PlanRevenue {
  plan_id: string;
  plan_name: string;
  subscriber_count: number;
  monthly_price: number;
  monthly_revenue: number;
}

export interface RevenueTrend {
  month: string;
  invoiced: number;
  collected: number;
}

export interface TrafficStats {
  total_gigabytes: number;
  download_gigabytes: number;
  upload_gigabytes: number;
  active_sessions: number;
  avg_session_minutes: number;
}

export interface BHPUSOPeriodSummary {
  period_name: string;
  period_code: string;
  start_date: string;
  end_date: string;
  gross_revenue: number;
  subscription_revenue: number;
  self_subscription_revenue: number;
  partner_kso_revenue: number;
  voucher_revenue: number;
  deductible_jartaplok: number;
  deductible_bad_debt: number;
  total_deductibles: number;
  tariff_base_amount: number;
  bhp_rate_percent: number;
  bhp_amount: number;
  uso_rate_percent: number;
  uso_amount: number;
  total_payable: number;
  due_date: string;
  status: "UPCOMING" | "ACTIVE" | "PAST_DUE" | "CLOSED";
}

export interface BHPUSOReport {
  year: number;
  annual_summary: BHPUSOPeriodSummary;
  quarters: BHPUSOPeriodSummary[];
  monthly_breakdown: BHPUSOPeriodSummary[];
  regulation_reference: string;
}

export const reportsApi = {
  getFinancialSummary: () =>
    request<FinancialSummary>("/reports/financial"),

  getPlanRevenue: () =>
    request<PlanRevenue[]>("/reports/plans"),

  getRevenueTrends: (months: number = 6) =>
    request<RevenueTrend[]>(`/reports/trends?months=${months}`),

  getTrafficStats: () =>
    request<TrafficStats>("/reports/traffic"),

  getBHPUSOReport: (year?: number) => {
    const y = year || new Date().getFullYear();
    return request<BHPUSOReport>(`/reports/bhp-uso?year=${y}`);
  },

  exportBHPUSOCsv: async (year?: number) => {
    const y = year || new Date().getFullYear();
    const path = `/reports/export-bhp-uso-csv?year=${y}`;
    await downloadFile(path, `laporan-bhp-uso-kominfo-${y}-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getExportBHPUSOCsvUrl: (year?: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    const y = year || new Date().getFullYear();
    return `${base}/reports/export-bhp-uso-csv?year=${y}`;
  },

  exportCsv: async (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const path = `/reports/export-csv${query ? `?${query}` : ""}`;
    await downloadFile(path, `transaksi-billing-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  exportVoucherTaxCsv: async (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const path = `/reports/export-voucher-tax-csv${query ? `?${query}` : ""}`;
    await downloadFile(path, `rekap-pajak-voucher-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getExportCsvUrl: (from?: string, to?: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    return `${base}/reports/export-csv${query ? `?${query}` : ""}`;
  },

  getExportVoucherTaxCsvUrl: (from?: string, to?: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    return `${base}/reports/export-voucher-tax-csv${query ? `?${query}` : ""}`;
  },
};

