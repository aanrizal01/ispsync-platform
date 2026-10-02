import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Beli Voucher WiFi Hotspot",
  },
  description: "Beli voucher internet WiFi resmi ISPSYNC secara online dengan pembayaran instan QRIS.",
};

export default function HotspotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
