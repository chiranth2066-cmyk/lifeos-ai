import { NextResponse } from "next/server";
import { getServerCapabilities } from "@/lib/env";
import { getActiveSession } from "@/lib/supabase/store";

export async function GET() {
  const capabilities = getServerCapabilities();
  const session = await getActiveSession();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    capabilities,
    authenticated: Boolean(session),
    storageMode: session?.storageMode || (capabilities.supabaseConfigured ? "supabase" : "local-sandbox"),
    user: session?.user || null,
  });
}

