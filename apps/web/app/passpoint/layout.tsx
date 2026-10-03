import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = (headersList.get("host") || "").toLowerCase();
  const parts = host.split(".");
  let slug = "";
  if (parts.length >= 4 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3 && (parts[0] === "passpoint" || parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "wifi")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length >= 3 && parts[0] !== "www") {
    slug = parts[0].toLowerCase();
  }

  const isTenant = !!slug && slug !== "ispsync";
  const upper = isTenant ? slug.toUpperCase() : "ISPSYNC";

  return {
    title: {
      absolute: isTenant ? `Passpoint Wi-Fi | ${upper} Hotspot 2.0` : "Akses WiFi Otomatis Passpoint | ISPSYNC",
    },
    description: `Akses roaming WiFi otomatis berkecepatan tinggi tanpa captive portal login di seluruh jaringan ${upper}.`,
  };
}

export default function PasspointLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
