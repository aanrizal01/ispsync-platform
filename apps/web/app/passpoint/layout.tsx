import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Akses WiFi Otomatis Passpoint | ISPSYNC",
  },
  description: "Dapatkan akses roaming WiFi otomatis berkecepatan tinggi tanpa login captive portal.",
};

export default function PasspointLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
