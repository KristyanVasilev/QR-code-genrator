"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { signIn, type FormState } from "@/lib/auth/actions";
import { useI18n } from "@/i18n/client";
import { AuthField } from "./AuthField";
import { useAuthText } from "./useAuthText";

export function LoginForm() {
  const { t, locale, href } = useI18n();
  const err = useAuthText();
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  // Четем query параметрите в браузъра, за да остане страницата статична
  const [query, setQuery] = useState<{ next: string; notice?: string }>({ next: "" });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQuery({ next: p.get("next") ?? "", notice: p.get("error") ?? p.get("notice") ?? undefined });
  }, []);

  const notice =
    query.notice === "link"
      ? { kind: "error", text: t.auth.notices.link }
      : query.notice === "confirmed"
        ? { kind: "ok", text: t.auth.notices.confirmed }
        : null;

  return (
    <form action={action} className="auth-form" noValidate>
      {notice && !state.error && <p className={`notice ${notice.kind}`}>{notice.text}</p>}
      {state.error && (
        <p className="notice error" role="alert">
          {err(state.error)}
        </p>
      )}
      <input type="hidden" name="lang" value={locale} />
      <input type="hidden" name="next" value={query.next} />
      <AuthField
        name="email"
        label={t.auth.email}
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        key={state.email}
        error={err(state.fieldErrors?.email)}
      />
      <AuthField
        name="password"
        label={t.auth.password}
        type="password"
        autoComplete="current-password"
        required
        error={err(state.fieldErrors?.password)}
      />
      <div className="auth-row">
        <Link href={href("/forgot-password")} className="small">
          {t.auth.forgot}
        </Link>
      </div>
      <button type="submit" className="btn primary block" disabled={pending}>
        {pending ? t.auth.loggingIn : t.auth.loginBtn}
      </button>
    </form>
  );
}
