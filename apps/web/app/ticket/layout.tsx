import type { Metadata } from "next";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";

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
        absolute: `Pusat Bantuan & Lacak Tiket | ${upper}`,
      },
      description: `Portal Pengaduan & Layanan Gangguan Pelanggan ${upper}`,
      icons: hasFavicon ? {
        icon: `/web/${slug}_favicon.svg`,
        shortcut: `/web/${slug}_favicon.svg`,
      } : {
        icon: "/web/ispsync_favicon.svg",
        shortcut: "/web/ispsync_favicon.svg",
      },
    };
  }

  return {
    title: {
      absolute: "Pusat Bantuan & Lacak Tiket",
    },
    description: "Portal Pengaduan & Layanan Gangguan Pelanggan",
    icons: {
      icon: "/web/ispsync_favicon.svg",
      shortcut: "/web/ispsync_favicon.svg",
    }
  };
}

export default function TicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
