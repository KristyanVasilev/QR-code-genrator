import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAccount } from "@/lib/account";
import { canCreateQr } from "@/lib/plans";
import { QrEditor } from "@/components/dashboard/QrEditor";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboard.newMeta };
}

export default async function NewQrPage() {
  const { t, href } = await getI18n();
  return (
    <>
      <header className="dash-head">
        <div>
          <Link href={href("/dashboard")} className="small">
            {t.dashboard.backToCodes}
          </Link>
          <h1>{t.dashboard.newTitle}</h1>
        </div>
      </header>
      <Suspense fallback={<div className="card skeleton" style={{ height: 480 }} aria-busy="true" />}>
        <NewQr />
      </Suspense>
    </>
  );
}

async function NewQr() {
  const [a, { t, href }] = await Promise.all([getAccount(), getI18n()]);
  const d = t.dashboard;
  // Проверката тук е за UX; истинската защита е тригерът в базата
  if (a.access && !canCreateQr(a.plan.id, a.qrCount)) {
    return (
      <div className="card empty">
        <h2 className="card-title">{d.limitTitle}</h2>
        <p className="muted">{fmt(d.limitText, { plan: a.plan.name, n: a.plan.limits.maxQrCodes ?? 0 })}</p>
        <div className="btn-row" style={{ marginTop: 16, maxWidth: 360 }}>
          <Link href={href("/pricing")} className="btn primary">
            {d.seePlans}
          </Link>
          <Link href={href("/dashboard")} className="btn">
            {d.nav.codes}
          </Link>
        </div>
      </div>
    );
  }
  return <QrEditor mode="create" access={a.access} trialEligible={!a.trialUsed} />;
}
