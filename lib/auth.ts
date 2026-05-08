import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export async function getCurrentUserOrRedirect() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Returns the user's business row, or null if onboarding hasn't happened yet.
export async function getCurrentBusiness(): Promise<{ business: Business | null }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { business: null };

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return { business: (data as Business) ?? null };
}

export async function requireBusiness(): Promise<Business> {
  const { business } = await getCurrentBusiness();
  if (!business) redirect("/onboarding");
  return business;
}
