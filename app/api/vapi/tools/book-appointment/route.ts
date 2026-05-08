import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyVapiBearer, verifyVapiSignature } from "@/lib/webhook-verify";
import {
  findService,
  isWithinHours,
  overlapsExisting,
  type ExistingBooking,
} from "@/lib/availability";
import type { Service } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sigHeader = req.headers.get("x-vapi-signature") ?? req.headers.get("x-vapi-signature-256");
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

  const { businessId, args, toolCallId, vapiCallId } = extractToolCall(body);
  if (!businessId) return NextResponse.json({ error: "missing business id" }, { status: 400 });

  const customerName = String(args?.customerName ?? "").trim();
  const customerPhone = String(args?.customerPhone ?? "").trim();
  const service = String(args?.service ?? "").trim();
  const scheduledAt = String(args?.scheduledAt ?? "").trim();
  const notes = args?.notes ? String(args.notes) : null;

  if (!customerName || !customerPhone || !service || !scheduledAt)
    return toolResponse(toolCallId, {
      success: false,
      reason: "Missing customerName, customerPhone, service, or scheduledAt",
    });

  const startUtc = new Date(scheduledAt);
  if (Number.isNaN(startUtc.getTime()))
    return toolResponse(toolCallId, { success: false, reason: "invalid datetime" });

  const supabase = getSupabaseServiceClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_hours, services")
    .eq("id", businessId)
    .single();
  if (!business) return toolResponse(toolCallId, { success: false, reason: "unknown business" });

  const services = (business.services ?? []) as Service[];
  const matched = findService(services, service);
  if (!matched)
    return toolResponse(toolCallId, {
      success: false,
      reason: `Service "${service}" is not offered`,
    });

  if (!isWithinHours(startUtc, business.business_hours))
    return toolResponse(toolCallId, {
      success: false,
      reason: "Outside business hours",
    });

  // Re-check conflicts at write time so the AI can't double-book if availability raced.
  const { data: existing } = await supabase
    .from("bookings")
    .select("scheduled_at, service, status")
    .eq("business_id", businessId)
    .gte("scheduled_at", new Date(startUtc.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .lte("scheduled_at", new Date(startUtc.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (overlapsExisting(startUtc, matched.duration_min, services, (existing ?? []) as ExistingBooking[])) {
    return toolResponse(toolCallId, { success: false, reason: "That time is already booked" });
  }

  let callId: string | null = null;
  if (vapiCallId) {
    const { data: callRow } = await supabase
      .from("calls")
      .select("id")
      .eq("vapi_call_id", vapiCallId)
      .maybeSingle();
    callId = callRow?.id ?? null;
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      call_id: callId,
      customer_name: customerName,
      customer_phone: customerPhone,
      service: matched.name,
      scheduled_at: startUtc.toISOString(),
      notes,
      status: "confirmed",
    })
    .select("id, scheduled_at, service, customer_name")
    .single();

  if (error) return toolResponse(toolCallId, { success: false, reason: error.message });

  return toolResponse(toolCallId, {
    success: true,
    bookingId: booking.id,
    confirmation: `Booked ${booking.service} for ${booking.customer_name} at ${new Date(booking.scheduled_at).toLocaleString()}.`,
  });
}

function extractToolCall(body: any): {
  businessId: string | null;
  args: any;
  toolCallId: string | null;
  vapiCallId: string | null;
} {
  const message = body?.message ?? body;
  const toolCalls = message?.toolCalls ?? message?.toolCallList ?? [];
  const tc = toolCalls[0] ?? message?.functionCall ?? null;
  const businessId =
    body?.metadata?.business_id ??
    message?.assistant?.metadata?.business_id ??
    message?.call?.metadata?.business_id ??
    null;
  let args: any = null;
  if (tc?.function?.arguments) {
    args =
      typeof tc.function.arguments === "string"
        ? safeParse(tc.function.arguments)
        : tc.function.arguments;
  } else if (tc?.parameters) {
    args = tc.parameters;
  }
  return {
    businessId,
    args: args ?? {},
    toolCallId: tc?.id ?? null,
    vapiCallId: message?.call?.id ?? null,
  };
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function toolResponse(toolCallId: string | null, result: any) {
  return NextResponse.json({
    results: [
      {
        toolCallId: toolCallId ?? "unknown",
        result: JSON.stringify(result),
      },
    ],
  });
}
