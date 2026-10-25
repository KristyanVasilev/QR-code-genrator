import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { confirmCheckout } from "@/lib/billing/confirm";
import { AfterCheckout } from "@/components/dashboard/AfterCheckout";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.billing.successMeta };
}

export default async function BillingSuccessPage({ searchParams }: PageProps<"/[lang]/dashboard/billing/success">) {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<p className="muted">{t.billing.confirming}</p>}>
      <Confirm searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirm({ searchParams }: Pick<PageProps<"/[lang]/dashboard/billing/success">, "searchParams">) {
  const [sp, { t, href }] = await Promise.all([searchParams, getI18n()]);
  const b = t.billing;
  const id = typeof sp.session_id === "string" ? sp.session_id : "";
  const result = await confirmCheckout(id);

  if (result === "invalid") {
    return (
      <div className="card empty">
        <h1 className="card-title">{b.invalidSession}</h1>
        <p className="muted">
          <Link href={href("/dashboard")}>{t.common.toDashboard}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card empty">
      <h1 className="card-title">{result === "ok" ? b.activeTitle : b.pendingTitle}</h1>
      <p className="muted">{result === "ok" ? b.activeText : b.pendingText}</p>
      <AfterCheckout key={result} active={result === "ok"} />
    </div>
  );
}
