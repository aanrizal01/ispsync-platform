import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Login Kemitraan Agen | ISPSYNC",
  },
  description: "Portal resmi masuk mitra agen penjualan voucher hotspot WiFi ISPSYNC.",
};

export default function AgentLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
