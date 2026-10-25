"use client";

import { useState, useTransition } from "react";
import { openBillingPortal, startCheckout } from "@/lib/billing/actions";
import type { PaidPlanId } from "@/lib/plans";
import { useI18n } from "@/i18n/client";

interface Props {
  /** Без план — отваря Stripe Customer Portal */
  plan?: PaidPlanId;
  returnTo?: string;
  className?: string;
  children: React.ReactNode;
}

/** Пренасочва към Stripe Checkout / Customer Portal (или към вход за гости). */
export function CheckoutButton({ plan, returnTo, className = "btn primary block", children }: Props) {
  const { t, locale, href } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const res = plan
        ? await startCheckout(plan, returnTo ?? href("/pricing"), locale)
        : await openBillingPortal(locale);
      if ("error" in res) setError(t.billing.errors[res.error as keyof typeof t.billing.errors] ?? t.common.tryAgain);
      else window.location.assign(res.url);
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={onClick} disabled={pending}>
        {pending ? t.pricing.redirecting : children}
      </button>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}
