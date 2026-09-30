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
  "/admin/radius": { category: "Jaringan & Infra", title: "Server RADIUS" },
  "/admin/partners": { category: "Jaringan & Infra", title: "Mitra ISP" },
  "/admin/notifications": { category: "Sistem & Keamanan", title: "Pusat Notifikasi" },
  "/admin/users": { category: "Sistem & Keamanan", title: "Pengguna & Staf" },
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
    <div className="flex min-h-screen bg-slate-50 w-full overflow-x-hidden print:block print:bg-white print:overflow-visible">
      {/* Responsive Sidebar */}
      <div className="print:hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full max-w-full print:block print:w-full print:m-0 print:p-0">
        {/* Top Header Navbar with Dark Theme matching Sidebar */}
        <header className="print:hidden bg-[#0B1120] border-b border-slate-800/80 px-4 py-2.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md backdrop-blur-md">
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
              <span className="font-bold text-white text-sm tracking-tight">ISPSYNC CMS</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-1.5 py-0.5 rounded border border-blue-500/30">
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
        </header>

        {/* Page Content Container */}
        <div className="flex-1 p-3.5 sm:p-5 md:p-6 w-full max-w-full min-w-0 print:p-0 print:m-0 print:w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
