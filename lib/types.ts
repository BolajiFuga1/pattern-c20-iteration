export type Service = {
  id: string;
  name: string;
  duration_min: number;
  price?: number | null;
};

// Hours for a single weekday: list of [openMinute, closeMinute] in local minutes-of-day.
// Example 9am-5pm = [{ open: 9 * 60, close: 17 * 60 }]. Empty array = closed.
export type DayHours = { open: number; close: number }[];

// 0 = Sunday, 6 = Saturday
export type BusinessHours = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours>;

export type Business = {
  id: string;
  owner_user_id: string;
  name: string;
  timezone: string;
  business_hours: BusinessHours;
  services: Service[];
  system_prompt: string | null;
  vapi_assistant_id: string | null;
  vapi_phone_number_id: string | null;
  phone_number: string | null;
  telegram_chat_id: string | null;
  telegram_link_token: string | null;
  created_at: string;
};
