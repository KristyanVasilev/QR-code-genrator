"use client";

import { PAID_PLANS, TRIAL, type PaidPlanId } from "@/lib/plans";
import { useI18n } from "@/i18n/client";

interface Props {
  value: PaidPlanId;
  onChange: (plan: PaidPlanId) => void;
  /** Показва цената на пробния период за Starter */
  trialEligible?: boolean;
  name?: string;
}

/** Планове като редове с радио бутон; избраният ред е в градиент. */
export function PlanRows({ value, onChange, trialEligible = true, name = "plan" }: Props) {
  const { t, fmt, price } = useI18n();
  return (
    <div className="plan-rows" role="radiogroup" aria-label={t.plans.radiogroup}>
      {PAID_PLANS.map((p) => {
        const id = p.id as PaidPlanId;
        const trial = id === TRIAL.plan && trialEligible;
        const active = value === id;
        const monthly = price(p.priceMonthly);
        return (
          <label key={id} className={`plan-row ${active ? "active" : ""}`}>
            <input type="radio" name={name} value={id} checked={active} onChange={() => onChange(id)} />
            <span className="plan-radio" aria-hidden />
            <span>
              <span className="plan-row-name">{p.name}</span>
              <span className="plan-row-desc">
                {" "}
                — {p.limits.maxQrCodes === null ? t.plans.unlimited : fmt(t.plans.upTo, { n: p.limits.maxQrCodes })}
              </span>
              <span className="plan-row-desc" style={{ display: "block" }}>
                {t.plans[id].tagline}
              </span>
            </span>
            <span className="plan-row-price">
              {trial ? price(TRIAL.price) : `${monthly}${t.common.perMonth}`}
              <small>{trial ? fmt(t.plans.trialPrice, { days: TRIAL.days, price: monthly }) : t.plans.renewsMonthly}</small>
            </span>
          </label>
        );
      })}
    </div>
  );
}
