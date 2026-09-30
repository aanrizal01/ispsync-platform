import Link from "next/link";

export default function HotspotLogoutPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-200">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>

        <h1 className="text-xl font-black text-slate-900 mb-2">Sesi Telah Diakhiri</h1>
        <p className="text-xs text-slate-500 mb-6">
          Koneksi internet Anda telah berhasil diputuskan. Terima kasih telah menggunakan layanan kami.
        </p>

        <Link
          href="/hotspot/login"
          className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/20"
        >
          LOGIN KEMBALI
        </Link>
      </div>
    </div>
  );
}
