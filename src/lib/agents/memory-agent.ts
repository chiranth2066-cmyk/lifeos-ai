import { listMemories, saveMemory, type SessionContext } from "@/lib/supabase/store";
import type { MemoryType } from "@/types/database";

export async function runMemoryRecallAgent(session: SessionContext): Promise<{
  memoriesSummary: string;
  count: number;
}> {
  const records = await listMemories(session);
  if (records.length === 0) {
    return { memoriesSummary: "No prior stored preferences.", count: 0 };
  }
  const summary = records
    .slice(0, 8)
    .map((m) => `[${m.memory_type}] ${JSON.stringify(m.memory_content)}`)
    .join("; ");
  return { memoriesSummary: summary, count: records.length };
}

export async function runMemoryPersistAgent(
  session: SessionContext,
  memoryType: MemoryType,
  label: string,
  value: string
): Promise<void> {
  const existing = await listMemories(session);
  const duplicate = existing.some(
    (m) =>
      m.memory_content?.label === label &&
      m.memory_content?.value === value
  );
  if (!duplicate) {
    await saveMemory(session, memoryType, { label, value });
  }
}

