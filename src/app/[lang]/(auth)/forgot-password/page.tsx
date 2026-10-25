import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.forgotTitle };
}

export default async function ForgotPasswordPage() {
  const { t, href } = await getI18n();
  return (
    <>
      <h1 className="auth-title">{t.auth.forgotTitle}</h1>
      <p className="muted small">{t.auth.forgotSubtitle}</p>
      <ForgotPasswordForm />
      <p className="auth-foot small">
        <Link href={href("/login")}>{t.auth.backToLogin}</Link>
      </p>
    </>
  );
}
