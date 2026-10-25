import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.resetTitle };
}

// Защитена от proxy.ts: достъпна след линка от имейла или за влезли потребители
export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  return (
    <>
      <h1 className="auth-title">{t.auth.resetTitle}</h1>
      <p className="muted small">{t.auth.resetSubtitle}</p>
      <ResetPasswordForm />
    </>
  );
}
