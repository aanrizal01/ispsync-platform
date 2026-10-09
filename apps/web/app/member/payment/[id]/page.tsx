"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "../../context";
import { Building2, CreditCard, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function MockPaymentPage({ params }: { params: { id: string } }) {
  const invoiceId = params.id;
  const { member, refresh } = useMember();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const invoice = member?.invoices?.find((i: any) => i.id === invoiceId);

  useEffect(() => {
    if (member && !invoice) {
      router.replace("/member/invoices");
    }
  }, [member, invoice, router]);

  if (!member || !invoice) return null;

  async function handleSimulatePayment() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/member/billing/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, status: "paid" }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        refresh(); // update member context
        setTimeout(() => {
          router.push("/member/invoices");
        }, 3000);
      } else {
        setError(data.error || "Gagal memproses pembayaran");
      }
    } catch (err) {
      setError("Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-6 text-center">
          <h2 className="text-white font-black text-xl tracking-tight">ISPSYNC Payment Sandbox</h2>
          <p className="text-slate-400 text-xs mt-1">Sistem Mock Gateway Pembayaran</p>
        </div>

        {success ? (
          <div className="p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Pembayaran Berhasil!</h3>
            <p className="text-sm text-slate-500 mb-6">
              Tagihan {invoiceId} telah lunas. Paket SaaS Anda telah diperbarui secara otomatis.
            </p>
            <div className="text-xs text-slate-400">Mengarahkan kembali ke dashboard...</div>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 pb-6 border-b border-slate-100 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Pembayaran</div>
              <div className="text-4xl font-black text-slate-900">Rp {Number(invoice.amount).toLocaleString("id-ID")}</div>
              <div className="text-xs text-blue-600 font-semibold mt-2">{invoice.period}</div>
            </div>

            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">No. Tagihan</span>
                <span className="font-bold text-slate-900">{invoiceId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nama Perusahaan</span>
                <span className="font-bold text-slate-900">{member.company}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Metode Pembayaran</span>
                <span className="font-bold text-slate-900">Virtual Account Sandbox</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleSimulatePayment}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-blue-200"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Simulasikan Pembayaran Berhasil</span>
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <Link href="/member/invoices" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                Batal &amp; Kembali
              </Link>
            </div>
          </div>
        )}
        
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secured by ISPSYNC Mock Gateway</span>
        </div>
      </div>
    </div>
  );
}
