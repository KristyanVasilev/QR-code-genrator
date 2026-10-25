"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useI18n } from "@/i18n/client";
import { splitLocale } from "@/i18n/config";

const LINKS = [
  { href: "/dashboard", key: "codes", exact: true },
  { href: "/dashboard/new", key: "new", exact: false },
  { href: "/dashboard/billing", key: "billing", exact: false },
  { href: "/reset-password", key: "password", exact: false },
] as const;

/** Меню на таблото с маркиране на текущата страница. */
export function DashNav({ static: isStatic = false }: { static?: boolean }) {
  // Статичният вариант е за Suspense fallback — без usePathname
  return isStatic ? <Nav current={null} /> : <LiveNav />;
}

function LiveNav() {
  // Сравняваме без езиковия префикс
  return <Nav current={splitLocale(usePathname()).rest} />;
}

function Nav({ current }: { current: string | null }) {
  const { t, href } = useI18n();
  const isActive = (path: string, exact?: boolean) =>
    current !== null && (exact ? current === path : current === path || current.startsWith(`${path}/`));
  return (
    <nav className="dash-nav" aria-label={t.dashboard.nav.label}>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={href(l.href)}
          className={isActive(l.href, l.exact) || (l.exact && current?.startsWith("/dashboard/codes")) ? "active" : ""}
          aria-current={isActive(l.href, l.exact) ? "page" : undefined}
        >
          {t.dashboard.nav[l.key]}
        </Link>
      ))}
      <SignOutButton />
    </nav>
  );
}
