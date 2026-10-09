import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");

const TENANT_LEGAL_MAP: Record<string, string> = {
  ispmu: "PT. Mitra Usaha Data",
  ispku: "PT. ISP Kita Nusantara",
  gogiga: "PT. GOGIGA MEDIA TEKNOLOGI",
  dev: "ISPSYNC Staging Lab",
};

const TENANT_TELCO_LICENSES: Record<string, { nib: string; sklo: string }> = {
  ispmu: {
    nib: "0220208123456",
    sklo: "No. 128/TEL.04.02/KOMINFO",
  },
  ispku: {
    nib: "0220107654321",
    sklo: "No. 095/TEL.04.02/KOMINFO",
  },
  gogiga: {
    nib: "0220309988776",
    sklo: "No. 154/TEL.04.02/KOMINFO",
  },
  dev: {
    nib: "0220008819201",
    sklo: "No. 014/TEL.04.02/KOMINFO",
  },
};

interface MemberRecord {
  id: string;
  email: string;
  company: string;
  picName: string;
  phone: string;
  address: string;
  npwp: string;
  nib?: string;
  sklo?: string;
  domain: string;
  logoUrl?: string;
  brandColor?: string;
}

function getMembers(): MemberRecord[] {
  try {
    if (fs.existsSync(MEMBERS_PATH)) {
      const data = JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf-8"));
      return data.members || [];
    }
  } catch (err) {
    console.error("Failed to read members.json:", err);
  }
  return [];
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const explicitSlug = url.searchParams.get("slug") || req.headers.get("x-tenant-slug");

  // Determine host and slug
  const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = rawHost.toLowerCase().split(":")[0];
  const parts = host.split(".");
  let slug = (explicitSlug || "").toLowerCase();

  if (!slug) {
    if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "wifi" || parts[0] === "agent" || parts[0] === "member")) {
      slug = parts[1].toLowerCase();
    } else if (parts.length === 3 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "wifi" || parts[0] === "agent")) {
      slug = parts[1].toLowerCase();
    } else if (parts.length >= 3 && parts[0] !== "www") {
      slug = parts[0].toLowerCase();
    }
  }

  if (!slug || slug === "localhost" || slug === "127") {
    slug = "dev";
  }

  const upper = slug.toUpperCase();
  const members = getMembers();

  // Find member matching domain or slug
  const member = members.find(
    (m) =>
      m.domain?.toLowerCase().includes(slug) ||
      m.company?.toLowerCase().includes(slug) ||
      m.email?.toLowerCase().includes(`@${slug}.`)
  );

  const legalName =
    TENANT_LEGAL_MAP[slug] ||
    member?.company ||
    `PT. ${upper} Data Nusantara`;

  const brandName = upper === "DEV" ? "DEV LAB" : upper;
  const phone = member?.phone || "+62 812-3456-7890";
  const email = member?.email || `admin@${slug}.ispsync.id`;
  const address =
    member?.address ||
    `Jl. Telekomunikasi No. 1, Sentra Internet ${upper}, Indonesia`;
  const npwp = member?.npwp || "01.234.567.8-901.000";
  const domain = member?.domain || `${slug}.ispsync.id`;
  const website = `https://${domain}`;
  const logoUrl = `/web/${slug}_logo.svg`;
  const faviconUrl = `/web/${slug}_favicon.svg`;
  const telcoLicense = TENANT_TELCO_LICENSES[slug] || {
    nib: member?.nib || "0220208123456",
    sklo: member?.sklo || "No. 128/TEL.04.02/KOMINFO",
  };
  const nib = member?.nib || telcoLicense.nib;
  const sklo = member?.sklo || telcoLicense.sklo;

  return NextResponse.json({
    success: true,
    slug,
    companyName: legalName,
    plan: member?.plan || "professional",
    planCapacity: member?.planCapacity || "5.000 Pelanggan",
    brandName,
    npwp,
    nib,
    sklo,
    phone,
    whatsappCS: phone,
    emailSupport: email,
    website,
    address,
    logoUrl,
    faviconUrl,
    brandColor: "#0284c7",
    invoiceFooterNote: `Terima kasih atas kepercayaan Anda menggunakan layanan internet ${brandName}. Pembayaran tepat waktu menjamin kelancaran koneksi Anda.`,
    isFromSaaS: !!member,
    saasMemberId: member?.id || null,
  });
}
