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
      <aside className="w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800/80">
          <img
            src="/logo-prism.png"
            alt="ISPSYNC"
            className="h-8 w-auto object-contain"
          />
          <div>
            <div className="font-black text-slate-100 text-sm tracking-wider">ISPSYNC</div>
            <div className="text-[10px] text-slate-400 font-medium">
              {isSuperadmin ? "Platform Console" : "Member Portal"}
            </div>
          </div>
        </div>

        {/* Plan badge */}
        <div className="mx-4 mt-3 mb-2 p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-0.5">
            {isSuperadmin ? "Peran Platform" : "Paket Aktif"}
          </div>
          <div className="font-black text-slate-100 text-xs truncate">
            {isSuperadmin ? "Master Superadmin" : member.planName}
          </div>
          <div className="text-[10px] text-cyan-500 mt-0.5">
            {isSuperadmin ? "Kedaulatan Sistem Penuh" : daysLeft > 0 ? `${daysLeft} hari tersisa` : "Sudah expired"}
          </div>
        </div>

        {/* Nav Container with Scroll */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Section 0: Superadmin Management (Master only) */}
          {isSuperadmin && (
            <div>
              <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Manajemen Platform</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700 tracking-wider">
                  ROOT
                </span>
              </div>
              <div className="space-y-0.5">
                <Link
                  href="/member/tenants"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/tenants"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <Building2 className={`w-4 h-4 shrink-0 ${pathname === "/member/tenants" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>Daftar Pelanggan SaaS</span>
                </Link>
                <Link
                  href="/member/gateway"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/gateway"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <Network className={`w-4 h-4 shrink-0 ${pathname === "/member/gateway" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>Gateway &amp; Caddy Domains</span>
                </Link>
                <Link
                  href="/member/dns"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/dns"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <Globe className={`w-4 h-4 shrink-0 ${pathname === "/member/dns" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>DNS Server &amp; Zones</span>
                </Link>
                <Link
                  href="/cms-9x7k2"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/cms-9x7k2"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <SlidersHorizontal className={`w-4 h-4 shrink-0 ${pathname === "/cms-9x7k2" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>CMS &amp; Paket Langganan</span>
                </Link>
                <Link
                  href="/member/settings-saas"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/settings-saas"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <Server className={`w-4 h-4 shrink-0 ${pathname === "/member/settings-saas" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>Pengaturan Kuota SaaS</span>
                </Link>
                <Link
                  href="/member/settings"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/settings"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <Mail className={`w-4 h-4 shrink-0 ${pathname === "/member/settings" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>Pengaturan SMTP &amp; Mailer</span>
                </Link>
                <Link
                  href="/member/settings-payment"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/settings-payment"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <CreditCard className={`w-4 h-4 shrink-0 ${pathname === "/member/settings-payment" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>Pengaturan Payment Gateway</span>
                </Link>
              </div>
            </div>
          )}

          {/* Section 1: Main */}
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
            <div className="space-y-0.5">
              <Link
                href="/member/dashboard"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                  pathname === "/member/dashboard"
                    ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                    : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/member/dashboard" ? "text-cyan-400" : "text-slate-500"}`} />
                <span>Dashboard</span>
              </Link>
              {!isSuperadmin && (
                <Link
                  href="/member/invoices"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                    pathname === "/member/invoices"
                      ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                      : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                  }`}
                >
                  <Receipt className={`w-4 h-4 shrink-0 ${pathname === "/member/invoices" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>Invoice &amp; Billing</span>
                </Link>
              )}
            </div>
          </div>

          {/* Section 2: 3 Engine Tenant Settings (Hanya untuk Tenant Klien) */}
          {!isSuperadmin && (
            <div>
              <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Pengaturan 3 Engine</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
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
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all border ${
                          isActive
                            ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                            : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                          <div className="truncate">
                            <div className="truncate">{eng.label}</div>
                            <div className={`text-[10px] ${isActive ? "text-slate-300 font-medium" : "text-slate-500 font-normal"}`}>
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
                              ? "text-slate-400 hover:text-white hover:bg-slate-700"
                              : "text-slate-500 hover:text-cyan-400 hover:bg-slate-800"
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
            <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Akun &amp; Support
            </div>
            <div className="space-y-0.5">
              {accountNavItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all border ${
                      isActive
                        ? "font-bold bg-slate-800/80 text-white shadow-sm border-slate-700"
                        : "font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-transparent"
                    }`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-slate-800/80">
          <Link
            href="/member/profile"
            className="flex items-center gap-3 mb-2 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-900 transition group cursor-pointer"
            title="Buka Pengaturan Akun"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0 transition-colors">
              {member.picName ? member.picName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 truncate transition-colors">
                {member.picName}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{member.email}</div>
            </div>
          </Link>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
            <Link
              href="/member/profile"
              className="text-[11px] font-medium text-slate-500 hover:text-cyan-400 transition-colors"
            >
              Pengaturan Akun
            </Link>
            <button
              onClick={logout}
              className="text-[11px] font-medium text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
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
