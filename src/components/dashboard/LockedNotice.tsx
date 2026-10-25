import Link from "next/link";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

/** Показва се, когато няма активен абонамент: кодовете са заключени. */
export async function LockedNotice({ purgeAt, compact = false }: { purgeAt: string | null; compact?: boolean }) {
  const { t, href, date } = await getI18n();
  const d = t.dashboard;
  return (
    <div className={compact ? "notice warn" : "card empty"} role="status">
      {!compact && <h2 className="card-title">{d.lockedTitle}</h2>}
      <p className={compact ? "" : "muted"} style={{ margin: 0 }}>
        {d.lockedText}
        {purgeAt && <strong> {fmt(d.lockedPurge, { date: date(purgeAt) })}</strong>}{" "}
        <Link href={href("/pricing")}>{d.lockedCta}</Link>
      </p>
    </div>
  );
}
