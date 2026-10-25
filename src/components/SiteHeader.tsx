import Link from "next/link";
import { Suspense } from "react";
import { SITE } from "@/config/site";
import { AuthNav, GuestNav } from "@/components/auth/AuthNav";
import { LanguageSwitcher, LanguageSwitcherFallback } from "@/components/LanguageSwitcher";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function Logo() {
  const { t, href } = await getI18n();
  return (
    <Link href={href("/")} className="logo" aria-label={fmt(t.nav.home, { site: SITE.name })}>
      <span className="logo-mark" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="#fff">
          <path d="M0 0h6v6H0zM8 0h6v6H8zM0 8h6v6H0zM8 8h2v2H8zM12 8h2v2h-2zM10 10h2v2h-2zM8 12h2v2H8zM12 12h2v2h-2z" />
        </svg>
      </span>
      {SITE.name}
    </Link>
  );
}

export async function SiteHeader() {
  const { t, href } = await getI18n();
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="nav" aria-label={t.nav.mainNav}>
          <Link href={`${href("/")}#generator`}>{t.nav.generator}</Link>
          <Link href={`${href("/")}#features`}>{t.nav.features}</Link>
          <Link href={href("/pricing")}>{t.nav.pricing}</Link>
          <Link href={`${href("/")}#faq`}>{t.nav.faq}</Link>
        </nav>
        {/* usePathname изисква Suspense при динамични маршрути */}
        <div className="header-actions">
          <Suspense fallback={<LanguageSwitcherFallback />}>
            <LanguageSwitcher compact />
          </Suspense>
          <Suspense fallback={<GuestNav hidden />}>
            <AuthNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
