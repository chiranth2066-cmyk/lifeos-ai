import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "./server";
import { getServerCapabilities } from "@/lib/env";
import type {
  ActivityLogRecord,
  ApprovalActionDetails,
  ApprovalRecord,
  ApprovalStatus,
  Conversation,
  IntegrationRecord,
  MemoryRecord,
  MemoryType,
  Message,
  ModuleType,
  StepStatus,
  TaskRecord,
  TaskStatus,
  TaskStepRecord,
  UserPreferences,
  UserProfile,
} from "@/types/database";

export interface SessionContext {
  user: UserProfile;
  storageMode: "supabase" | "local-sandbox";
}

interface SandboxDatabase {
  users: Map<string, UserProfile>;
  preferences: Map<string, UserPreferences>;
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>;
  tasks: Map<string, TaskRecord>;
  taskSteps: Map<string, TaskStepRecord[]>;
  approvals: Map<string, ApprovalRecord>;
  integrations: Map<string, IntegrationRecord[]>;
  activityLogs: ActivityLogRecord[];
  memories: Map<string, MemoryRecord[]>;
  taskControlSignals: Map<string, "running" | "paused" | "cancelled">;
}

const globalForSandbox = globalThis as unknown as {
  __lifeosSandboxDb?: SandboxDatabase;
};

function getSandboxDb(): SandboxDatabase {
  if (!globalForSandbox.__lifeosSandboxDb) {
    globalForSandbox.__lifeosSandboxDb = {
      users: new Map(),
      preferences: new Map(),
      conversations: new Map(),
      messages: new Map(),
      tasks: new Map(),
      taskSteps: new Map(),
      approvals: new Map(),
      integrations: new Map(),
      activityLogs: [],
      memories: new Map(),
      taskControlSignals: new Map(),
    };
  }
  return globalForSandbox.__lifeosSandboxDb;
}

const SANDBOX_COOKIE = "lifeos_sandbox_user";
const DEFAULT_SANDBOX_USER_ID = "00000000-0000-4000-8000-000000000001";

function ensureSandboxSeeded(userId: string, email = "alex@lifeos.local", name = "Alex Rivera"): UserProfile {
  const db = getSandboxDb();
  let user = db.users.get(userId);
  if (!user) {
    user = {
      id: userId,
      email,
      name,
      created_at: new Date().toISOString(),
    };
    db.users.set(userId, user);
  }
  if (!db.preferences.has(userId)) {
    db.preferences.set(userId, {
      id: randomUUID(),
      user_id: userId,
      preferences: {
        travelStyle: "Value & Comfort",
        preferredTransport: "Flight or AC Sleeper",
        dietaryPreference: "Local & Vegetarian-friendly",
        approvalAlwaysRequired: true,
      },
      location: "Bengaluru, India",
      currency: "INR",
      created_at: new Date().toISOString(),
    });
  }
  if (!db.memories.has(userId)) {
    db.memories.set(userId, [
      {
        id: randomUUID(),
        user_id: userId,
        memory_type: "preference",
        memory_content: {
          label: "Preferred Home City",
          value: "Bengaluru, India (INR)",
        },
        created_at: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        user_id: userId,
        memory_type: "constraint",
        memory_content: {
          label: "Financial Safety Rule",
          value: "Always require explicit approval before bookings, purchases, or sending emails.",
        },
        created_at: new Date().toISOString(),
      },
    ]);
  }
  if (!db.integrations.has(userId)) {
    const caps = getServerCapabilities();
    db.integrations.set(userId, [
      { id: randomUUID(), user_id: userId, provider: "Google Gemini AI", connection_status: caps.geminiConfigured ? "connected" : "mock", created_at: new Date().toISOString() },
      { id: randomUUID(), user_id: userId, provider: "Web Search (" + caps.webSearchProvider + ")", connection_status: caps.webSearchProvider === "mock" ? "mock" : "connected", created_at: new Date().toISOString() },
      { id: randomUUID(), user_id: userId, provider: "Weather (" + caps.weatherProvider + ")", connection_status: "connected", created_at: new Date().toISOString() },
      { id: randomUUID(), user_id: userId, provider: "Maps (" + caps.mapsProvider + ")", connection_status: "connected", created_at: new Date().toISOString() },
      { id: randomUUID(), user_id: userId, provider: "Travel Booking Provider", connection_status: "mock", created_at: new Date().toISOString() },
      { id: randomUUID(), user_id: userId, provider: "Google Calendar", connection_status: "mock", created_at: new Date().toISOString() },
      { id: randomUUID(), user_id: userId, provider: "Gmail / Email", connection_status: "mock", created_at: new Date().toISOString() },
    ]);
  }
  return user;
}

