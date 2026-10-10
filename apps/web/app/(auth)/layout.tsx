import type { Metadata } from "next";

import { headers } from "next/headers";
import fs from "fs";
import path from "path";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  gogiga: "PT. GOGIGA MEDIA TEKNOLOGI",
  gbd: "PT GNET BIARO DATA",
  dev: "Laboratorium ISPSYNC R&D",
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const rawHost = headersList.get("host") || "";
  const host = rawHost.toLowerCase().split(":")[0];
  const parts = host.split(".");
  let slug = "";
  if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "radius" || parts[0] === "wifi" || parts[0] === "admin" || parts[0] === "portal")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "radius" || parts[0] === "wifi" || parts[0] === "admin" || parts[0] === "portal")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length >= 3 && parts[0] !== "www") {
    slug = parts[0].toLowerCase();
  }

  if (slug && slug !== "ispsync") {
    const upper = slug === "dev" ? "DEV LAB" : slug.toUpperCase();
    
    // Check if custom favicon exists
    const customFav = path.join(process.cwd(), "public", "web", `${slug}_favicon.svg`);
    const hasFavicon = fs.existsSync(customFav);

    return {
      title: {
        absolute: `Masuk | ${upper} Ledger`,
      },
      description: `Login ke Backoffice Ledger & Management Platform ${upper}`,
      icons: hasFavicon ? {
        icon: `/web/${slug}_favicon.svg`,
      } : undefined,
    };
  }

  return {
    title: {
      absolute: "Masuk ke Dashboard",
    },
    description: "Login ke Backoffice Ledger & Management Platform",
    icons: {
      icon: "/web/ispsync_favicon.svg",
    }
  };
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
