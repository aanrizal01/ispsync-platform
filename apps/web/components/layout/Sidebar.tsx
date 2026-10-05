"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Repeat,
  Package,
  FileText,
  CreditCard,
  TrendingDown,
  BarChart3,
  Ticket,
  Store,
  Radio,
  Network,
  Server,
  Handshake,
  Bell,
  UserCog,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LucideIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// ── Navigation Section Types & Definitions ───────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "UTAMA",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        permission: null,
      },
    ],
  },
  {
    title: "PELANGGAN & LAYANAN",
    items: [
      {
        label: "Pelanggan",
        href: "/admin/customers",
        icon: Users,
        permission: "customers:read",
      },
      {
        label: "Langganan",
        href: "/admin/subscriptions",
        icon: Repeat,
        permission: "subscriptions:read",
      },
      {
        label: "Paket Internet",
        href: "/admin/plans",
        icon: Package,
        permission: "plans:read",
      },
    ],
  },
  {
    title: "BILLING & KEUANGAN",
    items: [
      {
        label: "Invoice Tagihan",
        href: "/admin/billing",
        icon: FileText,
        permission: "invoices:read",
      },
      {
        label: "Pembayaran",
        href: "/admin/payments",
        icon: CreditCard,
        permission: "payments:read",
      },
      {
        label: "Pengeluaran",
        href: "/admin/expenses",
        icon: TrendingDown,
        permission: "billing:read",
      },
      {
        label: "Laporan",
        href: "/admin/reports",
        icon: BarChart3,
        permission: "reports:read",
      },
    ],
  },
  {
    title: "HOTSPOT & VOUCHER",
    items: [
      {
        label: "Voucher Hotspot",
        href: "/admin/vouchers",
        icon: Ticket,
        permission: "vouchers:read",
      },
      {
        label: "Agen & Reseller",
        href: "/admin/agents",
        icon: Store,
        permission: "agents:read",
      },
      {
        label: "Passpoint HS2.0",
        href: "/admin/passpoint",
        icon: Radio,
        permission: "passpoint:read",
      },
    ],
  },
  {
    title: "JARINGAN & INFRASTRUKTUR",
    items: [
      {
        label: "Perangkat & Router Core",
        href: "/admin/network",
        icon: Server,
        permission: "network:read",
      },
      {
        label: "NexusGIS",
        href: "/admin/nexusgis",
        icon: Network,
        permission: "network:read",
      },
      {
        label: "Server RADIUS",
        href: "/admin/radius",
        icon: Radio,
        permission: "radius:read",
      },
      {
        label: "Mitra ISP",
        href: "/admin/partners",
        icon: Handshake,
        permission: null,
      },
    ],
  },
  {
    title: "SISTEM & KEAMANAN",
    items: [
      {
        label: "Notifikasi",
        href: "/admin/notifications",
        icon: Bell,
        permission: "notifications:read",
      },
      {
        label: "Pengguna / Staf",
        href: "/admin/users",
        icon: UserCog,
        permission: "admin:users",
      },
      {
        label: "Audit Log",
        href: "/admin/audit-logs",
        icon: ClipboardList,
        permission: null,
      },
      {
        label: "Pengaturan",
        href: "/admin/settings",
        icon: Settings,
        permission: null,
      },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Load saved collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch (_) {}
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch (_) {}
      return next;
    });
  };

  const renderNavContent = (isMobile = false) => {
    const isMini = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full bg-[#0B1120] text-white select-none">
        {/* Brand Header */}
        <div
          className={cn(
            "h-16 border-b border-slate-800/80 flex items-center shrink-0 transition-all duration-300",
            isMini ? "px-2 justify-center" : "px-4 justify-between"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center p-1">
                <img src="/logo.png" alt="ISPSYNC Logo" className="w-full h-full object-contain" />
              </div>
            </div>

            {!isMini && (
              <div className="min-w-0">
                <div className="leading-tight">
                  <p className="text-sm font-bold tracking-tight text-white truncate">ISPSYNC LEDGER</p>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase truncate">
                    ISP Billing & Core Engine
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop Toggle Button in Header */}
          {!isMobile && !isMini && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Persempit Sidebar"
              aria-label="Persempit Sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || sIdx} className="space-y-1">
                {section.title && !isMini && (
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {section.title}
                  </div>
                )}
                {isMini && sIdx > 0 && (
                  <div className="my-2 border-t border-slate-800/60 mx-2" />
                )}

                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/") ||
                      (item.href === "/admin/nexusgis" && (pathname === "/admin/fibergrid" || pathname.startsWith("/admin/fibergrid/")));
                    const Icon = item.icon;

                    return (
                      <li key={item.href} className="relative group">
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (isMobile && onCloseMobile) {
                              onCloseMobile();
                            }
                          }}
                          className={cn(
                            "flex items-center rounded-xl text-xs font-medium transition-all duration-200 relative",
                            isMini
                              ? "justify-center w-11 h-11 mx-auto"
                              : "gap-3 px-3 py-2",
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                            )}
                          />

                          {!isMini && (
                            <>
                              <span className="truncate flex-1">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.2 rounded-md text-[9px] font-bold tracking-wider uppercase",
                                    item.badgeColor || "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>

                        {/* Hover Tooltip in Mini Mode */}
                        {isMini && (
                          <div className="fixed left-20 z-50 pointer-events-none hidden group-hover:flex items-center pl-2">
                            <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-2">
                              <span>{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.2 rounded text-[9px] font-bold",
                                    item.badgeColor || "bg-blue-500/20 text-blue-300"
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Minimal Footer: Collapse Toggle & Platform Version (Replaces duplicate user profile) */}
        {!isMobile && (
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
            {isMini ? (
              <button
                onClick={toggleCollapse}
                className="w-10 h-10 mx-auto rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Perluas Sidebar"
                aria-label="Perluas Sidebar"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={toggleCollapse}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ChevronsLeft className="w-4 h-4 text-slate-500" />
                  <span>Sembunyikan Menu</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
                  v2.6
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-full bg-[#0B1120] text-white shrink-0 print:hidden transition-all duration-300 ease-in-out border-r border-slate-800/80 z-20",
          collapsed ? "w-18" : "w-64"
        )}
      >
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Responsive Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity duration-200 print:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B1120] text-white flex flex-col transition-transform duration-300 ease-in-out lg:hidden shadow-2xl print:hidden border-r border-slate-800",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderNavContent(true)}
      </aside>
    </>
  );
}
