-- AI Receptionist initial schema with RLS for multi-tenant SaaS.

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- businesses (tenant root, one per owner)
------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  timezone text not null default 'UTC',
  business_hours jsonb not null default '{
    "0": [], "1": [{"open":540,"close":1020}], "2": [{"open":540,"close":1020}],
    "3": [{"open":540,"close":1020}], "4": [{"open":540,"close":1020}],
    "5": [{"open":540,"close":1020}], "6": []
  }'::jsonb,
  services jsonb not null default '[]'::jsonb,
  system_prompt text,
  vapi_assistant_id text,
  vapi_phone_number_id text,
  phone_number text,
  telegram_chat_id text,
  telegram_link_token text unique,
  created_at timestamptz not null default now()
);

create unique index if not exists businesses_owner_unique on public.businesses(owner_user_id);
create index if not exists businesses_assistant_idx on public.businesses(vapi_assistant_id);

alter table public.businesses enable row level security;

drop policy if exists "businesses_select_own" on public.businesses;
create policy "businesses_select_own" on public.businesses
  for select using (owner_user_id = auth.uid());

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own" on public.businesses
  for insert with check (owner_user_id = auth.uid());

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists "businesses_delete_own" on public.businesses;
create policy "businesses_delete_own" on public.businesses
  for delete using (owner_user_id = auth.uid());

------------------------------------------------------------
-- calls
------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  vapi_call_id text unique,
  caller_phone text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer,
  transcript jsonb,
  summary text,
  recording_url text,
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);

create index if not exists calls_business_started_idx on public.calls(business_id, started_at desc);

alter table public.calls enable row level security;

drop policy if exists "calls_select_own" on public.calls;
create policy "calls_select_own" on public.calls
  for select using (
    business_id in (select id from public.businesses where owner_user_id = auth.uid())
  );

------------------------------------------------------------
-- bookings
------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  service text not null,
  scheduled_at timestamptz not null,
  notes text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create index if not exists bookings_business_scheduled_idx
  on public.bookings(business_id, scheduled_at);

alter table public.bookings enable row level security;

drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings
  for select using (
    business_id in (select id from public.businesses where owner_user_id = auth.uid())
  );

drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own" on public.bookings
  for update using (
    business_id in (select id from public.businesses where owner_user_id = auth.uid())
  ) with check (
    business_id in (select id from public.businesses where owner_user_id = auth.uid())
  );

drop policy if exists "bookings_delete_own" on public.bookings;
create policy "bookings_delete_own" on public.bookings
  for delete using (
    business_id in (select id from public.businesses where owner_user_id = auth.uid())
  );

------------------------------------------------------------
-- notifications (audit log of outbound owner pings)
------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  channel text not null,
  payload jsonb,
  status text not null default 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_business_idx on public.notifications(business_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (
    business_id in (select id from public.businesses where owner_user_id = auth.uid())
  );
