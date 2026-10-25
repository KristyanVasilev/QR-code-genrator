"use client";

import Link from "next/link";
import { useMemo } from "react";
import { QrPreview } from "@/components/qr/QrPreview";
import { createMatrix, downloadQr, sanitizeDesign, type ExportFormat } from "@/lib/qr/render";
import { DeleteQrButton } from "./DeleteQrButton";
import { useI18n } from "@/i18n/client";

interface Props {
  id: string;
  name: string;
  typeLabel: string;
  /** null = заключен код (няма активен абонамент) */
  payload: string | null;
  design: unknown;
  date: string;
}

export function QrCard({ id, name, typeLabel, payload, design: rawDesign, date }: Props) {
  const { t, fmt, href } = useI18n();
  const d = t.dashboard;
  const editHref = href(`/dashboard/codes/${id}`);
  const design = useMemo(() => sanitizeDesign(rawDesign), [rawDesign]);
  const matrix = useMemo(() => {
    if (!payload) return null;
    try {
      return createMatrix(payload, design);
    } catch {
      return null;
    }
  }, [payload, design]);

  const download = (f: ExportFormat) => matrix && downloadQr(matrix, design, f, name, 1024);

  if (!payload) {
    return (
      <article className="card qr-card locked">
        <div className="qr-thumb">
          <span className="lock" aria-hidden>🔒</span>
        </div>
        <div className="qr-card-body">
          <h3 title={name}>{name}</h3>
          <p className="muted small">
            {typeLabel} · {date}
          </p>
        </div>
        <div className="qr-card-actions">
          <Link href={href("/pricing")} className="btn sm primary">
            {d.unlock}
          </Link>
          <DeleteQrButton id={id} name={name} />
        </div>
      </article>
    );
  }

  return (
    <article className="card qr-card">
      <Link href={editHref} className={`qr-thumb ${design.transparent ? "checker" : ""}`} aria-label={fmt(d.editAria, { name })}>
        {matrix ? <QrPreview matrix={matrix} design={design} label={name} /> : <span className="muted small">{d.renderError}</span>}
      </Link>
      <div className="qr-card-body">
        <h3 title={name}>{name}</h3>
        <p className="muted small">
          {typeLabel} · {date}
        </p>
      </div>
      <div className="qr-card-actions">
        <button type="button" className="btn sm" onClick={() => download("png")} disabled={!matrix}>
          PNG
        </button>
        <button type="button" className="btn sm" onClick={() => download("svg")} disabled={!matrix}>
          SVG
        </button>
        <Link href={editHref} className="btn sm">
          {d.edit}
        </Link>
        <DeleteQrButton id={id} name={name} />
      </div>
    </article>
  );
}
