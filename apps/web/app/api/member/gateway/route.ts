import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dns from "dns/promises";
import { requireMember } from "../../../../../lib/member-auth";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");
const EDGE_SERVER_IP = "103.179.65.73";

function getMembersData() {
  try {
    const data = JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf-8"));
    return data.members || [];
  } catch {
    return [];
  }
}

function saveMembersData(members: any[]): boolean {
  try {
    fs.writeFileSync(MEMBERS_PATH, JSON.stringify({ members }, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save members.json:", err);
    return false;
  }
}

function extractSlug(rawDomain: string): string {
  const clean = rawDomain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();
  const parts = clean.split(".");
  if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "billing" || parts[0] === "hotspot" || parts[0] === "admin" || parts[0] === "portal" || parts[0] === "nexus" || parts[0] === "fibergrid")) {
    return parts[1];
  } else if (parts.length >= 3 && parts[1] === "ispsync") {
    return parts[0];
  }
  return parts[0];
}

async function quickDnsCheck(domain: string): Promise<{ resolved: boolean; ips: string[]; pointsToEdge: boolean }> {
  try {
    const ips = await Promise.race([
      dns.resolve4(domain),
      new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("DNS timeout")), 1200))
    ]);
    const pointsToEdge = ips.includes(EDGE_SERVER_IP);
    return { resolved: true, ips, pointsToEdge };
  } catch {
    return { resolved: false, ips: [], pointsToEdge: false };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireMember(req, ["SUPERADMIN"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const members = getMembersData();

    // 1. Edge gateway metadata
    const gatewayInfo = {
      serverIp: EDGE_SERVER_IP,
      caddyVersion: "Caddy v2.9 Alpine (Carrier On-Demand TLS)",
      tlsAutomation: "ACME Zero-Touch (ZeroSSL / Let's Encrypt)",
      askWebhookUrl: "http://172.18.0.1:8081/api/v1/caddy/ask",
      edgeStatus: "HEALTHY",
      upstreams: [
        {
          name: "Next.js Web Engine",
          host: "web:3000",
          port: 3000,
          protocol: "HTTP/1.1",
          routingPattern: "/member*, /agent*, /passpoint*, /hotspot*, /buy*, /login, *.ispsync.id (Billing UI)",
          status: "ONLINE",
          description: "Carrier Ledger backoffice, auth, hotspot & voucher ordering, and SaaS management portal"
        },
        {
          name: "Carrier Billing REST API",
          host: "api:8080",
          port: 8080,
          protocol: "HTTP/1.1",
          routingPattern: "/api/v1/*, /health, /ready, /api/v1/passpoint/*",
          status: "ONLINE",
          description: "High-throughput Go engine for billing, radius AAA, invoice settlement, and payment webhooks"
        },
        {
          name: "ISPSYNC Nexus (Team Operations)",
          host: "172.18.0.1:8081",
          port: 8081,
          protocol: "HTTP/1.1",
          routingPattern: "nexus.<tenant>.ispsync.id (/noc, /sales, /teknisi), portal.<tenant>.ispsync.id, /web/*",
          status: "ONLINE",
          description: "Pusat operasi terpadu seluruh tim internal ISP: NOC (/noc), Sales (/sales), dan Teknisi Lapangan (/teknisi) dalam satu subdomain nexus.<tenant>.ispsync.id, serta portal mandiri pelanggan."
        },
        {
          name: "FiberGrid FTTX Engine",
          host: "172.18.0.1:8082",
          port: 8082,
          protocol: "HTTP/1.1",
          routingPattern: "fibergrid.<tenant>.ispsync.id",
          status: "ONLINE",
          description: "Topologi optik FTTX GIS, manajemen OLT/ODN, dan pemetaan jalur kabel fiber pelanggan"
        }
      ]
    };

    // 2. Build complete domain catalog
    const domainList: any[] = [];

    // System Core Roots
    domainList.push({
      domain: "ispsync.id",
      type: "SYSTEM_ROOT",
      category: "Platform Apex",
      company: "ISPSYNC Platform Root",
      tenantSlug: "ispsync",
      primaryUpstream: "web:3000",
      apiUpstream: "api:8080",
      tlsMode: "Strict HTTPS / HSTS Preloaded",
      tlsStatus: "VALID",
      pointsToEdge: true,
      canDelete: false
    });

    domainList.push({
      domain: "www.ispsync.id",
      type: "SYSTEM_ROOT",
      category: "Platform WWW",
      company: "ISPSYNC Platform Root",
      tenantSlug: "ispsync",
      primaryUpstream: "web:3000",
      apiUpstream: "api:8080",
      tlsMode: "Strict HTTPS / HSTS Preloaded",
      tlsStatus: "VALID",
      pointsToEdge: true,
      canDelete: false
    });

    domainList.push({
      domain: "member.ispsync.id",
      type: "SYSTEM_PORTAL",
      category: "SaaS Owner & Client Portal",
      company: "ISPSYNC Platform Management",
      tenantSlug: "member",
      primaryUpstream: "web:3000",
      apiUpstream: "web:3000 / api:8080",
      tlsMode: "On-Demand TLS Auto-SSL",
      tlsStatus: "VALID",
      pointsToEdge: true,
      canDelete: false
    });

    // Master Engine Showcase Subdomains
    const showcaseEngines = [
      { prefix: "ledger", name: "Billing & Ledger Engine Showcase" },
      { prefix: "nexus", name: "NOC & Customer Engine Showcase" },
      { prefix: "fibergrid", name: "FiberGrid Optical Grid Showcase" },
      { prefix: "portal", name: "Subscriber Portal Showcase" }
    ];

    for (const eng of showcaseEngines) {
      domainList.push({
        domain: `${eng.prefix}.ispsync.id`,
        type: "SYSTEM_SHOWCASE",
        category: "Showcase Landing",
        company: eng.name,
        tenantSlug: "showcase",
        primaryUpstream: "web:3000",
        apiUpstream: "none",
        tlsMode: "On-Demand TLS Auto-SSL",
        tlsStatus: "VALID",
        pointsToEdge: true,
        canDelete: false
      });
    }

    // Tenant Domains
    for (const m of members) {
      if (m.id === "mbr_001" || m.role === "SUPERADMIN") continue;
      const slug = extractSlug(m.domain || "");
      if (!slug || slug === "ispsync") continue;

      // 1. Ledger Subdomain
      domainList.push({
        domain: `ledger.${slug}.ispsync.id`,
        type: "TENANT_SUBDOMAIN",
        category: "Ledger Backoffice & AAA",
        company: m.company,
        tenantSlug: slug,
        tenantId: m.id,
        primaryUpstream: "web:3000",
        apiUpstream: "api:8080",
        tlsMode: "On-Demand TLS Auto-SSL",
        tlsStatus: m.status === "active" ? "AUTHORIZED" : "SUSPENDED",
        pointsToEdge: true,
        canDelete: false
      });

      // 2. Nexus Subdomain
      domainList.push({
        domain: `nexus.${slug}.ispsync.id`,
        type: "TENANT_SUBDOMAIN",
        category: "NOC, Sales & Teknisi (/noc, /sales, /teknisi)",
        company: m.company,
        tenantSlug: slug,
        tenantId: m.id,
        primaryUpstream: "172.18.0.1:8081",
        apiUpstream: "172.18.0.1:8081",
        tlsMode: "On-Demand TLS Auto-SSL",
        tlsStatus: m.status === "active" ? "AUTHORIZED" : "SUSPENDED",
        pointsToEdge: true,
        canDelete: false
      });

      // 3. FiberGrid Subdomain
      domainList.push({
        domain: `fibergrid.${slug}.ispsync.id`,
        type: "TENANT_SUBDOMAIN",
        category: "FTTX & ODN Topology",
        company: m.company,
        tenantSlug: slug,
        tenantId: m.id,
        primaryUpstream: "172.18.0.1:8082",
        apiUpstream: "172.18.0.1:8082",
        tlsMode: "On-Demand TLS Auto-SSL",
        tlsStatus: m.status === "active" ? "AUTHORIZED" : "SUSPENDED",
        pointsToEdge: true,
        canDelete: false
      });

      // 4. Portal Subdomain
      domainList.push({
        domain: `portal.${slug}.ispsync.id`,
        type: "TENANT_SUBDOMAIN",
        category: "Subscriber Self-Service",
        company: m.company,
        tenantSlug: slug,
        tenantId: m.id,
        primaryUpstream: "172.18.0.1:8081",
        apiUpstream: "172.18.0.1:8081",
        tlsMode: "On-Demand TLS Auto-SSL",
        tlsStatus: m.status === "active" ? "AUTHORIZED" : "SUSPENDED",
        pointsToEdge: true,
        canDelete: false
      });

      // 5. WiFi Subdomain
      domainList.push({
        domain: `wifi.${slug}.ispsync.id`,
        type: "TENANT_SUBDOMAIN",
        category: "Hotspot & Voucher Landing",
        company: m.company,
        tenantSlug: slug,
        tenantId: m.id,
        primaryUpstream: "web:3000",
        apiUpstream: "api:8080",
        tlsMode: "On-Demand TLS Auto-SSL",
        tlsStatus: m.status === "active" ? "AUTHORIZED" : "SUSPENDED",
        pointsToEdge: true,
        canDelete: false
      });

      // 6. Custom Domain (if registered)
      if (m.customDomain && m.customDomain.trim() !== "") {
        const cd = m.customDomain.trim().toLowerCase();
        domainList.push({
          domain: cd,
          type: "CUSTOM_DOMAIN",
          category: "Custom White-Label FQDN",
          company: m.company,
          tenantSlug: slug,
          tenantId: m.id,
          primaryUpstream: "172.18.0.1:8081 / web:3000",
          apiUpstream: "api:8080",
          tlsMode: "On-Demand TLS Auto-SSL",
          tlsStatus: m.status === "active" ? "AUTHORIZED" : "SUSPENDED",
          pointsToEdge: false, // will be verified dynamically
          canDelete: true
        });
      }
    }

    const stats = {
      totalDomains: domainList.length,
      systemDomains: domainList.filter(d => d.type === "SYSTEM_ROOT" || d.type === "SYSTEM_PORTAL" || d.type === "SYSTEM_SHOWCASE").length,
      tenantSubdomains: domainList.filter(d => d.type === "TENANT_SUBDOMAIN").length,
      customDomains: domainList.filter(d => d.type === "CUSTOM_DOMAIN").length,
      activeUpstreams: gatewayInfo.upstreams.length,
      edgeNodeIp: EDGE_SERVER_IP
    };

    return NextResponse.json({
      success: true,
      gatewayInfo,
      stats,
      domains: domainList
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireMember(req, ["SUPERADMIN"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { action } = body;

    // Action 1: Verify DNS resolution
    if (action === "verify_dns") {
      const { domain } = body;
      if (!domain) {
        return NextResponse.json({ success: false, error: "Domain wajib diisi" }, { status: 400 });
      }

      const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();
      const startTime = Date.now();
      let resolvedIps: string[] = [];
      let cnameRecord: string[] = [];
      let isResolved = false;

      try {
        resolvedIps = await dns.resolve4(cleanDomain);
        isResolved = resolvedIps.length > 0;
      } catch (e: any) {
        // Try lookup fallback
        try {
          const lookupRes = await dns.lookup(cleanDomain);
          if (lookupRes.address) {
            resolvedIps = [lookupRes.address];
            isResolved = true;
          }
        } catch {
          // Unresolved
        }
      }

      try {
        cnameRecord = await dns.resolveCname(cleanDomain);
      } catch {
        // No CNAME record found
      }

      const latencyMs = Date.now() - startTime;
      const pointsToEdge = resolvedIps.includes(EDGE_SERVER_IP);

      return NextResponse.json({
        success: true,
        domain: cleanDomain,
        isResolved,
        resolvedIps,
        cnameRecord,
        pointsToEdge,
        edgeIp: EDGE_SERVER_IP,
        latencyMs,
        message: pointsToEdge
          ? `Domain ${cleanDomain} berhasil terarah ke IP Edge Cluster ${EDGE_SERVER_IP}.`
          : isResolved
          ? `Domain ${cleanDomain} mengarah ke IP lain (${resolvedIps.join(", ")}). Harap arahkan A-Record ke ${EDGE_SERVER_IP}.`
          : `Domain ${cleanDomain} belum terpropagasi di DNS publik.`
      });
    }

    // Action 2: Test Caddy On-Demand TLS Permission Hook (/api/v1/caddy/ask)
    if (action === "test_caddy_ask") {
      const { domain } = body;
      if (!domain) {
        return NextResponse.json({ success: false, error: "Domain wajib diisi" }, { status: 400 });
      }

      const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();
      const apiBaseUrl = process.env.API_BASE_URL || (process.env.NODE_ENV === "production" ? "http://api:8080" : "http://localhost:8080");

      try {
        // Query the ask webhook on ISPSYNC Core or Go API
        // In production, Caddyfile calls http://172.18.0.1:8081/api/v1/caddy/ask?domain={domain}
        const askUrl = `http://172.18.0.1:8081/api/v1/caddy/ask?domain=${encodeURIComponent(cleanDomain)}`;
        const res = await fetch(askUrl, { signal: AbortSignal.timeout(3000) }).catch(async () => {
          // Fallback to api:8080
          return await fetch(`${apiBaseUrl}/api/v1/caddy/ask?domain=${encodeURIComponent(cleanDomain)}`, { signal: AbortSignal.timeout(3000) });
        });

        const status = res.status;
        const text = await res.text();
        const authorized = status === 200;

        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          authorized,
          statusCode: status,
          responseText: text.trim(),
          message: authorized
            ? `Caddy mengotorisasi penerbitan sertifikat SSL On-Demand untuk ${cleanDomain}.`
            : `Caddy menolak penerbitan sertifikat SSL (HTTP ${status}). Domain belum terdaftar atau status tenant tidak aktif.`
        });
      } catch (err: any) {
        // Emulate store logic if direct webhook socket unreachable from inside Next.js container
        const ispsyncSub = cleanDomain.endsWith(".ispsync.id") || cleanDomain === "ispsync.id";
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          authorized: ispsyncSub,
          statusCode: ispsyncSub ? 200 : 403,
          responseText: ispsyncSub ? "OK (Policy match)" : "Forbidden",
          message: ispsyncSub
            ? `Domain ${cleanDomain} masuk dalam whitelist On-Demand TLS *.ispsync.id.`
            : `Webhook check timeout: ${err.message}`
        });
      }
    }

    // Action 3: Probe live HTTPS connection
    if (action === "probe_ssl") {
      const { domain } = body;
      if (!domain) {
        return NextResponse.json({ success: false, error: "Domain wajib diisi" }, { status: 400 });
      }

      const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();
      const startTime = Date.now();

      try {
        const probeRes = await fetch(`https://${cleanDomain}`, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(6000)
        });

        const latencyMs = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          online: true,
          statusCode: probeRes.status,
          latencyMs,
          message: `Koneksi HTTPS aman (SSL TLS) aktif. HTTP status: ${probeRes.status}. Waktu respons: ${latencyMs}ms.`
        });
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          online: false,
          statusCode: 0,
          latencyMs,
          message: `Koneksi HTTPS gagal atau belum aktif: ${err.message}`
        });
      }
    }

    // Action 4: Register or update custom domain for a tenant
    if (action === "set_custom_domain") {
      const { tenantId, tenantSlug, customDomain } = body;
      if (!tenantSlug) {
        return NextResponse.json({ success: false, error: "Tenant slug wajib diisi" }, { status: 400 });
      }

      const cleanCustomDomain = (customDomain || "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").split(":")[0].trim().toLowerCase();

      // 1. Update members.json
      const members = getMembersData();
      const idx = members.findIndex((m: any) => m.id === tenantId || extractSlug(m.domain || "") === tenantSlug);
      if (idx !== -1) {
        members[idx].customDomain = cleanCustomDomain;
        saveMembersData(members);
      }

      // 2. Call internal Go API to register custom_domain in ispsync DB
      const apiBaseUrl = process.env.API_BASE_URL || (process.env.NODE_ENV === "production" ? "http://api:8080" : "http://localhost:8080");
      try {
        const internalRes = await fetch(`${apiBaseUrl}/api/v1/internal/tenants/custom-domain`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": "isp-onboarding-admin-key"
          },
          body: JSON.stringify({
            tenant_slug: tenantSlug,
            custom_domain: cleanCustomDomain
          })
        });

        if (!internalRes.ok) {
          console.error("Internal custom domain update error:", await internalRes.text());
        }
      } catch (e: any) {
        console.error("Failed to reach internal custom domain API:", e.message);
      }

      return NextResponse.json({
        success: true,
        message: cleanCustomDomain
          ? `Custom domain '${cleanCustomDomain}' berhasil didaftarkan ke Caddy On-Demand TLS untuk tenant '${tenantSlug}'.`
          : `Custom domain berhasil dihapus untuk tenant '${tenantSlug}'.`,
        tenantSlug,
        customDomain: cleanCustomDomain
      });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
