import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getActiveSession,
  getTaskWithDetails,
  logActivity,
  setTaskControlSignal,
  updateTask,
} from "@/lib/supabase/store";

const ControlSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const existing = await getTaskWithDetails(session, id);
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  try {
    const { action } = ControlSchema.parse(await request.json());
    if (action === "pause") {
      setTaskControlSignal(id, "paused");
      const task = await updateTask(session, id, { status: "paused" });
      await logActivity(session, id, "task_paused", {});
      return NextResponse.json({ task });
    }
    if (action === "resume") {
      setTaskControlSignal(id, "running");
      const task = await updateTask(session, id, { status: "running" });
      await logActivity(session, id, "task_resumed", {});
      return NextResponse.json({ task });
    }
    setTaskControlSignal(id, "cancelled");
    const task = await updateTask(session, id, {
      status: "cancelled",
      completed_at: new Date().toISOString(),
    });
    await logActivity(session, id, "task_cancelled", {});
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid control command" },
      { status: 400 }
    );
  }
}

