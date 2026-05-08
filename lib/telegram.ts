import { env } from "@/lib/env";

type SendMessageArgs = {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
};

export async function sendTelegramMessage(args: SendMessageArgs) {
  const res = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken()}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: args.chatId,
        text: args.text,
        parse_mode: args.parseMode ?? "HTML",
        disable_web_page_preview: false,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
  return (await res.json()) as { ok: boolean; result: { message_id: number } };
}

export function formatCallSummary(args: {
  businessName: string;
  callerPhone: string | null;
  summary: string | null;
  bookingLine: string | null;
  transcriptUrl: string;
}): string {
  const lines: string[] = [
    `<b>📞 New call</b> for <b>${escapeHtml(args.businessName)}</b>`,
    args.callerPhone ? `From: <code>${escapeHtml(args.callerPhone)}</code>` : null,
    "",
    args.summary ? escapeHtml(args.summary) : "<i>No summary available.</i>",
  ].filter((x): x is string => x !== null);

  if (args.bookingLine) {
    lines.push("", `✅ <b>Booking:</b> ${escapeHtml(args.bookingLine)}`);
  }

  lines.push("", `<a href="${args.transcriptUrl}">View full transcript →</a>`);
  return lines.join("\n");
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}
