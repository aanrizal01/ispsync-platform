"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isCustomer } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Jangan redirect jika di halaman login atau registrasi agen
    if (pathname === "/agent/login" || pathname === "/agent/register") return;

    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/agent/login");
      } else if (isCustomer()) {
        router.replace("/portal/overview");
      }
    }
  }, [isAuthenticated, isLoading, isCustomer, pathname, router]);

  // Halaman login dan register agen murni tampil penuh tanpa wrapper/navbar apa pun
  if (pathname === "/agent/login" || pathname === "/agent/register") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-300">Memuat Portal Agen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Konten Utama tanpa navbar atas yang mengganggu */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 py-4 sm:p-6 overflow-x-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200">
        © {new Date().getFullYear()} ISPSYNC • Sistem Kemitraan Penjualan Voucher Hotspot
      </footer>
    </div>
  );
}
