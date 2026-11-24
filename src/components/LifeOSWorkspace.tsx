"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Sparkles, ShieldAlert } from "lucide-react";
import { Sidebar, type NavSection } from "@/components/layout/Sidebar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { TaskExecutionView } from "@/components/tasks/TaskExecutionView";
import { TravelPlannerView } from "@/components/modules/TravelPlannerView";
import { ShoppingAssistantView } from "@/components/modules/ShoppingAssistantView";
import { SchedulerView } from "@/components/modules/SchedulerView";
import { EmailAssistantView } from "@/components/modules/EmailAssistantView";
import { FinanceOrganizerView } from "@/components/modules/FinanceOrganizerView";
import { SettingsView } from "@/components/settings/SettingsView";
import { ApprovalModal } from "@/components/approvals/ApprovalModal";
import { AuthModal } from "@/components/auth/AuthModal";
import type { AttachedFilePreview } from "@/components/shared/CommandComposer";
import type { AgentStreamEvent } from "@/types/agent";
import type {
  ActivityLogRecord,
  ApprovalRecord,
  Conversation,
  Message,
  TaskRecord,
  TaskStepRecord,
  UserProfile,
} from "@/types/database";
import type {
  EmailAssistantResult,
  FinanceAnalysisResult,
  SchedulerResult,
  ShoppingResult,
  TravelPlanResult,
} from "@/types/modules";

