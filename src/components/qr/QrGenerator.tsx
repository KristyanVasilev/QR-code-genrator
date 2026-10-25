"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { saveDraft } from "@/lib/qr/draft";
import { QrFields } from "./QrFields";
import { QrPreview } from "./QrPreview";
import { buildPayload, defaultValues, errorText, getQrType, QR_TYPES, type QrValues } from "@/lib/qr/types";
import { useI18n } from "@/i18n/client";
import {
  contrastWarning,
  createDummyMatrix,
  createMatrix,
  DEFAULT_DESIGN,
  downloadQr,
  type Ecc,
  type ExportFormat,
  type QrDesign,
} from "@/lib/qr/render";

export interface QrDraft {
  name: string;
  type: string;
  content: QrValues;
  design: QrDesign;
}

interface Props {
  /** Начални данни (при редакция на запазен код) */
  initial?: QrDraft;
  /** Ако е подаден, показва бутон „Запази“. Без него — пренася черновата към таблото. */
  onSave?: (draft: QrDraft & { payload: string }) => Promise<{ error?: string } | void>;
  saveLabel?: string;
  /** Текст под бутона (напр. условията на абонамента) */
  saveHint?: ReactNode;
  /**
   * "dummy" — неразчитаем макет (докато кодът не е създаден и платен);
   * "real" — истинският код, само за вече създадени кодове с активен абонамент.
   */
  preview?: "dummy" | "real";
}

const ECC_LEVELS: Ecc[] = ["L", "M", "Q", "H"];

const SIZES = [512, 1024, 2048];

