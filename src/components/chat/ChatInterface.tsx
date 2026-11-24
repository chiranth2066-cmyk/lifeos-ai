"use client";

import React, { useState } from "react";
import {
  Bot,
  User,
  Volume2,
  VolumeX,
  PlusCircle,
  Loader2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { CommandComposer, type AttachedFilePreview } from "@/components/shared/CommandComposer";
import type { Conversation, Message } from "@/types/database";

interface ChatInterfaceProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  liveStreamMessage: string | null;
  isRunning: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onSendMessage: (promptText: string, attachments?: AttachedFilePreview[]) => void;
  onCancelRunningTask: () => void;
  onOpenTask: (taskId: string) => void;
}

const CHAT_SUGGESTIONS = [
  "Plan a 3-day Goa trip for two people under ₹15,000.",
  "Find me a laptop under ₹80,000 for programming and gaming.",
  "Find all unanswered important emails and prepare replies.",
  "Organize my day tomorrow.",
];

export function ChatInterface({
  conversations,
  activeConversationId,
  messages,
  liveStreamMessage,
  isRunning,
  onSelectConversation,
  onNewConversation,
  onSendMessage,
  onCancelRunningTask,
  onOpenTask,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ""));
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Conversation History List */}
      <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0d0d12] p-3 flex flex-col gap-2 max-h-48 lg:max-h-full overflow-y-auto shrink-0">
        <div className="flex items-center justify-between px-1 py-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Conversations
          </span>
          <button
            type="button"
            onClick={onNewConversation}
            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-xs text-zinc-500 px-2 py-3">
            No conversations yet. Send a task below to start.
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelectConversation(conv.id)}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                conv.id === activeConversationId
                  ? "bg-white/[0.08] text-white border border-white/10"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))
        )}
      </div>

      {/* Main Conversational Stream */}
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">AI Agent Console</h2>
            <p className="text-[11px] text-zinc-500">
              Multi-step reasoning, tool execution & approval-gated workflows
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (voiceOutputEnabled && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
              }
              setVoiceOutputEnabled(!voiceOutputEnabled);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer ${
              voiceOutputEnabled
                ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {voiceOutputEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Voice Replies {voiceOutputEnabled ? "On" : "Off"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !liveStreamMessage && (
            <div className="mx-auto max-w-2xl py-10 space-y-4 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-white">Tell LifeOS AI what you want handled</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSendMessage(s)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const taskId = typeof msg.metadata?.taskId === "string" ? msg.metadata.taskId : null;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "border border-white/[0.08] bg-[#121218] text-zinc-200"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                      {taskId && (
                        <button
                          type="button"
                          onClick={() => onOpenTask(taskId)}
                          className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:bg-white/[0.12] cursor-pointer"
                        >
                          Inspect Task Execution <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {voiceOutputEnabled && (
                        <button
                          type="button"
                          onClick={() => speakText(msg.content)}
                          className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          <Volume2 className="h-3 w-3" /> Read aloud
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {liveStreamMessage && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
              <div className="max-w-xl rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-200">
                {liveStreamMessage}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-4 bg-[#0b0b0f]">
          <CommandComposer
            compact
            value={input}
            onChange={setInput}
            isRunning={isRunning}
            onCancel={onCancelRunningTask}
            onSubmit={(attachments) => {
              const text = input.trim();
              setInput("");
              onSendMessage(text, attachments);
            }}
          />
        </div>
      </div>
    </div>
  );
}

