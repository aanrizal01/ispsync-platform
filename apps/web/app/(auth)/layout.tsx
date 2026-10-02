import type { Metadata } from "next";

import { headers } from "next/headers";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = (headersList.get("host") || "").toLowerCase();
  const parts = host.split(".");
  let slug = "";
  if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3 && (parts[0] === "ledger" || parts[0] === "hotspot")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length >= 3 && parts[0] !== "www") {
    slug = parts[0].toLowerCase();
  }

  if (slug && slug !== "ispsync") {
    const upper = slug.toUpperCase();
    return {
      title: {
        absolute: `Masuk | ${upper} Ledger`,
      },
      description: `Login ke Backoffice Ledger & Management Platform ${upper}`,
    };
  }

  return {
    title: {
      absolute: "Masuk ke Dashboard",
    },
    description: "Login ke Backoffice Ledger & Management Platform",
  };
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
