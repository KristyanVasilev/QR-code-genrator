"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteQr } from "@/lib/qr/actions";
import { useI18n } from "@/i18n/client";

export function DeleteQrButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!window.confirm(fmt(t.dashboard.confirmDelete, { name }))) return;
    start(async () => {
      const res = await deleteQr(id);
      if (!res.ok) window.alert(t.qrErrors[res.error as keyof typeof t.qrErrors] ?? t.common.tryAgain);
      else if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <button type="button" className="btn sm danger" onClick={onClick} disabled={pending}>
      {pending ? t.dashboard.deleting : t.dashboard.del}
    </button>
  );
}
