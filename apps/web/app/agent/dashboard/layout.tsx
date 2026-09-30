import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Dashboard Mitra Agen | ISPSYNC",
  },
  description: "Kelola saldo, cetak tiket thermal, dan pantau komisi penjualan voucher WiFi ISPSYNC.",
};

export default function AgentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
