import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE } from "@/config/site";
import { I18nProvider } from "@/i18n/client";
import { fmt, LOCALE_TAGS, LOCALES } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], display: "swap", variable: "--font-sans" });
// Заглавия — Inter Tight 600, както в шаблона Atoks
const interTight = Inter_Tight({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-tight",
});

// Всеки език се пререндерира статично
export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(SITE.url),
    title: { default: fmt(t.meta.title, { site: SITE.name }), template: `%s · ${SITE.name}` },
    description: t.meta.description,
    // hreflang: Google показва правилния език за всяка държава
    alternates: {
      languages: { ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}`])), "x-default": "/en" },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, t } = await getI18n();
  return (
    <html lang={LOCALE_TAGS[locale]} className={`${inter.variable} ${interTight.variable}`}>
      <body>
        <I18nProvider locale={locale} dictionary={t}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
