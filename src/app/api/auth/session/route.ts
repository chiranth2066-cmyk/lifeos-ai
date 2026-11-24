import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getServerCapabilities } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveSession, upsertSandboxAuthCookie } from "@/lib/supabase/store";

const AuthBodySchema = z.object({
  mode: z.enum(["signin", "signup", "sandbox"]),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().max(80).optional(),
});

export async function GET() {
  const session = await getActiveSession();
  const capabilities = getServerCapabilities();
  return NextResponse.json({
    authenticated: Boolean(session),
    user: session?.user || null,
    storageMode: session?.storageMode || "none",
    supabaseConfigured: capabilities.supabaseConfigured,
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = AuthBodySchema.parse(json);
    const caps = getServerCapabilities();

    if (caps.supabaseConfigured && body.mode !== "sandbox") {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
      }
      if (!body.email || !body.password) {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
      }
      if (body.mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: body.email,
          password: body.password,
          options: { data: { name: body.name || body.email.split("@")[0] } },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({
          authenticated: Boolean(data.user),
          user: data.user,
          storageMode: "supabase",
          message: data.session ? "Account created and signed in." : "Check your email to confirm sign-up.",
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 401 });
      return NextResponse.json({
        authenticated: Boolean(data.user),
        user: data.user,
        storageMode: "supabase",
      });
    }

    if (!caps.localSandboxAllowed) {
      return NextResponse.json(
        { error: "Supabase authentication is required and local sandbox mode is disabled." },
        { status: 403 }
      );
    }

    const email = body.email || "alex@lifeos.local";
    const name = body.name || email.split("@")[0] || "Alex Rivera";
    const sandboxUser = {
      id: body.mode === "sandbox" ? "00000000-0000-4000-8000-000000000001" : randomUUID(),
      email,
      name,
    };
    await upsertSandboxAuthCookie(sandboxUser);

    return NextResponse.json({
      authenticated: true,
      user: { ...sandboxUser, created_at: new Date().toISOString() },
      storageMode: "local-sandbox",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid authentication payload" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const caps = getServerCapabilities();
  if (caps.supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  }
  await upsertSandboxAuthCookie(null);
  return NextResponse.json({ authenticated: false });
}

