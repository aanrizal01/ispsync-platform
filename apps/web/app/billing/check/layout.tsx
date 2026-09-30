import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Cek Tagihan & Pembayaran Online | ISPSYNC",
  },
  description: "Cek status tagihan internet, cetak invoice, dan bayar online instan via QRIS.",
};

export default function BillingCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
