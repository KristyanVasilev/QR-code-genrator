import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAccount } from "@/lib/account";
import { PLANS, RETENTION_DAYS, TRIAL } from "@/lib/plans";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.billing.metaTitle };
}

export default async function BillingPage() {
  const { t } = await getI18n();
  return (
    <>
      <header className="dash-head">
        <h1>{t.billing.title}</h1>
      </header>
      <Suspense fallback={<div className="card skeleton" style={{ height: 200 }} aria-busy="true" />}>
        <Billing />
      </Suspense>
    </>
  );
}

async function Billing() {
  const [a, { t, href, date, price }] = await Promise.all([getAccount(), getI18n()]);
  const b = t.billing;
  const starter = price(PLANS.starter.priceMonthly);

  if (!a.access) {
    return (
      <div className="card empty">
        <h2 className="card-title">{b.noneTitle}</h2>
        <p className="muted">
          {a.trialUsed
            ? fmt(b.noneTrialUsed, { price: starter })
            : fmt(b.noneTrial, { days: TRIAL.days, trial: price(TRIAL.price), price: starter })}
          {a.purgeAt && ` ${fmt(b.nonePurge, { date: date(a.purgeAt) })}`}
        </p>
        <div className="btn-row" style={{ marginTop: 16, maxWidth: 420 }}>
          <Link href={href("/pricing")} className="btn primary">
            {b.seePlans}
          </Link>
          {a.hasStripeCustomer && <CheckoutButton className="btn">{b.invoices}</CheckoutButton>}
        </div>
      </div>
    );
  }

  const monthly = price(a.plan.priceMonthly);
  const statuses: Record<string, string> = b.statuses;

  return (
    <div className="card billing">
      <dl className="billing-grid">
        <dt>{b.plan}</dt>
        <dd>
          <strong>{a.plan.name}</strong> — {monthly}
          {t.common.perMonth}
        </dd>
        <dt>{b.status}</dt>
        <dd>{statuses[a.status ?? ""] ?? a.status}</dd>
        <dt>{a.trialing ? b.trialEnds : a.cancelAtPeriodEnd ? b.activeUntil : b.nextPayment}</dt>
        <dd>
          {date(a.currentPeriodEnd)}
          {a.trialing && !a.cancelAtPeriodEnd && fmt(b.trialCharge, { price: monthly })}
        </dd>
        <dt>{b.codes}</dt>
        <dd>
          {a.qrCount}
          {a.plan.limits.maxQrCodes !== null && fmt(b.of, { n: a.plan.limits.maxQrCodes })}
        </dd>
      </dl>
      {a.cancelAtPeriodEnd && (
        <p className="notice warn">{fmt(b.canceledNote, { date: date(a.currentPeriodEnd), days: RETENTION_DAYS })}</p>
      )}
      <div className="btn-row" style={{ marginTop: 16, maxWidth: 420 }}>
        <CheckoutButton className="btn primary">{b.manageBtn}</CheckoutButton>
      </div>
      <p className="muted small">{b.portalNote}</p>
    </div>
  );
}