export async function getActiveSession(): Promise<SessionContext | null> {
  const caps = getServerCapabilities();

  if (caps.supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          user: {
            id: user.id,
            email: user.email || "",
            name: (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User",
            created_at: user.created_at,
          },
          storageMode: "supabase",
        };
      }
      if (!caps.localSandboxAllowed) {
        return null;
      }
    }
  }

  if (!caps.localSandboxAllowed) {
    return null;
  }

  let sandboxUid = DEFAULT_SANDBOX_USER_ID;
  let sandboxEmail = "alex@lifeos.local";
  let sandboxName = "Alex Rivera";
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SANDBOX_COOKIE)?.value;
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; email?: string; name?: string };
      if (parsed.id) sandboxUid = parsed.id;
      if (parsed.email) sandboxEmail = parsed.email;
      if (parsed.name) sandboxName = parsed.name;
    }
  } catch {
    // Ignore cookie read issues outside request context
  }

  const user = ensureSandboxSeeded(sandboxUid, sandboxEmail, sandboxName);
  return { user, storageMode: "local-sandbox" };
}

export async function getUserPreferences(session: SessionContext): Promise<UserPreferences> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) return data as UserPreferences;
    }
  }
  const db = getSandboxDb();
  ensureSandboxSeeded(session.user.id, session.user.email, session.user.name);
  return db.preferences.get(session.user.id)!;
}

export async function updateUserPreferences(
  session: SessionContext,
  patch: Partial<Pick<UserPreferences, "location" | "currency" | "preferences">>
): Promise<UserPreferences> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const existing = await getUserPreferences(session);
      const updated = {
        location: patch.location ?? existing.location,
        currency: patch.currency ?? existing.currency,
        preferences: { ...existing.preferences, ...(patch.preferences ?? {}) },
      };
      const { data } = await supabase
        .from("user_preferences")
        .upsert({ user_id: session.user.id, ...updated }, { onConflict: "user_id" })
        .select()
        .single();
      if (data) return data as UserPreferences;
    }
  }
  const db = getSandboxDb();
  const existing = await getUserPreferences(session);
  const next: UserPreferences = {
    ...existing,
    location: patch.location ?? existing.location,
    currency: patch.currency ?? existing.currency,
    preferences: { ...existing.preferences, ...(patch.preferences ?? {}) },
  };
  db.preferences.set(session.user.id, next);
  return next;
}

export async function listConversations(session: SessionContext): Promise<Conversation[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      return (data as Conversation[]) || [];
    }
  }
  const db = getSandboxDb();
  return Array.from(db.conversations.values())
    .filter((c) => c.user_id === session.user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createConversation(session: SessionContext, title: string): Promise<Conversation> {
  const conv: Conversation = {
    id: randomUUID(),
    user_id: session.user.id,
    title: title.slice(0, 80) || "New Task Conversation",
    created_at: new Date().toISOString(),
  };
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from("conversations").insert(conv).select().single();
      if (data) return data as Conversation;
    }
  }
  const db = getSandboxDb();
  db.conversations.set(conv.id, conv);
  db.messages.set(conv.id, []);
  return conv;
}

export async function listMessages(session: SessionContext, conversationId: string): Promise<Message[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      return (data as Message[]) || [];
    }
  }
  const db = getSandboxDb();
  const conv = db.conversations.get(conversationId);
  if (!conv || conv.user_id !== session.user.id) return [];
  return db.messages.get(conversationId) || [];
}

export async function addMessage(
  session: SessionContext,
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<Message> {
  const msg: Message = {
    id: randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    metadata,
    created_at: new Date().toISOString(),
  };
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from("messages").insert(msg).select().single();
      if (data) return data as Message;
    }
  }
  const db = getSandboxDb();
  const list = db.messages.get(conversationId) || [];
  list.push(msg);
  db.messages.set(conversationId, list);
  return msg;
}

export async function createTask(
  session: SessionContext,
  input: {
    conversationId: string | null;
    taskName: string;
    taskDescription: string;
    moduleType: ModuleType;
    executionPlan?: Record<string, unknown>;
  }
): Promise<TaskRecord> {
  const task: TaskRecord = {
    id: randomUUID(),
    user_id: session.user.id,
    conversation_id: input.conversationId,
    task_name: input.taskName,
    task_description: input.taskDescription,
    module_type: input.moduleType,
    status: "pending",
    execution_plan: input.executionPlan || {},
    result_summary: {},
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from("tasks").insert(task).select().single();
      if (data) return data as TaskRecord;
    }
  }
  const db = getSandboxDb();
  db.tasks.set(task.id, task);
  db.taskSteps.set(task.id, []);
  db.taskControlSignals.set(task.id, "running");
  return task;
}

