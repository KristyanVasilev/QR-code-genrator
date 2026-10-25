"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/lib/auth/actions";
import { useI18n } from "@/i18n/client";

function Submit({ className }: { className: string }) {
  const { t } = useI18n();
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? t.nav.signingOut : t.nav.signOut}
    </button>
  );
}

export function SignOutButton({ className = "link-btn" }: { className?: string }) {
  const { locale } = useI18n();
  return (
    <form action={signOut}>
      <input type="hidden" name="lang" value={locale} />
      <Submit className={className} />
    </form>
  );
}
