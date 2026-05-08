import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  attachAssistantToNumber,
  buyPhoneNumber,
  createAssistant,
  updateAssistant,
} from "@/lib/vapi";
import { defaultSystemPrompt } from "@/lib/utils";

const schema = z.object({
  areaCode: z.string().regex(/^\d{2,5}$/).optional(),
});

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();
  if (bErr || !business)
    return NextResponse.json({ error: "Business not found. Complete profile first." }, { status: 404 });

  if (business.phone_number && business.vapi_assistant_id) {
    return NextResponse.json({ business });
  }

  const systemPrompt =
    business.system_prompt ?? defaultSystemPrompt(business.name, business.services ?? []);

  const assistantArgs = {
    businessId: business.id,
    businessName: business.name,
    systemPrompt,
    appUrl: env.appUrl(),
    webhookSecret: env.vapiWebhookSecret(),
  };

  let assistantId = business.vapi_assistant_id as string | null;
  if (!assistantId) {
    const assistant = await createAssistant(assistantArgs);
    assistantId = assistant.id;
  } else {
    await updateAssistant(assistantId, assistantArgs);
  }

  let phoneNumberId = business.vapi_phone_number_id as string | null;
  let phoneNumber = business.phone_number as string | null;
  if (!phoneNumberId) {
    const num = await buyPhoneNumber({ assistantId, areaCode: parsed.data.areaCode });
    phoneNumberId = num.id;
    phoneNumber = num.number;
  } else {
    await attachAssistantToNumber(phoneNumberId, assistantId);
  }

  const { data: updated, error: uErr } = await supabase
    .from("businesses")
    .update({
      vapi_assistant_id: assistantId,
      vapi_phone_number_id: phoneNumberId,
      phone_number: phoneNumber,
      system_prompt: systemPrompt,
    })
    .eq("id", business.id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ business: updated });
}
