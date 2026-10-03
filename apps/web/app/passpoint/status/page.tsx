"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Wifi,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Smartphone,
  ChevronLeft,
} from "lucide-react";
import { passpointApi, PasspointCustomerStatus } from "@/lib/api/passpoint";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

export default function PasspointStatusPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<PasspointCustomerStatus | null>(null);
  const [tenantName, setTenantName] = useState("ISPSYNC");
  const [tenantLegalName, setTenantLegalName] = useState("PT. ISP Kita Nusantara");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname.toLowerCase();
      const parts = h.split(".");
      let detectedSlug = "";

      if (parts.length >= 4 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length === 3 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length >= 3 && parts[0] !== "www") {
        detectedSlug = parts[0].toLowerCase();
      }

      if (detectedSlug && detectedSlug !== "ispsync") {
        const upper = detectedSlug.toUpperCase();
        setTenantName(upper);
        setTenantLegalName(TENANT_LEGAL_MAP[detectedSlug] || `PT. ${upper} Data Nusantara`);
        document.title = `Cek Status | ${upper} Passpoint`;
      }
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setStatusData(null);

    try {
      const res = await passpointApi.checkCustomerStatus(query.trim());
      setStatusData(res);
    } catch (err: any) {
      setError(
        err.message || "Data akun Passpoint tidak ditemukan. Pastikan nomor HP atau username sudah sesuai."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB";
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/passpoint"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Beranda Passpoint</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Layanan Mandiri Pelanggan</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl w-full mx-auto px-4 py-12 flex-1 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 mb-2">
            <Wifi className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Cek Status Akses WiFi Passpoint {tenantName}
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Masukkan nomor WhatsApp atau Username akun Passpoint Anda untuk memeriksa sisa masa aktif dan paket.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nomor WhatsApp atau Username EAP
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau pp_abc1"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center transition disabled:opacity-50"
                >
                  {loading ? (
                    <span className="text-[11px]">Memeriksa...</span>
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-900/70 text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Result Card */}
        {statusData && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5 animate-in fade-in duration-300">
            {/* Status Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  {statusData.customer_name}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  {statusData.customer_phone || statusData.username}
                </p>
              </div>
              <div>
                {statusData.status === "ACTIVE" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Layanan Aktif</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Masa Aktif Habis</span>
                  </span>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Paket Layanan</span>
                <p className="font-semibold text-slate-200">{statusData.package_name}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Sisa Masa Aktif</span>
                <p className="font-semibold text-cyan-400">
                  {statusData.status === "ACTIVE"
                    ? `${statusData.days_remaining} Hari ${statusData.hours_remaining} Jam`
                    : "Kedaluwarsa"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Username EAP (Identity)</span>
                <p className="font-mono font-semibold text-slate-200 select-all">
                  {statusData.username}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Realm / Domain Jaringan</span>
                <p className="font-mono font-semibold text-slate-200">{statusData.realm}</p>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Berlaku Hingga</span>
                <p className="font-semibold text-slate-200">
                  {formatDate(statusData.expires_at ? new Date(statusData.expires_at).toISOString() : undefined)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Link
                href="/passpoint?mode=RENEW"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white text-xs font-semibold transition shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Perpanjang Masa Aktif WiFi Sekarang</span>
              </Link>

              <a
                href={statusData.apple_profile_url}
                download
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Ulang Profil Apple (.mobileconfig)</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} {tenantLegalName}. Seluruh hak cipta dilindungi.</p>
      </footer>
    </div>
  );
}
