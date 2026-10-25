"use client";

import { createContext, use, type ReactNode } from "react";
import { fmt, formatDate, formatPrice, localePath, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

interface I18n {
  locale: Locale;
  t: Dictionary;
  /** Път с езиков префикс */
  href: (path: string) => string;
  fmt: typeof fmt;
  date: (iso: string | null | undefined) => string;
  price: (amount: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  const value: I18n = {
    locale,
    t: dictionary,
    href: (p) => localePath(locale, p),
    fmt,
    date: (iso) => formatDate(locale, iso),
    price: (n) => formatPrice(locale, n),
  };
  return <Ctx value={value}>{children}</Ctx>;
}

export function useI18n(): I18n {
  const v = use(Ctx);
  if (!v) throw new Error("useI18n трябва да е в I18nProvider");
  return v;
}
