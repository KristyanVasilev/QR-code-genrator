// Поддържани езици. Английският е основен (по подразбиране).
// Нов език: добавете кода тук, речник в ./dictionaries и запис в ./dictionaries/index.ts.

export const LOCALES = ["en", "bg", "es", "de", "fr", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Бисквитка с изричния избор на потребителя (има предимство пред автоматичното определяне) */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  bg: "Български",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
};

/** Пълен BCP 47 таг за Intl форматиране и <html lang>. Английският е американски (основен пазар — САЩ). */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  bg: "bg-BG",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
};

/**
 * Валута за показване на цените. Английският е за пазара в САЩ → $,
 * езиците от ЕС → €. Реалната валута при плащане избира Stripe по
 * местоположението на клиента (цени с currency_options: USD и EUR);
 * останалите държави виждат автоматично превалутирана цена.
 */
export type Currency = "usd" | "eur";
export const LOCALE_CURRENCY: Record<Locale, Currency> = {
  en: "usd",
  bg: "eur",
  es: "eur",
  de: "eur",
  fr: "eur",
  it: "eur",
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

// Държава (ISO 3166) → език, когато браузърът не подсказва поддържан език
const COUNTRY_LOCALE: Record<string, Locale> = {
  BG: "bg",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es", UY: "es", PY: "es", BO: "es",
  CR: "es", PA: "es", DO: "es", GT: "es", HN: "es", SV: "es", NI: "es", CU: "es", PR: "es",
  DE: "de", AT: "de", CH: "de", LI: "de",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr", SN: "fr", CI: "fr",
  IT: "it", SM: "it", VA: "it",
};

/**
 * Избира език: 1) изричен избор (бисквитка) 2) Accept-Language на браузъра
 * 3) държава от хостинга (Vercel/Netlify/Cloudflare заглавки) 4) английски.
 */
export function pickLocale(opts: { cookie?: string | null; acceptLanguage?: string | null; country?: string | null }): Locale {
  if (isLocale(opts.cookie)) return opts.cookie;

  // "bg-BG,bg;q=0.9,en;q=0.8" → по тежест
  const langs = (opts.acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((l) => l.base && !Number.isNaN(l.q))
    .sort((a, b) => b.q - a.q);
  for (const l of langs) if (isLocale(l.base)) return l.base;

  const byCountry = opts.country ? COUNTRY_LOCALE[opts.country.toUpperCase()] : undefined;
  return byCountry ?? DEFAULT_LOCALE;
}

/** Пътят с езиков префикс: localePath("bg", "/pricing") → "/bg/pricing" */
export const localePath = (locale: Locale, path = "/") => `/${locale}${path === "/" ? "" : path}`;

/** Маха езиковия префикс: "/bg/pricing" → { locale: "bg", rest: "/pricing" } */
export function splitLocale(pathname: string): { locale: Locale | null; rest: string } {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first)) return { locale: first, rest: `/${rest.join("/")}` };
  return { locale: null, rest: pathname };
}

export function formatDate(locale: Locale, iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString(LOCALE_TAGS[locale]) : "";
}

export function formatPrice(locale: Locale, amount: number) {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency: LOCALE_CURRENCY[locale].toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Замества {име} в текста: fmt("До {n} кода", { n: 5 }) */
export function fmt(text: string, vars: Record<string, string | number> = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
