import { NextResponse } from "next/server";
import { z } from "zod";
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

  const vapiKey = process.env.VAPI_PRIVATE_KEY;
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL ?? "https://example.com";
  const liveMode = Boolean(vapiKey && webhookSecret);

  let assistantId = business.vapi_assistant_id as string | null;
  let phoneNumberId = business.vapi_phone_number_id as string | null;
  let phoneNumber = business.phone_number as string | null;

  if (liveMode) {
    const assistantArgs = {
      businessId: business.id,
      businessName: business.name,
      systemPrompt,
      appUrl,
      webhookSecret: webhookSecret!,
    };
    if (!assistantId) {
      const assistant = await createAssistant(assistantArgs);
      assistantId = assistant.id;
    } else {
      await updateAssistant(assistantId, assistantArgs);
    }
    if (!phoneNumberId) {
      const num = await buyPhoneNumber({ assistantId, areaCode: parsed.data.areaCode });
      phoneNumberId = num.id;
      phoneNumber = num.number;
    } else {
      await attachAssistantToNumber(phoneNumberId, assistantId);
    }
  } else {
    // Demo mode: no Vapi credentials configured, allow onboarding to complete with
    // a placeholder number so the rest of the platform is navigable.
    if (!assistantId) assistantId = `demo_${business.id.slice(0, 8)}`;
    if (!phoneNumberId) phoneNumberId = `demo_pn_${business.id.slice(0, 8)}`;
    if (!phoneNumber) {
      const area = parsed.data.areaCode ?? "555";
      const last7 = Math.floor(2_000_000 + Math.random() * 7_999_999).toString();
      phoneNumber = `+1${area}${last7.slice(0, 3)}${last7.slice(3)}`;
    }
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

  // In demo mode, seed a few example calls + bookings so the dashboard isn't empty.
  if (!liveMode) await seedDemoData(supabase, updated.id);

  return NextResponse.json({ business: updated });
}

async function seedDemoData(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  businessId: string,
) {
  const { count } = await supabase
    .from("calls")
    .select("id", { head: true, count: "exact" })
    .eq("business_id", businessId);
  if ((count ?? 0) > 0) return;

  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const inDays = (d: number, hour: number) => {
    const dt = new Date(now);
    dt.setUTCDate(dt.getUTCDate() + d);
    dt.setUTCHours(hour, 0, 0, 0);
    return dt.toISOString();
  };

  const callsPayload = [
    {
      business_id: businessId,
      caller_phone: "+14155550181",
      started_at: minutesAgo(45),
      ended_at: minutesAgo(43),
      duration_sec: 124,
      status: "completed",
      summary:
        "Caller asked about haircut availability, booked Saturday 11am with Tunde. Confirmed price.",
      transcript: [
        { role: "assistant", message: "Hi, thanks for calling. How can I help?" },
        { role: "user", message: "Hey, do you have any haircut slots Saturday?" },
        { role: "assistant", message: "We do — Saturday 11am works. Can I get your name and number?" },
        { role: "user", message: "Tunde, 0803 555 0181." },
        { role: "assistant", message: "Booked. See you Saturday at 11am, Tunde." },
      ],
    },
    {
      business_id: businessId,
      caller_phone: "+14155550144",
      started_at: minutesAgo(180),
      ended_at: minutesAgo(178),
      duration_sec: 89,
      status: "completed",
      summary: "Caller asked about pricing and opening hours. No booking made.",
      transcript: [
        { role: "assistant", message: "Hi, thanks for calling." },
        { role: "user", message: "How much is a beard trim?" },
        { role: "assistant", message: "Beard trim is $15. Anything else?" },
        { role: "user", message: "Just checking, thanks." },
      ],
    },
  ];

  const { data: callRows } = await supabase
    .from("calls")
    .insert(callsPayload)
    .select("id, started_at");

  if (callRows?.length) {
    await supabase.from("bookings").insert([
      {
        business_id: businessId,
        call_id: callRows[0].id,
        customer_name: "Tunde Adebayo",
        customer_phone: "+14155550181",
        service: "Haircut",
        scheduled_at: inDays(2, 11),
        status: "confirmed",
        notes: "From demo call",
      },
      {
        business_id: businessId,
        customer_name: "Aisha Bello",
        customer_phone: "+14155550199",
        service: "Haircut",
        scheduled_at: inDays(4, 14),
        status: "confirmed",
        notes: "Walk-in follow-up",
      },
    ]);
  }
}
