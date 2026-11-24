import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerCapabilities } from "@/lib/env";

export async function createSupabaseServerClient() {
  const caps = getServerCapabilities();
  if (!caps.supabaseConfigured) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in Server Components where response cookies cannot be mutated
          }
        },
      },
    }
  );
}

