import React from "react";
import {
  Banknote,
  ShieldCheck,
  Receipt,
  Server,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  Lock,
  Cpu,
  Layers,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export function LedgerShowcase() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* ── Ambient Radial Glows (Aurora Effect) ──────────────────────── */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header / Top Navbar (Showcase Only - No CTA) ─────────────── */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/20">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">
                  ISPSYNC LEDGER
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  ENGINE 3
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Financial, Automated Invoicing &amp; AAA Orchestration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
              Specification Showcase
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="max-w-3xl">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700 mb-4 inline-block">
            Carrier-Grade Telecom Accounting
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Arsitektur Finansial, Otomasi Billing &amp;{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
              Sinkronisasi AAA Real-Time
            </span>
          </h1>
          <p className="mt-6 text-sm sm:text-base text-slate-400 leading-relaxed">
            ISPSYNC Ledger dirancang khusus untuk memenuhi standar ketat pembukuan finansial Internet Service Provider (ISP). Mengombinasikan penghitungan uang integer presisi, otomatisasi penagihan bulanan berbasis siklus langganan, orkestrasi FreeRADIUS AAA, hingga loket kasir POS dengan struk thermal.
          </p>
        </div>

        {/* ── Key Technical Metric Badges ───────────────────────────── */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Precision Accounting</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">Zero Rounding Loss</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Integer 64-bit pure Rupiah</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">AAA Core Engine</div>
            <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1">FreeRADIUS 3.2</div>
            <div className="text-[11px] text-slate-500 mt-0.5">PostgreSQL rlm_sql sync</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">CoA Disconnect</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">RFC 3576</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Auto-isolir &amp; auto-restore</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Payment Standard</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">ASPI / EMVCo</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dynamic QRIS &amp; Virtual Account</div>
          </div>
        </div>
      </section>

      {/* ── Architecture & Capabilities Grid ────────────────────────── */}
      <section className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
              Platform Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
              Modul Utama ISPSYNC Ledger
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mb-4">
                  <Banknote className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Recurring Invoicing Engine
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Penjadwalan otomatis penerbitan tagihan berkala bulanan pada tanggal 1 tiap bulan. Mendukung kalkulasi prorata presisi, PPN 11% berbasis poin dasar (basis points), dan denda keterlambatan terstruktur.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-cyan-400/80">
                • DRAFT ➔ ISSUED ➔ PAID / OVERDUE
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mb-4">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  FreeRADIUS AAA &amp; MikroTik CoA
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Sinkronisasi real-time status pembayaran dengan database autentikasi RADIUS. Saat tagihan melewati jatuh tempo, sistem menembakkan paket RFC 3576 Disconnect-Request ke router MikroTik Gateway untuk isolir otomatis tanpa restart router.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-blue-400/80">
                • radcheck • radreply • radusergroup
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mb-4">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Dynamic QRIS &amp; Omnichannel Gateway
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Integrasi gateway multi-channel Tripay, Midtrans, dan Xendit. Menghasilkan QRIS Dinamis standar Bank Indonesia secara instan dengan verifikasi webhook 1-detik yang langsung memicu pembukaan isolir otomatis (auto-unsuspend).
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400/80">
                • ASPI EMVCo • VA Mandiri/BCA/BRI
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mb-4">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Loket Kasir POS &amp; Cetak Struk
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Antarmuka kasir cepat dengan dukungan pemindaian barcode fisik, kalkulator kembalian otomatis, pecahan uang pas, dan cetak struk thermal 58mm/80mm serta kwitansi bukti bayar A4 berstempel resmi.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-indigo-400/80">
                • Barcode Scanning • Thermal ESC/POS
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mb-4">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Ledger Keuangan &amp; Laporan Pajak
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Buku besar akuntansi pendapatan langganan ritel, rekap PPN 11% Keluaran untuk SPT Masa Pajak, rekap sewa wholesale Jartaplok, dan audit trail mutasi piutang yang tidak dapat diubah (append-only ledger).
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-teal-400/80">
                • Audit-Proof • e-Faktur Pajak Standar
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Keamanan Multi-Role Berprinsip Least Privilege
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Pembatasan izin hierarkis ketat antara peran Superadmin, Finance, Kasir Loket, dan Agen. Staf kasir diisolasi hanya pada menu penerimaan pembayaran tanpa hak mengakses audit logs maupun pengaturan sistem.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-cyan-400/80">
                • JWT RS256 • Role-Based Access Control
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer Copyright (Legal PT) ─────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; 2026 PT. Inovasi Sistem Pintar. All rights reserved.
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>ISPSYNC LEDGER</span>
            <span>•</span>
            <span>ENGINE 3 SPECIFICATION</span>
            <span>•</span>
            <span>CARRIER-GRADE TELECOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
