"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useMember } from "./context";
import {
  Building2,
  SlidersHorizontal,
  Network,
  Globe,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Radio,
  Settings,
  HelpCircle,
  ExternalLink,
  Mail,
  Users,
  Server
} from "lucide-react";

const mainNavItems = [
  { href: "/member/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/member/invoices", label: "Invoice & Billing", icon: Receipt },
];

const engineNavItems = [
  { href: "/member/engine/ledger", label: "Engine Ledger", sub: "Billing & AAA", icon: CreditCard, key: "ledger" as const },
  { href: "/member/engine/nexus", label: "Engine Nexus", sub: "Customer & Ops", icon: Globe, key: "nexus" as const },
  { href: "/member/engine/fibergrid", label: "Engine FiberGrid", sub: "FTTX & NOC", icon: Radio, key: "fibergrid" as const },
];

const accountNavItems = [
  { href: "/member/staff", label: "Manajemen Staf & Akses", icon: Users },
  { href: "/member/profile", label: "Pengaturan Akun & Profil", icon: Settings },
  { href: "/member/support", label: "Bantuan & Support", icon: HelpCircle },
];

function getEngineUrls(domain?: string) {
  let d = domain ? domain.trim() : "";
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!d) {
    if (typeof window !== "undefined") {
      d = window.location.hostname;
    } else {
      d = "ispsync.id";
    }
  }

  // Strip existing engine subdomains if present
  d = d.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx)\./, "");

  return {
    ledger: `https://ledger.${d}`,
    nexus: `https://nexus.${d}`,
    fibergrid: `https://fibergrid.${d}`,
  };
}

export default function MemberNav({ children }: { children: React.ReactNode }) {
  const { member, loading, logout } = useMember();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !member) router.replace("/member/login");
    if (!loading && (member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001") && pathname.startsWith("/member/engine")) {
      router.replace("/member/tenants");
    }
  }, [member, loading, pathname, router]);

  if (loading || !member) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Memuat...</div>
    </div>
  );

  // Days remaining
  const expires = new Date(member.expiresAt);
  const today = new Date();
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const urls = getEngineUrls(member.domain);

  const isSuperadmin =
    member?.role === "SUPERADMIN" || member?.email === "admin@ispsync.id" || member?.id === "mbr_001";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100">
          <img
            src="/logo-prism.png"
            alt="ISPSYNC"
            className="h-8 w-auto object-contain"
          />
          <div>
            <div className="font-black text-gray-900 text-sm tracking-wider">ISPSYNC</div>
            <div className="text-[10px] text-gray-400 font-medium">
              {isSuperadmin ? "Platform Console" : "Member Portal"}
            </div>
          </div>
        </div>

        {/* Plan badge */}
        <div className="mx-4 mt-3 mb-2 p-3 bg-blue-50/70 rounded-xl border border-blue-100/70">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-0.5">
            {isSuperadmin ? "Peran Platform" : "Paket Aktif"}
          </div>
          <div className="font-black text-blue-700 text-xs truncate">
            {isSuperadmin ? "Master Superadmin" : member.planName}
          </div>
          <div className="text-[10px] text-blue-500 mt-0.5">
            {isSuperadmin ? "Kedaulatan Sistem Penuh" : daysLeft > 0 ? `${daysLeft} hari tersisa` : "Sudah expired"}
          </div>
        </div>

        {/* Nav Container with Scroll */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Section 0: Superadmin Management (Master only) */}
          {isSuperadmin && (
            <div>
              <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-cyan-600">
                <span>Manajemen Platform</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-cyan-100 text-cyan-800 border border-cyan-200">
                  ROOT
                </span>
              </div>
              <div className="space-y-0.5">
                <Link
                  href="/member/tenants"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/tenants"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Daftar Pelanggan SaaS</span>
                </Link>
                <Link
                  href="/member/gateway"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/gateway"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Network className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Gateway &amp; Caddy Domains</span>
                </Link>
                <Link
                  href="/member/dns"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/dns"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Globe className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>DNS Server &amp; Zones</span>
                </Link>
                <Link
                  href="/cms-9x7k2"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/cms-9x7k2"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>CMS &amp; Paket Langganan</span>
                </Link>
                <Link
                  href="/member/settings-saas"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/settings-saas"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Server className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Pengaturan Kuota SaaS</span>
                </Link>
                <Link
                  href="/member/settings"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/settings"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Pengaturan SMTP &amp; Mailer</span>
                </Link>
                <Link
                  href="/member/settings-payment"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/settings-payment"
                      ? "bg-slate-900 text-cyan-400 shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Pengaturan Payment Gateway</span>
                </Link>
              </div>
            </div>
          )}

          {/* Section 1: Main */}
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Menu Utama
            </div>
            <div className="space-y-0.5">
              <Link
                href="/member/dashboard"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  pathname === "/member/dashboard"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/member/dashboard" ? "text-white" : "text-gray-500"}`} />
                <span>Dashboard</span>
              </Link>
              {!isSuperadmin && (
                <Link
                  href="/member/invoices"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    pathname === "/member/invoices"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Receipt className={`w-4 h-4 shrink-0 ${pathname === "/member/invoices" ? "text-white" : "text-gray-500"}`} />
                  <span>Invoice &amp; Billing</span>
                </Link>
              )}
            </div>
          </div>

          {/* Section 2: 3 Engine Tenant Settings (Hanya untuk Tenant Klien) */}
          {!isSuperadmin && (
            <div>
              <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span>Pengaturan 3 Engine</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="space-y-1">
                {engineNavItems.map(eng => {
                  const isActive = pathname.startsWith(eng.href);
                  const liveUrl = urls[eng.key];
                  const Icon = eng.icon;
                  return (
                    <div key={eng.href} className="group relative">
                      <Link
                        href={eng.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-gray-500"}`} />
                          <div className="truncate">
                            <div className="truncate">{eng.label}</div>
                            <div className={`text-[10px] font-normal ${isActive ? "text-slate-300" : "text-gray-400"}`}>
                              {eng.sub}
                            </div>
                          </div>
                        </div>
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Buka engine di tab baru"
                          className={`p-1 rounded-lg text-[11px] transition-colors ${
                            isActive
                              ? "text-slate-400 hover:text-white hover:bg-slate-800"
                              : "text-gray-400 hover:text-blue-600 hover:bg-gray-200"
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Account */}
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Akun &amp; Support
            </div>
            <div className="space-y-0.5">
              {accountNavItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <Link
            href="/member/profile"
            className="flex items-center gap-3 mb-2 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-100 transition group cursor-pointer"
            title="Buka Pengaturan Akun"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 transition-colors">
              {member.picName ? member.picName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 truncate transition-colors">
                {member.picName}
              </div>
              <div className="text-[10px] text-gray-400 truncate">{member.email}</div>
            </div>
          </Link>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
            <Link
              href="/member/profile"
              className="text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              Pengaturan Akun
            </Link>
            <button
              onClick={logout}
              className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
