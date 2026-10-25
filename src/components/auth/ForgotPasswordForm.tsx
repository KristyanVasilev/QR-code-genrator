"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "@/lib/auth/actions";
import { useI18n } from "@/i18n/client";
import { AuthField } from "./AuthField";
import { useAuthText } from "./useAuthText";

export function ForgotPasswordForm() {
  const { t, locale } = useI18n();
  const err = useAuthText();
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});

  if (state.message === "reset_sent") {
    return (
      <p className="notice ok" role="status">
        {t.auth.resetSent}
      </p>
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
      <button type="submit" className="btn primary block" disabled={pending}>
        {pending ? t.auth.sending : t.auth.sendLink}
      </button>
    </form>
  );
}
