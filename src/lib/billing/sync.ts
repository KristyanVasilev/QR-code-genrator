import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForPrice, stripe } from "@/lib/stripe";

const ACTIVE = new Set(["active", "trialing", "past_due"]);
const ts = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

/**
 * Записва актуалното състояние на Stripe абонамент в таблицата subscriptions.
 * Винаги работи с прясно изтеглен обект от Stripe, затова е безопасно при
 * повторени или разбъркани по ред webhook събития.
 */
export async function syncSubscription(subscriptionId: string, userIdHint?: string | null) {
  const sub: Stripe.Subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const admin = createAdminClient();

  // Потребителят: от метаданните на абонамента, от checkout сесията или по Stripe клиента
  let userId = sub.metadata?.user_id || userIdHint || null;
  if (!userId) {
    const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) throw new Error(`syncSubscription: няма потребител за ${sub.id}`);

  const { data: current, error: readErr } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status, trial_used")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  // Не позволяваме стар (прекратен) абонамент да презапише по-нов активен
  if (
    current?.stripe_subscription_id &&
    current.stripe_subscription_id !== sub.id &&
    current.status &&
    ACTIVE.has(current.status) &&
    !ACTIVE.has(sub.status)
  ) {
    return;
  }

  // Повтарящата се цена определя плана (еднократната такса не е елемент на абонамента)
  const item = sub.items.data.find((i) => planForPrice(i.price.id)) ?? sub.items.data[0];
  const plan = planForPrice(item?.price.id);
  if (!plan) throw new Error(`syncSubscription: непозната цена ${item?.price.id}`);

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan,
      status: sub.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: item.price.id,
      current_period_end: ts(item.current_period_end),
      cancel_at_period_end: sub.cancel_at_period_end || !!sub.cancel_at,
      ended_at: ts(sub.ended_at),
      trial_used: (current?.trial_used ?? false) || !!sub.trial_start,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
