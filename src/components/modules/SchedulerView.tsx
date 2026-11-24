"use client";

import React, { useEffect, useState } from "react";
import { Calendar, AlertTriangle, Clock, ShieldCheck, Loader2 } from "lucide-react";
import type { ApprovalRecord } from "@/types/database";
import type { SchedulerResult } from "@/types/modules";

interface SchedulerViewProps {
  initialResult?: SchedulerResult | null;
  onApprovalCreated: (approval: ApprovalRecord) => void;
}

export function SchedulerView({ initialResult, onApprovalCreated }: SchedulerViewProps) {
  const [localData, setLocalData] = useState<SchedulerResult | null>(null);
  const data = localData ?? initialResult ?? null;
  const [goalInput, setGoalInput] = useState("Deep Work: Architecture Sprint, Inbox Triage, Evening Run");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) return;
    let active = true;
    (async () => {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "scheduler",
          goals: ["Deep Work: Architecture Sprint", "Inbox Triage", "Evening Run"],
        }),
      });
      const json = await res.json();
      if (active && res.ok && json.data) setLocalData(json.data);
    })();
    return () => {
      active = false;
    };
  }, [data]);

  async function refreshSchedule(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const goals = goalInput
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "scheduler", goals }),
      });
      const json = await res.json();
      if (res.ok && json.data) setLocalData(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function approveProposedBlocks() {
    if (!data) return;
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "create_approval",
        actionType: "calendar_event_creation",
        title: `Add ${data.proposedSchedule.length} time blocks on ${data.date}`,
        summary: data.proposedSchedule.map((p) => p.title).join(" • "),
        provider: data.provider,
        isMockProvider: data.isMock,
        recipientOrBooking: `Calendar (${data.date})`,
        payload: {
          proposedEvents: data.proposedSchedule.map((e) => ({
            title: e.title,
            startIso: e.startIso,
            endIso: e.endIso,
            category: e.category,
            priority: e.priority,
          })),
        },
      }),
    });
    const json = await res.json();
    if (res.ok && json.approval) onApprovalCreated(json.approval);
  }

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            AI Personal Scheduler
          </h1>
          <p className="text-xs text-zinc-400">
            Detects calendar conflicts, finds deep-work slots, and commits approved blocks.
          </p>
        </div>
        {data && (
          <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-[10px] text-zinc-400">
            {data.provider}
          </span>
        )}
      </div>

      <form
        onSubmit={refreshSchedule}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-white/[0.08] bg-[#111116] p-4"
      >
        <input
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          placeholder="Comma-separated priorities to schedule..."
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 cursor-pointer"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Optimize Tomorrow
        </button>
      </form>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Existing Calendar & Conflicts */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Existing Events ({data.date})</h2>
            {data.conflicts.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    Conflict: {c.eventA} vs {c.eventB}
                  </div>
                  <div className="text-amber-200/80">{c.reason}</div>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              {data.existingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <div className="font-medium text-zinc-100">{ev.title}</div>
                    <div className="text-[11px] text-zinc-500">
                      {ev.startIso.slice(11, 16)} – {ev.endIso.slice(11, 16)} • {ev.location || ev.category}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    {ev.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Proposed Schedule */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">AI Proposed Time Blocks</h2>
              <button
                type="button"
                onClick={approveProposedBlocks}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve & Add to Calendar
              </button>
            </div>

            <div className="space-y-2">
              {data.proposedSchedule.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.06] px-3.5 py-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{ev.title}</span>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
                      {ev.priority} priority
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {ev.startIso.slice(11, 16)} – {ev.endIso.slice(11, 16)} ({ev.category})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

