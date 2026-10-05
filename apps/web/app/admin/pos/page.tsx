"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FastPosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/payments?tab=pos");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Mengarahkan ke Loket Kasir POS di Menu Pembayaran...</p>
      </div>
    </div>
  );
}
