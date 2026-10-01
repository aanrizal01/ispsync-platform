import Link from "next/link";
import {
  Server,
  Smartphone,
  Globe,
  Zap,
  ShieldCheck,
  Printer,
  Wifi,
  BarChart3,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Users,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-blue-600 selection:text-white">
      {/* ── Background Glow ────────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/id" className="flex items-center gap-2.5 sm:gap-3 group">
            <img
              src="/logo-prism.png"
              alt="ISPSYNC"
              className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-xl sm:text-2xl font-black tracking-wider text-gray-900 font-sans">
              ISPSYNC
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#arsitektur" className="hover:text-blue-600 transition-colors">
              Arsitektur Enterprise
            </a>
            <a href="#fitur" className="hover:text-blue-600 transition-colors">
              Kapabilitas Platform
            </a>
            <a href="#harga" className="hover:text-blue-600 transition-colors">
              Paket &amp; Investasi
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center text-[10px] sm:text-xs font-semibold bg-gray-100 p-0.5 sm:p-1 rounded-lg border border-gray-200">
              <Link href="/" className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-gray-500 hover:text-gray-900 transition-colors">
                EN
              </Link>
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-white text-blue-600 shadow-sm font-bold">
                ID
              </span>
            </div>
            <Link
              href="/member/login"
              className="inline-flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <span className="hidden sm:inline">Portal Member</span>
              <span className="inline sm:hidden">Portal</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold mb-8">
          <Layers className="w-3.5 h-3.5" />
          <span>Enterprise Telecom Infrastructure & ISP Operations Orchestration Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight sm:leading-none text-gray-900">
          Kuasai Seluruh Ekosistem Broadband & Operasional ISP dalam{" "}
          <span className="text-blue-600">
            Satu Detak Sinkronisasi.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
          Dirancang untuk stabilitas skala telekomunikasi dan kepatuhan audit.
          <strong className="text-slate-800"> ISPSYNC</strong> mengintegrasikan Core Engine Telekomunikasi Berkecepatan Tinggi,
          Enterprise Web Portal, dan Point-of-Sales Mobile Lapangan dalam satu ekosistem realtime berkeandalan tinggi.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/member/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all"
          >
            <span>Masuk ke Portal Member</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://wa.me/6281100000000?text=Halo%20Admin%20ISPSYNC,%20saya%20tertarik%20konsultasi%20platform%20ISPSYNC"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold text-base px-8 py-4 rounded-xl shadow-sm transition-all"
          >
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Konsultasi Enterprise via WhatsApp</span>
          </a>
        </div>

        {/* Stats Strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-gray-200">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="text-3xl font-black text-blue-600">&lt; 10ms</div>
            <div className="text-xs text-gray-500 mt-1">Latensi Eksekusi Isolir & CoA</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="text-3xl font-black text-blue-600">100%</div>
            <div className="text-xs text-gray-500 mt-1">Realtime Multi-Engine Sync</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="text-3xl font-black text-emerald-600">Multi-Tier</div>
            <div className="text-xs text-gray-500 mt-1">Sistem Distribusi & Loket Resmi</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="text-3xl font-black text-indigo-600">PostGIS</div>
            <div className="text-xs text-gray-500 mt-1">Pemetaan Spasial ODP & Kabel Fiber</div>
          </div>
        </div>
      </section>

      {/* ── The 3-Engine Architecture ──────────────────────────────── */}
      <section id="arsitektur" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gray-50">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            The Triple-Power Technology
          </h2>
          <p className="text-3xl sm:text-5xl font-black text-gray-900">
            Ditenagai oleh Arsitektur 3 Mesin Mandiri
          </p>
          <p className="mt-4 text-gray-500">
            Dirancang dengan standar telekomunikasi modern <b>BSS &amp; OSS</b>. Tiga engine spesialis bekerja secara terdistribusi untuk menjamin keandalan jaringan carrier-grade, kolaborasi infrastruktur, dan akurasi rekonsiliasi finansial. Semua terhubung ke <b>Single Source of Truth</b> PostgreSQL + PostGIS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Engine 1: FiberGrid */}
          <div className="relative group rounded-2xl bg-white border border-gray-200 p-8 hover:border-amber-400 transition-all duration-300 hover:shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
              <Server className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 inline-block mb-3 border border-amber-200">
              ENGINE 1: INFRA & PHYSICAL
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ISPSYNC FiberGrid</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Mesin infrastruktur dan aset fisik. Mengurus semua aset jaringan pasif dan aktif dari tower OLT hingga tiang ODP di jalanan.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Manajemen Aset OLT / ODC / ODP</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Pemetaan Fiber GIS (PostGIS spatial)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>TR-069 Wi-Fi ACS (Zero-Touch Prov)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Manajemen Sewa Port Wholesale B2B</span>
              </li>
            </ul>
          </div>

          {/* Engine 2: Nexus */}
          <div className="relative group rounded-2xl bg-white border border-gray-200 p-8 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
              <Globe className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 inline-block mb-3 border border-emerald-200">
              ENGINE 2: RETAIL OPS
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ISPSYNC Nexus</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Mesin operasional ritel dan lapangan. Melayani kebutuhan pelanggan ritel mulai dari prospek, pendaftaran, hingga pemasangan baru.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Cek Coverage Presisi (Radius 250m)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>SPK & Tanda Tangan BAST Digital</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Sales Referral & Klaim Komisi</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Live NOC Monitoring Dashboard</span>
              </li>
            </ul>
          </div>

          {/* Engine 3: Ledger */}
          <div className="relative group rounded-2xl bg-white border border-gray-200 p-8 hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 inline-block mb-3 border border-blue-200">
              ENGINE 3: FINANCIAL & AAA
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ISPSYNC Ledger</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Mesin finansial dan otentikasi AAA. Mengurus perputaran uang, penagihan, izin akses jaringan, dan bagi hasil Jartaplok secara presisi.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Otomasi Invoicing & Tripay QRIS/VA</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>FreeRADIUS 3.2 AAA Terintegrasi</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Auto-Isolir & Auto-Restore (MikroTik CoA)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Ecosystem Revenue Share Settlement</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Key Features ───────────────────────────────────────────── */}
      <section id="fitur" className="relative z-10 py-20 bg-slate-900/30 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Kapabilitas Enterprise</h2>
            <p className="text-3xl sm:text-4xl font-black text-white">
              Solusi Terintegrasi Skala Telekomunikasi & Penyedia Jasa Internet
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <Wifi className="w-8 h-8 text-cyan-400 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Otomasi MikroTik & BRAS Broadband</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Sinkronisasi profile bandwidth dinamis, pool IP carrier-grade, isolir otomatis saat jatuh tempo, serta pembukaan
                blokir otomatis seketika setelah pembayaran terverifikasi.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <MessageSquare className="w-8 h-8 text-emerald-400 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">WhatsApp Gateway Terpadu</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pengingat tagihan otomatis (H-3, H-1, saat jatuh tempo), kirim kode voucher internet, dan kuitansi
                pembayaran PDF langsung ke nomor WhatsApp pelanggan.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <Printer className="w-8 h-8 text-amber-400 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Thermal Print Struk Resmi</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Dukungan printer kasir thermal Bluetooth 58mm & 80mm dari HP Android maupun desktop web untuk bukti
                bayar resmi bernomor seri audit unik.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <BarChart3 className="w-8 h-8 text-blue-400 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Laporan Finansial & Biaya Operasional (OPEX)</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Bukan cuma catat omset pemasukan, catat juga seluruh pengeluaran operasional infrastruktur (sewa tiang, beli kabel fiber,
                gaji teknisi) untuk mengetahui EBITDA dan laba bersih riil bisnis ISP Anda.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <ShieldCheck className="w-8 h-8 text-purple-400 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Keamanan & Kepatuhan Enterprise</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Autentikasi JWT RSA-4096, isolasi database PostgreSQL terenkripsi, rate limiting Redis anti-brute
                force, proteksi DDoS, dan pencatatan audit log per tindakan operator.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <Users className="w-8 h-8 text-rose-400 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Multi-Role RBAC & Manajemen Mitra</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Hak akses berjenjang: NOC Engineer, Super Admin, Finance Ops, Support Lapangan, hingga Mitra Reseller / Loket Resmi
                dengan saldo deposit terkelola dan bagi hasil otomatis.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ── Pricing & Investment Section ──────────────────────────── */}
      <section id="harga" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paket &amp; Investasi Enterprise</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            Investasi Terukur untuk Skala Jaringan Tanpa Batas
          </h2>
          <p className="mt-4 text-gray-500 text-base leading-relaxed">
            Pilihan paket transparan berbasis kapasitas riil pelanggan dan infrastruktur Anda. Ditambah opsi Add-Ons fleksibel kapan pun jaringan Anda bertumbuh pesat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Plan 1: Starter */}
          <div className="rounded-2xl bg-white border border-gray-200 p-7 flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">ISP Regional</div>
              <h3 className="text-2xl font-black text-gray-900">Starter</h3>
              <p className="text-xs text-gray-500 mt-2 min-h-[36px]">
                Untuk ISP regional berkembang atau operator mandiri berlisensi.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-gray-500">Rp</span>
                  <span className="text-3xl font-black text-gray-900">2.500.000</span>
                  <span className="text-xs text-gray-500">/ bln</span>
                </div>
                <div className="text-[11px] text-blue-600 mt-1 font-bold">Hingga 1.500 Pelanggan Aktif</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Ledger (Billing &amp; AAA) + Nexus Dasar</div>
              </div>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>2 Router BRAS / MikroTik Gateway</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>FreeRADIUS 3.2 AAA Terintegrasi</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Otomasi Isolir CoA &amp; Payment (VA/QRIS)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Web Backoffice &amp; Form Registrasi Ritel</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>WhatsApp Gateway Notifikasi Tagihan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Maks. 5 Akun Staf (NOC, CS, Kasir)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">Dukungan Jam Kerja Reguler</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/member/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs transition-all border border-gray-200"
              >
                <span>Pilih Paket Starter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Plan 2: Professional (Featured) */}
          <div className="relative rounded-2xl bg-blue-600 border-2 border-blue-600 p-7 flex flex-col justify-between shadow-2xl transform lg:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-blue-700 font-black text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap border border-blue-200">
              Paling Diminati
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">FTTH Multi-POP</div>
              <h3 className="text-2xl font-black text-white">Professional</h3>
              <p className="text-xs text-blue-100 mt-2 min-h-[36px]">
                Standar emas untuk ISP berlisensi aktif dengan ekspansi jaringan fiber.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-blue-400">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-blue-200">Rp</span>
                  <span className="text-3xl font-black text-white">6.500.000</span>
                  <span className="text-xs text-blue-200">/ bln</span>
                </div>
                <div className="text-[11px] text-cyan-200 mt-1 font-bold">Hingga 5.000 Pelanggan Aktif</div>
                <div className="text-[10px] text-blue-200 mt-0.5">Ledger + Nexus Penuh (SPK HP) + FiberGrid</div>
              </div>
              <ul className="space-y-3 text-xs text-white">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>5 Router BRAS / Gateway MikroTik</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>Hingga 500 Tiang ODP/ODC di Peta GIS</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>SPK &amp; BAST Digital (Tanda Tangan HP)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>Cek Coverage 250m &amp; Komisi Referral</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>Android POS Thermal Kasir Lapangan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>15 Akun Staf (NOC, Teknisi, CS, Sales)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-white">Dukungan Prioritas 24/7 (WhatsApp)</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/member/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs shadow-lg transition-all transform hover:scale-105"
              >
                <span>Pilih Paket Professional</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="rounded-2xl bg-white border border-gray-200 p-7 flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Carrier-Grade</div>
              <h3 className="text-2xl font-black text-gray-900">Enterprise</h3>
              <p className="text-xs text-gray-500 mt-2 min-h-[36px]">
                Kapasitas besar untuk ISP Metropolitan &amp; Telco Regional.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-gray-500">Rp</span>
                  <span className="text-3xl font-black text-gray-900">14.500.000</span>
                  <span className="text-xs text-gray-500">/ bln</span>
                </div>
                <div className="text-[11px] text-indigo-600 mt-1 font-bold">Hingga 15.000 Pelanggan Aktif</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Full 3 Engine + Wholesale Jartaplok</div>
              </div>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Router BRAS &amp; Gateway</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Tiang ODP / ODC &amp; Rute Fiber</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Hingga 8 Unit OLT Auto-Config (ZTE/Huawei)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>TR-069 ACS Remote Modem &amp; Redaman dBm</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Modul Wholesale Jartaplok (Sewa Port)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Akun Staf &amp; Multi-Branch RBAC</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-indigo-700">Dedicated SLA Garansi Uptime 99.9%</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/member/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs transition-all border border-gray-200"
              >
                <span>Pilih Paket Enterprise</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Plan 4: Private On-Premise */}
          <div className="rounded-2xl bg-white border border-gray-200 p-7 flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-2">Data Sovereignty</div>
              <h3 className="text-2xl font-black text-gray-900">Private Telco</h3>
              <p className="text-xs text-gray-500 mt-2 min-h-[36px]">
                On-Premise deployment di data center atau server internal milik klien.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-gray-500">Rp</span>
                  <span className="text-3xl font-black text-gray-900">65.000.000</span>
                  <span className="text-xs text-gray-500">/ thn</span>
                </div>
                <div className="text-[11px] text-rose-600 mt-1 font-bold">Kapasitas Unlimited Total</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Full 3 Engine On-Premise 100% Milik Anda</div>
              </div>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>100% On-Site Server / Data Center Klien</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Kedaulatan Data Total (Zero Data Sharing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>High-Availability &amp; Disaster Recovery Setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Router BRAS, OLT &amp; ODP GIS</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Full API Access &amp; Custom Integration Telco</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-rose-700">Dedicated SLA 99.95% &amp; NOC Escalation</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <a
                href="https://wa.me/6281100000000?text=Halo%20Tim%20ISPSYNC,%20saya%20tertarik%20konsultasi%20paket%20Private%20Telco%20On-Premise"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all"
              >
                <span>Konsultasi Private Telco</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Scale-As-You-Grow Add-Ons ────────────────────────────── */}
        <div className="mt-16 rounded-3xl bg-slate-50 border border-slate-200/80 p-8 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fleksibilitas Tanpa Batas</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Ekspansi Kuota Fleksibel (Scale-As-You-Grow Add-Ons)
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
                Butuh kapasitas tambahan di tengah masa pertumbuhan tanpa harus langsung upgrade ke tier di atasnya? Kombinasikan add-ons sesuai kebutuhan riil jaringan Anda.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/member/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <span>Kustomisasi Kuota</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Ekstra 500 Pelanggan Aktif</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +Rp 500.000 <span className="text-xs font-normal text-gray-500">/ bln</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tambah kuota FreeRADIUS &amp; billing secara bertahap saat ekspansi klaster baru tanpa loncat paket.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
                <Server className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Ekstra 1 Unit OLT (Auto-Config)</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +Rp 750.000 <span className="text-xs font-normal text-gray-500">/ bln</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Kelola tambahan perangkat OLT ZTE / Huawei / BDCOM dengan auto-provisioning dan monitoring redaman.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Ekstra 250 Titik ODP / GIS</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +Rp 350.000 <span className="text-xs font-normal text-gray-500">/ bln</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Perluas batas pemetaan tiang ODP, ODC, enclosure, dan tracing jalur kabel optik pada peta spasial PostGIS.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Ekstra 5 Akun Teknisi &amp; Staf</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +Rp 250.000 <span className="text-xs font-normal text-gray-500">/ bln</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Lisensi staf lapangan tambahan untuk aplikasi Android SPK pemasangan, BAST digital, dan kasir loket.
              </p>
            </div>
          </div>
        </div>

        {/* Annual Discount Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-blue-600 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-white text-base">Hemat Hingga 2 Bulan dengan Pembayaran Tahunan</div>
              <div className="text-xs text-blue-100 mt-0.5">Dapatkan garansi harga tetap, prioritas fitur baru, dan gratis biaya onboarding migrasi database.</div>
            </div>
          </div>
          <Link
            href="/member/login"
            className="flex-shrink-0 px-6 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs transition-all"
          >
            Aktivasi Paket Tahunan
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-200 bg-white pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src="/logo-prism.png"
                  alt="ISPSYNC"
                  className="h-8 w-auto object-contain"
                />
                <span className="font-black text-gray-900 text-lg tracking-wider">ISPSYNC</span>
              </div>
              <p className="max-w-xs text-gray-500 text-xs leading-relaxed mb-6">
                The Triple-Engine Platform for ISPs & Telecom Network Operators. Infrastruktur sekelas carrier untuk otomasi billing, radius, dan CRM.
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="text-gray-900 font-semibold mb-2">Metode Pembayaran Internasional</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Stripe</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">PayPal</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Visa</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Mastercard</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-900 font-semibold mb-2">Metode Pembayaran Lokal (Indonesia)</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">QRIS</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">BCA</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Mandiri</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">BNI</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Virtual Account</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-gray-900 font-semibold mb-4 text-sm">Platform</div>
              <ul className="space-y-3">
                <li><a href="#arsitektur" className="hover:text-blue-600 transition-colors">Arsitektur Triple-Engine</a></li>
                <li><a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur Utama</a></li>
                <li><a href="#harga" className="hover:text-blue-600 transition-colors">Paket & Harga</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">API Developer</a></li>
              </ul>
            </div>

            <div>
              <div className="text-gray-900 font-semibold mb-4 text-sm">Perusahaan</div>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Hubungi Sales</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Syarat & Ketentuan</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span>© {new Date().getFullYear()} ISPSYNC Enterprise. Hak Cipta Dilindungi Undang-Undang.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
