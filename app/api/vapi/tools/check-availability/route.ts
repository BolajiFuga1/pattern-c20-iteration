import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyVapiBearer, verifyVapiSignature } from "@/lib/webhook-verify";
import {
  findService,
  isWithinHours,
  overlapsExisting,
  suggestAlternatives,
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

  const { businessId, args, toolCallId } = extractToolCall(body);
  if (!businessId) return NextResponse.json({ error: "missing business id" }, { status: 400 });

  const service = String(args?.service ?? "").trim();
  const requestedAt = String(args?.requestedAt ?? "").trim();
  if (!service || !requestedAt)
    return toolResponse(toolCallId, { available: false, reason: "missing service or requestedAt" });

  const startUtc = new Date(requestedAt);
  if (Number.isNaN(startUtc.getTime()))
    return toolResponse(toolCallId, { available: false, reason: "invalid datetime" });

  const supabase = getSupabaseServiceClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_hours, services")
    .eq("id", businessId)
    .single();
  if (!business) return toolResponse(toolCallId, { available: false, reason: "unknown business" });

  const services = (business.services ?? []) as Service[];
  const matched = findService(services, service);
  if (!matched)
    return toolResponse(toolCallId, {
      available: false,
      reason: `Service "${service}" is not offered`,
      offered: services.map((s) => s.name),
    });

  if (!isWithinHours(startUtc, business.business_hours))
    return toolResponse(toolCallId, {
      available: false,
      reason: "Outside business hours",
      alternatives: await loadAndSuggest(businessId, startUtc, matched.duration_min, business.business_hours, services),
    });

  // Look at bookings within +/- 1 day.
  const { data: existing } = await supabase
    .from("bookings")
    .select("scheduled_at, service, status")
    .eq("business_id", businessId)
    .gte("scheduled_at", new Date(startUtc.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .lte("scheduled_at", new Date(startUtc.getTime() + 24 * 60 * 60 * 1000).toISOString());

  const bookings = (existing ?? []) as ExistingBooking[];
  if (overlapsExisting(startUtc, matched.duration_min, services, bookings)) {
    return toolResponse(toolCallId, {
      available: false,
      reason: "That time is already booked",
      alternatives: suggestAlternatives({
        from: startUtc,
        durationMin: matched.duration_min,
        hours: business.business_hours,
        services,
        bookings,
      }),
    });
  }

  return toolResponse(toolCallId, { available: true });
}

async function loadAndSuggest(
  businessId: string,
  from: Date,
  durationMin: number,
  hours: any,
  services: Service[],
) {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("bookings")
    .select("scheduled_at, service, status")
    .eq("business_id", businessId)
    .gte("scheduled_at", from.toISOString())
    .lte("scheduled_at", new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
  return suggestAlternatives({
    from,
    durationMin,
    hours,
    services,
    bookings: (data ?? []) as ExistingBooking[],
  });
}

function extractToolCall(body: any): {
  businessId: string | null;
  args: any;
  toolCallId: string | null;
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
  return { businessId, args: args ?? {}, toolCallId: tc?.id ?? null };
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function toolResponse(toolCallId: string | null, result: any) {
  // Vapi accepts both shapes; we return the modern toolCallList form.
  return NextResponse.json({
    results: [
      {
        toolCallId: toolCallId ?? "unknown",
        result: JSON.stringify(result),
      },
    ],
  });
}
