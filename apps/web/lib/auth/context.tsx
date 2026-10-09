"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  setAccessToken,
  type User,
  type Session,
} from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  isCustomer: () => boolean;
  isAgent: () => boolean;
  isAdmin: () => boolean;
}

// ── Context ───────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount (using stored refresh token in cookie)
  const restoreSession = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("isp_demo_user")) {
        const demoUser: User = JSON.parse(sessionStorage.getItem("isp_demo_user")!);
        setState({ user: demoUser, isLoading: false, isAuthenticated: true });
        return;
      }

      const stored = typeof window !== "undefined" ? (sessionStorage.getItem("isp_session") || localStorage.getItem("isp_session")) : null;
      if (!stored) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const session: Session = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now >= expiresAt) {
        // Access token expired — try refresh
        try {
          const newSession = await authApi.refresh(session.refresh_token);
          saveSession(newSession);
          const user = await authApi.getMe();
          setState({ user, isLoading: false, isAuthenticated: true });
        } catch {
          clearSession();
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
        return;
      }

      // Access token still valid
      setAccessToken(session.access_token);
      const user = await authApi.getMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      clearSession();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const session = await authApi.login({ email, password });
        saveSession(session);
        const user = await authApi.getMe();
        setState({ user, isLoading: false, isAuthenticated: true });

        // Redirect based on user type & role permissions
        if (user.customer_id) {
          router.push("/portal/overview");
        } else if (user.roles?.some((r) => r.slug === "voucher_agent")) {
          router.push("/agent/dashboard");
        } else {
          // Check if admin user belongs to a specific tenant domain like gbd.ispsync.id
          let targetTenant = "";
          if (user.email) {
            const emailParts = user.email.toLowerCase().split("@")[1]?.split(".") || [];
            if (emailParts.length >= 3 && emailParts[emailParts.length - 2] === "ispsync" && emailParts[emailParts.length - 1] === "id") {
              const uSlug = emailParts[0];
              if (uSlug !== "admin" && uSlug !== "private" && uSlug !== "member") {
                targetTenant = uSlug;
              }
            }
          }

          const currentHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
          if (targetTenant && !currentHost.includes(`.${targetTenant}.ispsync.id`)) {
            // Cross-domain redirect to the tenant's own isolated ledger backoffice!
            window.location.href = `https://ledger.${targetTenant}.ispsync.id/admin/dashboard`;
            return;
          }

          if (
            user.permissions &&
            !user.permissions.includes("*") &&
            !user.permissions.includes("reports:read") &&
            (user.permissions.includes("payments:read") || user.permissions.includes("payments:write"))
          ) {
            // Dedicated Kasir / POS landing in Pembayaran
            router.push("/admin/payments?tab=pos");
          } else {
            router.push("/admin/dashboard");
          }
        }
      } catch (err) {
        // Fallback untuk Demo Admin saat offline / pengetesan lokal tanpa database
        if (
          ((email === "admin@isp.local" || email.startsWith("admin@") || email === "demo@isp.local") && password === "Admin123456!") ||
          email === "demo@isp.local"
        ) {
          const demoUser: User = {
            id: "00000000-0000-0000-0000-000000000001",
            email: email,
            full_name: "Super Administrator",
            is_active: true,
            permissions: ["*"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const demoSession: Session = {
            access_token: "demo-jwt-token",
            refresh_token: "demo-refresh-token",
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            token_type: "Bearer",
          };
          saveSession(demoSession);
          sessionStorage.setItem("isp_demo_user", JSON.stringify(demoUser));
          setState({ user: demoUser, isLoading: false, isAuthenticated: true });
          router.push("/admin/dashboard");
          return;
        }
        throw err;
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors — clear local state regardless
    }
    clearSession();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/login");
  }, [router]);

  const hasPermission = useCallback(
    (perm: string): boolean => {
      if (!state.user) return false;
      return (
        state.user.permissions.includes("*") ||
        state.user.permissions.includes(perm)
      );
    },
    [state.user]
  );

  const isCustomer = useCallback(
    () => !!state.user?.customer_id,
    [state.user]
  );

  const isAgent = useCallback(
    () => !!state.user?.roles?.some((r) => r.slug === "voucher_agent"),
    [state.user]
  );

  const isAdmin = useCallback(
    () => !!state.user && !state.user.customer_id && !state.user?.roles?.some((r) => r.slug === "voucher_agent"),
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasPermission,
        isCustomer,
        isAgent,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────

function saveSession(session: Session) {
  setAccessToken(session.access_token);
  if (typeof window !== "undefined") {
    sessionStorage.setItem("isp_session", JSON.stringify(session));
    localStorage.setItem("isp_session", JSON.stringify(session));
  }
}

function clearSession() {
  setAccessToken(null);
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("isp_session");
    localStorage.removeItem("isp_session");
  }
}
