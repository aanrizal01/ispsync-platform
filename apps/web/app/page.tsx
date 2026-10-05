import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

export default async function InternationalLandingPage() {
  const headersList = await headers();
  const rawHost = headersList.get("host") || "";
  const host = rawHost.toLowerCase().split(":")[0];

  // Subdomain & tenant domain routing
  if (host.startsWith("agent.")) {
    redirect("/agent/login");
  }

  if (host.startsWith("member.")) {
    redirect("/member/login");
  }

  if (host.startsWith("hotspot.") || host.startsWith("wifi.") || host.startsWith("passpoint.")) {
    redirect("/hotspot");
  }

  // Check if request is for the main SaaS public landing page
  const isSaaSHost =
    host === "ispsync.id" ||
    host === "www.ispsync.id" ||
    host === "localhost" ||
    host === "127.0.0.1";

  // All ISP & tenant domains (billing.gogiga.net.id, ledger.ispmu.ispsync.id, etc.)
  // route directly to the ISP Ledger & Billing login page
  if (!isSaaSHost) {
    redirect("/login");
  }

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
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
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
            <a href="#architecture" className="hover:text-blue-600 transition-colors">
              Triple-Engine Architecture
            </a>
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Platform Capabilities
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Plans &amp; Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center text-[10px] sm:text-xs font-semibold bg-gray-100 p-0.5 sm:p-1 rounded-lg border border-gray-200">
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-white text-blue-600 shadow-sm font-bold">
                EN
              </span>
              <Link
                href="/id"
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-gray-500 hover:text-gray-900 transition-colors"
              >
                ID
              </Link>
            </div>
            <Link
              href="/member/login"
              className="inline-flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <span className="hidden sm:inline">Member Portal</span>
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
          <span>Next-Gen Telecom Infrastructure &amp; ISP Operations Orchestration Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight sm:leading-none text-gray-900">
          Unify Your Entire Broadband Ecosystem &amp; Field Operations in{" "}
          <span className="text-blue-600">
            One Real-Time Pulse.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
          Engineered for carrier-scale stability, multi-vendor fiber orchestration, and strict audit compliance.
          <strong className="text-slate-800"> ISPSYNC</strong> seamlessly orchestrates High-Throughput Core AAA Engines,
          Enterprise Web Portals, and Mobile Field Operations in a unified, real-time ecosystem.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/member/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all"
          >
            <span>Access Member Portal</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://wa.me/6281100000000?text=Hello%20ISPSYNC%20Team,%20I%20would%20like%20to%20consult%20regarding%20the%20ISPSYNC%20Enterprise%20platform"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold text-base px-8 py-4 rounded-xl border border-gray-300 shadow-sm transition-all"
          >
            <span>Schedule Architecture Call</span>
          </a>
        </div>

        {/* Highlight Metrics / Architecture Pill */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="text-blue-600 font-bold text-sm mb-1">Multi-Vendor OLT</div>
            <div className="text-xs text-gray-500">Huawei, ZTE, BDCOM &amp; Fiberhome Auto-Config</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="text-cyan-600 font-bold text-sm mb-1">Carrier-Grade AAA</div>
            <div className="text-xs text-gray-500">FreeRADIUS 3.2 with Dynamic CoA &lt; 5ms</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="text-indigo-600 font-bold text-sm mb-1">Spatial GIS Mapping</div>
            <div className="text-xs text-gray-500">PostGIS Fiber Tracing, ODC, ODP &amp; Cables</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="text-emerald-600 font-bold text-sm mb-1">B2B Wholesale</div>
            <div className="text-xs text-gray-500">Open-Access Port Sharing &amp; Auto-Settlement</div>
          </div>
        </div>
      </section>

      {/* ── Triple-Engine Architecture ──────────────────────────────── */}
      <section id="architecture" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
            <Server className="w-3.5 h-3.5" />
            <span>Zero-Overlap Decoupled Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            The Triple-Engine Telecom Framework
          </h2>
          <p className="mt-4 text-gray-500 text-base leading-relaxed">
            Three independent engines designed with zero overlap. Scale physical fiber assets, field operations,
            and high-throughput financial transactions without operational bottlenecks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Engine 1: FiberGrid */}
          <div className="relative group rounded-2xl bg-white border border-gray-200 p-8 hover:border-amber-400 transition-all duration-300 hover:shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 inline-block mb-3 border border-amber-200">
              ENGINE 1: INFRA &amp; PHYSICAL ASSETS
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ISPSYNC FiberGrid</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Infrastructure and physical asset engine. Manages passive and active fiber assets from central OLTs to street-level ODP distribution boxes.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>OLT, ODC &amp; ODP Passive/Active Inventory</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Spatial PostGIS Fiber Route &amp; Splice Mapping</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>TR-069 / TR-369 Wi-Fi ACS Zero-Touch Provisioning</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>B2B Wholesale Port Monetization &amp; VNO Sharing</span>
              </li>
            </ul>
          </div>

          {/* Engine 2: Nexus */}
          <div className="relative group rounded-2xl bg-white border border-gray-200 p-8 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
              <Globe className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 inline-block mb-3 border border-emerald-200">
              ENGINE 2: RETAIL OPS &amp; FIELD DISPATCH
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ISPSYNC Nexus</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Retail operations and field technician engine. Manages subscriber lifecycle from lead generation, installation work orders, to field handovers.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Sub-250m Precision Coverage Geolocation Engine</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Mobile Digital Work Orders &amp; E-Signatures</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Sales Partner Referral Tracking &amp; Auto-Commissions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Live NOC Telemetry, Optical Loss &amp; Incident Dispatch</span>
              </li>
            </ul>
          </div>

          {/* Engine 3: Ledger */}
          <div className="relative group rounded-2xl bg-white border border-gray-200 p-8 hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 inline-block mb-3 border border-blue-200">
              ENGINE 3: FINANCIAL &amp; AAA ORCHESTRATION
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">ISPSYNC Ledger</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Financial ledger and network authentication engine. Handles recurring billing, RADIUS authentication, CoA disconnection, and open-access settlements.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Automated Invoicing &amp; Multi-Gateway Payment</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Embedded FreeRADIUS 3.2 High-Throughput AAA</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Instant CoA Auto-Suspension &amp; Payment Restoration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Automated B2B Revenue-Share Settlement Engine</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Platform Capabilities ───────────────────────────────────── */}
      <section id="features" className="relative z-10 py-20 bg-slate-900/30 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Carrier-Grade Capabilities</h2>
            <p className="text-3xl sm:text-4xl font-black text-gray-900">
              End-to-End Orchestration for Modern Broadband &amp; Fiber Operators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <Wifi className="w-8 h-8 text-cyan-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">MikroTik &amp; Carrier BRAS/BNG Gateway Automation</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Dynamic bandwidth profile provisioning, carrier-grade IPv4/IPv6 address pool orchestration, instant CoA auto-suspension upon invoice expiry, and instantaneous restoration upon verified settlement.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <MessageSquare className="w-8 h-8 text-emerald-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Omnichannel Subscriber Notifications</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Automated multi-stage billing alerts (T-3, T-1, Due Date), Wi-Fi voucher passcodes, and verified PDF receipts dispatched directly via WhatsApp Business API, SMS, and Email gateways.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <Printer className="w-8 h-8 text-amber-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Field Mobile POS &amp; Thermal Receipts</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Seamless support for 58mm and 80mm wireless Bluetooth thermal printers from mobile Android apps and desktop web, delivering legally audited receipts with unique serial verification.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <BarChart3 className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Telecom Financial Audit &amp; OPEX Accounting</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Beyond subscriber revenue: track complete infrastructure OPEX—pole rental, dark fiber leases, splicing consumables, and technician field labor—to accurately assess EBITDA and true net margins.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <ShieldCheck className="w-8 h-8 text-purple-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Enterprise Security &amp; Regulatory Compliance</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                RSA-4096 JWT authentication, isolated encrypted PostgreSQL instances, Redis anti-brute-force rate limiting, DDoS perimeter mitigation, and immutable operator audit logs for telecom regulators.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <Users className="w-8 h-8 text-rose-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Multi-Role RBAC &amp; Partner Management</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tiered permission boundaries: NOC Engineers, Super Admins, Field Support, Cashiers, and Reseller Partners with managed credit balances and automated revenue-share splits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing & Investment Section ──────────────────────────── */}
      <section id="pricing" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Telecom Investment</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            Predictable Pricing for Infinite Network Expansion
          </h2>
          <p className="mt-4 text-gray-500 text-base leading-relaxed">
            Transparent subscription tiers based on active subscribers and real infrastructure capacity. Plus flexible add-ons whenever your network accelerates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Plan 1: Starter */}
          <div className="rounded-2xl bg-white border border-gray-200 p-7 flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Regional WISP / ISP</div>
              <h3 className="text-2xl font-black text-gray-900">Starter</h3>
              <p className="text-xs text-gray-500 mt-2 min-h-[36px]">
                For emerging regional ISPs, WISPs, and licensed independent operators.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-gray-500">$</span>
                  <span className="text-3xl font-black text-gray-900">149</span>
                  <span className="text-xs text-gray-500">/ mo</span>
                </div>
                <div className="text-[11px] text-blue-600 mt-1 font-bold">Up to 1,500 Active Subscribers</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Ledger (Billing &amp; AAA) + Nexus Basic</div>
              </div>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>2 BRAS / MikroTik Gateway Routers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Integrated FreeRADIUS 3.2 AAA Engine</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Instant CoA Auto-Disconnect &amp; Invoicing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Web Operations Backoffice &amp; Registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Automated Billing &amp; WhatsApp Notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Up to 5 Staff Seats (NOC, CS, Cashier)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">Standard Business Hours Support</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/member/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs transition-all border border-gray-200"
              >
                <span>Select Starter Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Plan 2: Professional (Featured) */}
          <div className="relative rounded-2xl bg-blue-600 border-2 border-blue-600 p-7 flex flex-col justify-between shadow-2xl transform lg:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-blue-700 font-black text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap border border-blue-200">
              Most Popular
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">FTTH Multi-POP</div>
              <h3 className="text-2xl font-black text-white">Professional</h3>
              <p className="text-xs text-blue-100 mt-2 min-h-[36px]">
                The industry standard for licensed ISPs actively expanding optical fiber networks.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-blue-400">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-blue-200">$</span>
                  <span className="text-3xl font-black text-white">399</span>
                  <span className="text-xs text-blue-200">/ mo</span>
                </div>
                <div className="text-[11px] text-cyan-200 mt-1 font-bold">Up to 5,000 Active Subscribers</div>
                <div className="text-[10px] text-blue-200 mt-0.5">Ledger + Full Nexus (Mobile SPK) + FiberGrid</div>
              </div>
              <ul className="space-y-3 text-xs text-white">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>5 BRAS / BNG Gateway Routers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>Up to 500 ODP/ODC Enclosures on GIS Map</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>Mobile Work Orders &amp; Digital Signatures</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>250m Coverage Qualification &amp; Referral Engine</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>Android Field POS &amp; Thermal Printing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span>15 Staff Seats (NOC, Field Techs, CS, Sales)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-white">24/7 Dedicated Support (Priority WhatsApp SLA)</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/member/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs shadow-lg transition-all transform hover:scale-105"
              >
                <span>Select Professional Plan</span>
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
                High-capacity orchestration for metropolitan fiber operators and regional telcos.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-gray-500">$</span>
                  <span className="text-3xl font-black text-gray-900">899</span>
                  <span className="text-xs text-gray-500">/ mo</span>
                </div>
                <div className="text-[11px] text-indigo-600 mt-1 font-bold">Up to 15,000 Active Subscribers</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Full 3 Engines + B2B Wholesale Sharing</div>
              </div>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited BRAS &amp; Gateway Routers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited ODP / ODC Enclosures &amp; Fiber Routes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Up to 8 OLTs Auto-Config (Huawei / ZTE / BDCOM)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>TR-069 ACS Remote Modem &amp; Optical dBm Diagnostics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>B2B Wholesale Port Monetization Module</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited Staff Seats &amp; Multi-Branch RBAC</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-indigo-700">Dedicated SLA: 99.9% Guaranteed Uptime</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/member/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs transition-all border border-gray-200"
              >
                <span>Select Enterprise Plan</span>
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
                Bare-metal or private cloud deployment inside your own datacenter.
              </p>
              <div className="mt-6 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-gray-500">$</span>
                  <span className="text-3xl font-black text-gray-900">3,990</span>
                  <span className="text-xs text-gray-500">/ yr</span>
                </div>
                <div className="text-[11px] text-rose-600 mt-1 font-bold">Unlimited Total Capacity</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Full 3 Engines On-Premises in Your Data Center</div>
              </div>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>100% On-Site Server / Client Data Center</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Total Data Sovereignty (Zero External Data Sharing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>High-Availability Cluster &amp; Disaster Recovery Setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited BRAS Routers, OLTs &amp; GIS Fiber Assets</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>Full Core Telecom REST API &amp; OSS/BSS Integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-rose-700">Dedicated SLA: 99.95% &amp; Direct Tier-3 Escalation</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <a
                href="https://wa.me/6281100000000?text=Hello%20ISPSYNC%20Team,%20I%20am%20interested%20in%20consulting%20for%20Private%20Telco%20On-Premise%20deployment"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all"
              >
                <span>Consult Private Telco</span>
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
                <span>Infinite Flexibility</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Scale-As-You-Grow Add-Ons
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
                Need extra capacity between growth phases without immediately jumping into the next plan tier? Combine add-ons as your fiber footprint expands.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/member/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <span>Customize Capacity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Extra 500 Active Subscribers</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +$35 <span className="text-xs font-normal text-gray-500">/ mo</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Gradually scale FreeRADIUS &amp; billing quota when expanding new residential or business fiber clusters.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
                <Server className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Extra 1 OLT Unit (Auto-Config)</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +$50 <span className="text-xs font-normal text-gray-500">/ mo</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Automate registration &amp; optical loss telemetry on additional Huawei / ZTE / BDCOM OLT chassis.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Extra 250 ODP / GIS Nodes</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +$25 <span className="text-xs font-normal text-gray-500">/ mo</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Expand spatial boundary limits for poles, splice closures, and fiber trunk routes on PostGIS GIS mapping.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 mb-1">Extra 5 Field Tech &amp; Staff Seats</div>
              <div className="text-lg font-black text-blue-600 mb-2">
                +$20 <span className="text-xs font-normal text-gray-500">/ mo</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Additional staff licenses for Android mobile work orders, on-site e-signatures, and mobile POS cashiers.
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
              <div className="font-bold text-white text-base">Save up to 2 Months with Annual Billing</div>
              <div className="text-xs text-blue-100 mt-0.5">Lock in your guaranteed rate, priority roadmap features, and complimentary database migration onboarding.</div>
            </div>
          </div>
          <Link
            href="/member/login"
            className="flex-shrink-0 px-6 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs transition-all"
          >
            Activate Annual Plan
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
                The Triple-Engine Platform for ISPs & Telecom Network Operators. Carrier-grade infrastructure to automate billing, radius, and CRM.
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="text-gray-900 font-semibold mb-2">International Payments</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Stripe</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">PayPal</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Visa</span>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded font-medium text-gray-700">Mastercard</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-900 font-semibold mb-2">Local Payments (Indonesia)</div>
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
                <li><a href="#architecture" className="hover:text-blue-600 transition-colors">Triple-Engine Architecture</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Core Features</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing & Plans</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Developer API</a></li>
              </ul>
            </div>

            <div>
              <div className="text-gray-900 font-semibold mb-4 text-sm">Company</div>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-blue-600 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Contact Sales</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span>© {new Date().getFullYear()} ISPSYNC Enterprise. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
