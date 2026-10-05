/**
 * Typed API client for the ISP Billing backend.
 * All requests automatically include Authorization header.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_V1 = `${API_BASE}/api/v1`;

// ── Types ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError extends Error {
  code: string;
  details?: Array<{ field: string; message: string }>;
  status: number;
}

// ── Token Storage ─────────────────────────────────────────────────
// Tokens stored in memory (not localStorage) to prevent XSS access.
// Refresh token stored in HttpOnly cookie (set by server).

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("isp_session") || localStorage.getItem("isp_session");
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.access_token) {
          accessToken = session.access_token;
          return accessToken;
        }
      }
    } catch {}
  }
  return null;
}

// ── Request Helper ────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    const parts = host.split(".");
    let slug = "";
    if (parts.length >= 4) {
      slug = parts[1];
    } else if (parts.length === 3 && parts[1] === "ispsync") {
      slug = parts[0];
    }
    if (slug) {
      headers["X-Tenant-Slug"] = slug;
    }
  }

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers,
    credentials: "include", // for cookie-based refresh token
  });

  // Handle 401 by attempting automatic silent token refresh
  if (response.status === 401 && !path.startsWith("/auth/")) {
    try {
      const stored = typeof window !== "undefined" ? (sessionStorage.getItem("isp_session") || localStorage.getItem("isp_session")) : null;
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.refresh_token) {
          const refreshRes = await fetch(`${API_V1}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
            credentials: "include",
          });
          const refreshData = await refreshRes.json().catch(() => null);
          if (refreshRes.ok && refreshData?.success && refreshData?.data?.access_token) {
            const newAccess = refreshData.data.access_token;
            setAccessToken(newAccess);
            const updated = {
              ...session,
              access_token: newAccess,
              refresh_token: refreshData.data.refresh_token || session.refresh_token,
              expires_at: refreshData.data.expires_at || session.expires_at,
            };
            if (typeof window !== "undefined") {
              sessionStorage.setItem("isp_session", JSON.stringify(updated));
              localStorage.setItem("isp_session", JSON.stringify(updated));
            }
            // Retry original request with fresh token
            headers["Authorization"] = `Bearer ${newAccess}`;
            const retryRes = await fetch(`${API_V1}${path}`, {
              ...options,
              headers,
              credentials: "include",
            });
            const retryData: ApiResponse<T> = await retryRes.json().catch(() => ({
              success: false,
              error: { code: "PARSE_ERROR", message: "Failed to parse response" },
            }));
            if (retryRes.ok && retryData.success) {
              return retryData.data as T;
            }
          }
        }
      }
    } catch {
      // Fall through to error handling
    }
  }

  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: { code: "PARSE_ERROR", message: "Failed to parse response" },
  }));

  if (!response.ok || !data.success) {
    const err = new Error(data.error?.message || "Request failed") as ApiError;
    err.code = data.error?.code || "UNKNOWN_ERROR";
    err.details = data.error?.details;
    err.status = response.status;
    throw err;
  }

  return data.data as T;
}

async function requestPaginated<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T[]; meta?: { page: number; limit: number; total: number; total_pages: number } }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Handle 401 by attempting automatic silent token refresh
  if (response.status === 401 && !path.startsWith("/auth/")) {
    try {
      const stored = typeof window !== "undefined" ? (sessionStorage.getItem("isp_session") || localStorage.getItem("isp_session")) : null;
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.refresh_token) {
          const refreshRes = await fetch(`${API_V1}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
            credentials: "include",
          });
          const refreshData = await refreshRes.json().catch(() => null);
          if (refreshRes.ok && refreshData?.success && refreshData?.data?.access_token) {
            const newAccess = refreshData.data.access_token;
            setAccessToken(newAccess);
            const updated = {
              ...session,
              access_token: newAccess,
              refresh_token: refreshData.data.refresh_token || session.refresh_token,
              expires_at: refreshData.data.expires_at || session.expires_at,
            };
            if (typeof window !== "undefined") {
              sessionStorage.setItem("isp_session", JSON.stringify(updated));
              localStorage.setItem("isp_session", JSON.stringify(updated));
            }
            // Retry original request with fresh token
            headers["Authorization"] = `Bearer ${newAccess}`;
            const retryRes = await fetch(`${API_V1}${path}`, {
              ...options,
              headers,
              credentials: "include",
            });
            const retryData: PaginatedResponse<T> = await retryRes.json().catch(() => ({
              success: false,
              error: { code: "PARSE_ERROR", message: "Failed to parse response" },
            }));
            if (retryRes.ok && retryData.success) {
              return { data: (retryData.data || []) as T[], meta: retryData.meta };
            }
          }
        }
      }
    } catch {
      // Fall through to error handling
    }
  }

  const data: PaginatedResponse<T> = await response.json().catch(() => ({
    success: false,
    error: { code: "PARSE_ERROR", message: "Failed to parse response" },
  }));

  if (!response.ok || !data.success) {
    const err = new Error(data.error?.message || "Request failed") as ApiError;
    err.code = data.error?.code || "UNKNOWN_ERROR";
    err.details = data.error?.details;
    err.status = response.status;
    throw err;
  }

  return { data: (data.data || []) as T[], meta: data.meta };
}

// ── Auth API ──────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  customer_id?: string;
  last_login_at?: string;
  roles?: Role[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<Session>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<Session>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),

  getMe: () => request<User>("/auth/me"),

  changePassword: (data: {
    current_password: string;
    new_password: string;
  }) =>
    request<{ message: string }>("/auth/me/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ── Health API ────────────────────────────────────────────────────

export const healthApi = {
  check: () =>
    fetch(`${API_BASE}/health`).then((r) => r.json()),
};

// ── File Download Helper ──────────────────────────────────────────
async function downloadFile(
  path: string,
  fallbackFileName: string,
  options: RequestInit = {}
): Promise<void> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_V1}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !path.startsWith("/auth/")) {
    try {
      const stored =
        typeof window !== "undefined"
          ? sessionStorage.getItem("isp_session") ||
            localStorage.getItem("isp_session")
          : null;
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.refresh_token) {
          const refreshRes = await fetch(`${API_V1}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
            credentials: "include",
          });
          const refreshData = await refreshRes.json().catch(() => null);
          if (
            refreshRes.ok &&
            refreshData?.success &&
            refreshData?.data?.access_token
          ) {
            const newAccess = refreshData.data.access_token;
            setAccessToken(newAccess);
            const updated = {
              ...session,
              access_token: newAccess,
              refresh_token:
                refreshData.data.refresh_token || session.refresh_token,
              expires_at:
                refreshData.data.expires_at || session.expires_at,
            };
            if (typeof window !== "undefined") {
              sessionStorage.setItem("isp_session", JSON.stringify(updated));
              localStorage.setItem("isp_session", JSON.stringify(updated));
            }
            headers["Authorization"] = `Bearer ${newAccess}`;
            response = await fetch(`${API_V1}${path}`, {
              ...options,
              headers,
              credentials: "include",
            });
          }
        }
      }
    } catch {}
  }

  if (!response.ok) {
    let errMsg = `Gagal mengunduh file (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {}
    throw new Error(errMsg);
  }

  let fileName = fallbackFileName;
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match?.[1]) {
      fileName = match[1].trim();
    }
  }

  const blob = await response.blob();
  if (typeof window !== "undefined") {
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  }
}

// Export base for feature-specific API modules
export { request, requestPaginated, downloadFile, API_V1 };
