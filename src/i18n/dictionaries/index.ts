import type { Locale } from "../config";
import { en, type Dictionary } from "./en";

// Зареждане при нужда — всеки език е отделен модул
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => en,
  bg: () => import("./bg").then((m) => m.bg),
  es: () => import("./es").then((m) => m.es),
  de: () => import("./de").then((m) => m.de),
  fr: () => import("./fr").then((m) => m.fr),
  it: () => import("./it").then((m) => m.it),
};

export const loadDictionary = (locale: Locale) => loaders[locale]();
export type { Dictionary };
