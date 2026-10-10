"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Menu,
  ChevronDown,
  LogOut,
  ChevronRight,
  UserCog,
  ShieldCheck,
  Bell,
} from "lucide-react";

// Route title map for dynamic breadcrumbs
const routeMap: Record<string, { category: string; title: string }> = {
  "/admin/dashboard": { category: "Utama", title: "Dashboard Monitoring" },
  "/admin/customers": { category: "Pelanggan & Layanan", title: "Data Pelanggan" },
  "/admin/subscriptions": { category: "Pelanggan & Layanan", title: "Langganan Internet" },
  "/admin/plans": { category: "Pelanggan & Layanan", title: "Paket Internet" },
  "/admin/billing": { category: "Billing & Keuangan", title: "Invoice Tagihan" },
  "/admin/payments": { category: "Billing & Keuangan", title: "Riwayat Pembayaran" },
  "/admin/expenses": { category: "Billing & Keuangan", title: "Pengeluaran Operasional" },
  "/admin/reports": { category: "Billing & Keuangan", title: "Laporan & Analitik Keuangan" },
  "/admin/vouchers": { category: "Hotspot & Voucher", title: "Voucher Hotspot" },
  "/admin/agents": { category: "Hotspot & Voucher", title: "Agen & Reseller" },
  "/admin/passpoint": { category: "Hotspot & Voucher", title: "Passpoint HS2.0" },
  "/admin/network": { category: "Jaringan & Infra", title: "Peta & Jaringan FTTX" },
  "/admin/nexusgis": { category: "Jaringan & Infra", title: "NexusGIS & Topologi ODP" },
  "/admin/fibergrid": { category: "Jaringan & Infra", title: "NexusGIS & Topologi ODP" },
  "/admin/radius": { category: "Jaringan & Infra", title: "Server RADIUS" },
  "/admin/partners": { category: "Jaringan & Infra", title: "Mitra ISP" },
  "/admin/notifications": { category: "Sistem & Keamanan", title: "Pusat Notifikasi" },
  "/admin/users": { category: "Sistem & Keamanan", title: "Pengguna & Staf" },
  "/admin/roles": { category: "Sistem & Keamanan", title: "Peran & Hak Akses" },
  "/admin/audit-logs": { category: "Sistem & Keamanan", title: "Audit Trail Log" },
  "/admin/settings": { category: "Sistem & Keamanan", title: "Pengaturan Sistem" },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isCustomer, isAgent, isAdmin, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [tenantName, setTenantName] = useState("ISPSYNC");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let slug = "";
      const h = window.location.hostname.toLowerCase();
      const parts = h.split(".");
      if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "admin")) {
        slug = parts[1];
      } else if (parts.length === 3 && parts[1] === "ispsync") {
        slug = parts[0];
      }

      if ((!slug || slug === "dev") && user?.email) {
        const atIdx = user.email.indexOf("@");
        if (atIdx !== -1) {
          const domain = user.email.slice(atIdx + 1).toLowerCase();
          const dParts = domain.split(".");
          if (dParts.length >= 3 && dParts[dParts.length - 2] === "ispsync" && dParts[0] !== "admin" && dParts[0] !== "private") {
            slug = dParts[0];
          }
        }
      }

      const up = slug && slug !== "ispsync" ? slug.toUpperCase() : "ISPSYNC";
      setTenantName(up);
      const pageInfo = routeMap[pathname];
      document.title = pageInfo ? `${pageInfo.title} | ${up} Ledger` : `${up} Ledger | Admin Dashboard`;

      const iconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (iconEl) {
        if (slug && slug !== "ispsync") {
          const testFavicon = new Image();
          testFavicon.src = `/web/${slug}_favicon.svg`;
          testFavicon.onload = () => { iconEl.href = `/web/${slug}_favicon.svg`; };
          testFavicon.onerror = () => { iconEl.href = "/web/ispsync_favicon.svg"; };
        } else {
          iconEl.href = "/web/ispsync_favicon.svg";
        }
      }
    }
  }, [user, pathname]);

  // Tenant Domain Redirection Guard (Prevent accidental cross-tenant dashboard access)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.email && typeof window !== "undefined") {
      const email = user.email.toLowerCase();
      const atIdx = email.indexOf("@");
      if (atIdx !== -1) {
        const domain = email.slice(atIdx + 1);
        const parts = domain.split(".");
        if (parts.length >= 3 && parts[parts.length - 2] === "ispsync" && parts[parts.length - 1] === "id") {
          const userTenant = parts[0];
          if (userTenant !== "admin" && userTenant !== "private" && userTenant !== "member") {
            const currentHost = window.location.hostname.toLowerCase();
            const hostParts = currentHost.split(".");
            let currentTenant = "";
            if (hostParts.length >= 4) {
              currentTenant = hostParts[1];
            } else if (hostParts.length === 3 && hostParts[1] === "ispsync") {
              currentTenant = hostParts[0];
            }
            if (currentTenant && currentTenant !== userTenant && (currentTenant === "dev" || currentTenant === "ispsync")) {
              window.location.href = `https://ledger.${userTenant}.ispsync.id${window.location.pathname}${window.location.search}`;
            }
          }
        }
      }
    }
  }, [isLoading, isAuthenticated, user]);

  // Close mobile sidebar and user dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (isCustomer()) {
        router.replace("/portal/overview");
      } else if (isAgent() && !isAdmin()) {
        router.replace("/agent/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, isCustomer, isAgent, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || isCustomer() || (isAgent() && !isAdmin())) {
    return null;
  }

  const currentRoute = routeMap[pathname] || {
    category: "Admin",
    title: pathname.split("/").filter(Boolean).pop()?.toUpperCase() || "Dashboard",
  };

  return (
    <div className="flex h-screen bg-slate-50 w-full overflow-hidden print:block print:bg-white print:overflow-visible">
      {/* Responsive Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto w-full max-w-full print:block print:w-full print:m-0 print:p-0">
        {/* Top Header Navbar with Dark Theme matching Sidebar */}
        <header className="print:hidden bg-[#0B1120] border-b border-slate-800/80 px-4 py-2.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl lg:hidden transition-colors"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile-only Brand Header */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="font-bold text-white text-sm tracking-tight">{tenantName} LEDGER</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-1.5 py-0.5 rounded border border-cyan-500/30">
                Core
              </span>
            </div>

            {/* Desktop Breadcrumbs (Polished dark theme) */}
            <div className="hidden lg:flex items-center gap-2 text-xs select-none">
              <span className="font-medium text-slate-400">{currentRoute.category}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold text-white tracking-wide">{currentRoute.title}</span>
            </div>
          </div>



          {/* Right Header: User Profile Dropdown */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => alert("Tidak ada notifikasi sistem yang baru.")}
              className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-2xs relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
            </button>
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 transition-all select-none group shadow-2xs"
              aria-expanded={userDropdownOpen}
              aria-label="Menu Pengguna"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-blue-500/20">
                {user?.full_name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors max-w-[130px] truncate leading-tight">
                  {user?.full_name || "Admin"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-tight">
                  {typeof user?.roles?.[0] === "string" ? user.roles[0] : (user?.roles?.[0] as any)?.name || "Super Admin"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200" />
            </button>

            {/* Dropdown Menu Modal (Dark theme) */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-800 py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="px-3.5 py-2.5">
                  <p className="text-xs font-bold text-white truncate">{user?.full_name || "Admin"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || "admin@ispsync.id"}</p>
                </div>

                <div className="border-t border-slate-800 pt-1 mt-1 pb-1">
                  <Link
                    href="/admin/users"
                    onClick={() => setUserDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <UserCog className="w-4 h-4 text-slate-400" />
                    Pengguna / Staf
                  </Link>
                  <Link
                    href="/admin/roles"
                    onClick={() => setUserDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    Peran & Hak Akses
                  </Link>
                </div>

                {/* Logout Action */}
                <div className="border-t border-slate-800 pt-1 mt-1">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    Keluar / Logout
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 p-3.5 sm:p-5 md:p-6 w-full max-w-full min-w-0 print:p-0 print:m-0 print:w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
