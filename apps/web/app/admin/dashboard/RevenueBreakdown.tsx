// RevenueBreakdown.tsx
import { FinancialSummary } from "@/lib/api/reports";
import { formatRupiah } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RevenueBreakdownProps {
  financial: FinancialSummary | null;
  loading: boolean;
}

const COLORS = ["#2563eb", "#16a34a", "#ea580c"]; // blue, green, orange

export default function RevenueBreakdown({ financial, loading }: RevenueBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="text-sm text-slate-400">Memuat data pendapatan…</div>
      </div>
    );
  }

  if (!financial) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="text-sm text-slate-400">Data pendapatan tidak tersedia.</div>
      </div>
    );
  }

  const data = [
    { name: "Langganan PPPoE", value: financial.subscription_collected ?? 0 },
    { name: "Voucher Online", value: financial.voucher_online_collected ?? 0 },
    { name: "Voucher Offline", value: financial.voucher_offline_collected ?? 0 },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h3 className="font-semibold text-slate-800 mb-3">Distribusi Pendapatan</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }: any) => percent ? `${(percent * 100).toFixed(0)}%` : ""}
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => formatRupiah(Number(value) || 0)}
            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-slate-600">
        Total Pendapatan: <strong>{formatRupiah(total)}</strong>
      </div>
    </div>
  );
}
