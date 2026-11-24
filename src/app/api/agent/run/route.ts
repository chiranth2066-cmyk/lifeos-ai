import { NextResponse } from "next/server";
import { runAgentOrchestrator } from "@/lib/agents/orchestrator";
import {
  checkRateLimit,
  detectPromptInjection,
  sanitizeExternalContent,
  UserPromptSchema,
} from "@/lib/security";
import { getActiveSession, logActivity } from "@/lib/supabase/store";
import type { AgentStreamEvent } from "@/types/agent";

export async function POST(request: Request) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const rate = checkRateLimit(`agent:${session.user.id}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rate.resetInMs / 1000)}s.` },
      { status: 429 }
    );
  }

  let body: ReturnType<typeof UserPromptSchema.parse>;
  try {
    const raw = await request.json();
    body = UserPromptSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request payload." },
      { status: 400 }
    );
  }

  const injectionCheck = detectPromptInjection(body.prompt);
  if (injectionCheck.flagged) {
    await logActivity(session, null, "security_prompt_injection_blocked", {
      reasons: injectionCheck.reasons,
    });
    return NextResponse.json(
      {
        error:
          "Request blocked by LifeOS security policy: cannot execute unrestricted code, bypass approvals, or disclose system secrets.",
      },
      { status: 400 }
    );
  }

  const attachmentNotes = body.attachments?.length
    ? body.attachments
        .map((a) => `${a.name} (${a.type}): ${sanitizeExternalContent(a.contentPreview, 1500)}`)
        .join("\n")
    : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: AgentStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed by client
        }
      };

      try {
        await runAgentOrchestrator({
          session,
          prompt: body.prompt,
          conversationId: body.conversationId,
          attachmentNotes,
          emit: sendEvent,
        });
      } catch (err) {
        sendEvent({
          type: "error",
          taskId: "unknown",
          message: err instanceof Error ? err.message : "Agent orchestration failed.",
          timestamp: new Date().toISOString(),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

