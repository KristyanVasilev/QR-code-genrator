"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type FormState } from "@/lib/auth/actions";
import { useI18n } from "@/i18n/client";
import { AuthField } from "./AuthField";
import { useAuthText } from "./useAuthText";

export function RegisterForm() {
  const { t, fmt, locale, href } = useI18n();
  const err = useAuthText();
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});

  if (state.message === "check_email") {
    return (
      <div className="auth-done">
        <p className="notice ok" role="status">
          {fmt(t.auth.checkEmail, { email: state.email ?? "" })}
        </p>
        <p className="muted small">{t.auth.noEmail}</p>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form" noValidate>
      {state.error && (
        <p className="notice error" role="alert">
          {err(state.error)}
        </p>
      )}
      <input type="hidden" name="lang" value={locale} />
      <AuthField name="fullName" label={t.auth.fullName} type="text" autoComplete="name" maxLength={100} />
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
        autoComplete="new-password"
        required
        minLength={8}
        error={err(state.fieldErrors?.password)}
      />
      <AuthField
        name="confirm"
        label={t.auth.confirm}
        type="password"
        autoComplete="new-password"
        required
        error={err(state.fieldErrors?.confirm)}
      />
      <div className="field">
        <label className="checkbox">
          <input type="checkbox" name="terms" aria-invalid={state.fieldErrors?.terms ? true : undefined} />
          <span>
            {t.auth.agreePrefix} <Link href={href("/terms")}>{t.auth.termsLink}</Link> {t.auth.and}{" "}
            <Link href={href("/privacy")}>{t.auth.privacyLink}</Link>
          </span>
        </label>
        {state.fieldErrors?.terms && <p className="field-error">{err(state.fieldErrors.terms)}</p>}
      </div>
      <p className="field-help">{t.auth.passwordHelp}</p>
      <button type="submit" className="btn primary block" disabled={pending}>
        {pending ? t.auth.registering : t.auth.registerBtn}
      </button>
    </form>
  );
}
