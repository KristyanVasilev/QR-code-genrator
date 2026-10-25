"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QrGenerator, type QrDraft } from "@/components/qr/QrGenerator";
import { createQr, updateQr } from "@/lib/qr/actions";
import { saveDraft, takeDraft } from "@/lib/qr/draft";
import { startCheckout } from "@/lib/billing/actions";
import { PLANS, TRIAL, type PaidPlanId } from "@/lib/plans";
import { PlanRows } from "@/components/billing/PlanRows";
import { useI18n } from "@/i18n/client";

type Props =
  | { mode: "create"; access: boolean; trialEligible: boolean }
  | { mode: "edit"; id: string; initial: QrDraft };

export function QrEditor(props: Props) {
  const { t, fmt, href, price, locale } = useI18n();
  const d = t.dashboard;
  const router = useRouter();
  const [draft, setDraft] = useState<QrDraft | undefined>(props.mode === "edit" ? props.initial : undefined);
  const [ready, setReady] = useState(props.mode === "edit");
  const [plan, setPlan] = useState<PaidPlanId>("starter");

  // Кодовете за грешки от сървъра → текст на текущия език
  const qrError = (code: string) => t.qrErrors[code as keyof typeof t.qrErrors] ?? t.common.tryAgain;

  // При нов код: зарежда чернова от публичния генератор, ако има такава
  useEffect(() => {
    if (props.mode !== "create") return;
    const dr = takeDraft();
    if (dr) setDraft(dr);
    setReady(true);
  }, [props.mode]);

  if (!ready) return <div className="card skeleton" style={{ height: 480 }} aria-busy="true" />;

  if (props.mode === "edit") {
    const { id } = props;
    return (
      <QrGenerator
        initial={draft}
        preview="real"
        saveLabel={d.saveChanges}
        onSave={async (v) => {
          const res = await updateQr(id, { name: v.name, type: v.type, content: v.content, design: v.design });
          if (!res.ok) return { error: qrError(res.error) };
        }}
      />
    );
  }

  // Активен абонамент: създаваме кода директно
  if (props.access) {
    return (
      <QrGenerator
        initial={draft}
        saveLabel={d.createCode}
        onSave={async (v) => {
          const res = await createQr({ name: v.name, type: v.type, content: v.content, design: v.design });
          if (!res.ok) return { error: qrError(res.error) };
          router.push(`${href(`/dashboard/codes/${res.id}`)}?notice=created`);
        }}
      />
    );
  }

  // Без абонамент: черновата се пази, плащане в Stripe, после кодът се създава автоматично
  const trial = plan === TRIAL.plan && props.trialEligible;
  const monthly = price(PLANS[plan].priceMonthly);
  const trialPrice = price(TRIAL.price);

  return (
    <>
      <section className="card paywall">
        <h2 className="card-title">{d.paywallTitle}</h2>
        <p className="muted small">{d.paywallText}</p>
        <PlanRows value={plan} onChange={setPlan} trialEligible={props.trialEligible} />
      </section>

      <QrGenerator
        initial={draft}
        saveLabel={trial ? fmt(d.payTrial, { trial: trialPrice, days: TRIAL.days }) : fmt(d.payMonthly, { price: monthly })}
        saveHint={
          trial
            ? fmt(d.payTrialHint, { trial: trialPrice, days: TRIAL.days, price: monthly })
            : fmt(d.payMonthlyHint, { price: monthly })
        }
        onSave={async (v) => {
          saveDraft({ name: v.name, type: v.type, content: v.content, design: v.design });
          const res = await startCheckout(plan, href("/dashboard/new"), locale);
          if ("error" in res) return { error: t.billing.errors[res.error as keyof typeof t.billing.errors] ?? t.common.tryAgain };
          window.location.assign(res.url);
        }}
      />
    </>
  );
}
