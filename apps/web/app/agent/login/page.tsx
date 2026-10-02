import type { Metadata } from "next";
import { headers } from "next/headers";
import AgentLoginForm, { type TenantInfo } from "./agent-login-form";

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
  if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "agent")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "agent")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length >= 3 && parts[0] !== "www") {
    slug = parts[0].toLowerCase();
  }

  const upper = slug && slug !== "ispsync" ? slug.toUpperCase() : "ISPSYNC";

  return {
    title: {
      absolute: `Masuk | ${upper} Portal Agen`,
    },
    description: `Portal Kemitraan Agen & Reseller Hotspot ${upper}`,
  };
}

export default async function AgentLoginPage() {
  const headersList = await headers();
  const host = (headersList.get("host") || "").toLowerCase();
  const parts = host.split(".");
  let slug = "";
  if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "agent")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "agent")) {
    slug = parts[1].toLowerCase();
  } else if (parts.length >= 3 && parts[0] !== "www") {
    slug = parts[0].toLowerCase();
  }

  const isTenant = !!slug && slug !== "ispsync";
  const upper = slug ? slug.toUpperCase() : "ISPSYNC";
  const initialTenant: TenantInfo = {
    name: upper,
    legalName: TENANT_LEGAL_MAP[slug] || (isTenant ? `PT. ${upper} Data Nusantara` : ""),
    slug: slug || "",
    logo: isTenant ? `/web/${slug}_logo.svg` : "",
    isTenant: isTenant,
  };

  return <AgentLoginForm initialTenant={initialTenant} />;
}
