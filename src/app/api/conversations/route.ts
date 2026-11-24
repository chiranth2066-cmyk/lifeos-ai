import { NextResponse } from "next/server";
import {
  createConversation,
  getActiveSession,
  listConversations,
  listMessages,
} from "@/lib/supabase/store";

export async function GET(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  const conversations = await listConversations(session);
  if (conversationId) {
    const messages = await listMessages(session, conversationId);
    return NextResponse.json({ conversations, messages });
  }
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const conversation = await createConversation(session, body.title || "New Task Conversation");
  return NextResponse.json({ conversation });
}

