import "server-only";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { formatDate, formatPrice, isLocale, localePath, type Locale } from "./config";
import { loadDictionary } from "./dictionaries";

/** Текущият език от адреса (/bg/...) — за Server Components. */
export async function getLocale(): Promise<Locale> {
  const l = await lang();
  if (!isLocale(l)) notFound();
  return l;
}

/** Речникът на текущия език — за Server Components. */
export async function getDictionary() {
  return loadDictionary(await getLocale());
}

// За Server Actions и Route Handlers (там root-params не са достъпни)
// ползвайте loadDictionary(locale) от "@/i18n/dictionaries" с изрично подаден език.

/** Всичко нужно на Server Component: език, речник и форматиране. */
export async function getI18n() {
  const locale = await getLocale();
  const t = await loadDictionary(locale);
  return {
    locale,
    t,
    href: (p: string) => localePath(locale, p),
    date: (iso: string | null | undefined) => formatDate(locale, iso),
    price: (n: number) => formatPrice(locale, n),
  };
}
