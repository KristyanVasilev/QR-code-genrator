"use client";

import { useI18n } from "@/i18n/client";

/** Превежда код на грешка от действията за вход (auth.errors.<код>). */
export function useAuthText() {
  const { t } = useI18n();
  return (code: string | undefined) =>
    code ? (t.auth.errors[code as keyof typeof t.auth.errors] ?? t.auth.errors.unknown) : undefined;
}
