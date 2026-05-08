import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function defaultBusinessHours() {
  // Mon-Fri 9am-5pm, weekend closed
  const weekday = [{ open: 9 * 60, close: 17 * 60 }];
  return {
    "0": [],
    "1": weekday,
    "2": weekday,
    "3": weekday,
    "4": weekday,
    "5": weekday,
    "6": [],
  };
}

export function defaultSystemPrompt(businessName: string, services: { name: string; duration_min: number }[]) {
  const list = services.length
    ? services.map((s) => `- ${s.name} (${s.duration_min} min)`).join("\n")
    : "- (no services configured yet)";
  return `You are the friendly receptionist for ${businessName}.

Your job:
1. Answer caller questions about the business in a warm, concise tone.
2. Help callers book appointments. Always confirm the customer's name, phone number, the service, and the desired time before booking.
3. Use the check_availability tool BEFORE proposing a time. If the time is taken, offer the alternatives it returns.
4. Use the book_appointment tool to confirm the booking, then read back the confirmation.
5. If the caller asks for something the business doesn't offer, say so politely and offer the closest option.
6. Keep replies short — one or two sentences at a time. This is a phone call, not an essay.

Services we offer:
${list}

If you don't know an answer, say you'll have the owner follow up rather than guessing.`;
}

export function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