export async function updateTask(
  session: SessionContext,
  taskId: string,
  patch: Partial<Pick<TaskRecord, "status" | "execution_plan" | "result_summary" | "completed_at" | "module_type" | "task_name">>
): Promise<TaskRecord | null> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", taskId)
        .eq("user_id", session.user.id)
        .select()
        .single();
      if (data) return data as TaskRecord;
    }
  }
  const db = getSandboxDb();
  const existing = db.tasks.get(taskId);
  if (!existing || existing.user_id !== session.user.id) return null;
  const updated = { ...existing, ...patch };
  db.tasks.set(taskId, updated);
  return updated;
}

export async function listTasks(session: SessionContext): Promise<TaskRecord[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      return (data as TaskRecord[]) || [];
    }
  }
  const db = getSandboxDb();
  return Array.from(db.tasks.values())
    .filter((t) => t.user_id === session.user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getTaskWithDetails(
  session: SessionContext,
  taskId: string
): Promise<{
  task: TaskRecord;
  steps: TaskStepRecord[];
  approvals: ApprovalRecord[];
  logs: ActivityLogRecord[];
} | null> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: task } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!task) return null;
      const [{ data: steps }, { data: approvals }, { data: logs }] = await Promise.all([
        supabase.from("task_steps").select("*").eq("task_id", taskId).order("execution_order", { ascending: true }),
        supabase.from("approvals").select("*").eq("task_id", taskId).order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("*").eq("task_id", taskId).order("created_at", { ascending: true }),
      ]);
      return {
        task: task as TaskRecord,
        steps: (steps as TaskStepRecord[]) || [],
        approvals: (approvals as ApprovalRecord[]) || [],
        logs: (logs as ActivityLogRecord[]) || [],
      };
    }
  }
  const db = getSandboxDb();
  const task = db.tasks.get(taskId);
  if (!task || task.user_id !== session.user.id) return null;
  const steps = [...(db.taskSteps.get(taskId) || [])].sort(
    (a, b) => a.execution_order - b.execution_order
  );
  const approvals = Array.from(db.approvals.values()).filter((a) => a.task_id === taskId);
  const logs = db.activityLogs.filter((l) => l.task_id === taskId);
  return { task, steps, approvals, logs };
}

export async function replaceTaskSteps(
  session: SessionContext,
  taskId: string,
  steps: Array<Omit<TaskStepRecord, "id" | "task_id">>
): Promise<TaskStepRecord[]> {
  const records: TaskStepRecord[] = steps.map((s) => ({
    id: randomUUID(),
    task_id: taskId,
    ...s,
  }));
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.from("task_steps").delete().eq("task_id", taskId);
      const { data } = await supabase.from("task_steps").insert(records).select();
      if (data) return data as TaskStepRecord[];
    }
  }
  const db = getSandboxDb();
  db.taskSteps.set(taskId, records);
  return records;
}

export async function updateTaskStepStatus(
  session: SessionContext,
  taskId: string,
  executionOrder: number,
  status: StepStatus,
  result: Record<string, unknown> = {}
): Promise<void> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase
        .from("task_steps")
        .update({ status, result })
        .eq("task_id", taskId)
        .eq("execution_order", executionOrder);
      return;
    }
  }
  const db = getSandboxDb();
  const list = db.taskSteps.get(taskId) || [];
  const idx = list.findIndex((s) => s.execution_order === executionOrder);
  if (idx >= 0) {
    list[idx] = { ...list[idx], status, result };
    db.taskSteps.set(taskId, list);
  }
}

export function setTaskControlSignal(taskId: string, signal: "running" | "paused" | "cancelled") {
  getSandboxDb().taskControlSignals.set(taskId, signal);
}

export function getTaskControlSignal(taskId: string): "running" | "paused" | "cancelled" {
  return getSandboxDb().taskControlSignals.get(taskId) ?? "running";
}

export async function createApproval(
  session: SessionContext,
  input: {
    taskId: string;
    actionType: string;
    actionDetails: ApprovalActionDetails;
    ttlMinutes?: number;
  }
): Promise<ApprovalRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (input.ttlMinutes ?? 30) * 60_000);
  const record: ApprovalRecord = {
    id: randomUUID(),
    task_id: input.taskId,
    user_id: session.user.id,
    action_type: input.actionType,
    action_details: input.actionDetails,
    idempotency_key: `${input.taskId}:${input.actionType}:${randomUUID()}`,
    status: "pending",
    approved_at: null,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };

  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from("approvals").insert(record).select().single();
      if (data) return data as ApprovalRecord;
    }
  }
  const db = getSandboxDb();
  db.approvals.set(record.id, record);
  return record;
}

