"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { hotspotApi, type HotspotStatusResponse } from "@/lib/api/hotspot";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} jam ${m} mnt`;
  if (m > 0) return `${m} mnt ${s} dtk`;
  return `${s} detik`;
}

function HotspotStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const username = searchParams.get("username") || "";
  const ip = searchParams.get("ip") || "";
  const mac = searchParams.get("mac") || "";

  const [status, setStatus] = useState<HotspotStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await hotspotApi.getStatus({ username, ip, mac });
        setStatus(res);
      } catch (err) {
        console.error("Failed to load status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [username, ip, mac]);

  const handleLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin mengakhiri sesi internet ini?")) return;
    setLoggingOut(true);
    try {
      await hotspotApi.logout({
        username: status?.username || username,
        client_ip: ip,
        client_mac: mac,
      });
      router.push("/hotspot/logout");
    } catch (err) {
      alert("Gagal melakukan logout");
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Connection status badge */}
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100 animate-pulse">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-xl font-black text-slate-900 mb-1">Status Koneksi Internet</h1>
        <p className="text-xs text-slate-500 mb-6">
          Anda sedang terhubung ke jaringan internet hotspot
        </p>

        {loading ? (
          <div className="py-8 text-xs text-slate-400">Memuat status sesi...</div>
        ) : (
          <div className="space-y-4 text-left mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Pengguna / Voucher:</span>
                <span className="font-mono font-bold text-blue-600">{status?.username || username || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alamat IP:</span>
                <span className="font-mono text-slate-700">{status?.client_ip || ip || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Durasi Terhubung:</span>
                <span className="font-bold text-slate-800">
                  {status ? formatDuration(status.session_time_seconds) : "—"}
                </span>
              </div>
            </div>

            {/* Traffic Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <span className="text-[10px] text-blue-500 font-bold block uppercase">Upload</span>
                <span className="text-sm font-extrabold text-slate-800">
                  {status ? formatBytes(status.bytes_in) : "0 B"}
                </span>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-600 font-bold block uppercase">Download</span>
                <span className="text-sm font-extrabold text-slate-800">
                  {status ? formatBytes(status.bytes_out) : "0 B"}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors border border-rose-200"
        >
          {loggingOut ? "Memproses..." : "PUTUSKAN KONEKSI (LOGOUT)"}
        </button>
      </div>
    </div>
  );
}

export default function HotspotStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Memuat Status...</div>}>
      <HotspotStatusContent />
    </Suspense>
  );
}
