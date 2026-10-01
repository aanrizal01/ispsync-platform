"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";

type Member = {
  id: string; email: string; company: string; picName: string;
  phone?: string; address?: string; npwp?: string;
  plan: string; planName: string; planPrice: string;
  planCapacity: string; status: string; subscribedAt: string; expiresAt: string;
  autoRenew: boolean; domain: string;
  invoices: { id: string; date: string; dueDate: string; period: string; amount: string; status: string; paymentDate: string | null; paymentMethod: string | null; }[];
  tickets: any[];
};

type MemberContextType = {
  member: Member | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};

const MemberContext = createContext<MemberContextType | null>(null);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("member-token");
    if (stored) {
      fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: stored }),
      }).then(r => r.json()).then(data => {
        if (data.success) { setMember(data.member); setToken(stored); }
        else { localStorage.removeItem("member-token"); }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json().catch(() => ({ success: false, error: "Respons server tidak valid" }));
      if (data.success) {
        localStorage.setItem("member-token", data.token);
        setToken(data.token);
        // Fetch full member data
        try {
          const r2 = await fetch("/api/member/auth", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify", token: data.token }),
          });
          const d2 = await r2.json();
          if (d2.success) setMember(d2.member);
        } catch {
          // Non-blocking if verify fails, member token is already stored
        }
        return { success: true };
      }
      return { success: false, error: data.error || "Gagal masuk" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Koneksi ke server gagal. Periksa koneksi internet Anda." };
    }
  }

  function logout() {
    if (token) {
      fetch("/api/member/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout", token }) });
    }
    localStorage.removeItem("member-token");
    setMember(null); setToken(null);
    router.push("/member/login");
  }

  return <MemberContext.Provider value={{ member, token, loading, login, logout }}>{children}</MemberContext.Provider>;
}

export function useMember() {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be inside MemberProvider");
  return ctx;
}
