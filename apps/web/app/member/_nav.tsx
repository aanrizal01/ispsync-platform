"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useMember } from "./context";

const navItems = [
  { href: "/member/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/member/invoices", label: "Invoice", icon: "🧾" },
  { href: "/member/profile", label: "Profil", icon: "👤" },
  { href: "/member/support", label: "Support", icon: "💬" },
];

export default function MemberNav({ children }: { children: React.ReactNode }) {
  const { member, loading, logout } = useMember();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !member) router.replace("/member/login");
  }, [member, loading]);

  if (loading || !member) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Memuat...</div>
    </div>
  );

  // Days remaining
  const expires = new Date(member.expiresAt);
  const today = new Date();
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">IS</span>
          </div>
          <div>
            <div className="font-black text-gray-900 text-sm">ISPSYNC</div>
            <div className="text-[10px] text-gray-400">Member Portal</div>
          </div>
        </div>

        {/* Plan badge */}
        <div className="mx-4 mt-4 mb-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-0.5">Paket Aktif</div>
          <div className="font-black text-blue-700 text-sm">{member.planName}</div>
          <div className="text-[10px] text-blue-500 mt-1">
            {daysLeft > 0 ? `${daysLeft} hari tersisa` : "Sudah expired"}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === item.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
              {member.picName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{member.picName}</div>
              <div className="text-[10px] text-gray-400 truncate">{member.email}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full text-xs text-gray-400 hover:text-red-500 py-1.5 transition-colors text-center">
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
