// Създава продуктите, цените (EUR + USD) и Customer Portal в Stripe и отпечатва редовете за .env.local.
// Безопасно е да се пуска многократно — съществуващите цени се откриват по lookup_key.
//
// Употреба:  npm run stripe:setup          (чете STRIPE_SECRET_KEY от .env.local)
// Цените трябва да съвпадат с src/lib/plans.ts.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Липсва STRIPE_SECRET_KEY в .env.local");
  process.exit(1);
}
if (!key.startsWith("sk_test_") && !process.argv.includes("--live")) {
  console.error("Ключът не е тестов. За живия режим добавете --live (внимавайте!).");
  process.exit(1);
}

const stripe = new Stripe(key);

// Цени в EUR (ЕС, вкл. ДДС) с вариант в USD (САЩ, без sales tax — добавя се при плащане).
// Фиксираните валути имат предимство пред автоматичното превалутиране (Adaptive Pricing);
// клиенти от други държави виждат цената, превалутирана от EUR.
// Данъчният код е задължителен за Managed Payments (Stripe = merchant of record).
const TAX_CODE = "txcd_10103000"; // SaaS — за лична употреба
const PRICES = [
  { env: "STRIPE_PRICE_STARTER", lookup: "qrly_starter_monthly_v2", old: "qrly_starter_monthly", product: "QRly Starter", amount: 500, recurring: true },
  { env: "STRIPE_PRICE_PRO", lookup: "qrly_pro_monthly_v2", old: "qrly_pro_monthly", product: "QRly Pro", amount: 700, recurring: true },
  { env: "STRIPE_PRICE_BUSINESS", lookup: "qrly_business_monthly_v2", old: "qrly_business_monthly", product: "QRly Business", amount: 1500, recurring: true },
  { env: "STRIPE_PRICE_TRIAL_FEE", lookup: "qrly_trial_fee_v2", old: "qrly_trial_fee", product: "QRly trial (14 days)", amount: 199, recurring: false },
];

const lines = [];
const prices = {};
for (const p of PRICES) {
  const found = await stripe.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1, expand: ["data.currency_options"] });
  let price = found.data[0];
  if (!price) {
    // Ползваме продукта от старата (само EUR) цена, ако има такава
    const old = (await stripe.prices.list({ lookup_keys: [p.old], limit: 1 })).data[0];
    const productId = old
      ? typeof old.product === "string" ? old.product : old.product.id
      : (await stripe.products.create({ name: p.product, tax_code: TAX_CODE })).id;
    await stripe.products.update(productId, { name: p.product, tax_code: TAX_CODE });
    price = await stripe.prices.create({
      product: productId,
      currency: "eur",
      unit_amount: p.amount,
      tax_behavior: "inclusive", // ЕС: показаната цена е крайна (с ДДС)
      currency_options: { usd: { unit_amount: p.amount, tax_behavior: "exclusive" } }, // САЩ: + sales tax
      lookup_key: p.lookup,
      ...(p.recurring ? { recurring: { interval: "month" } } : {}),
    });
    // Старата цена се изключва (съществуващите абонаменти продължават да работят)
    if (old?.active) await stripe.prices.update(old.id, { active: false });
    console.error(`Създадена: ${p.product} — €${(p.amount / 100).toFixed(2)} / $${(p.amount / 100).toFixed(2)}`);
  } else {
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    await stripe.products.update(productId, { tax_code: TAX_CODE });
    console.error(`Съществува: ${p.product} — €${(price.unit_amount / 100).toFixed(2)} / $${((price.currency_options?.usd?.unit_amount ?? 0) / 100).toFixed(2)}`);
  }
  prices[p.env] = price;
  lines.push(`${p.env}=${price.id}`);
}

// Customer Portal: смяна на карта и план, отказ в края на периода, фактури.
// Позната по metadata.app, за да не се създава отново при повторно пускане.
const portalFeatures = {
  payment_method_update: { enabled: true },
  invoice_history: { enabled: true },
  customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] },
  subscription_cancel: {
    enabled: true,
    mode: "at_period_end",
    cancellation_reason: {
      enabled: true,
      options: ["too_expensive", "missing_features", "unused", "switched_service", "other"],
    },
  },
  subscription_update: {
    enabled: true,
    default_allowed_updates: ["price"], // без количество — 2× Starter не дава повече кодове
    proration_behavior: "create_prorations",
    trial_update_behavior: "end_trial", // смяна на план по време на пробата я прекратява
    products: ["STRIPE_PRICE_STARTER", "STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS"].map((k) => ({
      product: typeof prices[k].product === "string" ? prices[k].product : prices[k].product.id,
      prices: [prices[k].id],
    })),
  },
};
const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
let portal = configs.data.find((c) => c.metadata?.app === "qrly");
if (portal) {
  portal = await stripe.billingPortal.configurations.update(portal.id, { features: portalFeatures });
  console.error(`Обновен: Customer Portal (${portal.id})`);
} else {
  portal = await stripe.billingPortal.configurations.create({
    metadata: { app: "qrly" },
    business_profile: { headline: "Manage your QRly subscription" },
    features: portalFeatures,
  });
  console.error(`Създаден: Customer Portal (${portal.id})`);
}
lines.push(`STRIPE_PORTAL_CONFIG=${portal.id}`);

console.error("\nКопирайте в .env.local:\n");
console.log(lines.join("\n"));
