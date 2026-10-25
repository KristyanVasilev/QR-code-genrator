-- =====================================================================
-- Начална схема: профили, абонаменти, QR кодове, сканирания, Stripe събития
-- Изпълнява се в Supabase (SQL Editor или `supabase db push`).
-- Сигурност: Row Level Security е включена навсякъде; потребителите
-- достъпват само своите редове. Абонаментите и Stripe данните се пишат
-- само от сървъра (service_role ключ) — никога от браузъра.
-- =====================================================================

-- ---------- Общи помощни функции ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Планове (огледало на src/lib/plans.ts) ----------

create or replace function public.plan_max_qr_codes(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  -- null = без ограничение
  select case p_plan when 'pro' then 500 when 'business' then null else 10 end;
$$;

create or replace function public.plan_allows_dynamic(p_plan text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_plan in ('pro', 'business');
$$;

-- ---------- Профили ----------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text check (char_length(full_name) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Абонаменти (един ред на потребител) ----------
-- Ред без платен план = безплатен план. Записва се само от Stripe webhook.

create table public.subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  plan                    text not null default 'free' check (plan in ('free', 'pro', 'business')),
  status                  text check (status in (
                            'active', 'trialing', 'past_due', 'canceled', 'unpaid',
                            'incomplete', 'incomplete_expired', 'paused')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Ефективен план според статуса (огледало на effectivePlan в src/lib/plans.ts).
-- past_due се третира като активен, докато Stripe опитва повторно плащане.
create or replace function public.effective_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when s.status in ('active', 'trialing', 'past_due') then s.plan else 'free' end
       from public.subscriptions s
      where s.user_id = p_user),
    'free');
$$;

-- ---------- QR кодове ----------

create table public.qr_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  type        text not null check (type ~ '^[a-z][a-z0-9_]{1,30}$'),
  content     jsonb not null default '{}'::jsonb check (pg_column_size(content) <= 8192),
  payload     text not null check (char_length(payload) between 1 and 2000),
  design      jsonb not null default '{}'::jsonb check (pg_column_size(design) <= 4096),
  -- Подготовка за динамични кодове: payload сочи към /r/<short_code>,
  -- а target_url е крайната дестинация, която може да се сменя.
  is_dynamic  boolean not null default false,
  short_code  text unique check (short_code ~ '^[A-Za-z0-9_-]{4,32}$'),
  target_url  text check (char_length(target_url) <= 2048),
  scan_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint qr_codes_dynamic_fields check (
    not is_dynamic or (short_code is not null and target_url is not null))
);

create index qr_codes_user_created_idx on public.qr_codes (user_id, created_at desc);

create trigger qr_codes_updated_at
  before update on public.qr_codes
  for each row execute function public.set_updated_at();

-- Защита на ниво база: лимит според плана и защитени колони.
-- Прилага се за заявки от потребители (authenticated); сървърът със
-- service_role не се ограничава.
create or replace function public.qr_codes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  text;
  v_max   integer;
  v_count integer;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;

  v_plan := public.effective_plan(new.user_id);

  if tg_op = 'INSERT' then
    v_max := public.plan_max_qr_codes(v_plan);
    if v_max is not null then
      -- сериализира едновременни вмъквания на един и същ потребител
      perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
      select count(*) into v_count from public.qr_codes where user_id = new.user_id;
      if v_count >= v_max then
        raise exception 'plan_limit_reached' using errcode = 'P0001';
      end if;
    end if;
    new.scan_count := 0;
  else
    new.user_id    := old.user_id;
    new.scan_count := old.scan_count;
    new.created_at := old.created_at;
  end if;

  if new.is_dynamic and (tg_op = 'INSERT' or not old.is_dynamic)
     and not public.plan_allows_dynamic(v_plan) then
    raise exception 'plan_feature_unavailable' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger qr_codes_guard
  before insert or update on public.qr_codes
  for each row execute function public.qr_codes_guard();

-- ---------- Сканирания (за бъдеща статистика на динамичните кодове) ----------
-- Не пазим IP адреси (GDPR) — само обобщени данни.

create table public.qr_scans (
  id          bigint generated always as identity primary key,
  qr_code_id  uuid not null references public.qr_codes (id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  country     text check (char_length(country) <= 2),
  device      text check (char_length(device) <= 20),
  referrer    text check (char_length(referrer) <= 300)
);

create index qr_scans_code_time_idx on public.qr_scans (qr_code_id, scanned_at desc);

-- ---------- Обработени Stripe събития (идемпотентност на webhooks) ----------

create table public.stripe_events (
  id            text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- ---------- Автоматичен профил и безплатен абонамент при регистрация ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(left(new.raw_user_meta_data ->> 'full_name', 100), ''));
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- =====================================================================
-- Row Level Security и права
-- =====================================================================

alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.qr_codes      enable row level security;
alter table public.qr_scans      enable row level security;
alter table public.stripe_events enable row level security;

-- Supabase дава по подразбиране всички права на anon/authenticated —
-- отнемаме ги и даваме само необходимото (вкл. по колони).
revoke all on public.profiles, public.subscriptions, public.qr_codes,
              public.qr_scans, public.stripe_events from anon, authenticated;

-- Профили: четене и смяна само на името
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "profiles: own select" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: own update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Абонаменти: само четене на собствения ред
grant select on public.subscriptions to authenticated;

create policy "subscriptions: own select" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- QR кодове: пълно управление на собствените; динамичните полета и
-- броячът се управляват само от сървъра.
grant select, delete on public.qr_codes to authenticated;
grant insert (name, type, content, payload, design) on public.qr_codes to authenticated;
grant update (name, type, content, payload, design) on public.qr_codes to authenticated;

create policy "qr_codes: own select" on public.qr_codes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "qr_codes: own insert" on public.qr_codes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "qr_codes: own update" on public.qr_codes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "qr_codes: own delete" on public.qr_codes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Сканирания: собственикът на кода може да ги чете
grant select on public.qr_scans to authenticated;

create policy "qr_scans: owner select" on public.qr_scans
  for select to authenticated using (
    exists (select 1 from public.qr_codes c
             where c.id = qr_scans.qr_code_id and c.user_id = (select auth.uid())));

-- stripe_events: без политики — достъпна само за service_role.

-- Вътрешните функции не се извикват директно от клиента
revoke execute on function public.effective_plan(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.qr_codes_guard() from public, anon, authenticated;
