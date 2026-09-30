"use client";
import MemberNav from "../_nav";
import { useMember } from "../context";

function fmt(n: string) { return "Rp " + Number(n).toLocaleString("id-ID"); }

export default function MemberInvoices() {
  const { member } = useMember();
  if (!member) return null;
  return (
    <MemberNav>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Invoice</h1>
        <p className="text-gray-500 text-sm mb-8">Riwayat tagihan dan pembayaran layanan ISPSYNC Anda.</p>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["No. Invoice","Periode","Tgl Invoice","Jatuh Tempo","Jumlah","Metode","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {member.invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{inv.id}</td>
                  <td className="px-4 py-3 text-gray-700">{inv.period}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.date}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.dueDate}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.paymentMethod || "-"}</td>
                  <td className="px-4 py-3">
                    {inv.status === "paid" ? (
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">Lunas</span>
                    ) : inv.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold">Belum Bayar</span>
                        <a href={`https://wa.me/6281100000000?text=Konfirmasi%20pembayaran%20${inv.id}`} target="_blank"
                          className="text-[10px] text-blue-600 hover:underline">Bayar</a>
                      </div>
                    ) : (
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-bold">Overdue</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="font-bold text-blue-800 text-sm mb-1">Butuh invoice resmi atau kwitansi?</div>
          <p className="text-xs text-blue-600 mb-3">Hubungi tim ISPSYNC via WhatsApp untuk mendapatkan invoice PDF bermaterai dan kwitansi pembayaran resmi.</p>
          <a href="https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20membutuhkan%20invoice%20resmi%20untuk%20keperluan%20administrasi" target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">
            Request Invoice Resmi
          </a>
        </div>
      </div>
    </MemberNav>
  );
}
