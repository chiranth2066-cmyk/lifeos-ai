import { NextResponse } from "next/server";
import { getActiveSession, getTaskWithDetails, listTasks } from "@/lib/supabase/store";

export async function GET(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (taskId) {
    const detail = await getTaskWithDetails(session, taskId);
    if (!detail) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(detail);
  }

  const tasks = await listTasks(session);
  return NextResponse.json({ tasks });
}

