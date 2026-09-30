import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Merge Tailwind CSS classes safely, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a monetary amount (in Rupiah integer) to display string.
 * Input: 150000 → Output: "Rp 150.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string to human-readable format.
 */
export function formatDate(date: string | Date, fmt = "dd MMM yyyy"): string {
  return format(new Date(date), fmt, { locale: localeId });
}

/**
 * Format a date as relative time (e.g., "3 hari yang lalu").
 */
export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: localeId,
  });
}

/**
 * Format bytes to human-readable size (e.g., 1024 → "1 KB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format bandwidth in kbps to human-readable (e.g., 20480 → "20 Mbps").
 */
export function formatBandwidth(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(0)} Mbps`;
  }
  return `${kbps} Kbps`;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * Get initials from a full name (e.g., "Budi Santoso" → "BS").
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/**
 * Status badge variant mapping for consistent color coding.
 */
export type StatusVariant = "default" | "success" | "warning" | "danger" | "muted";

export function getStatusVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    // Subscription / Customer
    ACTIVE: "success",
    PENDING: "warning",
    GRACE: "warning",
    SUSPENDED: "danger",
    CANCELLED: "muted",
    EXPIRED: "muted",
    TERMINATED: "danger",
    LEAD: "default",

    // Invoice
    PAID: "success",
    ISSUED: "default",
    PARTIALLY_PAID: "warning",
    OVERDUE: "danger",
    VOID: "muted",
    DRAFT: "muted",

    // Payment
    COMPLETED: "success",
    FAILED: "danger",
    REFUNDED: "warning",

    // Voucher
    UNUSED: "default",
    REVOKED: "danger",
    CREATED: "muted",

    // Network
    ONLINE: "success",
    OFFLINE: "danger",
    UNREACHABLE: "danger",
  };
  return map[status] ?? "default";
}
