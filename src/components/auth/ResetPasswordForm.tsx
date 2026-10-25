"use client";

import { useActionState } from "react";
import { updatePassword, type FormState } from "@/lib/auth/actions";
import { useI18n } from "@/i18n/client";
import { AuthField } from "./AuthField";
import { useAuthText } from "./useAuthText";

export function ResetPasswordForm() {
  const { t, locale } = useI18n();
  const err = useAuthText();
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, {});

  return (
    <form action={action} className="auth-form" noValidate>
      {state.error && (
        <p className="notice error" role="alert">
          {err(state.error)}
        </p>
      )}
      <input type="hidden" name="lang" value={locale} />
      <AuthField
        name="password"
        label={t.auth.newPassword}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        error={err(state.fieldErrors?.password)}
      />
      <AuthField
        name="confirm"
        label={t.auth.confirmNew}
        type="password"
        autoComplete="new-password"
        required
        error={err(state.fieldErrors?.confirm)}
      />
      <p className="field-help">{t.auth.passwordHelp}</p>
      <button type="submit" className="btn primary block" disabled={pending}>
        {pending ? t.auth.saving : t.auth.savePassword}
      </button>
    </form>
  );
}
