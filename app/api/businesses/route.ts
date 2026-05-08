import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { defaultBusinessHours, defaultSystemPrompt, randomToken } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  timezone: z.string().min(1).max(60),
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: z.string().min(1).max(60).optional(),
  business_hours: z.record(z.string(), z.array(z.object({ open: z.number(), close: z.number() }))).optional(),
  services: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        duration_min: z.number().int().min(5).max(480),
        price: z.number().nullable().optional(),
      }),
    )
    .optional(),
  system_prompt: z.string().max(8000).optional(),
});

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  // Upsert: one business per owner.
  const { data, error } = await supabase
    .from("businesses")
    .upsert(
      {
        owner_user_id: user.id,
        name: parsed.data.name,
        timezone: parsed.data.timezone,
        business_hours: defaultBusinessHours(),
        services: [],
        system_prompt: defaultSystemPrompt(parsed.data.name, []),
        telegram_link_token: randomToken(),
      },
      { onConflict: "owner_user_id" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

export async function PATCH(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { data, error } = await supabase
    .from("businesses")
    .update(parsed.data)
    .eq("owner_user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}
