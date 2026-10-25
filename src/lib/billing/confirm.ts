import "server-only";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth/session";
import { syncSubscription } from "./sync";

/**
 * Извиква се от страницата след плащане. Синхронизира абонамента веднага,
 * без да чака webhook-а (който може да закъснее с няколко секунди).
 * Сесията трябва да принадлежи на текущия потребител.
 */
export async function confirmCheckout(sessionId: string): Promise<"ok" | "pending" | "invalid"> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return "invalid";
  const user = await requireUser();

  try {
    const s = await stripe().checkout.sessions.retrieve(sessionId);
    if (s.client_reference_id !== user.id) return "invalid";
    if (s.status !== "complete") return "pending";
    const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
    if (!subId) return "pending";
    await syncSubscription(subId, user.id);
    return "ok";
  } catch (e) {
    console.error("[billing] confirm", e);
    return "pending";
  }
}