export function LifeOSWorkspace() {
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [storageMode, setStorageMode] = useState("local-sandbox");
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [liveActivityText, setLiveActivityText] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<{
    task: TaskRecord;
    steps: TaskStepRecord[];
    approvals: ApprovalRecord[];
    logs: ActivityLogRecord[];
  } | null>(null);

  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [modalApproval, setModalApproval] = useState<ApprovalRecord | null>(null);

  // Module results hydrated from orchestrator tasks
  const [travelResult, setTravelResult] = useState<TravelPlanResult | null>(null);
  const [shoppingResult, setShoppingResult] = useState<ShoppingResult | null>(null);
  const [schedulerResult, setSchedulerResult] = useState<SchedulerResult | null>(null);
  const [emailResult, setEmailResult] = useState<EmailAssistantResult | null>(null);
  const [financeResult, setFinanceResult] = useState<FinanceAnalysisResult | null>(null);

  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    const [healthRes, tasksRes, convRes, appRes] = await Promise.all([
      fetch("/api/health"),
      fetch("/api/tasks"),
      fetch("/api/conversations"),
      fetch("/api/approvals"),
    ]);

    if (healthRes.ok) {
      const h = await healthRes.json();
      setUser(h.user);
      setStorageMode(h.storageMode);
      setSupabaseConfigured(Boolean(h.capabilities?.supabaseConfigured));
      setGeminiConfigured(Boolean(h.capabilities?.geminiConfigured));
    }
    if (tasksRes.ok) {
      const t = await tasksRes.json();
      setTasks(t.tasks || []);
    }
    if (convRes.ok) {
      const c = await convRes.json();
      setConversations(c.conversations || []);
    }
    if (appRes.ok) {
      const a = await appRes.json();
      setApprovals(a.approvals || []);
    }
  }, []);

  const loadTaskDetail = useCallback(async (taskId: string) => {
    setSelectedTaskId(taskId);
    const res = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`);
    if (res.ok) {
      const detail = await res.json();
      setSelectedTaskDetail(detail);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const res = await fetch(`/api/conversations?conversationId=${encodeURIComponent(conversationId)}`);
    if (res.ok) {
      const json = await res.json();
      setMessages(json.messages || []);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await refreshWorkspace();
    })();
    return () => {
      active = false;
    };
  }, [refreshWorkspace]);

  async function handleDelegateTask(
    promptText: string,
    attachments: AttachedFilePreview[] = []
  ) {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    setErrorBanner(null);
    setPrompt("");
    setIsRunning(true);
    setLiveActivityText("Intent Agent analyzing instructions & constraints...");
    setActiveSection("tasks");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: trimmed,
          conversationId: activeConversationId || undefined,
          attachments,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: "Failed to run agent." }));
        setErrorBanner(errJson.error || "Agent request failed.");
        setIsRunning(false);
        setLiveActivityText(null);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let latestTaskId: string | null = null;
      let latestConvId: string | null = null;

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const payloadStr = line.slice(5).trim();
          if (!payloadStr) continue;

          try {
            const event = JSON.parse(payloadStr) as AgentStreamEvent;
            setLiveActivityText(event.message);

            if (event.type === "task_created") {
              latestTaskId = event.taskId;
              const convId = event.data?.conversationId as string | undefined;
              if (convId) latestConvId = convId;
              await loadTaskDetail(event.taskId);
            } else if (
              event.type === "step_started" ||
              event.type === "step_completed" ||
              event.type === "step_failed"
            ) {
              if (latestTaskId) await loadTaskDetail(latestTaskId);
            } else if (event.type === "partial_result" && event.data?.research) {
              const research = event.data.research as {
                travel?: TravelPlanResult;
                shopping?: ShoppingResult;
                scheduler?: SchedulerResult;
                email?: EmailAssistantResult;
                finance?: FinanceAnalysisResult;
              };
              if (research.travel) setTravelResult(research.travel);
              if (research.shopping) setShoppingResult(research.shopping);
              if (research.scheduler) setSchedulerResult(research.scheduler);
              if (research.email) setEmailResult(research.email);
              if (research.finance) setFinanceResult(research.finance);
            } else if (event.type === "approval_required" && event.data?.approval) {
              const approval = event.data.approval as ApprovalRecord;
              setModalApproval(approval);
              if (latestTaskId) await loadTaskDetail(latestTaskId);
            }
          } catch {
            // Ignore malformed chunk
          }
        }
      }

      await refreshWorkspace();
      if (latestTaskId) await loadTaskDetail(latestTaskId);
      if (latestConvId) await loadConversation(latestConvId);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorBanner("Execution interrupted or network failed.");
      }
    } finally {
      setIsRunning(false);
      setLiveActivityText(null);
      abortControllerRef.current = null;
    }
  }

  async function handleControlTask(taskId: string, action: "pause" | "resume" | "cancel") {
    if (action === "cancel" && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    await fetch(`/api/tasks/${taskId}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refreshWorkspace();
    await loadTaskDetail(taskId);
  }

  async function handleSignOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await refreshWorkspace();
    setAuthModalOpen(true);
  }

  const pendingApprovalsCount = approvals.filter((a) => a.status === "pending").length;
  const activeTasksCount = tasks.filter((t) =>
    ["running", "pending", "paused", "waiting_for_approval"].includes(t.status)
  ).length;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#09090b] text-zinc-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          if (sec === "chat" && conversations[0] && !activeConversationId) {
            void loadConversation(conversations[0].id);
          }
          if (sec === "tasks" && tasks[0] && !selectedTaskId) {
            void loadTaskDetail(tasks[0].id);
          }
        }}
        onNewTask={() => {
          setActiveConversationId(null);
          setMessages([]);
          setActiveSection("dashboard");
        }}
        pendingApprovalsCount={pendingApprovalsCount}
        activeTasksCount={activeTasksCount}
        user={user}
        storageMode={storageMode}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Utility Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0e]/80 backdrop-blur-md px-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-md p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-zinc-400 capitalize">
              {activeSection === "dashboard" ? "Command Center" : activeSection.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${
                geminiConfigured
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                  : "bg-zinc-900 border-white/10 text-zinc-400"
              }`}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {geminiConfigured ? "Gemini Live" : "Heuristic + Mock Sandbox"}
            </span>

            {pendingApprovalsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  const first = approvals.find((a) => a.status === "pending");
                  if (first) setModalApproval(first);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/35 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30 cursor-pointer"
              >
                <ShieldAlert className="h-3 w-3" />
                {pendingApprovalsCount} Pending Approval
              </button>
            )}
          </div>
        </header>

        {errorBanner && (
          <div className="flex items-center justify-between bg-red-500/15 border-b border-red-500/30 px-4 py-2 text-xs text-red-200">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="underline hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {activeSection === "dashboard" && (
            <DashboardView
              prompt={prompt}
              onPromptChange={setPrompt}
              onDelegateTask={handleDelegateTask}
              isRunning={isRunning}
              tasks={tasks}
              approvals={approvals}
              onSelectTask={(tid) => {
                void loadTaskDetail(tid);
                setActiveSection("tasks");
              }}
              onOpenApproval={(ap) => setModalApproval(ap)}
            />
          )}

          {activeSection === "chat" && (
            <ChatInterface
              conversations={conversations}
              activeConversationId={activeConversationId}
              messages={messages}
              liveStreamMessage={liveActivityText}
              isRunning={isRunning}
              onSelectConversation={(cid) => void loadConversation(cid)}
              onNewConversation={() => {
                setActiveConversationId(null);
                setMessages([]);
              }}
              onSendMessage={handleDelegateTask}
              onCancelRunningTask={() => {
                if (selectedTaskId) void handleControlTask(selectedTaskId, "cancel");
              }}
              onOpenTask={(tid) => {
                void loadTaskDetail(tid);
                setActiveSection("tasks");
              }}
            />
          )}

          {activeSection === "tasks" && (
            <TaskExecutionView
              tasks={tasks}
              selectedTask={selectedTaskDetail?.task || null}
              steps={selectedTaskDetail?.steps || []}
              approvals={selectedTaskDetail?.approvals || []}
              logs={selectedTaskDetail?.logs || []}
              liveActivityText={liveActivityText}
              onSelectTask={(tid) => void loadTaskDetail(tid)}
              onControlTask={(tid, act) => void handleControlTask(tid, act)}
              onOpenApproval={(ap) => setModalApproval(ap)}
              onOpenModule={(mod) => {
                if (mod !== "general") setActiveSection(mod);
              }}
            />
          )}

          {activeSection === "travel" && (
            <TravelPlannerView
              initialPlan={travelResult}
              onApprovalCreated={(ap) => {
                setModalApproval(ap);
                void refreshWorkspace();
              }}
            />
          )}

          {activeSection === "shopping" && (
            <ShoppingAssistantView
              initialResult={shoppingResult}
              onApprovalCreated={(ap) => {
                setModalApproval(ap);
                void refreshWorkspace();
              }}
            />
          )}

          {activeSection === "scheduler" && (
            <SchedulerView
              initialResult={schedulerResult}
              onApprovalCreated={(ap) => {
                setModalApproval(ap);
                void refreshWorkspace();
              }}
            />
          )}

          {activeSection === "email" && (
            <EmailAssistantView
              initialResult={emailResult}
              onApprovalCreated={(ap) => {
                setModalApproval(ap);
                void refreshWorkspace();
              }}
            />
          )}

          {activeSection === "finance" && <FinanceOrganizerView initialResult={financeResult} />}

          {activeSection === "settings" && <SettingsView />}
        </main>
      </div>

      {/* Human Approval Modal */}
      <ApprovalModal
        approval={modalApproval}
        onClose={() => setModalApproval(null)}
        onDecisionComplete={(updated) => {
          setModalApproval(updated);
          void refreshWorkspace();
          if (selectedTaskId) void loadTaskDetail(selectedTaskId);
        }}
        onModifyRequest={(ap, note) => {
          setModalApproval(null);
          if (note.trim()) {
            void handleDelegateTask(`Modify "${ap.action_details.title}": ${note}`);
          }
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        open={authModalOpen}
        supabaseConfigured={supabaseConfigured}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(u, mode) => {
          setUser(u);
          setStorageMode(mode);
          void refreshWorkspace();
        }}
      />
    </div>
  );
}

