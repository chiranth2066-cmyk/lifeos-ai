"use client";

import React from "react";
import {
  CheckCircle2,
  CircleDot,
  Clock,
  Pause,
  Play,
  XCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type {
  ActivityLogRecord,
  ApprovalRecord,
  TaskRecord,
  TaskStepRecord,
} from "@/types/database";
import type { ComparisonResult } from "@/types/agent";
import type { ResearchBundle } from "@/lib/agents/research-agent";

interface TaskExecutionViewProps {
  tasks: TaskRecord[];
  selectedTask: TaskRecord | null;
  steps: TaskStepRecord[];
  approvals: ApprovalRecord[];
  logs: ActivityLogRecord[];
  liveActivityText: string | null;
  onSelectTask: (taskId: string) => void;
  onControlTask: (taskId: string, action: "pause" | "resume" | "cancel") => void;
  onOpenApproval: (approval: ApprovalRecord) => void;
  onOpenModule: (module: TaskRecord["module_type"]) => void;
}

const STEP_BADGE: Record<string, { color: string; label: string }> = {
  pending: { color: "text-zinc-400 bg-zinc-800/80 border-white/10", label: "Pending" },
  running: { color: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30", label: "Running" },
  completed: { color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", label: "Completed" },
  waiting_for_approval: {
    color: "text-amber-300 bg-amber-500/15 border-amber-500/30",
    label: "Waiting for approval",
  },
  failed: { color: "text-red-300 bg-red-500/15 border-red-500/30", label: "Failed" },
  cancelled: { color: "text-zinc-400 bg-zinc-800 border-white/10", label: "Cancelled" },
};

export function TaskExecutionView({
  tasks,
  selectedTask,
  steps,
  approvals,
  logs,
  liveActivityText,
  onSelectTask,
  onControlTask,
  onOpenApproval,
  onOpenModule,
}: TaskExecutionViewProps) {
  const resultSummary = (selectedTask?.result_summary || {}) as {
    research?: ResearchBundle;
    comparison?: ComparisonResult;
  };
  const pendingApproval = approvals.find((a) => a.status === "pending");

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Task Selector Rail */}
      <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0d0d12] p-3 space-y-1.5 max-h-44 lg:max-h-full overflow-y-auto shrink-0">
        <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          My Tasks ({tasks.length})
        </div>
        {tasks.length === 0 ? (
          <p className="text-xs text-zinc-500 px-2 py-4">
            No tasks created yet. Start from the Dashboard or Chat.
          </p>
        ) : (
          tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTask(t.id)}
              className={`w-full rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${
                selectedTask?.id === t.id
                  ? "bg-white/[0.08] border border-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent"
              }`}
            >
              <div className="truncate text-xs font-medium">{t.task_name}</div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="capitalize text-zinc-500">{t.module_type}</span>
                <span className="text-zinc-400">{t.status.replace(/_/g, " ")}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Main Split Execution Workspace */}
      {!selectedTask ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="max-w-sm space-y-2">
            <Activity className="mx-auto h-8 w-8 text-zinc-600" />
            <h3 className="text-sm font-medium text-zinc-300">Select a task to inspect execution</h3>
            <p className="text-xs text-zinc-500">
              View live agent steps, research outputs, comparison rankings, and approval gates.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT SECTION: Instruction, Execution Plan, Subtasks, Controls */}
          <div className="xl:col-span-5 space-y-5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    {selectedTask.module_type} Workflow
                  </span>
                  <h2 className="text-base font-semibold text-white mt-0.5">{selectedTask.task_name}</h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                    STEP_BADGE[selectedTask.status]?.color || STEP_BADGE.pending.color
                  }`}
                >
                  {selectedTask.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-zinc-400 bg-black/30 rounded-xl p-3 border border-white/[0.05]">
                {selectedTask.task_description}
              </p>

              {/* Task Controls: Pause, Resume, Cancel */}
              {["running", "paused", "waiting_for_approval", "pending"].includes(selectedTask.status) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTask.status === "paused" ? (
                    <button
                      type="button"
                      onClick={() => onControlTask(selectedTask.id, "resume")}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onControlTask(selectedTask.id, "pause")}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] cursor-pointer"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onControlTask(selectedTask.id, "cancel")}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel Task
                  </button>
                </div>
              )}
            </div>

            {/* Subtasks Stepper */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Execution Plan ({steps.length} steps)
              </h3>
              <div className="space-y-2.5">
                {steps.map((step) => {
                  const badge = STEP_BADGE[step.status] || STEP_BADGE.pending;
                  return (
                    <div
                      key={step.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {step.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : step.status === "running" ? (
                            <Loader2 className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
                          ) : step.status === "waiting_for_approval" ? (
                            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                          ) : step.status === "failed" ? (
                            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-zinc-100">
                            {step.execution_order}. {step.step_name}
                          </span>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 pl-6">{step.step_description}</p>
                      <div className="text-[10px] text-zinc-500 pl-6">Agent: {step.agent_name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: Live Activity, Research Results, Comparison Table, Approval CTA */}
          <div className="xl:col-span-7 space-y-5">
            {/* Live Backend Activity Indicator */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CircleDot
                  className={`h-4 w-4 shrink-0 ${
                    selectedTask.status === "running" ? "text-indigo-400 animate-pulse" : "text-zinc-400"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                    Backend Execution Stream
                  </div>
                  <div className="truncate text-xs text-zinc-200">
                    {liveActivityText ||
                      (logs.length > 0
                        ? `${logs[logs.length - 1].event_type}: ${JSON.stringify(logs[logs.length - 1].event_details).slice(0, 120)}`
                        : `Task status: ${selectedTask.status}`)}
                  </div>
                </div>
              </div>
              {selectedTask.module_type !== "general" && (
                <button
                  type="button"
                  onClick={() => onOpenModule(selectedTask.module_type)}
                  className="shrink-0 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.1] cursor-pointer"
                >
                  Open {selectedTask.module_type} view
                </button>
              )}
            </div>

            {/* Pending Approval Callout */}
            {pendingApproval && (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Approval Gate Reached
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {pendingApproval.action_details.title}
                  </div>
                  {typeof pendingApproval.action_details.totalCost === "number" && (
                    <div className="text-xs text-amber-100/80 font-mono">
                      Estimated cost: {pendingApproval.action_details.currency || "INR"}{" "}
                      {pendingApproval.action_details.totalCost.toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenApproval(pendingApproval)}
                  className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 shrink-0 cursor-pointer"
                >
                  Review & Approve
                </button>
              </div>
            )}

            {/* Comparison Results Table */}
            {resultSummary.comparison && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Comparison Agent: {resultSummary.comparison.category}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{resultSummary.comparison.rationale}</p>
                </div>

                <div className="space-y-2.5">
                  {resultSummary.comparison.rankedOptions.map((opt, idx) => {
                    const isBest = opt.id === resultSummary.comparison?.recommendedOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`rounded-xl border p-3.5 space-y-2 ${
                          isBest
                            ? "border-indigo-500/40 bg-indigo-500/[0.06]"
                            : "border-white/[0.06] bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                #{idx + 1} {opt.title}
                              </span>
                              {isBest && (
                                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                                  Recommended
                                </span>
                              )}
                              {opt.isMock && (
                                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                                  Mock Data
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{opt.subtitle}</div>
                          </div>
                          <div className="text-right shrink-0">
                            {opt.price > 0 && (
                              <div className="text-xs font-bold font-mono text-emerald-300">
                                {opt.currency} {opt.price.toLocaleString()}
                              </div>
                            )}
                            <div className="text-[11px] text-zinc-400">
                              Score {opt.score}/100 • ★ {opt.rating}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-300">
                          {opt.pros.slice(0, 2).map((p, i) => (
                            <span key={i} className="rounded-md bg-white/[0.04] px-2 py-0.5">
                              + {p}
                            </span>
                          ))}
                        </div>
                        {opt.bookingUrl && (
                          <a
                            href={opt.bookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 underline"
                          >
                            Inspect provider link <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audit Activity Log */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-4 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Real Backend Execution Log
              </h3>
              {logs.length === 0 ? (
                <p className="text-xs text-zinc-500">No execution events logged yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between gap-3 text-zinc-400">
                      <span className="truncate">
                        <span className="text-indigo-400">[{log.event_type}]</span>{" "}
                        {JSON.stringify(log.event_details)}
                      </span>
                      <span className="shrink-0 text-zinc-600">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

