"use client";

import { useState } from "react";
import { Server, Terminal, Copy, Check } from "lucide-react";

export default function VPNManagementPage() {
  const [script, setScript] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generateScript = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/tenant/mikrotik/generate", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Gagal generate script");
      }
      const data = await res.json();
      setScript(data.script || data.data?.script || JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Manajemen Integrasi VPN
        </h1>
        <p className="text-sm text-slate-500">
          Konfigurasi dan kelola integrasi VPN OSPF / BGP untuk Network Attached Storage (NAS) MikroTik.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0 text-cyan-600">
            <Server className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">Generate MikroTik Setup Script</h3>
            <p className="text-sm text-slate-500 mt-1">
              Hasilkan script konfigurasi otomatis untuk menghubungkan router MikroTik ke jaringan VPN Core ISPSYNC.
            </p>
            <div className="mt-4">
              <button
                onClick={generateScript}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Memproses..." : "Generate Script"}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>
            )}
          </div>
        </div>

        {script && (
          <div className="mt-4 pt-4 border-t border-slate-100 relative group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Terminal className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Terminal Script</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin!" : "Salin Script"}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-50 overflow-x-auto text-xs font-mono border border-slate-800">
              <code>{script}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
