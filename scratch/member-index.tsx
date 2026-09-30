"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./context";

export default function MemberIndexPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  useEffect(() => {
    if (!loading) {
      if (member) router.replace("/member/dashboard");
      else router.replace("/member/login");
    }
  }, [member, loading]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Memuat portal...</div>
    </div>
  );
}
