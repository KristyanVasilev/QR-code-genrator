import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { effectivePlan, hasAccess, PLANS, RETENTION_DAYS, type Plan } from "@/lib/plans";

export interface Account {
  id: string;
  email: string;
  fullName: string | null;
  plan: Plan;
  /** Активен (вкл. пробен) абонамент — може да създава, вижда и сваля кодове */
  access: boolean;
  status: string | null;
  trialing: boolean;
  trialUsed: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  /** Кога ще бъдат изтрити кодовете (само при прекратен абонамент) */
  purgeAt: string | null;
  qrCount: number;
}

/**
 * Данни за таблото на текущия потребител — три паралелни заявки,
 * всяка ограничена от RLS до собствените редове.
 */
export const getAccount = cache(async (): Promise<Account> => {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, sub, codes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, trial_used, ended_at, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("qr_codes").select("id", { count: "exact", head: true }),
  ]);

  for (const r of [profile, sub, codes]) {
    if (!r.error) continue;
    // 42703 = липсваща колона: базата изостава от кода
    if (r.error.code === "42703")
      throw new Error(`account: ${r.error.message}. Пуснете липсващите миграции от supabase/migrations/ (вижте README).`);
    throw new Error(`account: ${r.error.message}`);
  }

  const s = sub.data;
  const plan = PLANS[effectivePlan(s?.plan, s?.status)];
  const access = hasAccess(plan.id);
  const purgeAt =
    !access && s?.ended_at
      ? new Date(new Date(s.ended_at).getTime() + RETENTION_DAYS * 864e5).toISOString()
      : null;

  return {
    id: user.id,
    email: user.email,
    fullName: profile.data?.full_name ?? null,
    plan,
    access,
    status: s?.status ?? null,
    trialing: s?.status === "trialing",
    trialUsed: s?.trial_used ?? false,
    currentPeriodEnd: s?.current_period_end ?? null,
    cancelAtPeriodEnd: s?.cancel_at_period_end ?? false,
    hasStripeCustomer: !!s?.stripe_customer_id,
    purgeAt,
    qrCount: codes.count ?? 0,
  };
});

