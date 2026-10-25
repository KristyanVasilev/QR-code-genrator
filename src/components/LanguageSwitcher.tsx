"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Flag } from "./Flag";
import { useI18n } from "@/i18n/client";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, localePath, splitLocale, type Locale } from "@/i18n/config";

interface Props {
  /** В хедъра: само знаме + код; във футъра: знаме + пълно име */
  compact?: boolean;
  /** Отваря менюто нагоре (във футъра) */
  up?: boolean;
}

/**
 * Смяна на езика със знаменца. Запомня избора в бисквитка (има предимство
 * пред автоматичното определяне) и отваря същата страница на новия език.
 * Собствено меню вместо <select>, защото <option> не може да показва картинки.
 */
export function LanguageSwitcher({ compact = false, up = false }: Props) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // Затваряне при клик извън менюто
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) items.current[focus]?.focus();
  }, [open, focus]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.push(localePath(next, splitLocale(pathname).rest) + window.location.search);
  }

  function toggle() {
    setFocus(Math.max(0, LOCALES.indexOf(locale)));
    setOpen((o) => !o);
  }

  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>(".lang-trigger")?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus((f) => (f + 1) % LOCALES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus((f) => (f - 1 + LOCALES.length) % LOCALES.length);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className={`lang-switch ${compact ? "compact" : ""}`} onKeyDown={onKey}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t.nav.language}: ${LOCALE_NAMES[locale]}`}
        onClick={toggle}
      >
        <Flag locale={locale} />
        <span>{compact ? locale.toUpperCase() : LOCALE_NAMES[locale]}</span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className={`lang-menu ${up ? "up" : ""}`} role="listbox" aria-label={t.nav.language}>
          {LOCALES.map((l, i) => (
            <li key={l} role="presentation">
              <button
                ref={(el) => {
                  items.current[i] = el;
                }}
                type="button"
                role="option"
                aria-selected={l === locale}
                className={l === locale ? "active" : ""}
                onClick={() => choose(l)}
                lang={l}
              >
                <Flag locale={l} />
                <span>{LOCALE_NAMES[l]}</span>
                <span className="code">{l.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Вариант без usePathname — за Suspense fallback */
export function LanguageSwitcherFallback({ compact = true }: { compact?: boolean }) {
  const { locale } = useI18n();
  return (
    <div className={`lang-switch ${compact ? "compact" : ""}`} aria-hidden>
      <span className="lang-trigger">
        <Flag locale={locale} />
        <span>{compact ? locale.toUpperCase() : LOCALE_NAMES[locale]}</span>
      </span>
    </div>
  );
}
