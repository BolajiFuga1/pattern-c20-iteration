import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyVapiBearer, verifyVapiSignature } from "@/lib/webhook-verify";
import { formatCallSummary, sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";

// Vapi posts call lifecycle events here. We only act on `end-of-call-report`,
// which carries the final transcript, summary, and recording.
export async function POST(req: Request) {
  const raw = await req.text();
  const sigHeader =
    req.headers.get("x-vapi-signature") ?? req.headers.get("x-vapi-signature-256");
  const secretHeader = req.headers.get("x-vapi-secret");

  const secret = env.vapiWebhookSecret();
  const ok =
    verifyVapiSignature({ rawBody: raw, headerSignature: sigHeader, secret }) ||
    verifyVapiBearer(secretHeader, secret);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const message = body?.message ?? body;
  const type: string = message?.type ?? "";
  const call = message?.call ?? body?.call;
  const vapiCallId: string | undefined = call?.id;
  const assistantId: string | undefined = call?.assistantId ?? message?.assistant?.id;
  const businessId: string | undefined =
    call?.metadata?.business_id ?? message?.assistant?.metadata?.business_id;

  if (!vapiCallId) return NextResponse.json({ ok: true });

  const supabase = getSupabaseServiceClient();

  // Resolve the business: prefer metadata, fall back to looking up by assistant id.
  let resolvedBusinessId = businessId ?? null;
  if (!resolvedBusinessId && assistantId) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", assistantId)
      .maybeSingle();
    resolvedBusinessId = data?.id ?? null;
  }
  if (!resolvedBusinessId) return NextResponse.json({ ok: true });

  if (type === "status-update" || type === "call.started") {
    await supabase.from("calls").upsert(
      {
        business_id: resolvedBusinessId,
        vapi_call_id: vapiCallId,
        caller_phone: call?.customer?.number ?? null,
        started_at: call?.startedAt ?? new Date().toISOString(),
        status: message?.status ?? call?.status ?? "in_progress",
      },
      { onConflict: "vapi_call_id" },
    );
    return NextResponse.json({ ok: true });
  }

  if (type === "end-of-call-report" || type === "call.ended" || type === "report") {
    const startedAt = call?.startedAt ?? message?.startedAt ?? null;
    const endedAt = call?.endedAt ?? message?.endedAt ?? new Date().toISOString();
    const durationSec =
      message?.durationSeconds ??
      (startedAt && endedAt
        ? Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
        : null);

    const transcript = normalizeTranscript(message);

    const { data: callRow } = await supabase
      .from("calls")
      .upsert(
        {
          business_id: resolvedBusinessId,
          vapi_call_id: vapiCallId,
          caller_phone: call?.customer?.number ?? null,
          started_at: startedAt,
          ended_at: endedAt,
          duration_sec: durationSec,
          transcript,
          summary: message?.analysis?.summary ?? message?.summary ?? null,
          recording_url: message?.recordingUrl ?? message?.stereoRecordingUrl ?? null,
          status: "completed",
        },
        { onConflict: "vapi_call_id" },
      )
      .select("id, business_id")
      .single();

    if (callRow) {
      await notifyOwner(callRow.id, callRow.business_id);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

function normalizeTranscript(message: any) {
  const messages = message?.artifact?.messages ?? message?.messages ?? null;
  if (Array.isArray(messages)) {
    return messages
      .filter((m) => m?.role && (m?.message ?? m?.content))
      .map((m) => ({
        role: m.role,
        message: m.message ?? m.content,
        time: m.time ?? m.secondsFromStart ?? null,
      }));
  }
  if (typeof message?.transcript === "string") {
    return [{ role: "system", message: message.transcript }];
  }
  return null;
}

async function notifyOwner(callId: string, businessId: string) {
  const supabase = getSupabaseServiceClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, telegram_chat_id")
    .eq("id", businessId)
    .single();
  if (!business?.telegram_chat_id) return;

  const { data: call } = await supabase
    .from("calls")
    .select("id, caller_phone, summary")
    .eq("id", callId)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("customer_name, service, scheduled_at, customer_phone")
    .eq("call_id", callId);

  const bookingLine = bookings?.length
    ? bookings
        .map(
          (b) =>
            `${b.service}, ${new Date(b.scheduled_at).toLocaleString()}, ${b.customer_name} (${b.customer_phone})`,
        )
        .join("; ")
    : null;

  const text = formatCallSummary({
    businessName: business.name,
    callerPhone: call?.caller_phone ?? null,
    summary: call?.summary ?? null,
    bookingLine,
    transcriptUrl: `${env.appUrl()}/dashboard/calls/${callId}`,
  });

  try {
    const result = await sendTelegramMessage({ chatId: business.telegram_chat_id, text });
    await supabase.from("notifications").insert({
      business_id: business.id,
      call_id: callId,
      channel: "telegram",
      payload: { text, message_id: result.result?.message_id },
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    await supabase.from("notifications").insert({
      business_id: business.id,
      call_id: callId,
      channel: "telegram",
      payload: { text },
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