export async function listApprovals(session: SessionContext): Promise<ApprovalRecord[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("approvals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      return (data as ApprovalRecord[]) || [];
    }
  }
  const db = getSandboxDb();
  return Array.from(db.approvals.values())
    .filter((a) => a.user_id === session.user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getApprovalById(
  session: SessionContext,
  approvalId: string
): Promise<ApprovalRecord | null> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("approvals")
        .select("*")
        .eq("id", approvalId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      return (data as ApprovalRecord) || null;
    }
  }
  const record = getSandboxDb().approvals.get(approvalId);
  if (!record || record.user_id !== session.user.id) return null;
  return record;
}

export async function updateApproval(
  session: SessionContext,
  approvalId: string,
  patch: Partial<Pick<ApprovalRecord, "status" | "approved_at" | "action_details">>
): Promise<ApprovalRecord | null> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("approvals")
        .update(patch)
        .eq("id", approvalId)
        .eq("user_id", session.user.id)
        .select()
        .single();
      if (data) return data as ApprovalRecord;
    }
  }
  const db = getSandboxDb();
  const existing = db.approvals.get(approvalId);
  if (!existing || existing.user_id !== session.user.id) return null;
  const updated = { ...existing, ...patch };
  db.approvals.set(approvalId, updated);
  return updated;
}

export async function logActivity(
  session: SessionContext,
  taskId: string | null,
  eventType: string,
  eventDetails: Record<string, unknown>
): Promise<void> {
  const entry: ActivityLogRecord = {
    id: randomUUID(),
    user_id: session.user.id,
    task_id: taskId,
    event_type: eventType,
    event_details: eventDetails,
    created_at: new Date().toISOString(),
  };
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.from("activity_logs").insert(entry);
      return;
    }
  }
  getSandboxDb().activityLogs.push(entry);
}

export async function listActivityLogs(session: SessionContext, limit = 50): Promise<ActivityLogRecord[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data as ActivityLogRecord[]) || [];
    }
  }
  return getSandboxDb()
    .activityLogs.filter((l) => l.user_id === session.user.id)
    .slice(-limit)
    .reverse();
}

export async function listMemories(session: SessionContext): Promise<MemoryRecord[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      return (data as MemoryRecord[]) || [];
    }
  }
  const db = getSandboxDb();
  ensureSandboxSeeded(session.user.id, session.user.email, session.user.name);
  return [...(db.memories.get(session.user.id) || [])].reverse();
}

export async function saveMemory(
  session: SessionContext,
  memoryType: MemoryType,
  memoryContent: Record<string, unknown>
): Promise<MemoryRecord> {
  const record: MemoryRecord = {
    id: randomUUID(),
    user_id: session.user.id,
    memory_type: memoryType,
    memory_content: memoryContent,
    created_at: new Date().toISOString(),
  };
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from("memories").insert(record).select().single();
      if (data) return data as MemoryRecord;
    }
  }
  const db = getSandboxDb();
  const list = db.memories.get(session.user.id) || [];
  list.push(record);
  db.memories.set(session.user.id, list);
  return record;
}

export async function deleteMemory(session: SessionContext, memoryId: string): Promise<void> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.from("memories").delete().eq("id", memoryId).eq("user_id", session.user.id);
      return;
    }
  }
  const db = getSandboxDb();
  const list = db.memories.get(session.user.id) || [];
  db.memories.set(
    session.user.id,
    list.filter((m) => m.id !== memoryId)
  );
}

export async function listIntegrations(session: SessionContext): Promise<IntegrationRecord[]> {
  if (session.storageMode === "supabase") {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", session.user.id);
      if (data && data.length > 0) return data as IntegrationRecord[];
    }
  }
  const db = getSandboxDb();
  ensureSandboxSeeded(session.user.id, session.user.email, session.user.name);
  return db.integrations.get(session.user.id) || [];
}

export async function upsertSandboxAuthCookie(
  user: { id: string; email: string; name: string } | null
): Promise<void> {
  const cookieStore = await cookies();
  if (!user) {
    cookieStore.delete(SANDBOX_COOKIE);
    return;
  }
  cookieStore.set(SANDBOX_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export type { TaskStatus, ApprovalStatus };

