"use server";

import { getCurrentUser, safeNext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceIdFor, stripe, trialFeePriceId } from "@/lib/stripe";
import { isPaidPlan, PLANS, TRIAL, type PaidPlanId } from "@/lib/plans";
import { SITE } from "@/config/site";
import { fmt, formatPrice, isLocale, localePath, type Locale } from "@/i18n/config";
import { loadDictionary } from "@/i18n/dictionaries";

/** error е код — текстът е в речника (billing.errors.<код>) */
export type BillingResult = { url: string } | { error: string };

const ACTIVE = ["active", "trialing", "past_due"];

/** Stripe клиент за потребителя — създава се веднъж и се пази в базата. */
async function ensureCustomer(userId: string, email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id, trial_used")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);

  let customerId: string | null = data.stripe_customer_id;
  if (!customerId) {
    // idempotencyKey: двоен клик не създава два Stripe клиента
    const customer = await stripe().customers.create(
      { email, metadata: { user_id: userId } },
      { idempotencyKey: `customer-${userId}` },
    );
    customerId = customer.id;
    const { error: upErr } = await admin
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);
  }
  return { customerId, trialUsed: data.trial_used as boolean };
}

/**
 * Стартира Stripe Checkout за избрания план. Starter включва пробен период
 * (14 дни за €1.99), ако потребителят не го е ползвал. Ако вече има активен
 * абонамент — връща линк към Customer Portal за смяна на плана.
 */
export async function startCheckout(plan: PaidPlanId, returnTo: string, lang: Locale): Promise<BillingResult> {
  const locale: Locale = isLocale(lang) ? lang : "en";
  const user = await getCurrentUser();
  if (!user) return { url: `${localePath(locale, "/login")}?next=${encodeURIComponent(safeNext(returnTo, localePath(locale, "/pricing")))}` };
  if (!isPaidPlan(plan)) return { error: "invalid_plan" };

  try {
    const { customerId, trialUsed } = await ensureCustomer(user.id, user.email);

    // Stripe е източникът на истината — проверяваме и там (webhook-ът може да закъснява)
    const existing = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    if (existing.data.some((s) => ACTIVE.includes(s.status))) return portalUrl(customerId, locale);

    const trial = plan === TRIAL.plan && !trialUsed && !existing.data.some((s) => s.trial_start);
    const p = PLANS[plan];
    const back = safeNext(returnTo, localePath(locale, "/pricing"));
    const t = await loadDictionary(locale);
    const price = formatPrice(locale, p.priceMonthly);
    const trialPrice = formatPrice(locale, TRIAL.price);

    const managed = process.env.STRIPE_MANAGED_PAYMENTS === "true";
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      // Всички наши езици се поддържат от Stripe Checkout
      locale,
      line_items: [
        { price: priceIdFor(plan), quantity: 1 },
        // Еднократната такса се таксува веднага; абонаментът започва след пробния период
        ...(trial ? [{ price: trialFeePriceId(), quantity: 1 }] : []),
      ],
      subscription_data: {
        metadata: { user_id: user.id, plan },
        ...(trial ? { trial_period_days: TRIAL.days } : {}),
      },
      metadata: { user_id: user.id, plan },
      // Stripe като merchant of record: поема ДДС / sales tax, измами и спорове.
      // Включва се след одобрение в Stripe → Settings → Managed Payments.
      ...(managed ? { managed_payments: { enabled: true } } : {}),
      // Изрично съгласие с условията (закони за автоматично подновяване в САЩ).
      // Изисква публичен Terms URL в Stripe → Settings → Public details.
      ...(process.env.STRIPE_TOS_CONSENT === "true" ? { consent_collection: { terms_of_service: "required" as const } } : {}),
      // custom_text не е разрешен с Managed Payments — там Stripe показва свои стандартни
      // условия за плащане; нашето описание на подновяването е до бутона на сайта.
      ...(managed ? {} : {
        custom_text: {
          submit: {
            message: trial
              ? fmt(t.billing.checkoutTrial, { trial: trialPrice, days: TRIAL.days, price })
              : fmt(t.billing.checkoutMonthly, { price }),
          },
        },
      }),
      success_url: `${SITE.url}${localePath(locale, "/dashboard/billing/success")}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}${back}${back.includes("?") ? "&" : "?"}checkout=canceled`,
    });

    if (!session.url) return { error: "no_url" };
    return { url: session.url };
  } catch (e) {
    console.error("[billing] checkout", e);
    return { error: "checkout_failed" };
  }
}

async function portalUrl(customerId: string, locale: Locale): Promise<BillingResult> {
  const portal = await stripe().billingPortal.sessions.create({
    customer: customerId,
    // Настройката от npm run stripe:setup; без нея — тази по подразбиране от таблото
    ...(process.env.STRIPE_PORTAL_CONFIG ? { configuration: process.env.STRIPE_PORTAL_CONFIG } : {}),
    return_url: `${SITE.url}${localePath(locale, "/dashboard")}`,
    locale,
  });
  return { url: portal.url };
}

/** Customer Portal: смяна на план, карта, фактури, отказ от абонамента. */
export async function openBillingPortal(lang: Locale): Promise<BillingResult> {
  const locale: Locale = isLocale(lang) ? lang : "en";
  const user = await getCurrentUser();
  if (!user) return { url: localePath(locale, "/login") };
  try {
    const { customerId } = await ensureCustomer(user.id, user.email);
    return await portalUrl(customerId, locale);
  } catch (e) {
    console.error("[billing] portal", e);
    return { error: "portal_failed" };
  }
}
