import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyTelegramSecret } from "@/lib/webhook-verify";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";

// Telegram bot webhook. We only care about /start <token> messages — those link
// the owner's Telegram chat to their business so we can DM call summaries.
export async function POST(req: Request) {
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramSecret(headerSecret, env.telegramWebhookSecret())) {
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const text: string | undefined = message?.text;
  const chatId = message?.chat?.id;
  if (!text || !chatId) return NextResponse.json({ ok: true });

  const startMatch = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]+)/.exec(text);
  if (!startMatch) {
    if (text.startsWith("/start")) {
      await safeReply(chatId, "Hi! Open the link from your AI Receptionist dashboard to connect this chat.");
    }
    return NextResponse.json({ ok: true });
  }

  const token = startMatch[1];
  const supabase = getSupabaseServiceClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("telegram_link_token", token)
    .maybeSingle();

  if (!business) {
    await safeReply(chatId, "That link looks invalid or expired. Try generating a new one from the dashboard.");
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from("businesses")
    .update({ telegram_chat_id: String(chatId) })
    .eq("id", business.id);

  await safeReply(
    chatId,
    `✅ Connected to <b>${business.name}</b>. You'll get a summary here after every call.`,
  );
  return NextResponse.json({ ok: true });
}

async function safeReply(chatId: number, text: string) {
  try {
    await sendTelegramMessage({ chatId, text });
  } catch (e) {
    console.error("telegram reply failed", e);
  }
}
