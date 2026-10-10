"use client";

import { useState, useEffect } from "react";
import MemberNav from "../_nav";
import { useMember } from "../context";
import { CreditCard, Save, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

export default function PaymentSettingsPage() {
  const { member } = useMember();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    provider: "midtrans",
    isSandbox: true,
    midtransClientKey: "",
    midtransServerKey: "",
    midtransMerchantId: "",
  });

  const isSuperadmin =
    member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001";

  if (!member) return null;

  if (!isSuperadmin) {
    return (
      <MemberNav>
        <div className="p-8 text-center text-slate-500">
          Akses ditolak. Halaman ini hanya untuk Root Superadmin.
        </div>
      </MemberNav>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    
    // In a real app, we would save to API. Since this is mock/demo:
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Pengaturan Payment Gateway berhasil disimpan secara lokal (Mock).");
    }, 1000);
  }

  return (
    <MemberNav>
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                PLATFORM CONFIGURATION
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-cyan-600" />
              <span>Pengaturan Payment Gateway</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola kunci API gateway pembayaran (Midtrans) untuk memproses upgrade paket berlangganan klien SaaS Anda.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-sm">Kredensial Gateway</h2>
              <p className="text-[11px] text-slate-500">Konfigurasi environment dan API keys</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Provider Pembayaran
                </label>
                <select
                  value={form.provider}
                  onChange={e => setForm({...form, provider: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="midtrans">Midtrans (Default)</option>
                  <option value="duitku">Duitku</option>
                  <option value="xendit">Xendit</option>
                  <option value="tripay">Tripay</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mode Environment
                </label>
                <select
                  value={form.isSandbox ? "sandbox" : "production"}
                  onChange={e => setForm({...form, isSandbox: e.target.value === "sandbox"})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Catatan Sandbox:</strong> Saat ini sistem berjalan pada Mode Mock Sandbox bawaan untuk kemudahan demonstrasi. Kunci API yang dimasukkan di bawah ini tidak akan memicu API Midtrans asli kecuali Anda mengimplementasikan Midtrans SDK.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {form.provider === "duitku" ? "Merchant Code" : "Merchant ID"}
                </label>
                <input
                  type="text"
                  placeholder={form.provider === "duitku" ? "D12345" : "G-XXXXXX"}
                  value={form.midtransMerchantId}
                  onChange={e => setForm({...form, midtransMerchantId: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {form.provider !== "duitku" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Client Key (Public)
                  </label>
                  <input
                    type="text"
                    placeholder="SB-Mid-client-XXXXX"
                    value={form.midtransClientKey}
                    onChange={e => setForm({...form, midtransClientKey: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {form.provider === "duitku" ? "API Key / Secret Key" : "Server Key (Secret)"}
                </label>
                <input
                  type="password"
                  placeholder={form.provider === "duitku" ? "32 karakter kunci API dari Merchant Duitku" : "SB-Mid-server-XXXXX"}
                  value={form.midtransServerKey}
                  onChange={e => setForm({...form, midtransServerKey: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {loading ? "Menyimpan..." : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan API Keys</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MemberNav>
  );
}
