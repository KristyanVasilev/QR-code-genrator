import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getQrCode } from "@/lib/qr/queries";
import { sanitizeDesign } from "@/lib/qr/render";
import { getAccount } from "@/lib/account";
import { LockedNotice } from "@/components/dashboard/LockedNotice";
import { QrEditor } from "@/components/dashboard/QrEditor";
import { DeleteQrButton } from "@/components/dashboard/DeleteQrButton";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboard.editMeta };
}

export default function EditQrPage({ params }: PageProps<"/[lang]/dashboard/codes/[id]">) {
  return (
    <Suspense fallback={<div className="card skeleton" style={{ height: 480 }} aria-busy="true" />}>
      <EditQr params={params} />
    </Suspense>
  );
}

async function EditQr({ params }: Pick<PageProps<"/[lang]/dashboard/codes/[id]">, "params">) {
  const [{ id }, account, { t, href, date }] = await Promise.all([params, getAccount(), getI18n()]);
  const d = t.dashboard;
  // Без активен абонамент съдържанието не се изпраща към браузъра
  if (!account.access) return <LockedNotice purgeAt={account.purgeAt} />;
  const code = await getQrCode(id);
  if (!code) notFound();

  return (
    <>
      <header className="dash-head">
        <div>
          <Link href={href("/dashboard")} className="small">
            {d.backToCodes}
          </Link>
          <h1>{code.name}</h1>
          <p className="muted small">
            {fmt(d.createdOn, { created: date(code.created_at), updated: date(code.updated_at) })}
          </p>
        </div>
        <DeleteQrButton id={code.id} name={code.name} redirectTo={href("/dashboard")} />
      </header>
      <p className="notice warn" style={{ margin: 0 }}>
        {d.staticWarning}
      </p>
      <QrEditor
        mode="edit"
        id={code.id}
        initial={{ name: code.name, type: code.type, content: code.content ?? {}, design: sanitizeDesign(code.design) }}
      />
    </>
  );
}
