"use client";

import React, { useEffect, useState } from "react";
import { Mail, Send, Sparkles, Loader2 } from "lucide-react";
import type { ApprovalRecord } from "@/types/database";
import type { EmailAssistantResult, EmailThreadItem } from "@/types/modules";

interface EmailAssistantViewProps {
  initialResult?: EmailAssistantResult | null;
  onApprovalCreated: (approval: ApprovalRecord) => void;
}

export function EmailAssistantView({
  initialResult,
  onApprovalCreated,
}: EmailAssistantViewProps) {
  const [localData, setLocalData] = useState<EmailAssistantResult | null>(null);
  const data = localData ?? initialResult ?? null;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) return;
    let active = true;
    (async () => {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "email", filterQuery: "unanswered important" }),
      });
      const json = await res.json();
      if (active && res.ok && json.data) {
        const resData = json.data as EmailAssistantResult;
        setLocalData(resData);
        const map: Record<string, string> = {};
        resData.threads.forEach((t) => (map[t.id] = t.suggestedReply));
        setDrafts(map);
      }
    })();
    return () => {
      active = false;
    };
  }, [data]);

  async function scanInbox() {
    setLoading(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "email", filterQuery: "unanswered important" }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const resData = json.data as EmailAssistantResult;
        setLocalData(resData);
        const map: Record<string, string> = {};
        resData.threads.forEach((t) => (map[t.id] = t.suggestedReply));
        setDrafts(map);
      }
    } finally {
      setLoading(false);
    }
  }

  async function requestSendApproval(thread: EmailThreadItem) {
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "create_approval",
        actionType: "send_email_replies",
        title: `Send reply to ${thread.from}`,
        summary: `Subject: Re: ${thread.subject}\n\nDraft preview: ${(drafts[thread.id] || thread.suggestedReply).slice(0, 180)}`,
        provider: data?.provider || "Local Email Inbox Sandbox (Mock)",
        isMockProvider: true,
        recipientOrBooking: `${thread.from} <${thread.fromEmail}>`,
        payload: {
          threadIds: [thread.id],
          body: drafts[thread.id] || thread.suggestedReply,
        },
      }),
    });
    const json = await res.json();
    if (res.ok && json.approval) onApprovalCreated(json.approval);
  }

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-400" />
            AI Email Assistant
          </h1>
          <p className="text-xs text-zinc-400">
            Summarizes unanswered important threads and prepares replies — never sends without approval.
          </p>
        </div>
        <button
          type="button"
          onClick={scanInbox}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-400" />}
          Refresh Priority Inbox
        </button>
      </div>

      {data && (
        <div className="space-y-4">
          {data.threads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{thread.subject}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        thread.urgency === "high"
                          ? "bg-red-500/15 text-red-300 border border-red-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {thread.urgency} urgency
                    </span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                      Sandbox Mock
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    From {thread.from} &lt;{thread.fromEmail}&gt;
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 capitalize">
                  {thread.unanswered ? "Unanswered" : "Replied"}
                </span>
              </div>

              <div className="rounded-xl bg-black/30 border border-white/[0.05] p-3 text-xs text-zinc-300">
                <span className="text-indigo-400 font-medium">Thread Summary: </span>
                {thread.summary}
              </div>

              {thread.unanswered && (
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-400">Editable Draft Reply</label>
                  <textarea
                    rows={4}
                    value={drafts[thread.id] ?? thread.suggestedReply}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-500">
                      {thread.followUpAction ? `Suggested follow-up: ${thread.followUpAction}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => requestSendApproval(thread)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Review & Approve Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

