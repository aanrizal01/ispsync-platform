import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendSubscriptionExpiringEmail, sendAccountExpiredEmail, getDataDir } from "../../../../lib/mailer";

function getMembersPath(): string {
  const p0 = path.join(getDataDir(), "members.json");
  if (fs.existsSync(p0)) return p0;
  const p1 = path.join(process.cwd(), "data", "members.json");
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "apps", "web", "data", "members.json");
  if (fs.existsSync(p2)) return p2;
  return p0;
}

export async function GET(req: NextRequest) {
  // In production, secure this endpoint with a cron secret token
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = fs.readFileSync(getMembersPath(), "utf-8");
    const db = JSON.parse(raw);
    const members = db.members || [];
    let modified = false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs: string[] = [];

    for (const member of members) {
      if (member.role === "SUPERADMIN" || member.id === "mbr_001") continue;
      
      const expiryDateStr = member.expiresAt;
      if (!expiryDateStr) continue;

      const expires = new Date(expiryDateStr);
      expires.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 1. Auto-Purge Logic (Terminasi Data setelah 30 hari suspended)
      if (daysLeft <= -30) {
        // Flag for deletion (in a real system we would call the Go API to drop databases, etc.)
        logs.push(`[PURGE] Menghapus permanen tenant ${member.company} (${member.email}) karena expired > 30 hari`);
        // We will remove this member from the array at the end
        member._markedForDeletion = true;
        modified = true;
        continue;
      }

      // 2. Account Suspended Logic (Tenggat habis)
      if (daysLeft <= 0 && daysLeft > -30) {
        if (member.status !== "suspended") {
          member.status = "suspended";
          modified = true;
          
          await sendAccountExpiredEmail({
            to: member.email,
            name: member.picName || member.company,
            company: member.company,
            expiryDate: expiryDateStr,
          });
          
          logs.push(`[SUSPEND] Tenant ${member.company} (${member.email}) disuspensi`);
        }
      } 
      // 3. Subscription Expiring Warning (H-7, H-3, H-1)
      else if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
        await sendSubscriptionExpiringEmail({
          to: member.email,
          name: member.picName || member.company,
          company: member.company,
          expiryDate: expiryDateStr,
          daysLeft,
        });
        
        logs.push(`[WARNING] Reminder dikirim ke ${member.company} (${member.email}) - Sisa ${daysLeft} hari`);
      }
    }

    if (modified) {
      // Filter out members marked for deletion
      const remainingMembers = members.filter((m: any) => !m._markedForDeletion);
      db.members = remainingMembers;
      fs.writeFileSync(getMembersPath(), JSON.stringify(db, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, processed: members.length, purged: members.filter((m: any) => m._markedForDeletion).length, logs });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
