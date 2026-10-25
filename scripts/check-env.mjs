// Проверява дали ключовете в .env.local работят (без да ги отпечатва).
// Употреба: npm run check:env
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const e = process.env;
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const bad = (m) => {
  console.log(`❌ ${m}`);
  failed = true;
};

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_BUSINESS",
  "STRIPE_PRICE_TRIAL_FEE",
  "STRIPE_PORTAL_CONFIG",
];
for (const k of required) if (!e[k]) bad(`${k} липсва`);

// Supabase със secret ключа: таблиците и колоните от миграциите
try {
  const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error, count } = await admin.from("subscriptions").select("trial_used, ended_at", { count: "exact", head: true });
  if (error) bad(`Supabase (secret key): ${error.message}`);
  else ok(`Supabase secret key работи, миграциите са приложени (${count} профила)`);
} catch (err) {
  bad(`Supabase: ${err.message}`);
}

// Stripe: ключ, цени, Customer Portal
try {
  const stripe = new Stripe(e.STRIPE_SECRET_KEY);
  const expected = {
    STRIPE_PRICE_STARTER: { amount: 500, recurring: true },
    STRIPE_PRICE_PRO: { amount: 700, recurring: true },
    STRIPE_PRICE_BUSINESS: { amount: 1500, recurring: true },
    STRIPE_PRICE_TRIAL_FEE: { amount: 199, recurring: false },
  };
  for (const [k, exp] of Object.entries(expected)) {
    const p = await stripe.prices.retrieve(e[k], { expand: ["currency_options", "product"] });
    const isRecurring = !!p.recurring;
    const usd = p.currency_options?.usd?.unit_amount;
    const taxCode = typeof p.product === "object" ? p.product.tax_code : null;
    const per = isRecurring ? "/месец" : " еднократно";
    if (p.unit_amount !== exp.amount || isRecurring !== exp.recurring || p.currency !== "eur")
      bad(`${k}: очаквана €${(exp.amount / 100).toFixed(2)}${exp.recurring ? "/месец" : " еднократно"}`);
    else if (usd !== exp.amount) bad(`${k}: липсва цена в USD ($${(exp.amount / 100).toFixed(2)}) — пуснете npm run stripe:setup`);
    else if (!taxCode) bad(`${k}: продуктът няма данъчен код (нужен за Managed Payments)`);
    else ok(`${k}: €${(p.unit_amount / 100).toFixed(2)} / $${(usd / 100).toFixed(2)}${per} · данъчен код ${typeof taxCode === "string" ? taxCode : taxCode.id}`);
  }
  ok(`Stripe ключ (${e.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "тестов режим" : "ЖИВ РЕЖИМ"})`);
  console.log(`   Managed Payments: ${e.STRIPE_MANAGED_PAYMENTS === "true" ? "включено" : "изключено"} · съгласие с условията в Checkout: ${e.STRIPE_TOS_CONSENT === "true" ? "включено" : "изключено"}`);

  const def = e.STRIPE_PORTAL_CONFIG
    ? await stripe.billingPortal.configurations.retrieve(e.STRIPE_PORTAL_CONFIG, { expand: ["features.subscription_update.products"] })
    : (await stripe.billingPortal.configurations.list({ limit: 10 })).data.find((c) => c.is_default && c.active);
  if (!def?.active) bad("Customer Portal не е настроен — пуснете npm run stripe:setup");
  else {
    const f = def.features;
    ok("Customer Portal е настроен");
    if (!f.subscription_cancel?.enabled) bad("Customer Portal: включете „Cancel subscriptions“");
    if (!f.subscription_update?.enabled) console.log("⚠️  Customer Portal: „Switch plans“ е изключено — потребителите няма да могат да сменят плана сами");
    else {
      console.log(`   смяна на план: ${(Array.isArray(f.subscription_update.products) ? f.subscription_update.products : f.subscription_update.products?.data ?? []).length} продукта · количество: ${f.subscription_update.default_allowed_updates.includes("quantity") ? "РАЗРЕШЕНО ⚠️" : "забранено"} · проба при смяна: ${f.subscription_update.trial_update_behavior}`);
      console.log(`   отказ: ${f.subscription_cancel.mode} · смяна на карта: ${f.payment_method_update.enabled ? "да" : "не"} · фактури: ${f.invoice_history.enabled ? "да" : "не"}`);
    }
  }
} catch (err) {
  bad(`Stripe: ${err.message}`);
}

process.exit(failed ? 1 : 0);
