import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
    const { memberId, engine, config } = await req.json();
    if (!memberId || !engine) {
      return NextResponse.json({ error: "Missing memberId or engine" }, { status: 400 });
    }

    const db = getMembers();
    const idx = db.members.findIndex((m: any) => m.id === memberId);
    if (idx === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const member = db.members[idx];
    if (!member.engines) {
      member.engines = {};
    }

    member.engines[engine] = {
      ...(member.engines[engine] || {}),
      ...(config || {}),
      updatedAt: new Date().toISOString(),
    };

    db.members[idx] = member;
    saveMembers(db);

    const { password: _, ...safeMember } = member;
    return NextResponse.json({ success: true, member: safeMember });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update engine config" }, { status: 500 });
  }
}
