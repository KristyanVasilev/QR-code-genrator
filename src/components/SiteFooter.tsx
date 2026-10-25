import Link from "next/link";
import { Suspense } from "react";
import { SITE } from "@/config/site";
import { Logo } from "./SiteHeader";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./LanguageSwitcher";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { t, href } = await getI18n();
  const home = href("/");
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Logo />
            <p>{t.footer.tagline}</p>
            <div style={{ marginTop: 18 }}>
              <Suspense fallback={<LanguageSwitcherFallback compact={false} />}>
                <LanguageSwitcher up />
              </Suspense>
            </div>
          </div>
          <div className="footer-col">
            <h4>{t.footer.product}</h4>
            <Link href={`${home}#generator`}>{t.nav.generator}</Link>
            <Link href={`${home}#features`}>{t.nav.features}</Link>
            <Link href={href("/pricing")}>{t.nav.pricing}</Link>
            <Link href={`${home}#faq`}>{t.nav.faq}</Link>
          </div>
          <div className="footer-col">
            <h4>{t.footer.account}</h4>
            <Link href={href("/login")}>{t.nav.login}</Link>
            <Link href={href("/register")}>{t.footer.register}</Link>
            <Link href={href("/dashboard")}>{t.footer.myCodes}</Link>
          </div>
          <div className="footer-col">
            <h4>{t.footer.legal}</h4>
            <Link href={href("/terms")}>{t.footer.terms}</Link>
            <Link href={href("/privacy")}>{t.footer.privacy}</Link>
          </div>
        </div>
        <div className="wordmark" aria-hidden>
          {SITE.name}
        </div>
        <div className="footer-bottom">
          <span>{fmt(t.footer.rights, { site: SITE.name })}</span>
          <span>{t.footer.stripe}</span>
        </div>
      </div>
    </footer>
  );
}
