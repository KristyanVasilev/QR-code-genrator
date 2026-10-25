import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/session";
import { DEFAULT_LOCALE, localePath, splitLocale } from "@/i18n/config";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Приема линковете от имейлите на Supabase (потвърждение на регистрация,
 * смяна на парола). Поддържа и двата формата:
 *  - ?token_hash=…&type=…  (препоръчителен — работи и на друго устройство)
 *  - ?code=…               (PKCE — шаблоните по подразбиране; същият браузър)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  // Езикът се взима от next (/bg/dashboard), за да остане потребителят на своя език
  const locale = splitLocale(next).locale ?? DEFAULT_LOCALE;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("[auth/confirm] verifyOtp", error.code);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("[auth/confirm] exchange", error.code);
  }

  const target = new URL(ok ? next : `${localePath(locale, "/login")}?error=link`, request.nextUrl.origin);
  // При смяна на парола винаги отиваме към формата за нова парола
  if (ok && type === "recovery") target.pathname = localePath(locale, "/reset-password");
  const res = NextResponse.redirect(target);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
