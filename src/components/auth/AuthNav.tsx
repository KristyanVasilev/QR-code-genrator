"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "./SignOutButton";
import { ArrowUpRight } from "@/components/icons";
import { useI18n } from "@/i18n/client";

// Supabase пази сесията в бисквитка sb-<проект>-auth-token (понякога на части .0, .1)
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

/**
 * Показва „Вход/Започнете“ или „Табло/Изход“ само по наличието на бисквитката.
 * Това е чисто визуално — без заявка към сървъра, така публичните страници
 * остават статични. Реалната защита е в proxy.ts и в базата (RLS).
 */
export function AuthNav() {
  const { t, href } = useI18n();
  const pathname = usePathname();
  const [state, setState] = useState<"unknown" | "guest" | "user">("unknown");

  useEffect(() => {
    setState(SESSION_COOKIE.test(document.cookie) ? "user" : "guest");
  }, [pathname]);

  if (state === "user") {
    return (
      <nav className="nav nav-right">
        <SignOutButton className="link-btn hide-sm" />
        <Link href={href("/dashboard")} className="btn primary">
          {t.nav.dashboard} <ArrowUpRight />
        </Link>
      </nav>
    );
  }

  return <GuestNav hidden={state === "unknown"} />;
}

export function GuestNav({ hidden = false }: { hidden?: boolean }) {
  const { t, href } = useI18n();
  return (
    <nav className="nav nav-right" style={hidden ? { visibility: "hidden" } : undefined}>
      <Link href={href("/login")} className="hide-sm">
        {t.nav.login}
      </Link>
      <Link href={href("/register")} className="btn primary">
        {t.nav.getStarted} <ArrowUpRight />
      </Link>
    </nav>
  );
}
