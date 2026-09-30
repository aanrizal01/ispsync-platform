"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-slate-200 m-4 shadow-sm">
      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
        ⚠️
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Terjadi Kendala Memuat Halaman</h2>
      <p className="text-xs text-rose-600 max-w-lg mb-4 font-mono bg-rose-50 p-3 rounded-lg border border-rose-200 text-left overflow-x-auto">
        {error.message || "Unknown error"}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
        >
          Coba Lagi
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
        >
          Muat Ulang Halaman
        </button>
      </div>
    </div>
  );
}
