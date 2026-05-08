import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-config";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// User-scoped Supabase client for server components / route handlers.
// All reads/writes go through RLS using the user's session cookie.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't set cookies — this is safe to ignore there.
        }
      },
    },
  });
}

// Service-role client. Bypasses RLS. Only use inside webhook / cron / provisioning routes.
export function getSupabaseServiceClient() {
  return createClient(getSupabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
