import { NextResponse } from "next/server";
import { getActiveSession, listApprovals } from "@/lib/supabase/store";

export async function GET() {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const approvals = await listApprovals(session);
  return NextResponse.json({ approvals });
}

