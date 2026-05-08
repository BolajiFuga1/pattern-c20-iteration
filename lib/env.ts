function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  vapiPrivateKey: () => required("VAPI_PRIVATE_KEY", process.env.VAPI_PRIVATE_KEY),
  vapiWebhookSecret: () => required("VAPI_WEBHOOK_SECRET", process.env.VAPI_WEBHOOK_SECRET),
  telegramBotToken: () => required("TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN),
  telegramBotUsername: () =>
    required("TELEGRAM_BOT_USERNAME", process.env.TELEGRAM_BOT_USERNAME),
  telegramWebhookSecret: () =>
    required("TELEGRAM_WEBHOOK_SECRET", process.env.TELEGRAM_WEBHOOK_SECRET),
  appUrl: () => required("APP_URL", process.env.APP_URL),
};
