"use client";

import React, { useRef, useState } from "react";
import { Mic, MicOff, Paperclip, ArrowUp, Square, X, FileText } from "lucide-react";

export interface AttachedFilePreview {
  name: string;
  type: string;
  contentPreview: string;
}

interface CommandComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (attachments: AttachedFilePreview[]) => void;
  onCancel?: () => void;
  isRunning?: boolean;
  placeholder?: string;
  compact?: boolean;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function CommandComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  isRunning = false,
  placeholder = "What would you like me to take care of?",
  compact = false,
}: CommandComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachedFilePreview[]>([]);

  function toggleVoiceInput() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceNote("Voice input is unavailable in this browser; please type your instruction.");
      return;
    }

    setVoiceNote(null);
    const rec = new SpeechRec();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript) {
        onChange(value ? `${value} ${transcript}` : transcript);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    const loaded: AttachedFilePreview[] = [];
    for (const file of files) {
      const text = await file.text().catch(() => "");
      loaded.push({
        name: file.name,
        type: file.type || "text/plain",
        contentPreview: text.slice(0, 4000),
      });
    }
    setAttachments((prev) => [...prev, ...loaded].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isRunning) return;
    if (!value.trim() && attachments.length === 0) return;
    onSubmit(attachments);
    setAttachments([]);
  }

  return (
    <form onSubmit={handleFormSubmit} className="w-full">
      <div
        className={`relative rounded-2xl border border-white/10 bg-[#121218]/90 backdrop-blur-xl shadow-2xl shadow-black/50 transition-colors focus-within:border-indigo-500/50 ${
          compact ? "p-2.5" : "p-4"
        }`}
      >
        {attachments.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <span
                key={`${att.name}-${idx}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                {att.name}
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleFormSubmit(e);
            }
          }}
          rows={compact ? 2 : 3}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none leading-relaxed"
        />

        <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.json,.md"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach text, CSV, or JSON document"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Attach</span>
            </button>

            <button
              type="button"
              onClick={toggleVoiceInput}
              title={listening ? "Stop voice input" : "Start voice input"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                listening
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
              <span className="hidden sm:inline">{listening ? "Listening..." : "Voice"}</span>
            </button>

            {voiceNote && <span className="text-[11px] text-amber-300 ml-2">{voiceNote}</span>}
          </div>

          <div className="flex items-center gap-2">
            {isRunning && onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/20 border border-red-500/40 px-3.5 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/30 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop Task
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim() && attachments.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <span>Delegate</span>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

