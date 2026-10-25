"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createQr } from "@/lib/qr/actions";
import { takeDraft } from "@/lib/qr/draft";
import { useI18n } from "@/i18n/client";

/**
 * След успешно плащане: ако има чернова от генератора, създава кода
 * и отвежда към него. Иначе — направо към таблото.
 */
export function AfterCheckout({ active }: { active: boolean }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!active) {
      // Webhook-ът ще активира абонамента — опресняваме след малко
      const timer = setTimeout(() => router.refresh(), 4000);
      return () => clearTimeout(timer);
    }

    const draft = takeDraft();
    if (!draft) {
      router.replace(`${href("/dashboard")}?notice=subscribed`);
      return;
    }
    createQr({ name: draft.name, type: draft.type, content: draft.content, design: draft.design }).then((res) => {
      if (res.ok) router.replace(`${href(`/dashboard/codes/${res.id}`)}?notice=created`);
      else setError(t.qrErrors[res.error as keyof typeof t.qrErrors] ?? t.common.tryAgain);
    });
  }, [active, router, href, t]);

  return error ? (
    <p className="notice error">
      {error} <a href={href("/dashboard")}>{t.common.toDashboard}</a>
    </p>
  ) : null;
}
