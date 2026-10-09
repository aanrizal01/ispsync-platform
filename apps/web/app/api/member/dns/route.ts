import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dns from "dns/promises";

// Determine data directory (container /app/data or local process.cwd()/data)
function getDataDir(): string {
  const containerData = "/app/data";
  if (fs.existsSync(containerData)) return containerData;
  const localData = path.join(process.cwd(), "data");
  if (!fs.existsSync(localData)) {
    fs.mkdirSync(localData, { recursive: true });
  }
  return localData;
}

const DNS_JSON_PATH = path.join(getDataDir(), "dns-records.json");
const COREFILE_PATH = path.join(getDataDir(), "Corefile");

const DEFAULT_DNS_DATA = {
  zone: "ispsync.id",
  nameservers: ["ns1.ispsync.id", "ns2.ispsync.id"],
  serverIpv4: "103.179.65.73",
  serverIpv6: "2001:df1:1cc0:65::73",
  records: [
    {
      id: "rec_ns1",
      name: "ns1",
      type: "A",
      value: "103.179.65.73",
      ttl: 3600,
      priority: 0,
      isSystem: true,
      comment: "Primary Authoritative Nameserver (ns1.ispsync.id)"
    },
    {
      id: "rec_ns2",
      name: "ns2",
      type: "A",
      value: "103.179.65.73",
      ttl: 3600,
      priority: 0,
      isSystem: true,
      comment: "Secondary Authoritative Nameserver (ns2.ispsync.id)"
    },
    {
      id: "rec_apex_a",
      name: "@",
      type: "A",
      value: "103.179.65.73",
      ttl: 60,
      priority: 0,
      isSystem: true,
      comment: "Apex Domain IPv4 Node"
    },
    {
      id: "rec_wildcard_a",
      name: "*",
      type: "A",
      value: "103.179.65.73",
      ttl: 60,
      priority: 0,
      isSystem: true,
      comment: "Wildcard Multi-Tenant IPv4 (*.ispsync.id)"
    },
    {
      id: "rec_apex_aaaa",
      name: "@",
      type: "AAAA",
      value: "2001:df1:1cc0:65::73",
      ttl: 60,
      priority: 0,
      isSystem: true,
      comment: "Apex Domain IPv6 Node"
    },
    {
      id: "rec_wildcard_aaaa",
      name: "*",
      type: "AAAA",
      value: "2001:df1:1cc0:65::73",
      ttl: 60,
      priority: 0,
      isSystem: true,
      comment: "Wildcard Multi-Tenant IPv6 (*.ispsync.id)"
    },
    {
      id: "rec_caa_letsencrypt",
      name: "@",
      type: "CAA",
      value: "0 issue \"letsencrypt.org\"",
      ttl: 3600,
      priority: 0,
      isSystem: true,
      comment: "SSL Certificate Authority (Let's Encrypt)"
    },
    {
      id: "rec_caa_zerossl",
      name: "@",
      type: "CAA",
      value: "0 issue \"zerossl.com\"",
      ttl: 3600,
      priority: 0,
      isSystem: true,
      comment: "SSL Certificate Authority (ZeroSSL)"
    },
    {
      id: "rec_txt_google",
      name: "@",
      type: "TXT",
      value: "google-site-verification=jDM1n9QLqiBH6uKVavK0LioCgZV1cf4u2wlt62QpiHs",
      ttl: 300,
      priority: 0,
      isSystem: false,
      comment: "Google Workspace Domain Verification"
    },
    {
      id: "rec_cname_google",
      name: "cbirujfqln4d",
      type: "CNAME",
      value: "gv-slkmet6ytw7fvh.dv.googlehosted.com.",
      ttl: 300,
      priority: 0,
      isSystem: false,
      comment: "Google Workspace CNAME Verification Token"
    }
  ]
};

