import { request } from "./client";

export type ExpenseCategory =
  | "UPSTREAM_BANDWIDTH"
  | "INFRASTRUCTURE_POLE"
  | "MAINTENANCE_REPAIR"
  | "SALARY_WAGES"
  | "NOC_ELECTRICITY"
  | "EQUIPMENT_MATERIAL"
  | "MARKETING_SALES"
  | "OPERATIONAL_GENERAL"
  | "OTHER";

export type ExpensePaymentMethod = "BANK_TRANSFER" | "CASH" | "PETTY_CASH" | "OTHER";

export interface Expense {
  id: string;
  expense_number: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  vendor_name?: string;
  payment_method: ExpensePaymentMethod;
  bank_account?: string;
  reference_number?: string;
  is_bhp_deductible: boolean;
  notes?: string;
  recorded_by?: string;
  recorded_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  vendor_name?: string;
  payment_method: ExpensePaymentMethod;
  bank_account?: string;
  reference_number?: string;
  is_bhp_deductible: boolean;
  notes?: string;
}

export interface UpdateExpenseInput {
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  vendor_name?: string;
  payment_method: ExpensePaymentMethod;
  bank_account?: string;
  reference_number?: string;
  is_bhp_deductible: boolean;
  notes?: string;
}

export interface ExpenseSummary {
  total_expenses_month: number;
  total_expenses_year: number;
  total_bhp_deductible: number;
  count_month: number;
  top_category_month: string;
  top_category_amount: number;
  category_breakdown: Record<string, number>;
}

export interface ExpenseFilterParams {
  start_date?: string;
  end_date?: string;
  category?: string;
  search?: string;
  is_bhp_deductible?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedExpensesResponse {
  data: Expense[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const expenseCategories: { value: ExpenseCategory; label: string; badge: string; isBhpDeductibleDefault: boolean }[] = [
  { value: "UPSTREAM_BANDWIDTH", label: "Sewa Bandwidth & Transmisi Upstream (IP Transit)", badge: "bg-purple-50 text-purple-700 border-purple-200", isBhpDeductibleDefault: true },
  { value: "INFRASTRUCTURE_POLE", label: "Sewa Tiang, Jalur FO, & Jartaplok", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", isBhpDeductibleDefault: true },
  { value: "MAINTENANCE_REPAIR", label: "Pemeliharaan & Perbaikan Jaringan Lapangan", badge: "bg-amber-50 text-amber-700 border-amber-200", isBhpDeductibleDefault: false },
  { value: "SALARY_WAGES", label: "Gaji, Lembur, & Insentif Karyawan/Teknisi", badge: "bg-blue-50 text-blue-700 border-blue-200", isBhpDeductibleDefault: false },
  { value: "NOC_ELECTRICITY", label: "Listrik, Genset, & Fasilitas Server NOC", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", isBhpDeductibleDefault: false },
  { value: "EQUIPMENT_MATERIAL", label: "Pembelian Perangkat & Material (ONT, Kabel, ODP)", badge: "bg-cyan-50 text-cyan-700 border-cyan-200", isBhpDeductibleDefault: false },
  { value: "MARKETING_SALES", label: "Pemasaran, Promosi, & Spanduk", badge: "bg-pink-50 text-pink-700 border-pink-200", isBhpDeductibleDefault: false },
  { value: "OPERATIONAL_GENERAL", label: "Operasional Kantor, ATK, & Konsumsi", badge: "bg-slate-100 text-slate-700 border-slate-200", isBhpDeductibleDefault: false },
  { value: "OTHER", label: "Biaya Operasional Lainnya", badge: "bg-gray-100 text-gray-700 border-gray-200", isBhpDeductibleDefault: false },
];

export const expensePaymentMethods: { value: ExpensePaymentMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Transfer Bank" },
  { value: "CASH", label: "Kas Tunai" },
  { value: "PETTY_CASH", label: "Kas Kecil (Petty Cash)" },
  { value: "OTHER", label: "Lainnya" },
];

export const expenseApi = {
  list: async (params?: ExpenseFilterParams): Promise<PaginatedExpensesResponse> => {
    const sp = new URLSearchParams();
    if (params?.start_date) sp.append("start_date", params.start_date);
    if (params?.end_date) sp.append("end_date", params.end_date);
    if (params?.category) sp.append("category", params.category);
    if (params?.search) sp.append("search", params.search);
    if (params?.is_bhp_deductible !== undefined) sp.append("is_bhp_deductible", String(params.is_bhp_deductible));
    if (params?.page) sp.append("page", String(params.page));
    if (params?.limit) sp.append("limit", String(params.limit));

    const qs = sp.toString();
    const url = qs ? `/expenses?${qs}` : "/expenses";
    return request<PaginatedExpensesResponse>(url);
  },

  getSummary: async (year?: number, month?: number): Promise<ExpenseSummary> => {
    const sp = new URLSearchParams();
    if (year) sp.append("year", String(year));
    if (month) sp.append("month", String(month));
    const qs = sp.toString();
    const url = qs ? `/expenses/summary?${qs}` : "/expenses/summary";
    return request<ExpenseSummary>(url);
  },

  getByID: async (id: string): Promise<Expense> => {
    return request<Expense>(`/expenses/${id}`);
  },

  create: async (data: CreateExpenseInput): Promise<Expense> => {
    return request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: UpdateExpenseInput): Promise<Expense> => {
    return request<Expense>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/expenses/${id}`, {
      method: "DELETE",
    });
  },

  exportCSVUrl: (params?: ExpenseFilterParams): string => {
    const sp = new URLSearchParams();
    if (params?.start_date) sp.append("start_date", params.start_date);
    if (params?.end_date) sp.append("end_date", params.end_date);
    if (params?.category) sp.append("category", params.category);
    if (params?.search) sp.append("search", params.search);
    if (params?.is_bhp_deductible !== undefined) sp.append("is_bhp_deductible", String(params.is_bhp_deductible));
    const qs = sp.toString();
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    return `${apiBase}/expenses/export-csv${qs ? `?${qs}` : ""}`;
  },
};
