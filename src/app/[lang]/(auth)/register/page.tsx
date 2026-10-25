import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.registerMeta };
}

export default async function RegisterPage() {
  const { t, href } = await getI18n();
  return (
    <>
      <h1 className="auth-title">{t.auth.registerTitle}</h1>
      <p className="muted small">{t.auth.registerSubtitle}</p>
      <RegisterForm />
      <p className="auth-foot small">
        {t.auth.haveAccount} <Link href={href("/login")}>{t.auth.logIn}</Link>
      </p>
    </>
  );
}
