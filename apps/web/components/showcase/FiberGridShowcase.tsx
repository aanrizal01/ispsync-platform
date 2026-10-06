import React from "react";
import Link from "next/link";
import {
  Network,
  Cpu,
  Layers,
  Map,
  Activity,
  Radio,
  FileText,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Zap,
} from "lucide-react";

export function FiberGridShowcase() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* ── Ambient Radial Glows (Aurora Effect) ──────────────────────── */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header / Top Navbar (Showcase Navigation) ─────────────── */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">
                  ISPSYNC FIBERGRID
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-teal-400 border border-slate-700">
                  ENGINE 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                FTTX Physical Infrastructure &amp; Wholesale Jartaplok
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            >
              &larr; Platform
            </Link>
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-bold font-mono">
              <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                FiberGrid
              </span>
              <Link
                href="/showcase/nexus"
                className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition"
              >
                Nexus
              </Link>
              <Link
                href="/showcase/ledger"
                className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition"
              >
                Ledger
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="max-w-3xl">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-teal-400 border border-slate-700 mb-4 inline-block">
            Carrier-Grade Optical Plant Management
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Pemetaan Rute Kabel FO GIS, SNMP Poller OLT &amp;{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-400">
              Wholesale Port Sharing B2B
            </span>
          </h1>
          <p className="mt-6 text-sm sm:text-base text-slate-400 leading-relaxed">
            ISPSYNC FiberGrid mengendalikan seluruh lapisan infrastruktur fisik pasif dan aktif telekomunikasi. Dari data center OLT, cascading ODC splitter tray, tiang distribusi ODP, telemetri sinyal optik Tx/Rx dBm, hingga manajemen monetisasi sewa port jaringan tetap lokal (Jartaplok) lengkap dengan e-Faktur PPN 11% dan bukti potong PPh 23.
          </p>
        </div>

        {/* ── Key Technical Metric Badges ───────────────────────────── */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Geospatial Engine</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">PostGIS Spatial</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Feeder, dropcore &amp; KML export</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Multi-Vendor OLT</div>
            <div className="text-xl sm:text-2xl font-black text-teal-400 mt-1">ZTE, HW, CDATA</div>
            <div className="text-[11px] text-slate-500 mt-0.5">FiberHome, VSOL SNMP v2c</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Optical Telemetry</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">SNMP OPM dBm</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Laser Rx/Tx &amp; LOS alarms</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-[11px] text-slate-400 font-mono uppercase">B2B Wholesale Tax</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">PPN 11% &amp; PPh 23</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Jartaplok B2B Port Leasing</div>
          </div>
        </div>
      </section>

      {/* ── Capabilities Grid ───────────────────────────────────────── */}
      <section className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-teal-400 border border-slate-700">
              Platform Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
              Modul Utama ISPSYNC FiberGrid
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mb-4">
                  <Map className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Pemetaan Rute Kabel FO GIS &amp; Waypoint
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Visualisasi topologi rute kabel optik 12/24/48 Core di atas peta geospasial interaktif. Memetakan jalur kabel feeder utama, belokan tiang (waypoints), joint closure, hingga ekspor layer rute ke format KML Google Earth.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-teal-400/80">
                • PostGIS Spatial Lines • KML / KMZ Export
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  Manajemen OLT Multi-Vendor
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Pusat kendali perangkat OLT multi-chassis tanpa terkunci satu vendor. Mendukung chassis ZTE C300/C320, Huawei MA5608T/MA5800, FiberHome AN5516, C-Data, dan VSOL dengan pemantauan temperatur, modul SFP PON, dan utilisasi kapasitas.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-cyan-400/80">
                • Multi-Vendor GPON/EPON • SFP Telemetry
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mb-4">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  SNMP Poller &amp; Telemetri Redaman (OPM)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Poller otomatis berkala 5-menit yang membaca daya optik (Rx/Tx dBm) seluruh ONT pelanggan langsung dari OLT via SNMP OID. Mengklasifikasikan kondisi sinyal (Optimal &gt; -25 dBm, Peringatan -25 s.d -27 dBm, Kritis &lt; -27 dBm).
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-blue-400/80">
                • Auto Signal Classification • LOS Alerting
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mb-4">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  TR-069 ACS Wi-Fi &amp; Diagnostics
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Pengendalian parameter modem ONT pelanggan dari jarak jauh melalui standar TR-069 CWMP. NOC dapat memantau daftar perangkat terhubung (connected hosts), mengubah SSID &amp; password Wi-Fi dual-band, serta mengecek diagnostic ping modem.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-indigo-400/80">
                • TR-069 CWMP • Remote Wi-Fi Management
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mb-4">
                  <Boxes className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  ODC Tray Cascading &amp; Utilisasi ODP
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Hierarki manajemen pasif dari ODC splitter tray bertingkat (1:4 / 1:8 PLC) hingga port tiang ODP (1:8). Memantau port terisi versus port kosong secara visual sehingga perencanaan ekspansi kabel baru dapat dihitung secara akurat.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400/80">
                • Cascading Tree • Port Capacity Utilization
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mb-4">
                  <Workflow className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  B2B Wholesale Jartaplok &amp; Pajak
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Portal penyewaan port pasif tiang ODP kepada mitra ISP lain (Wholesale Infrastructure Sharing). Menghitung tarif sewa bulanan per port aktif, penerbitan invoice dengan PPN 11%, dan pemotongan PPh 23 (2%) lengkap dengan bukti e-Bupot.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-teal-400/80">
                • Open Access Sharing • B2B e-Faktur Pajak
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
            <span>ISPSYNC FIBERGRID</span>
            <span>•</span>
            <span>ENGINE 1 SPECIFICATION</span>
            <span>•</span>
            <span>CARRIER-GRADE TELECOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
