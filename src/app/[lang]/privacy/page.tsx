import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.privacyTitle };
}

// TODO: заменете с пълна политика (GDPR) преди публичен старт
export default async function PrivacyPage() {
  const { t } = await getI18n();
  return (
    <div className="container prose">
      <h1>{t.legal.privacyTitle}</h1>
      <p className="notice warn">{t.legal.draft}</p>
      <p>{fmt(t.legal.privacy1, { site: SITE.name })}</p>
    </div>
  );
}
