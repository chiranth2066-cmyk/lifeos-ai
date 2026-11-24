"use client";

import React, { useEffect, useState } from "react";
import { Settings, Brain, Plug, Shield, Trash2, Plus, Save, Loader2 } from "lucide-react";
import type {
  ActivityLogRecord,
  IntegrationRecord,
  MemoryRecord,
  MemoryType,
  UserPreferences,
} from "@/types/database";

export function SettingsView() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [location, setLocation] = useState("Bengaluru, India");
  const [currency, setCurrency] = useState("INR");
  const [memType, setMemType] = useState<MemoryType>("preference");
  const [memLabel, setMemLabel] = useState("");
  const [memValue, setMemValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/settings");
      if (!res.ok || !active) return;
      const json = await res.json();
      if (!active) return;
      setPreferences(json.preferences);
      setMemories(json.memories || []);
      setIntegrations(json.integrations || []);
      setActivityLogs(json.activityLogs || []);
      if (json.preferences) {
        setLocation(json.preferences.location || "Bengaluru, India");
        setCurrency(json.preferences.currency || "INR");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, currency }),
      });
      if (res.ok) {
        const json = await res.json();
        setPreferences(json.preferences);
        setSavedNotice("Preferences saved.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!memLabel.trim() || !memValue.trim()) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addMemory: { memoryType: memType, label: memLabel.trim(), value: memValue.trim() },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setMemories(json.memories || []);
      setMemLabel("");
      setMemValue("");
    }
  }

  async function removeMemory(id: string) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteMemoryId: id }),
    });
    if (res.ok) {
      const json = await res.json();
      setMemories(json.memories || []);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-400" />
          Settings, Memory & Security
        </h1>
        <p className="text-xs text-zinc-400">
          Configure defaults, inspect live vs mock integrations, manage Memory Agent entries, and audit logs.
        </p>
      </div>

      {/* Preferences */}
      <form
        onSubmit={savePreferences}
        className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Default User Preferences</h2>
          {savedNotice && <span className="text-xs text-emerald-400">{savedNotice}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1 text-xs">
            <span className="text-zinc-400">Default Location / Origin</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-zinc-400">Preferred Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Preferences
            </button>
          </div>
        </div>
        {preferences && (
          <div className="text-[11px] text-zinc-500">
            Approval Enforcement: Always require explicit confirmation for bookings, purchases, calendar edits, and emails.
          </div>
        )}
      </form>

      {/* Integrations Status */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plug className="h-4 w-4 text-indigo-400" />
          Connected Integrations & Providers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {integrations.map((intg) => (
            <div
              key={intg.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs"
            >
              <span className="text-zinc-200">{intg.provider}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  intg.connection_status === "connected"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-300 border border-white/10"
                }`}
              >
                {intg.connection_status === "connected" ? "Live Connected" : "Mock Sandbox"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Agent Manager */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          Task Memory Agent ({memories.length})
        </h2>

        <form onSubmit={addMemory} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <select
            value={memType}
            onChange={(e) => setMemType(e.target.value as MemoryType)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
          >
            <option value="preference">Preference</option>
            <option value="constraint">Constraint</option>
            <option value="context">Context</option>
            <option value="history">History</option>
          </select>
          <input
            value={memLabel}
            onChange={(e) => setMemLabel(e.target.value)}
            placeholder="Label (e.g. Seat preference)"
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
          />
          <input
            value={memValue}
            onChange={(e) => setMemValue(e.target.value)}
            placeholder="Value (e.g. Window seat, AC sleeper)"
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Memory
          </button>
        </form>

        <div className="space-y-2">
          {memories.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs"
            >
              <div>
                <span className="uppercase text-[10px] font-semibold text-indigo-400 mr-2">
                  {m.memory_type}
                </span>
                <span className="font-medium text-zinc-200">
                  {String(m.memory_content?.label || "Memory")}:
                </span>{" "}
                <span className="text-zinc-400">{String(m.memory_content?.value || "")}</span>
              </div>
              <button
                type="button"
                onClick={() => removeMemory(m.id)}
                className="text-zinc-500 hover:text-red-300 cursor-pointer"
                title="Delete memory"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Activity Logs */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          Security & Execution Audit Logs
        </h2>
        <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-[11px]">
          {activityLogs.length === 0 ? (
            <div className="text-zinc-500">No audit events recorded yet.</div>
          ) : (
            activityLogs.map((log) => (
              <div key={log.id} className="flex justify-between gap-4 border-b border-white/[0.04] pb-1.5 text-zinc-400">
                <span className="truncate">
                  <span className="text-emerald-400">{log.event_type}</span>{" "}
                  {JSON.stringify(log.event_details)}
                </span>
                <span className="shrink-0 text-zinc-600">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

