import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.ISPSYNC_CORE_URL || "http://172.18.0.1:8081";

function extractTenantSlug(req: NextRequest): string {
  const url = new URL(req.url);
  const explicitSlug = url.searchParams.get("slug") || req.headers.get("x-tenant-slug");
  if (explicitSlug) return explicitSlug.toLowerCase();

  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const parts = host.split(".");
  let slug = "";
  if (parts.length >= 4) {
    slug = parts[1].toLowerCase();
  } else if (parts.length === 3 && parts[1] === "ispsync") {
    slug = parts[0].toLowerCase();
  }
  return slug || "dev";
}

export async function GET(req: NextRequest) {
  const slug = extractTenantSlug(req);
  try {
    const res = await fetch(`${CORE_API_URL}/api/v1/tenant/settings`, {
      headers: {
        Host: `${slug}.ispsync.id`,
        "X-Tenant-Slug": slug,
        "X-Admin-Key": "isp-onboarding-admin-key",
      },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const slug = extractTenantSlug(req);
  try {
    const body = await req.json();
    const res = await fetch(`${CORE_API_URL}/api/v1/tenant/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `${slug}.ispsync.id`,
        "X-Tenant-Slug": slug,
        "X-Admin-Key": "isp-onboarding-admin-key",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
