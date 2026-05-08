import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUserOrRedirect } from "@/lib/auth";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  await getCurrentUserOrRedirect();
  const { business } = await getCurrentBusiness();

  // If they've already provisioned the number AND linked Telegram, send them to the dashboard.
  if (business?.vapi_phone_number_id && business?.telegram_chat_id) {
    redirect("/dashboard");
  }

  return <OnboardingClient existingBusiness={business} />;
}
