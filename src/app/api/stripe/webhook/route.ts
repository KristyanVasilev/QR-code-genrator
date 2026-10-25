import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/admin";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
]);

/**
 * Stripe webhooks: плащане, промяна и прекратяване на абонамент.
 * 1. Проверява подписа (никой друг не може да „активира“ абонамент).
 * 2. Идемпотентност: всяко събитие се обработва само веднъж (stripe_events).
 * 3. При грешка връща 500 — Stripe ще опита отново.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dupErr } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") return Response.json({ received: true, duplicate: true });
    console.error("[stripe] events", dupErr.message);
    return new Response("Storage error", { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
      if (s.mode === "subscription" && subId) await syncSubscription(subId, s.client_reference_id);
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub.id);
    }
  } catch (e) {
    console.error("[stripe] webhook", event.type, e);
    // Махаме маркера, за да може повторният опит на Stripe да се обработи
    await admin.from("stripe_events").delete().eq("id", event.id);
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
