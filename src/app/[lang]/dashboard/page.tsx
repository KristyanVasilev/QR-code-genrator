import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAccount } from "@/lib/account";
import { listQrCodes, PAGE_SIZE } from "@/lib/qr/queries";
import { getQrType } from "@/lib/qr/types";
import { PLANS, TRIAL } from "@/lib/plans";
import { QrCard } from "@/components/dashboard/QrCard";
import { LockedNotice } from "@/components/dashboard/LockedNotice";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboard.metaTitle };
}

export default function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  return (
    <>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <Codes searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Overview() {
  const [a, { t, href, date, price }] = await Promise.all([getAccount(), getI18n()]);
  const d = t.dashboard;
  const max = a.plan.limits.maxQrCodes;

  return (
    <>
      <header className="dash-head">
        <div>
          <h1>
            {d.hello}
            {a.fullName ? `, ${a.fullName}` : ""}!
          </h1>
          <p className="muted small">{a.email}</p>
        </div>
        <Link href={href("/dashboard/new")} className="btn primary">
          {d.newCode}
        </Link>
      </header>

      {!a.access && a.qrCount > 0 && <LockedNotice purgeAt={a.purgeAt} compact />}

      <div className="stats">
        <div className="card stat">
          <span className="muted small">{d.savedCodes}</span>
          <strong>
            {a.qrCount}
            {a.access && max !== null && <span className="muted"> / {max}</span>}
          </strong>
          {a.access && max !== null && (
            <div className="meter" aria-hidden>
              <span style={{ width: `${Math.min(100, (a.qrCount / max) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="card stat glow">
          <span className="muted small">{d.subscription}</span>
          <strong>{a.access ? a.plan.name : d.noneShort}</strong>
          <span className="muted small">
            {!a.access
              ? a.trialUsed
                ? fmt(d.fromPrice, { price: price(PLANS.starter.priceMonthly) })
                : fmt(d.trialOffer, { days: TRIAL.days, price: price(TRIAL.price) })
              : a.trialing
                ? fmt(d.trialUntil, { date: date(a.currentPeriodEnd) })
                : a.cancelAtPeriodEnd
                  ? fmt(d.endsOn, { date: date(a.currentPeriodEnd) })
                  : fmt(d.renewsOn, { date: date(a.currentPeriodEnd) })}
          </span>
          <Link href={href(a.access ? "/dashboard/billing" : "/pricing")} className="small">
            {a.access ? d.manage : d.choose}
          </Link>
        </div>
      </div>
    </>
  );
}

async function Codes({ searchParams }: Pick<PageProps<"/[lang]/dashboard">, "searchParams">) {
  const [sp, { t, href, date }] = await Promise.all([searchParams, getI18n()]);
  const d = t.dashboard;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Math.min(1000, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));
  const account = await getAccount();
  const { items, total } = await listQrCodes({ page, q, locked: !account.access });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = href("/dashboard");

  const pageHref = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (p > 1) s.set("page", String(p));
    const str = s.toString();
    return str ? `${base}?${str}` : base;
  };

  return (
    <section className="codes">
      <div className="codes-head">
        <h2>{d.codesTitle}</h2>
        {/* Обикновена GET форма — работи и без JavaScript */}
        <form action={base} className="search" role="search">
          <input type="search" name="q" defaultValue={q} placeholder={d.search} maxLength={100} aria-label={d.searchLabel} />
        </form>
      </div>

      {items.length === 0 ? (
        <div className="card empty center">
          {q ? (
            <p className="muted">
              {fmt(d.noResults, { q })} <Link href={base}>{d.showAll}</Link>
            </p>
          ) : (
            <>
              <p className="muted">{d.empty}</p>
              <Link href={href("/dashboard/new")} className="btn primary" style={{ marginTop: 12 }}>
                {d.createFirst}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="qr-grid">
          {items.map((c) => {
            const typeId = getQrType(c.type)?.id;
            return (
              <QrCard
                key={c.id}
                id={c.id}
                name={c.name}
                typeLabel={typeId ? t.qr.types[typeId].label : c.type}
                payload={c.payload}
                design={c.design}
                date={date(c.created_at)}
              />
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label={d.pages}>
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn sm">
              {d.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className="muted small">{fmt(d.pageOf, { page, pages })}</span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="btn sm">
              {d.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: "40%" }} />
      <div className="stats">
        <div className="card skeleton" style={{ height: 110 }} />
        <div className="card skeleton" style={{ height: 110 }} />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="qr-grid" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card skeleton" style={{ height: 300 }} />
      ))}
    </div>
  );
}
