import { requireBusiness } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const business = await requireBusiness();
  return <SettingsClient business={business} />;
}
