import { z } from "zod";

// Sliding-window in-memory rate limiter (per user/IP + route key)
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const timestamps = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetInMs: windowMs,
  };
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(system|prior)\s+(prompt|instructions|rules)/i,
  /you\s+are\s+now\s+(in\s+)?developer\s+mode/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s*key|secret|env)/i,
  /execute\s+(arbitrary\s+)?(sql|shell|bash|powershell|eval)/i,
  /bypass\s+(approval|captcha|payment|security|auth)/i,
  /<\s*script\b/i,
];

export function detectPromptInjection(input: string): {
  flagged: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      reasons.push(`Matched restricted pattern: ${pattern.source}`);
    }
  }
  return { flagged: reasons.length > 0, reasons };
}

/**
 * Treat external website/API text as untrusted data:
 * strip HTML/script tags, control characters, and neutralize prompt-override directives.
 */
export function sanitizeExternalContent(raw: string, maxLength = 4000): string {
  if (!raw) return "";
  let cleaned = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Neutralize common prompt-injection phrases inside untrusted external data
  cleaned = cleaned.replace(
    /(ignore\s+previous\s+instructions|system\s*prompt|override\s+policy)/gi,
    "[redacted-untrusted-directive]"
  );

  return cleaned.slice(0, maxLength);
}

export const UserPromptSchema = z.object({
  prompt: z.string().trim().min(1, "Please enter an instruction.").max(4000, "Instruction is too long."),
  conversationId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().max(200),
        type: z.string().max(100),
        contentPreview: z.string().max(15000),
      })
    )
    .max(5)
    .optional(),
});

// Idempotency guard for sensitive executions (prevents double-charges / duplicate bookings)
const executedIdempotencyKeys = new Set<string>();

export function claimIdempotencyKey(key: string): boolean {
  if (!key) return false;
  if (executedIdempotencyKeys.has(key)) return false;
  executedIdempotencyKeys.add(key);
  return true;
}

export function releaseIdempotencyKey(key: string): void {
  executedIdempotencyKeys.delete(key);
}

