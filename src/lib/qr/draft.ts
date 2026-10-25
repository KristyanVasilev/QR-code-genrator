// Пренасяне на чернова от публичния генератор към /dashboard/new
// (през вход, ако е нужно). sessionStorage живее само в текущия таб.

import type { QrDraft } from "@/components/qr/QrGenerator";
import { getQrType } from "./types";
import { sanitizeDesign } from "./render";

const KEY = "qr-draft";

export function saveDraft(d: QrDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // недостъпно хранилище (частен режим) — просто няма чернова
  }
}

/** Връща и изтрива черновата; невалидни данни се игнорират. */
export function takeDraft(): QrDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object" || !getQrType(d.type)) return null;
    return {
      name: typeof d.name === "string" ? d.name.slice(0, 120) : "",
      type: d.type,
      content: d.content && typeof d.content === "object" ? d.content : {},
      design: sanitizeDesign(d.design),
    };
  } catch {
    return null;
  }
}
