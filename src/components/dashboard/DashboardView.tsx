"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Plane,
  ShoppingBag,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Activity,
} from "lucide-react";
import { CommandComposer, type AttachedFilePreview } from "@/components/shared/CommandComposer";
import type { ApprovalRecord, TaskRecord } from "@/types/database";

interface DashboardViewProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onDelegateTask: (promptText: string, attachments?: AttachedFilePreview[]) => void;
  isRunning: boolean;
  tasks: TaskRecord[];
  approvals: ApprovalRecord[];
  onSelectTask: (taskId: string) => void;
  onOpenApproval: (approval: ApprovalRecord) => void;
}

const SUGGESTED_TASKS = [
  {
    label: "Plan a trip.",
    prompt: "Plan a 3-day Goa trip for two people under ₹15,000.",
    icon: Plane,
    accent: "text-sky-400",
  },
  {
    label: "Find the best deals.",
    prompt: "Compare three laptops under ₹80,000 for programming and gaming.",
    icon: ShoppingBag,
    accent: "text-violet-400",
  },
  {
    label: "Organize my schedule.",
    prompt: "Organize my schedule for tomorrow and detect any conflicts.",
    icon: Calendar,
    accent: "text-emerald-400",
  },
  {
    label: "Analyze my expenses.",
    prompt: "Analyze my monthly expenses and suggest potential savings.",
    icon: Wallet,
    accent: "text-amber-400",
  },
];

export function DashboardView({
  prompt,
  onPromptChange,
  onDelegateTask,
  isRunning,
  tasks,
  approvals,
  onSelectTask,
  onOpenApproval,
}: DashboardViewProps) {
  const activeTasks = tasks.filter((t) =>
    ["running", "pending", "paused", "waiting_for_approval"].includes(t.status)
  );
  const completedTasks = tasks.filter((t) => t.status === "completed").slice(0, 4);
  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 space-y-10">
      {/* Hero Header & Main Command Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-center sm:text-left"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-300">
            <Sparkles className="h-3 w-3" />
            Autonomous Multi-Agent Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Your life, intelligently organized.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Delegate the busywork. Focus on what matters.
          </p>
        </div>

        <CommandComposer
          value={prompt}
          onChange={onPromptChange}
          onSubmit={(attachments) => onDelegateTask(prompt, attachments)}
          isRunning={isRunning}
          placeholder="What would you like me to take care of?"
        />

        {/* Suggested tasks */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">Try:</span>
          {SUGGESTED_TASKS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onDelegateTask(item.prompt)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:border-white/20 hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Pending Human Approvals Banner */}
      {pendingApprovals.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-200">
                {pendingApprovals.length} action{pendingApprovals.length > 1 ? "s" : ""} waiting for your approval
              </div>
              <p className="text-xs text-amber-200/75 mt-0.5">
                {pendingApprovals[0].action_details.title} — review cost, provider, and terms before execution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenApproval(pendingApprovals[0])}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300 shrink-0 cursor-pointer"
          >
            Review & Approve
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Clean 2x2 Operational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active tasks */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              Active Tasks
            </h2>
            <span className="text-xs text-zinc-500">{activeTasks.length}</span>
          </div>
          {activeTasks.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              No tasks running right now. Delegate a travel plan, shopping comparison, or schedule audit above.
            </p>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTask(t.id)}
                  className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <div className="truncate text-xs font-medium text-zinc-200">{t.task_name}</div>
                    <div className="text-[11px] text-zinc-500 capitalize">{t.module_type} workflow</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                    {t.status.replace(/_/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recently completed tasks */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Recently Completed Tasks
            </h2>
            <span className="text-xs text-zinc-500">{completedTasks.length}</span>
          </div>
          {completedTasks.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              Completed and verified workflows will appear here with full execution history.
            </p>
          ) : (
            <div className="space-y-2">
              {completedTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTask(t.id)}
                  className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <div className="truncate text-xs font-medium text-zinc-200">{t.task_name}</div>
                    <div className="text-[11px] text-zinc-500">
                      {t.completed_at ? new Date(t.completed_at).toLocaleTimeString() : "Verified"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    completed
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming activities */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            Upcoming Activities
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="text-zinc-200">Tomorrow 09:30 AM — Product Engineering Standup</span>
              <span className="text-zinc-500">Sandbox</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="text-zinc-200">Tomorrow 02:00 PM — Design Review (Conflict Flagged)</span>
              <span className="text-amber-300">Review</span>
            </div>
          </div>
        </section>

        {/* AI recommendations */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            AI Recommendations
          </h2>
          <div className="space-y-2 text-xs text-zinc-300">
            <button
              type="button"
              onClick={() => onDelegateTask("Find all unanswered important emails and prepare replies.")}
              className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              You have 3 unanswered priority emails — click to draft replies for approval.
            </button>
            <button
              type="button"
              onClick={() => onDelegateTask("Analyze my monthly expenses and highlight duplicate subscriptions.")}
              className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Audit recurring SaaS & streaming charges in Finance Organizer.
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

