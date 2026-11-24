"use client";

import React from "react";
import {
  Sparkles,
  Plus,
  MessageSquare,
  ListChecks,
  Plane,
  ShoppingBag,
  Calendar,
  Mail,
  Wallet,
  Settings,
  ShieldAlert,
  LogOut,
  UserCircle2,
  X,
} from "lucide-react";
import type { UserProfile } from "@/types/database";

export type NavSection =
  | "dashboard"
  | "chat"
  | "tasks"
  | "travel"
  | "shopping"
  | "scheduler"
  | "email"
  | "finance"
  | "settings";

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onNewTask: () => void;
  pendingApprovalsCount: number;
  activeTasksCount: number;
  user: UserProfile | null;
  storageMode: string;
  onOpenAuth: () => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "chat", label: "Chat History", icon: MessageSquare },
  { id: "tasks", label: "My Tasks", icon: ListChecks },
  { id: "travel", label: "Travel Planner", icon: Plane },
  { id: "shopping", label: "Shopping Assistant", icon: ShoppingBag },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
  { id: "email", label: "Email Assistant", icon: Mail },
  { id: "finance", label: "Finance Organizer", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  onNewTask,
  pendingApprovalsCount,
  activeTasksCount,
  user,
  storageMode,
  onOpenAuth,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <aside className="flex h-full w-64 flex-col border-r border-white/[0.08] bg-[#0c0c10]/95 backdrop-blur-xl">
      {/* 1. Logo – LifeOS AI */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => {
            onSelectSection("dashboard");
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              LifeOS AI
            </div>
            <div className="text-[11px] text-zinc-500">Personal Digital Agent</div>
          </div>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. New Task */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            onNewTask();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white text-zinc-950 px-3 py-2 text-xs font-semibold shadow-sm hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          New Task
        </button>
      </div>

      {/* 3-10. Navigation Items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-white/[0.08] text-white shadow-inner border border-white/[0.08]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-zinc-500"}`} />
                {item.label}
              </span>
              {item.id === "tasks" && (pendingApprovalsCount > 0 || activeTasksCount > 0) && (
                <span className="flex items-center gap-1">
                  {pendingApprovalsCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                      <ShieldAlert className="h-2.5 w-2.5" />
                      {pendingApprovalsCount}
                    </span>
                  )}
                  {activeTasksCount > 0 && pendingApprovalsCount === 0 && (
                    <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                      {activeTasksCount}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer: Storage Mode & User */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Backend Mode</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              storageMode === "supabase"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-zinc-800 text-zinc-300 border border-white/10"
            }`}
          >
            {storageMode === "supabase" ? "Supabase Live" : "Local Sandbox"}
          </span>
        </div>

        {user ? (
          <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2">
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
            >
              <UserCircle2 className="h-5 w-5 shrink-0 text-indigo-400" />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-zinc-200">{user.name}</div>
                <div className="truncate text-[10px] text-zinc-500">{user.email}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.08] cursor-pointer"
          >
            Sign in / Connect Account
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block h-full shrink-0">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}

