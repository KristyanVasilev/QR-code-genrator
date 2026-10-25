import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { LOCALE_COOKIE, localePath, pickLocale, splitLocale } from "@/i18n/config";

// Маршрути (без езиковия префикс), които изискват вход
const PROTECTED = ["/dashboard", "/reset-password"];
// Страници само за гости — влезлите потребители се пренасочват към таблото
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * 1. Адрес без език (/pricing) → пренасочване към /<език>/pricing.
 *    Езикът: изричен избор (бисквитка) → браузър (Accept-Language) →
 *    държава от хостинга → английски.
 * 2. Защитени страници: опреснява сесията и пази достъпа.
 *    Публичните страници не викат Supabase и остават статични.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, rest } = splitLocale(pathname);

  if (!locale) {
    const chosen = pickLocale({
      cookie: request.cookies.get(LOCALE_COOKIE)?.value,
      acceptLanguage: request.headers.get("accept-language"),
      // Vercel / Cloudflare / Netlify подават държавата на посетителя
      country:
        request.headers.get("x-vercel-ip-country") ??
        request.headers.get("cf-ipcountry") ??
        request.headers.get("x-country"),
    });
    const to = request.nextUrl.clone();
    to.pathname = localePath(chosen, pathname);
    to.search = search;
    const res = NextResponse.redirect(to);
    // Пренасочването зависи от заглавките — кешовете трябва да го знаят
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }

  if (!matches(rest, PROTECTED) && !matches(rest, GUEST_ONLY)) return NextResponse.next();

  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  // getClaims проверява подписа на JWT локално и при нужда опреснява токена.
  // Не добавяйте код между създаването на клиента и това извикване.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  if (!signedIn && matches(rest, PROTECTED)) {
    const to = request.nextUrl.clone();
    to.pathname = localePath(locale, "/login");
    to.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(to, response);
  }

  if (signedIn && matches(rest, GUEST_ONLY)) {
    const to = request.nextUrl.clone();
    to.pathname = localePath(locale, "/dashboard");
    to.search = "";
    return redirectWithCookies(to, response);
  }

  return response;
}

// Пренасочването трябва да запази евентуално опреснените бисквитки
function redirectWithCookies(to: URL, from: NextResponse) {
  const res = NextResponse.redirect(to);
  for (const c of from.cookies.getAll()) res.cookies.set(c);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: [
    // Всичко освен вътрешните файлове на Next, API, линковете от имейли и статичните файлове
    "/((?!_next|api|auth/confirm|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
