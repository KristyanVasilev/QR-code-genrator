import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { ArrowUpRight } from "@/components/icons";

export default async function NotFound() {
  const { t, href } = await getI18n();
  return (
    <div className="container hero" style={{ minHeight: "50vh" }}>
      <span className="eyebrow">404</span>
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.text}</p>
      <div className="hero-actions">
        <Link href={href("/")} className="btn primary lg">
          {t.notFound.home} <ArrowUpRight />
        </Link>
      </div>
    </div>
  );
}
