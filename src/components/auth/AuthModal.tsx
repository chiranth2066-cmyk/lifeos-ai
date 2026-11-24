"use client";

import React, { useState } from "react";
import { X, Lock, Sparkles, Loader2 } from "lucide-react";
import type { UserProfile } from "@/types/database";

interface AuthModalProps {
  open: boolean;
  supabaseConfigured: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile, storageMode: string) => void;
}

export function AuthModal({
  open,
  supabaseConfigured,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password, name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Authentication failed");
      } else if (json.user) {
        onAuthenticated(json.user, json.storageMode);
        onClose();
      } else {
        setError(json.message || "Check your email to complete registration.");
      }
    } catch {
      setError("Network error while authenticating.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSandboxSignIn() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sandbox" }),
      });
      const json = await res.json();
      if (res.ok && json.user) {
        onAuthenticated(json.user, json.storageMode);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111116] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              {supabaseConfigured ? "Supabase Account" : "Local Sandbox Account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          {supabaseConfigured
            ? "Sign in with your Supabase credentials for row-level isolated tasks, memories, and approvals."
            : "Supabase keys are not configured in .env.local yet. You can create a local sandbox profile or continue with the default sandbox session."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
          />

          {error && <div className="text-xs text-red-300">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          {!supabaseConfigured && (
            <button
              type="button"
              onClick={handleSandboxSignIn}
              className="inline-flex items-center gap-1 text-zinc-300 hover:text-white cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Use Demo User
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

