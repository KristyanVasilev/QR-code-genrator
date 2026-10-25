"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

/**
 * Еднократно съобщение от ?notice=… (после параметърът се маха от адреса).
 * Живее в layout-а на таблото, затова следи навигацията.
 */
export function DashboardNotice() {
  const { t } = useI18n();
  const notices: Record<string, string> = t.dashboard.notices;
  const pathname = usePathname();
  const key = useSearchParams().get("notice");
  const [text, setText] = useState<string | null>(null);

  // Ново съобщение само при смяна на страницата
  useEffect(() => setText(null), [pathname]);

  useEffect(() => {
    if (!key) return;
    setText(notices[key] ?? null);
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url);
  }, [key]);

  return text ? (
    <p className="notice ok" role="status">
      {text}
    </p>
  ) : null;
}
