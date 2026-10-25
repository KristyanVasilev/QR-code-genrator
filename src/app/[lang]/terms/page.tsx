import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { PLANS, RETENTION_DAYS, TRIAL } from "@/lib/plans";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.termsTitle };
}

// TODO: заменете с реалните условия преди публичен старт (консултирайте се с юрист)
export default async function TermsPage() {
  const { t, price } = await getI18n();
  const l = t.legal;
  const vars = {
    site: SITE.name,
    days: TRIAL.days,
    trial: price(TRIAL.price),
    price: price(PLANS.starter.priceMonthly),
    retention: RETENTION_DAYS,
  };
  return (
    <div className="container prose">
      <h1>{l.termsTitle}</h1>
      <p className="notice warn">{l.draft}</p>
      <p>{fmt(l.terms1, vars)}</p>
      <p>{fmt(l.terms2, vars)}</p>
      <p>{fmt(l.terms3, vars)}</p>
    </div>
  );
}
