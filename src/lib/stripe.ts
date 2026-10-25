import "server-only";
import Stripe from "stripe";
import type { PaidPlanId } from "@/lib/plans";

let client: Stripe | null = null;

/** Създава се при първа нужда, за да не гърми билдът без ключ. */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Липсва STRIPE_SECRET_KEY. Вижте .env.example.");
    client = new Stripe(key);
  }
  return client;
}

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Липсва ${name}. Стартирайте npm run stripe:setup и копирайте ID-тата.`);
  return v;
}

const PRICE_ENV: Record<PaidPlanId, string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  business: "STRIPE_PRICE_BUSINESS",
};

export const priceIdFor = (plan: PaidPlanId) => env(PRICE_ENV[plan]);

/** Еднократната такса за пробния период (€1.99) */
export const trialFeePriceId = () => env("STRIPE_PRICE_TRIAL_FEE");

export function planForPrice(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  for (const plan of Object.keys(PRICE_ENV) as PaidPlanId[]) {
    if (process.env[PRICE_ENV[plan]] === priceId) return plan;
  }
  return null;
}
