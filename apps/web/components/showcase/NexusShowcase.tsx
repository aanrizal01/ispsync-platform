import React from "react";
import {
  MapPin,
  FileCheck2,
  Users,
  Compass,
  Smartphone,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Activity,
  FileText,
  UserCheck,
} from "lucide-react";

export function NexusShowcase() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* ── Ambient Radial Glows (Aurora Effect) ──────────────────────── */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header / Top Navbar (Showcase Only - No CTA) ─────────────── */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">
                  ISPSYNC NEXUS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 border border-slate-700">
                  ENGINE 2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Retail CRM, Field Operations &amp; Customer Onboarding
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
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 border border-slate-700 mb-4 inline-block">
            ISP Retail Operations &amp; Field Dispatch Engine
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Manajemen CRM Pelanggan, Cek Coverage GIS &amp;{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400">
              Surat Tugas Teknisi Digital
            </span>
          </h1>
          <p className="mt-6 text-sm sm:text-base text-slate-400 leading-relaxed">
            ISPSYNC Nexus adalah pusat operasional ritel ISP yang menjembatani calon pelanggan dengan regu teknisi lapangan dan tim pemasaran. Dilengkapi kalkulasi jangkauan dropcore presisi (Haversine formula), onboarding mandiri nir-kertas, hingga verifikasi berita acara pemasangan digital berbasis GPS dan redaman OPM.
          </p>
        </div>

        {/* ── Key Technical Metric Badges ───────────────────────────── */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Coverage Radius</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">&le; 250 Meter</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Haversine formula from ODP</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Onboarding Model</div>
            <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1">100% Paperless</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Digital contract &amp; e-Signature</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Optical Quality Gate</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">&ge; -27 dBm</div>
            <div className="text-[11px] text-slate-500 mt-0.5">BAST digital field threshold</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Sales Commission</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">Direct Referral</div>
            <div className="text-[11px] text-slate-500 mt-0.5">WhatsApp attribution link</div>
          </div>
        </div>
      </section>

      {/* ── Capabilities Grid ───────────────────────────────────────── */}
      <section className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 border border-slate-700">
              Platform Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
              Modul Utama ISPSYNC Nexus
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mb-4">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Portal Registrasi Publik &amp; Cek Jangkauan
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Portal mandiri bagi calon pelanggan untuk mengecek ketersediaan port tiang ODP di dekat rumahnya. Menggunakan peta interaktif Leaflet GIS dengan penghitungan jarak garis lurus maksimal 250 meter agar redaman optik tetap prima.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-blue-400/80">
                • Self-Service Registration • Radius Guard
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mb-4">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Kontrak Berlangganan &amp; e-Signature Legal
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Pembuatan surat perjanjian berlangganan internet otomatis sesuai regulasi Kominfo. Memuat klausul hak &amp; kewajiban, masa retensi layanan, integrasi upload foto KTP, dan tanda tangan digital langsung di layar ponsel pelanggan.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-cyan-400/80">
                • Legal Compliance • Paperless E-Sign
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mb-4">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Surat Perintah Kerja (SPK) Teknisi Lapangan
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Dispatching tugas instalasi pasang baru atau perbaikan gangguan langsung ke smartphone regu teknisi lapangan. Memuat titik koordinat rumah pelanggan, tiang ODP yang ditugaskan, dan nomor port ODP yang dialokasikan.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-teal-400/80">
                • Dispatch Mobile Portal • Real-Time Routing
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mb-4">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Berita Acara (BAST) Digital &amp; Validasi OPM
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Pengesahan aktivasi internet pasca pemasangan. Teknisi menginput foto hasil ukur Optical Power Meter (OPM) dengan standar redaman minimal -27 dBm. Pemasangan tidak dapat di-close bila redaman buruk melebihi ambang batas toleransi.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400/80">
                • Optical Quality Audit • Photo Evidence
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mb-4">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Portal Sales &amp; Pelacakan Komisi Referral
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Portal khusus bagi Account Executive dan agen pemasaran. Dilengkapi generator tautan WhatsApp promosi dengan kode referensi unik, dashboard pencapaian target pasang baru, serta rekapitulasi klaim komisi secara transparan.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-indigo-400/80">
                • Attribution Engine • WhatsApp Referral
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  NOC Live Monitoring &amp; Session Reset
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Dashboard pemantauan sesi aktif pelanggan PPPoE secara live. Petugas NOC dapat memfilter pelanggan per wilayah klaster tiang, memeriksa IP address aktif, memantau uptime modem, dan melakukan kick/reset sesi koneksi dalam 1 klik.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-blue-400/80">
                • Live PPPoE Sessions • Radius Kick
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
            <span>ISPSYNC NEXUS</span>
            <span>•</span>
            <span>ENGINE 2 SPECIFICATION</span>
            <span>•</span>
            <span>CARRIER-GRADE TELECOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
