import { headers } from "next/headers";
import LoginForm, { type TenantInfo } from "./login-form";

import fs from "fs";
import path from "path";

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  gogiga: "PT. GOGIGA MEDIA TEKNOLOGI",
  gbd: "PT GNET BIARO DATA",
  dev: "Laboratorium ISPSYNC R&D",
};

export default async function LoginPage() {
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

  const isTenant = !!slug && slug !== "ispsync";
  const upper = slug ? slug.toUpperCase() : "ISPSYNC";

  let legalName = TENANT_LEGAL_MAP[slug] || "";
  if (!legalName && slug) {
    try {
      const p = path.join(process.cwd(), "data", "members.json");
      if (fs.existsSync(p)) {
        const d = JSON.parse(fs.readFileSync(p, "utf-8"));
        const found = d.members?.find((m: any) => m.domain && m.domain.toLowerCase().includes(slug));
        if (found && found.company) legalName = found.company;
      }
    } catch {}
  }
  if (!legalName && isTenant) {
    legalName = `PT. ${upper} Data Nusantara`;
  }

  const initialTenant: TenantInfo = {
    name: upper,
    legalName: legalName,
    slug: slug || "",
    logo: isTenant ? `/web/${slug}_logo.svg` : "",
    isTenant: isTenant,
  };

  return <LoginForm initialTenant={initialTenant} />;
}