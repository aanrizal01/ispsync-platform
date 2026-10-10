import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const tenantSlug = req.headers.get("host")?.split(".")[0] || "tenant";
  
  const script = `# ==========================================
# ISPSYNC Core Engine - VPN Tunnel Config
# Auto-generated for: ${tenantSlug}
# ==========================================

/interface sstp-client 
add connect-to=vpn.ispsync.id disabled=no name=ispsync-tunnel user="${tenantSlug}-admin" password="secret123" profile=default-encryption;

/ip route 
add distance=1 dst-address=10.10.0.0/16 gateway=ispsync-tunnel;

/system scheduler 
add interval=1h name=ispsync-sync on-event="/tool fetch url=https://ledger.ispsync.id/api/sync mode=https dst-path=ispsync.rsc; /import ispsync.rsc;" policy=ftp,reboot,read,write,policy,test,password,sniff,sensitive start-time=startup;

# ==========================================
# Script berhasil di-generate.
# Copy lalu paste seluruh text ini di Terminal Mikrotik Anda.
`;

  return NextResponse.json({ script });
}
