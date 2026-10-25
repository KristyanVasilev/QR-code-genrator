import type { Metadata } from "next";
import { PLANS, RETENTION_DAYS, TRIAL } from "@/lib/plans";
import { PricingSelector } from "@/components/billing/PricingSelector";
import { CheckoutCanceledNotice } from "@/components/billing/CheckoutCanceledNotice";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pricing.metaTitle };
}

export default async function PricingPage() {
  const { t, href, price } = await getI18n();
  const p = t.pricing;
  const trial = price(TRIAL.price);
  const starter = price(PLANS.starter.priceMonthly);

  return (
    <div className="container">
      <section className="hero">
        <span className="eyebrow rise">{p.eyebrow}</span>
        <h1 className="rise d1">{p.title}</h1>
        <p className="rise d2">{fmt(p.subtitle, { days: TRIAL.days, price: trial })}</p>
      </section>

      <div style={{ maxWidth: 880, margin: "40px auto 0" }}>
        <CheckoutCanceledNotice />
        <PricingSelector returnTo={href("/pricing")} />

        <section className="card terms-summary">
          <h2 className="card-title">{p.howTitle}</h2>
          <ul className="muted small">
            <li>{fmt(p.how1, { days: TRIAL.days, trial, price: starter })}</li>
            <li>{p.how2}</li>
            <li>{fmt(p.how3, { days: RETENTION_DAYS })}</li>
            <li>{p.how4}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
