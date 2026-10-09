"use client";

import { useState, useEffect } from "react";
import MemberNav from "../_nav";
import { useMember } from "../context";
import { CheckCircle2, AlertCircle, RefreshCw, Save, Server, Users } from "lucide-react";

export default function SaasSettingsPage() {
  const { member, token } = useMember();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxTenants, setMaxTenants] = useState<number>(50);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const t = token || (typeof window !== "undefined" ? localStorage.getItem("member-token") : null);
    return {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  };

  const fetchSettings = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/member/settings", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || `Gagal memuat pengaturan (HTTP ${res.status}).`);
        return;
      }
      if (data.max_saas_tenants) {
        setMaxTenants(data.max_saas_tenants);
      }
    } catch (err: any) {
      setActionError("Gagal memuat pengaturan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch("/api/member/settings", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          action: "update_saas",
          max_saas_tenants: maxTenants,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || "Pengaturan SaaS berhasil disimpan.");
        if (data.max_saas_tenants) setMaxTenants(data.max_saas_tenants);
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setActionError(data.error || "Gagal menyimpan pengaturan.");
      }
    } catch (err: any) {
      setActionError("Terjadi kesalahan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (member?.role !== "SUPERADMIN") {
    return (
      <MemberNav>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-xl font-black text-slate-900">Akses Ditolak</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Halaman pengaturan platform ini khusus untuk Superadmin sistem ISPSYNC.
            </p>
          </div>
        </div>
      </MemberNav>
    );
  }

  return (
    <MemberNav>
      <div className="flex-1 min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-blue-700 border border-slate-200">
                SAAS MANAGEMENT
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Server className="w-6 h-6 text-blue-600" />
              <span>Pengaturan Kuota Pendaftaran Tenant</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
              Kelola batas maksimal ISP yang bisa mendaftar di instance SaaS ini secara GUI.
            </p>
          </div>

          <button
            onClick={fetchSettings}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer shrink-0"
            title="Perbarui Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800 flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
        )}

        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="font-black text-slate-900 text-sm">Kuota Global Tenant</h2>
                <p className="text-[11px] text-slate-500">Mencegah server overload dari pendaftar baru berlebih</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Maksimal Tenant / ISP Baru (MAX_SAAS_TENANTS)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={maxTenants}
                  onChange={(e) => setMaxTenants(parseInt(e.target.value, 10))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-bold font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Bila jumlah ISP / Tenant yang terdaftar melebihi kuota ini, pendaftaran akan otomatis ditutup dengan pesan error ke calon pelanggan.
                </p>
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Kuota</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MemberNav>
  );
}