function getDnsData() {
  try {
    if (fs.existsSync(DNS_JSON_PATH)) {
      const raw = fs.readFileSync(DNS_JSON_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading dns-records.json:", err);
  }
  // Initialize file with default data
  saveDnsData(DEFAULT_DNS_DATA);
  return DEFAULT_DNS_DATA;
}

function saveDnsData(data: any): boolean {
  try {
    fs.writeFileSync(DNS_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write dns-records.json:", err);
    return false;
  }
}

export function generateCorefile(data: any): string {
  const zone = data.zone || "ispsync.id";
  const serverIpv4 = data.serverIpv4 || "103.179.65.73";
  const serverIpv6 = data.serverIpv6 || "2001:df1:1cc0:65::73";
  const records = data.records || [];

  const soaSerial = new Date().toISOString().slice(0, 10).replace(/-/g, "") + "01";

  let out = `${zone}:53 {\n`;
  out += `    bind ${serverIpv4}\n`;
  out += `    reload 5s\n`;
  out += `    log\n`;
  out += `    errors\n\n`;

  // SOA
  out += `    template IN SOA {\n`;
  out += `        answer "${zone}. 3600 IN SOA ns1.${zone}. hostmaster.${zone}. ${soaSerial} 7200 3600 1209600 3600"\n`;
  out += `    }\n\n`;

  // NS
  out += `    template IN NS {\n`;
  out += `        answer "${zone}. 3600 IN NS ns1.${zone}."\n`;
  out += `        answer "${zone}. 3600 IN NS ns2.${zone}."\n`;
  out += `        additional "ns1.${zone}. 3600 IN A ${serverIpv4}"\n`;
  out += `        additional "ns2.${zone}. 3600 IN A ${serverIpv4}"\n`;
  out += `    }\n\n`;

  // CAA
  const caaRecords = records.filter((r: any) => r.type === "CAA");
  if (caaRecords.length > 0) {
    out += `    template IN CAA {\n`;
    for (const caa of caaRecords) {
      let val = caa.value.replace(/"/g, '\\"');
      out += `        answer "{{ .Name }} ${caa.ttl || 3600} IN CAA ${val}"\n`;
    }
    out += `    }\n\n`;
  }

  // CNAME
  const cnameRecords = records.filter((r: any) => r.type === "CNAME");
  for (const cname of cnameRecords) {
    const recName = cname.name.trim();
    const target = cname.value.trim().endsWith(".") ? cname.value.trim() : `${cname.value.trim()}.`;
    out += `    template IN CNAME {\n`;
    out += `        match ^${recName.replace(/\./g, "\\.")}\\.${zone.replace(/\./g, "\\.")}\\.?$\n`;
    out += `        answer "{{ .Name }} ${cname.ttl || 300} IN CNAME ${target}"\n`;
    out += `    }\n\n`;
  }

  // MX
  const mxRecords = records.filter((r: any) => r.type === "MX");
  if (mxRecords.length > 0) {
    out += `    template IN MX {\n`;
    out += `        match ^${zone.replace(/\./g, "\\.")}\\.?$\n`;
    for (const mx of mxRecords) {
      let host = mx.value.trim();
      if (!host.endsWith(".")) host += ".";
      const prio = mx.priority !== undefined ? mx.priority : 1;
      out += `        answer "${zone}. ${mx.ttl || 3600} IN MX ${prio} ${host}"\n`;
    }
    out += `    }\n\n`;
  }

  // TXT
  const txtRecords = records.filter((r: any) => r.type === "TXT");
  if (txtRecords.length > 0) {
    const txtByName: { [k: string]: any[] } = {};
    for (const txt of txtRecords) {
      const k = txt.name.trim();
      if (!txtByName[k]) txtByName[k] = [];
      txtByName[k].push(txt);
    }
    for (const [name, recs] of Object.entries(txtByName)) {
      const fqdnRegex = name === "@"
        ? `^${zone.replace(/\./g, "\\.")}\\.?$`
        : `^${name.replace(/\./g, "\\.")}\\.${zone.replace(/\./g, "\\.")}\\.?$`;
      const domainName = name === "@" ? zone : `${name}.${zone}`;
      out += `    template IN TXT {\n`;
      out += `        match ${fqdnRegex}\n`;
      for (const rec of recs) {
        let cleanVal = rec.value.replace(/^"/, "").replace(/"$/, "").replace(/"/g, '\\"');
        out += `        answer "${domainName}. ${rec.ttl || 300} IN TXT \\"${cleanVal}\\""\n`;
      }
      out += `    }\n\n`;
    }
  }

  // Specific custom A records (not @ and not * and not ns1/ns2)
  const specificARecords = records.filter(
    (r: any) => r.type === "A" && r.name !== "@" && r.name !== "*" && r.name !== "ns1" && r.name !== "ns2"
  );
  for (const aRec of specificARecords) {
    out += `    template IN A {\n`;
    out += `        match ^${aRec.name.replace(/\./g, "\\.")}\\.${zone.replace(/\./g, "\\.")}\\.?$\n`;
    out += `        answer "{{ .Name }} ${aRec.ttl || 60} IN A ${aRec.value.trim()}"\n`;
    out += `    }\n\n`;
  }

  // Default Wildcard & Apex A / AAAA Fallback
  out += `    template IN A {\n`;
  out += `        match (.*)${zone.replace(/\./g, "\\.")}\n`;
  out += `        answer "{{ .Name }} 60 IN A ${serverIpv4}"\n`;
  out += `    }\n\n`;

  out += `    template IN AAAA {\n`;
  out += `        match (.*)${zone.replace(/\./g, "\\.")}\n`;
  out += `        answer "{{ .Name }} 60 IN AAAA ${serverIpv6}"\n`;
  out += `    }\n`;

  out += `}\n`;
  return out;
}

function syncCorefile(data: any): boolean {
  try {
    const content = generateCorefile(data);
    fs.writeFileSync(COREFILE_PATH, content, "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write Corefile:", err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const data = getDnsData();
    let rawCorefile = "";
    try {
      if (fs.existsSync(COREFILE_PATH)) {
        rawCorefile = fs.readFileSync(COREFILE_PATH, "utf-8");
      } else {
        rawCorefile = generateCorefile(data);
        fs.writeFileSync(COREFILE_PATH, rawCorefile, "utf-8");
      }
    } catch {
      rawCorefile = generateCorefile(data);
    }

    const records = data.records || [];
    const stats = {
      total: records.length,
      a: records.filter((r: any) => r.type === "A" || r.type === "AAAA").length,
      cname: records.filter((r: any) => r.type === "CNAME").length,
      txt: records.filter((r: any) => r.type === "TXT").length,
      mx: records.filter((r: any) => r.type === "MX").length,
      caa: records.filter((r: any) => r.type === "CAA").length,
      system: records.filter((r: any) => r.isSystem).length,
      custom: records.filter((r: any) => !r.isSystem).length
    };

    return NextResponse.json({
      success: true,
      zone: data.zone,
      nameservers: data.nameservers,
      serverIpv4: data.serverIpv4,
      serverIpv6: data.serverIpv6,
      stats,
      records,
      rawCorefile
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const data = getDnsData();

    // 1. CREATE RECORD
    if (action === "create") {
      let { name, type, value, ttl, priority, comment } = body;
      if (!name || !type || !value) {
        return NextResponse.json({ success: false, error: "Nama host, tipe record, dan nilai record wajib diisi." }, { status: 400 });
      }

      type = type.toUpperCase().trim();
      name = name.trim();
      value = value.trim();
      ttl = parseInt(ttl) || 300;
      priority = parseInt(priority) || 0;

      // Clean host name
      if (name.endsWith("." + data.zone)) {
        name = name.replace("." + data.zone, "");
      }
      if (name === "" || name === data.zone) name = "@";

      const newRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        type,
        value,
        ttl,
        priority: type === "MX" ? priority : 0,
        isSystem: false,
        comment: comment?.trim() || ""
      };

      data.records.push(newRecord);
      saveDnsData(data);
      syncCorefile(data);

      return NextResponse.json({
        success: true,
        message: `DNS Record ${type} (${name}) berhasil ditambahkan dan disinkronkan ke CoreDNS.`,
        record: newRecord
      });
    }

    // 2. UPDATE RECORD
    if (action === "update") {
      let { id, name, type, value, ttl, priority, comment } = body;
      if (!id || !name || !type || !value) {
        return NextResponse.json({ success: false, error: "ID, nama host, tipe record, dan nilai wajib diisi." }, { status: 400 });
      }

      const index = data.records.findIndex((r: any) => r.id === id);
      if (index === -1) {
        return NextResponse.json({ success: false, error: "Record tidak ditemukan." }, { status: 404 });
      }

      name = name.trim();
      if (name.endsWith("." + data.zone)) {
        name = name.replace("." + data.zone, "");
      }
      if (name === "" || name === data.zone) name = "@";

      data.records[index] = {
        ...data.records[index],
        name,
        type: type.toUpperCase().trim(),
        value: value.trim(),
        ttl: parseInt(ttl) || 300,
        priority: type === "MX" ? (parseInt(priority) || 0) : 0,
        comment: comment?.trim() || ""
      };

      saveDnsData(data);
      syncCorefile(data);

      return NextResponse.json({
        success: true,
        message: `DNS Record ${type} (${name}) berhasil diperbarui.`,
        record: data.records[index]
      });
    }

    // 3. DELETE RECORD
    if (action === "delete") {
      const { id, force } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: "ID record wajib diisi." }, { status: 400 });
      }

      const rec = data.records.find((r: any) => r.id === id);
      if (!rec) {
        return NextResponse.json({ success: false, error: "Record tidak ditemukan." }, { status: 404 });
      }

      if (rec.isSystem && !force) {
        return NextResponse.json({
          success: false,
          error: "Record ini adalah record sistem inti platform (Apex / NS / Root). Menghapusnya dapat menyebabkan domain tidak dapat diakses."
        }, { status: 403 });
      }

      data.records = data.records.filter((r: any) => r.id !== id);
      saveDnsData(data);
      syncCorefile(data);

      return NextResponse.json({
        success: true,
        message: `DNS Record ${rec.type} (${rec.name}) berhasil dihapus.`
      });
    }

    // 4. QUICK PRESET (GOOGLE WORKSPACE MAIL)
    if (action === "quick_preset") {
      const { preset } = body;
      if (preset === "google_workspace") {
        // Check if MX already exists
        const hasGoogleMx = data.records.some(
          (r: any) => r.type === "MX" && r.value.toLowerCase().includes("smtp.google.com")
        );
        const hasGoogleSpf = data.records.some(
          (r: any) => r.type === "TXT" && r.value.includes("include:_spf.google.com")
        );

        if (!hasGoogleMx) {
          data.records.push({
            id: `rec_mx_google_${Date.now()}`,
            name: "@",
            type: "MX",
            value: "SMTP.GOOGLE.COM.",
            ttl: 3600,
            priority: 1,
            isSystem: false,
            comment: "Google Workspace Gmail MX Gateway"
          });
        }

        if (!hasGoogleSpf) {
          data.records.push({
            id: `rec_spf_google_${Date.now()}`,
            name: "@",
            type: "TXT",
            value: "v=spf1 include:_spf.google.com ~all",
            ttl: 3600,
            priority: 0,
            isSystem: false,
            comment: "Google Workspace Email SPF Anti-Spoofing"
          });
        }

        saveDnsData(data);
        syncCorefile(data);

        return NextResponse.json({
          success: true,
          message: "Preset Google Workspace (Gmail MX & SPF) berhasil dipasang ke domain ispsync.id."
        });
      }

      return NextResponse.json({ success: false, error: "Preset tidak dikenali." }, { status: 400 });
    }

    // 5. DIAGNOSTIC / DIG RECORD
    if (action === "dig") {
      const { domain, type } = body;
      const cleanDomain = domain ? domain.trim() : data.zone;
      const qType = (type || "A").toUpperCase();

      const startTime = Date.now();
      try {
        let results: any = [];
        if (qType === "A") {
          results = await dns.resolve4(cleanDomain);
        } else if (qType === "AAAA") {
          results = await dns.resolve6(cleanDomain);
        } else if (qType === "CNAME") {
          results = await dns.resolveCname(cleanDomain);
        } else if (qType === "TXT") {
          const txtGroups = await dns.resolveTxt(cleanDomain);
          results = txtGroups.map((g) => g.join(""));
        } else if (qType === "MX") {
          results = await dns.resolveMx(cleanDomain);
        } else if (qType === "NS") {
          results = await dns.resolveNs(cleanDomain);
        } else {
          results = await dns.resolve(cleanDomain, qType);
        }

        const latencyMs = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          type: qType,
          resolved: true,
          results,
          latencyMs,
          message: `Record ${qType} ${cleanDomain} berhasil diresolusi publik dalam ${latencyMs}ms.`
        });
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          type: qType,
          resolved: false,
          results: [],
          latencyMs,
          message: `Resolusi ${qType} ${cleanDomain} belum merespons: ${err.message}`
        });
      }
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
