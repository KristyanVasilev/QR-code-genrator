import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.loginMeta };
}

export default async function LoginPage() {
  const { t, href } = await getI18n();
  return (
    <>
      <h1 className="auth-title">{t.auth.loginTitle}</h1>
      <p className="muted small">{t.auth.loginSubtitle}</p>
      <LoginForm />
      <p className="auth-foot small">
        {t.auth.noAccount} <Link href={href("/register")}>{t.auth.signUp}</Link>
      </p>
    </>
  );
}
