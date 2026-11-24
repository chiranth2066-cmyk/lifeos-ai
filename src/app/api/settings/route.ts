import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteMemory,
  getActiveSession,
  getUserPreferences,
  listActivityLogs,
  listIntegrations,
  listMemories,
  saveMemory,
  updateUserPreferences,
} from "@/lib/supabase/store";

export async function GET() {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [preferences, memories, integrations, activityLogs] = await Promise.all([
    getUserPreferences(session),
    listMemories(session),
    listIntegrations(session),
    listActivityLogs(session, 40),
  ]);

  return NextResponse.json({
    preferences,
    memories,
    integrations,
    activityLogs,
  });
}

const PatchSettingsSchema = z.object({
  location: z.string().min(2).max(120).optional(),
  currency: z.string().min(3).max(6).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  addMemory: z
    .object({
      memoryType: z.enum(["preference", "constraint", "context", "history"]),
      label: z.string().min(1).max(80),
      value: z.string().min(1).max(300),
    })
    .optional(),
  deleteMemoryId: z.string().optional(),
});

export async function PATCH(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = PatchSettingsSchema.parse(await request.json());

    if (body.location || body.currency || body.preferences) {
      await updateUserPreferences(session, {
        location: body.location,
        currency: body.currency,
        preferences: body.preferences,
      });
    }

    if (body.addMemory) {
      await saveMemory(session, body.addMemory.memoryType, {
        label: body.addMemory.label,
        value: body.addMemory.value,
      });
    }

    if (body.deleteMemoryId) {
      await deleteMemory(session, body.deleteMemoryId);
    }

    const [preferences, memories] = await Promise.all([
      getUserPreferences(session),
      listMemories(session),
    ]);

    return NextResponse.json({ preferences, memories });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid settings update" },
      { status: 400 }
    );
  }
}

