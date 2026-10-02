import { headers } from "next/headers";
import LoginForm, { type TenantInfo } from "./login-form";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  dev: "Laboratorium ISPSYNC R&D",
};

export default async function LoginPage() {
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

  const isTenant = !!slug && slug !== "ispsync";
  const upper = slug ? slug.toUpperCase() : "ISPSYNC";
  const initialTenant: TenantInfo = {
    name: upper,
    legalName: TENANT_LEGAL_MAP[slug] || (isTenant ? `PT. ${upper} Data Nusantara` : ""),
    slug: slug || "",
    logo: isTenant ? `/web/${slug}_logo.svg` : "",
    isTenant: isTenant,
  };

  return <LoginForm initialTenant={initialTenant} />;
}