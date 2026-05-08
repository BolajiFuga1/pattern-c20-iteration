# AI Receptionist

Multi-tenant SaaS that gives any business a phone number answered by an AI receptionist. The AI
answers caller questions, books appointments, and after the call DMs a summary to the owner on
Telegram. Owners log into a dashboard to see every call, transcript, and booking.

Built with Next.js 15 (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, RLS), Vapi
for voice (managed STT/LLM/TTS + provisioned phone numbers), and the Telegram Bot API.

> The previous "pattern iteration program" demo lives unchanged under `legacy/`.

## Architecture

```
Caller ──► Vapi number ──► Vapi assistant ──► tool calls ──► /api/vapi/tools/*
                              │                                      │
                              └──end-of-call webhook──► /api/vapi/webhook
                                                              │
                                                              ├─► Supabase (calls, bookings)
                                                              └─► Telegram Bot API ──► Owner

Owner ──► Next.js dashboard ──► Supabase (RLS-scoped reads)
```

## Local development

```bash
cp .env.example .env.local        # fill in the values
npm install
npm run dev
```

Then open http://localhost:3000 .

### Database

Schema lives at `supabase/migrations/0001_init.sql`. Apply it to your Supabase project — either via
the Supabase MCP `apply_migration`, the dashboard SQL editor, or `supabase db push` locally. RLS
is enforced on every tenant table.

### Vapi setup

Onboarding (`/onboarding`) creates a per-tenant Vapi assistant with two tools (`check_availability`,
`book_appointment`) that point back at our API, and provisions a phone number. Webhook events go
to `/api/vapi/webhook` and are verified with `VAPI_WEBHOOK_SECRET` (HMAC or bearer).

### Telegram setup

1. Talk to [@BotFather](https://t.me/BotFather) and create a bot. Save the token and username.
2. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, and a
   strong `TELEGRAM_WEBHOOK_SECRET`.
3. Register the webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=$APP_URL/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
4. During onboarding the owner is shown a deep link `https://t.me/<bot>?start=<token>`. Tapping it
   sends the bot a `/start <token>`, which the webhook resolves to bind the chat to the business.

## Environment variables

See `.env.example`.

## Deployment

- Push to GitHub, import in Vercel, set the env vars above.
- Apply the SQL migration to your Supabase project.
- Set `APP_URL` to the public Vercel URL and re-register the Telegram webhook.

## Project layout

```
app/
  (auth)/login, (auth)/signup           Supabase Auth UI
  onboarding/                           4-step setup (profile, services, number, telegram)
  dashboard/                            Overview, calls, call detail, bookings, settings
  api/
    businesses/                         Tenant CRUD (RLS-scoped)
    bookings/[id]                       Booking edit/cancel
    onboarding/provision                Creates Vapi assistant + buys number
    vapi/webhook                        End-of-call processor → Telegram notify
    vapi/tools/check-availability       Server tool the AI calls
    vapi/tools/book-appointment         Server tool the AI calls
    telegram/webhook                    Bot webhook (handles /start linking)
lib/
  supabase/{server,client,middleware}.ts
  vapi.ts          Typed Vapi REST wrapper
  telegram.ts      Bot API send + summary formatter
  availability.ts  Slot computation
  webhook-verify.ts HMAC + bearer verifiers
  auth.ts          getCurrentBusiness / requireBusiness helpers
supabase/migrations/0001_init.sql
```
