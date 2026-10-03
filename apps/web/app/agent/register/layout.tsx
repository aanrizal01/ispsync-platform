import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Pendaftaran Mitra Agen | ISPSYNC",
  },
  description: "Formulir pendaftaran resmi mitra agen penjualan voucher hotspot dan loket pembayaran tagihan ISP.",
};

export default function AgentRegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
