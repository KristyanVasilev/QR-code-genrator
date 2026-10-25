"use client";

import { useState } from "react";
import { PLANS, TRIAL, type PaidPlanId } from "@/lib/plans";
import { ArrowUpRight, Check } from "@/components/icons";
import { useI18n } from "@/i18n/client";
import { CheckoutButton } from "./CheckoutButton";
import { PlanRows } from "./PlanRows";

/** Избор на план + обобщение на включеното + бутон към Stripe Checkout. */
export function PricingSelector({ returnTo }: { returnTo?: string }) {
  const { t, fmt, price, href } = useI18n();
  const [plan, setPlan] = useState<PaidPlanId>("starter");
  const p = PLANS[plan];
  const trial = plan === TRIAL.plan;
  const monthly = price(p.priceMonthly);
  const trialPrice = price(TRIAL.price);

  return (
    <>
      <PlanRows value={plan} onChange={setPlan} />
      <div className="plan-summary">
        <div>
          <h3 className="card-title">{fmt(t.pricing.includes, { plan: p.name })}</h3>
          <ul>
            {t.plans[plan].features.map((f) => (
              <li key={f}>
                <Check />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="cta">
          <CheckoutButton plan={plan} returnTo={returnTo ?? href("/pricing")} className="btn gradient lg block">
            {trial ? fmt(t.pricing.startFor, { price: trialPrice }) : fmt(t.pricing.choose, { plan: p.name })} <ArrowUpRight />
          </CheckoutButton>
          <p className="muted small center" style={{ margin: 0 }}>
            {trial
              ? fmt(t.pricing.trialNote, { days: TRIAL.days, trial: trialPrice, price: monthly })
              : fmt(t.pricing.monthlyNote, { price: monthly })}
          </p>
        </div>
      </div>
      <p className="muted small center" style={{ marginTop: 12 }}>
        {t.pricing.currencyNote}
      </p>
    </>
  );
}
