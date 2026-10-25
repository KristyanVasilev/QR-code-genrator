"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "./session";
import { SITE } from "@/config/site";
import { isLocale, localePath, type Locale } from "@/i18n/config";

/**
 * Резултат от формите. Грешките са кодове — формата ги превежда
 * чрез речника (auth.errors). Езикът идва от скрито поле "lang".
 */
export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Код на успешно съобщение: "check_email" | "reset_sent" */
  message?: string;
  /** Връщаме въведения имейл, защото React нулира формата след action */
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // ограничение на bcrypt

const field = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

const langOf = (fd: FormData): Locale => {
  const l = fd.get("lang");
  return isLocale(l) ? l : "en";
};

function checkEmail(email: string) {
  if (!email) return "email_required";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "email_invalid";
}

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD) return "password_short";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD) return "password_long";
  // Поне една буква (всяка азбука) и една цифра
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "password_weak";
}

/** Код на грешка от Supabase Auth; непознатите не разкриват детайли. */
function authCode(err: AuthError): string {
  switch (err.code) {
    case "invalid_credentials":
    case "email_not_confirmed":
    case "weak_password":
    case "same_password":
    case "signup_disabled":
      return err.code;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate_limited";
    case "session_not_found":
    case "session_expired":
      return "session_expired";
    default:
      console.error("[auth]", err.code, err.message);
      return "unknown";
  }
}

const confirmUrl = (next: string) => `${SITE.url}/auth/confirm?next=${encodeURIComponent(next)}`;

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const email = field(fd, "email").trim().toLowerCase();
  const password = field(fd, "password");

  const fieldErrors: Record<string, string> = {};
  const e = checkEmail(email);
  if (e) fieldErrors.email = e;
  if (!password) fieldErrors.password = "password_required";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authCode(error), email };

  redirect(safeNext(fd.get("next"), localePath(lang, "/dashboard")));
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const email = field(fd, "email").trim().toLowerCase();
  const password = field(fd, "password");
  const confirm = field(fd, "confirm");
  const fullName = field(fd, "fullName").trim().slice(0, 100);

  const fieldErrors: Record<string, string> = {};
  const e = checkEmail(email);
  if (e) fieldErrors.email = e;
  const p = checkPassword(password);
  if (p) fieldErrors.password = p;
  else if (password !== confirm) fieldErrors.confirm = "password_mismatch";
  if (fd.get("terms") !== "on") fieldErrors.terms = "terms_required";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // locale позволява имейл шаблоните в Supabase да са на езика на потребителя
    options: { emailRedirectTo: confirmUrl(localePath(lang, "/dashboard")), data: { full_name: fullName, locale: lang } },
  });
  if (error) return { error: authCode(error), email };

  // Ако потвърждението по имейл е изключено в Supabase, сесията е готова веднага
  if (data.session) redirect(localePath(lang, "/dashboard"));

  // Supabase не разкрива дали имейлът вече е регистриран — съобщението е еднакво
  return { message: "check_email", email };
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const email = field(fd, "email").trim().toLowerCase();
  const e = checkEmail(email);
  if (e) return { fieldErrors: { email: e }, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: confirmUrl(localePath(lang, "/reset-password")),
  });
  // Еднакъв отговор независимо дали профилът съществува (без изброяване на акаунти)
  if (error && error.code?.startsWith("over_")) return { error: "rate_limited", email };
  if (error) console.error("[auth] reset", error.code, error.message);

  return { message: "reset_sent" };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const password = field(fd, "password");
  const confirm = field(fd, "confirm");

  const p = checkPassword(password);
  if (p) return { fieldErrors: { password: p } };
  if (password !== confirm) return { fieldErrors: { confirm: "password_mismatch" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authCode(error) };

  redirect(`${localePath(lang, "/dashboard")}?notice=password-updated`);
}

export async function signOut(fd: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(localePath(langOf(fd), "/"));
}
