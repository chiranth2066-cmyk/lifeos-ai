"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import type { ApprovalRecord } from "@/types/database";

interface ApprovalModalProps {
  approval: ApprovalRecord | null;
  onClose: () => void;
  onDecisionComplete: (updated: ApprovalRecord) => void;
  onModifyRequest?: (approval: ApprovalRecord, note: string) => void;
}

export function ApprovalModal({
  approval,
  onClose,
  onDecisionComplete,
  onModifyRequest,
}: ApprovalModalProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | "modify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyNote, setModifyNote] = useState("");

  if (!approval) return null;

  const details = approval.action_details;
  const currency = details.currency || "INR";
  const isFinalized = approval.status === "executed" || approval.status === "rejected" || approval.status === "expired";

  async function handleDecision(decision: "approve" | "reject" | "modify") {
    if (!approval) return;
    setError(null);
    setLoading(decision);
    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          modificationNote: decision === "modify" ? modifyNote : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to process approval decision.");
      } else {
        onDecisionComplete(data.approval);
        if (decision === "modify" && onModifyRequest) {
          onModifyRequest(data.approval, modifyNote);
        }
      }
    } catch {
      setError("Network error while communicating with Approval Engine.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111116] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Human Approval Required
                  </span>
                  {details.isMockProvider && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-white/10">
                      Mock Sandbox Provider
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-white mt-0.5">{details.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <p className="text-sm text-zinc-300 leading-relaxed">{details.summary}</p>

            {/* Cost & Provider Summary */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Selected Provider</span>
                <span className="font-medium text-zinc-200">{details.provider}</span>
              </div>
              {details.recipientOrBooking && (
                <div className="flex items-start justify-between gap-4 text-xs">
                  <span className="text-zinc-400 shrink-0">Action Target</span>
                  <span className="font-medium text-zinc-200 text-right">{details.recipientOrBooking}</span>
                </div>
              )}

              {details.costBreakdown && details.costBreakdown.length > 0 && (
                <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
                  {details.costBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="font-mono text-zinc-200">
                        {currency} {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {typeof details.totalCost === "number" && (
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                  <span className="text-sm font-semibold text-white">Estimated Total Cost</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {currency} {details.totalCost.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Terms & Consequences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 space-y-1.5">
                <div className="font-semibold text-zinc-200">Terms & Disclosure</div>
                <ul className="space-y-1 text-zinc-400 list-disc pl-4">
                  {details.termsAndConditions.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 space-y-1.5">
                <div className="font-semibold text-zinc-200">Action Consequences</div>
                <ul className="space-y-1 text-zinc-400 list-disc pl-4">
                  {details.consequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Expiration notice */}
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Expires: {new Date(approval.expires_at).toLocaleTimeString()}
              </span>
              <span>Status: {approval.status.toUpperCase()}</span>
            </div>

            {/* Verification Receipt if already executed */}
            {details.verificationResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified Execution Receipt ({details.verificationResult.isSimulated ? "Sandbox" : "Live"})
                </div>
                <p className="text-xs text-emerald-100/90">{details.verificationResult.providerResponse}</p>
                {details.verificationResult.referenceId && (
                  <div className="font-mono text-xs text-emerald-300">
                    Reference ID: {details.verificationResult.referenceId}
                  </div>
                )}
                {typeof details.payload?.bookingUrl === "string" && (
                  <a
                    href={details.payload.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 underline"
                  >
                    Open Provider Checkout <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {typeof details.payload?.merchantUrl === "string" && (
                  <a
                    href={details.payload.merchantUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 underline"
                  >
                    Open Merchant Page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Modify Note Box */}
            {showModifyInput && !isFinalized && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">
                  What would you like to change in this plan?
                </label>
                <textarea
                  value={modifyNote}
                  onChange={(e) => setModifyNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Switch to flight instead of bus, or raise hotel budget to ₹2,500/night"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-white/[0.08] px-6 py-4 bg-black/30">
            {!isFinalized ? (
              <>
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleDecision("reject")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Reject
                </button>

                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => {
                    if (!showModifyInput) {
                      setShowModifyInput(true);
                    } else {
                      handleDecision("modify");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.1] disabled:opacity-50 cursor-pointer"
                >
                  {loading === "modify" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit3 className="h-3.5 w-3.5" />}
                  {showModifyInput ? "Submit Modification" : "Modify plan"}
                </button>

                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleDecision("approve")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve action
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

