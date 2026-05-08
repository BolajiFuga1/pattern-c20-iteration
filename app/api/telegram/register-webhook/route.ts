import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Owner-triggered: tells Telegram where to deliver bot updates. Idempotent —
// safe to re-call any time the APP_URL changes or after rotating the secret.
export async function POST() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = `${env.appUrl()}/api/telegram/webhook`;
  const res = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken()}/setWebhook`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: env.telegramWebhookSecret(),
        allowed_updates: ["message"],
      }),
    },
  );
  const json = await res.json();
  if (!res.ok || !json.ok) {
    return NextResponse.json(
      { error: json.description ?? "Telegram setWebhook failed", raw: json },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, webhook: url });
}
