-- =====================================================================
-- Платен модел: без безплатно създаване на кодове.
--   free     — няма активен абонамент: 0 кода, без редакция
--   starter  — €5/месец, 5 кода (пробен период 14 дни за €1.99, веднъж на профил)
--   pro      — €7/месец, 50 кода
--   business — €15/месец, неограничено
-- След прекратяване кодовете се заключват и се изтриват след 30 дни.
-- Огледало на src/lib/plans.ts — при промяна обновете и двете места.
-- =====================================================================

alter table public.subscriptions drop constraint subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'starter', 'pro', 'business'));

-- Пробният период се дава само веднъж на профил
alter table public.subscriptions add column trial_used boolean not null default false;
-- Кога абонаментът е приключил (Stripe ended_at); null докато е активен
alter table public.subscriptions add column ended_at timestamptz;

create or replace function public.plan_max_qr_codes(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  -- null = без ограничение
  select case p_plan
    when 'starter' then 5
    when 'pro' then 50
    when 'business' then null
    else 0
  end;
$$;

create or replace function public.plan_allows_dynamic(p_plan text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_plan in ('pro', 'business');
$$;

-- Без активен абонамент: не може да се създава и редактира (изтриването е позволено)
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

  if v_plan = 'free' then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    v_max := public.plan_max_qr_codes(v_plan);
    if v_max is not null then
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

-- Изтрива кодовете на потребители без активен абонамент повече от 30 дни.
-- Връща броя изтрити кодове.
create or replace function public.purge_lapsed_qr_codes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.qr_codes c
   using public.subscriptions s
   where s.user_id = c.user_id
     and s.status not in ('active', 'trialing', 'past_due')
     and s.ended_at is not null
     and s.ended_at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.purge_lapsed_qr_codes() from public, anon, authenticated;

-- Ежедневно изпълнение с pg_cron (наличен в Supabase). Ако разширението
-- липсва (напр. локален тест), стъпката се пропуска без грешка.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    execute $cron$select cron.schedule('purge-lapsed-qr-codes', '15 3 * * *', 'select public.purge_lapsed_qr_codes()')$cron$;
  end if;
end;
$$;
