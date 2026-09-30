// RecentPayments.tsx
import { Payment } from "@/lib/api/payments";
import { formatRupiah } from "@/lib/utils";
import Link from "next/link";

interface RecentPaymentsProps {
  payments: Payment[];
  loading: boolean;
}

export default function RecentPayments({ payments, loading }: RecentPaymentsProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-800">Pembayaran Terbaru</h3>
        <Link href="/admin/payments" className="text-xs text-blue-600 hover:underline">
          Lihat Semua →
        </Link>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400">Memuat data...</div>
      ) : payments.length === 0 ? (
        <div className="text-sm text-slate-400">Tidak ada pembayaran.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2">No.</th>
                <th className="pb-2">Pelanggan</th>
                <th className="pb-2">Jumlah</th>
                <th className="pb-2">Metode</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2">{p.payment_number}</td>
                  <td className="py-2">{p.customer_name || p.customer_number || "-"}</td>
                  <td className="py-2">{formatRupiah(p.amount)}</td>
                  <td className="py-2">{p.payment_method}</td>
                  <td className="py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status === "PENDING" || p.status === "PROCESSING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
