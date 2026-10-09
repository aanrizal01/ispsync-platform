import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireMember } from "@/lib/member-auth";

const MEMBERS_PATH = path.join(process.cwd(), "data", "members.json");

function getMembers() {
  try {
    return JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf-8"));
  } catch {
    return { members: [] };
  }
}

function saveMembers(data: any) {
  try {
    fs.writeFileSync(MEMBERS_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireMember(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { engine, config } = await req.json();
    const memberId = auth.member.id;

    if (!memberId || !engine) {
      return NextResponse.json({ error: "Missing memberId or engine" }, { status: 400 });
    }

    const db = getMembers();
    const idx = db.members.findIndex((m: any) => m.id === memberId);
    if (idx === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const member = db.members[idx];
    if (engine === "primary" || engine === "domain") {
      if (config.customDomain !== undefined) {
        member.customDomain = config.customDomain.trim();
      }
      if (config.domain) {
        member.domain = config.domain.trim();
      }
      member.updatedAt = new Date().toISOString();
    } else {
      if (!member.engines) {
        member.engines = {};
      }

      member.engines[engine] = {
        ...(member.engines[engine] || {}),
        ...(config || {}),
        updatedAt: new Date().toISOString(),
      };
    }

    db.members[idx] = member;
    const saved = saveMembers(db);
    if (!saved) {
      return NextResponse.json({ error: "Gagal menyimpan perubahan ke disk server" }, { status: 500 });
    }

    const { password: _, ...safeMember } = member;
    return NextResponse.json({ success: true, member: safeMember });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update engine config" }, { status: 500 });
  }
}
