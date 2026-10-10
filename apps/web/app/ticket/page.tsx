"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export default function TicketLookupPage() {
  const router = useRouter();
  const [ticketNumber, setTicketNumber] = useState("");
  const [tenantName, setTenantName] = useState("ISPSYNC");
  const [tenantSlug, setTenantSlug] = useState("dev");
  const [logoFallback, setLogoFallback] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      const parts = host.split(".");
      let slug = "dev";
      if (parts.length >= 4) {
        slug = parts[1];
      } else if (parts.length === 3 && parts[1] === "ispsync") {
        slug = parts[0];
      }
      setTenantSlug(slug);
      const upper = slug === "dev" ? "DEV LAB" : slug.toUpperCase();
      setTenantName(upper);

      // Set document title
      document.title = `Pusat Bantuan & Lacak Tiket | ${upper}`;

      // Update favicon dynamically
      const iconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (iconEl) {
        const favUrl = `/web/${slug}_favicon.svg`;
        const testFavicon = new Image();
        testFavicon.src = favUrl;
        testFavicon.onload = () => { iconEl.href = favUrl; };
        testFavicon.onerror = () => { iconEl.href = "/web/ispsync_favicon.svg"; };
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ticketNumber.trim();
    if (clean) {
      router.push(`/ticket/${encodeURIComponent(clean)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-cyan-600 selection:text-white">
      {/* Header with dynamic tenant logo */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-xs sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`/web/${tenantSlug}_logo.svg`}
              alt={tenantName}
              className="h-8 sm:h-9 w-auto max-w-[180px] object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
                setLogoFallback(true);
              }}
            />
            {logoFallback && (
              <div className="flex items-center gap-2.5">
                <img
                  src={`/web/${tenantSlug}_favicon.svg`}
                  alt=""
                  className="w-8 h-8 rounded-xl object-contain shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
                <span className="font-black text-sm tracking-tight text-slate-900 uppercase">{tenantName}</span>
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-cyan-800 border border-slate-200 shrink-0">
              HELP CENTER
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center my-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pelacakan Tiket Pengaduan
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
              Pantau status penanganan teknis dan berkomunikasi langsung dengan tim bantuan resmi ISP Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nomor Tiket Bantuan
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Contoh: TKT-DEV-001"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white uppercase tracking-wider transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-sans">
                Nomor tiket dapat dilihat pada pesan WhatsApp atau SMS yang Anda terima saat mengajukan laporan gangguan.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>Lacak &amp; Buka Tiket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-[11px] text-slate-500">
        <p>&copy; 2026 {tenantName} Broadband &bull; Layanan Pelanggan &amp; Pengaduan Teknis 24 Jam.</p>
      </footer>
    </div>
  );
}
