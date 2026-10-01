"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MemberDomainRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/member/engine/nexus");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Mengalihkan ke Pengaturan Engine Nexus...</div>
    </div>
  );
}