export function QrGenerator({ initial, onSave, saveLabel, saveHint, preview = "dummy" }: Props) {
  const { t, fmt, href } = useI18n();
  const g = t.qr.generator;
  const real = preview === "real";
  const [typeId, setTypeId] = useState(initial?.type ?? QR_TYPES[0].id);
  // Стойностите се пазят по тип, за да не се губят при превключване
  const [valuesByType, setValuesByType] = useState<Record<string, QrValues>>(() =>
    initial ? { [initial.type]: initial.content } : {},
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [design, setDesign] = useState<QrDesign>(initial?.design ?? DEFAULT_DESIGN);
  const [name, setName] = useState(initial?.name ?? "");
  const [size, setSize] = useState(1024);
  const [status, setStatus] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const def = getQrType(typeId) ?? QR_TYPES[0];
  const values = valuesByType[typeId] ?? defaultValues(def);

  const build = useMemo(() => buildPayload(typeId, values), [typeId, values]);
  // Отлагаме тежката част (матрицата), за да не „засича“ въвеждането
  const deferredPayload = useDeferredValue(build.ok ? build.payload : null);
  const deferredDesign = useDeferredValue(design);

  const matrix = useMemo(() => {
    if (!deferredPayload) return null;
    try {
      return real ? createMatrix(deferredPayload, deferredDesign) : createDummyMatrix(deferredPayload, deferredDesign);
    } catch {
      return null; // твърде дълго съдържание за избраното ниво на корекция
    }
  }, [deferredPayload, deferredDesign, real]);

  const errors = build.ok ? {} : build.errors;
  const warningCode = contrastWarning(design);
  const warning = warningCode ? t.qr.contrast[warningCode] : null;
  const typeLabel = t.qr.types[def.id].label;
  const tooLong = build.ok && deferredPayload === build.payload && !matrix;

  function setValue(field: string, value: string | boolean) {
    setStatus(null);
    setValuesByType((prev) => ({ ...prev, [typeId]: { ...values, [field]: value } }));
  }

  function switchType(id: string) {
    setTypeId(id);
    setTouched({});
    setStatus(null);
  }

  function touchAll() {
    setTouched(Object.fromEntries(def.fields.map((f) => [f.name, true])));
  }

  async function handleDownload(format: ExportFormat) {
    if (!real || !build.ok || !matrix) return touchAll();
    try {
      await downloadQr(matrix, design, format, name || typeLabel, size);
    } catch {
      setStatus({ kind: "error", text: g.downloadFailed });
    }
  }

  async function handleSave() {
    if (!onSave) return;
    if (!build.ok || !matrix) return touchAll();
    if (!name.trim()) {
      setStatus({ kind: "error", text: g.nameRequired });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await onSave({ name: name.trim(), type: typeId, content: values, design, payload: build.payload });
      if (res && res.error) setStatus({ kind: "error", text: res.error });
      else setStatus({ kind: "ok", text: g.saved });
    } catch {
      setStatus({ kind: "error", text: t.common.tryAgain });
    } finally {
      setBusy(false);
    }
  }

  /** Публичен генератор: пренася черновата към таблото (през вход при нужда). */
  function saveToAccount() {
    if (!build.ok || !matrix) return touchAll();
    saveDraft({ name: name.trim() || typeLabel, type: typeId, content: values, design });
    router.push(href("/dashboard/new"));
  }

  const ready = build.ok && !!matrix;

  return (
    <div className="generator">
      <div className="generator-main">
        <div className="type-tabs" role="tablist" aria-label={g.tabs}>
          {QR_TYPES.map((qt) => (
            <button
              key={qt.id}
              type="button"
              role="tab"
              aria-selected={qt.id === typeId}
              className={`type-tab ${qt.id === typeId ? "active" : ""}`}
              onClick={() => switchType(qt.id)}
            >
              {t.qr.types[qt.id].label}
            </button>
          ))}
        </div>

        <section className="card">
          <h2 className="card-title">{g.step1}</h2>
          <p className="muted small">{t.qr.types[def.id].description}</p>
          <QrFields
            fields={def.fields}
            values={values}
            errors={errors}
            touched={touched}
            onChange={setValue}
            onBlur={(n) => setTouched((t) => ({ ...t, [n]: true }))}
          />
          {(errors._payload || tooLong) && (
            <p className="field-error">{errors._payload ? errorText(t.qr.errors, errors._payload, fmt) : g.tooLongHint}</p>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">{g.step2}</h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="qr-fg">{g.fg}</label>
              <div className="color-input">
                <input id="qr-fg" type="color" value={design.fg} onChange={(e) => setDesign({ ...design, fg: e.target.value })} />
                <span>{design.fg}</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="qr-bg">{g.bg}</label>
              <div className="color-input">
                <input
                  id="qr-bg"
                  type="color"
                  value={design.bg}
                  disabled={design.transparent}
                  onChange={(e) => setDesign({ ...design, bg: e.target.value })}
                />
                <span>{design.transparent ? g.transparent : design.bg}</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="qr-ecc">{g.ecc}</label>
              <select id="qr-ecc" value={design.ecc} onChange={(e) => setDesign({ ...design, ecc: e.target.value as Ecc })}>
                {ECC_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {g[`ecc${l}`]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="qr-margin">{fmt(g.margin, { n: design.margin })}</label>
              <input
                id="qr-margin"
                type="range"
                min={0}
                max={8}
                value={design.margin}
                onChange={(e) => setDesign({ ...design, margin: Number(e.target.value) })}
              />
            </div>
            <label className="checkbox span-2">
              <input
                type="checkbox"
                checked={design.transparent}
                onChange={(e) => setDesign({ ...design, transparent: e.target.checked })}
              />
              {g.transparentBg}
            </label>
          </div>
          {warning && <p className="notice warn">{warning}</p>}
        </section>
      </div>

      <aside className="generator-side">
        <div className="card sticky">
          <div className={`qr-frame ${design.transparent ? "checker" : ""}`}>
            {!real && matrix && (
              <span className="qr-badge" title={g.previewTitle}>
                {g.preview}
              </span>
            )}
            {matrix ? (
              <QrPreview matrix={matrix} design={design} label={real ? fmt(g.realAria, { type: typeLabel }) : g.previewAria} />
            ) : (
              <div className="qr-placeholder">{g.placeholder}</div>
            )}
          </div>

          <div className="field">
            <label htmlFor="qr-name">{g.name} {onSave && <span className="req">*</span>}</label>
            <input
              id="qr-name"
              type="text"
              value={name}
              maxLength={120}
              placeholder={g.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {real ? (
            <>
            <div className="field">
              <label htmlFor="qr-size">{g.size}</label>
              <select id="qr-size" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} × {s} px
                  </option>
                ))}
              </select>
            </div>
  
            <div className="btn-row">
              <button type="button" className="btn primary" disabled={!ready} onClick={() => handleDownload("png")}>
                PNG
              </button>
              <button type="button" className="btn" disabled={!ready} onClick={() => handleDownload("svg")}>
                SVG
              </button>
              <button type="button" className="btn" disabled={!ready} onClick={() => handleDownload("jpg")}>
                JPG
              </button>
            </div>
            </>
          ) : (
            <p className="muted small center">
              {g.sampleNote}
            </p>
          )}

          {onSave ? (
            <button type="button" className="btn primary block" disabled={busy} onClick={handleSave}>
              {busy ? g.wait : (saveLabel ?? g.save)}
            </button>
          ) : (
            <button type="button" className="btn primary block" onClick={saveToAccount}>
              {g.create}
            </button>
          )}
          {saveHint && <p className="muted small center">{saveHint}</p>}

          {status && (
            <p className={`notice ${status.kind === "error" ? "error" : "ok"}`} role="status">
              {status.text}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
