import { notFound } from "next/navigation";
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
  const upper = slug ? (slug === "dev" ? "DEV LAB" : slug.toUpperCase()) : "ISPSYNC";

  let legalName = TENANT_LEGAL_MAP[slug] || "";
  let isValidTenant = !!TENANT_LEGAL_MAP[slug];

  if (!legalName && slug) {
    try {
      // Use standard data lookup instead of process.cwd() directly for safety
      const dPath = process.env.NODE_ENV === "production" ? "/app/data/members.json" : path.join(process.cwd(), "data", "members.json");
      if (fs.existsSync(dPath)) {
        const d = JSON.parse(fs.readFileSync(dPath, "utf-8"));
        const found = d.members?.find((m: any) => m.domain && m.domain.toLowerCase().includes(slug));
        if (found && found.company) {
          legalName = found.company;
          isValidTenant = true;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (isTenant && !isValidTenant) {
    notFound();
  }

  if (!legalName && isTenant) {
    legalName = `PT. ${upper} Data Nusantara`;
  }

  let tenantLogo = "/logo-prism.png";
  if (isTenant) {
    const customFav = path.join(process.cwd(), "public", "web", `${slug}_favicon.svg`);
    const customSvg = path.join(process.cwd(), "public", "web", `${slug}_logo.svg`);
    const customPng = path.join(process.cwd(), "public", "web", `${slug}_logo.png`);
    if (fs.existsSync(customFav)) {
      tenantLogo = `/web/${slug}_favicon.svg`;
    } else if (fs.existsSync(customSvg)) {
      tenantLogo = `/web/${slug}_logo.svg`;
    } else if (fs.existsSync(customPng)) {
      tenantLogo = `/web/${slug}_logo.png`;
    }
  }

  const initialTenant: TenantInfo = {
    name: upper,
    legalName: legalName,
    slug: slug || "",
    logo: tenantLogo,
    isTenant: isTenant,
  };

  return <LoginForm initialTenant={initialTenant} />;
}