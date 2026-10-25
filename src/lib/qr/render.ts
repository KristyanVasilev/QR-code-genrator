// Генериране на QR матрица и рендериране до SVG / PNG / JPG.
// Всичко се изпълнява в браузъра — сървърът не участва в статичните кодове.
// Дизайнът (QrDesign) се пази в базата като JSON, така че бъдещи опции
// (форма на точките, лого, рамка) се добавят като нови незадължителни полета.

import { encode, QrCodeDataType } from "uqr";

export type Ecc = "L" | "M" | "Q" | "H";

export interface QrDesign {
  fg: string; // #rrggbb
  bg: string; // #rrggbb
  transparent: boolean;
  ecc: Ecc;
  margin: number; // в модули, 0–8
}

export const DEFAULT_DESIGN: QrDesign = {
  fg: "#111827",
  bg: "#ffffff",
  transparent: false,
  ecc: "M",
  margin: 2,
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Привежда произволен вход (напр. от базата) до валиден дизайн. */
export function sanitizeDesign(input: unknown): QrDesign {
  const d = (input && typeof input === "object" ? input : {}) as Partial<QrDesign>;
  return {
    fg: typeof d.fg === "string" && HEX_RE.test(d.fg) ? d.fg : DEFAULT_DESIGN.fg,
    bg: typeof d.bg === "string" && HEX_RE.test(d.bg) ? d.bg : DEFAULT_DESIGN.bg,
    transparent: d.transparent === true,
    ecc: d.ecc && ["L", "M", "Q", "H"].includes(d.ecc) ? d.ecc : DEFAULT_DESIGN.ecc,
    margin:
      typeof d.margin === "number" && Number.isInteger(d.margin) && d.margin >= 0 && d.margin <= 8
        ? d.margin
        : DEFAULT_DESIGN.margin,
  };
}

export interface QrMatrix {
  size: number; // брой модули по страна, включително полето
  data: boolean[][];
}

export function createMatrix(payload: string, design: Pick<QrDesign, "ecc" | "margin">): QrMatrix {
  const r = encode(payload, { ecc: design.ecc, border: design.margin });
  return { size: r.size, data: r.data };
}

/**
 * Неразчитаем макет за преглед преди създаване на кода.
 * Запазва размера и служебните елементи (ъглови квадрати, синхронизация),
 * за да изглежда като истинския код, но данните са заменени с псевдослучаен
 * шум — скенер не може да го прочете. Шумът зависи само от размера,
 * затова не „трепти“ при писане.
 */
export function createDummyMatrix(payload: string, design: Pick<QrDesign, "ecc" | "margin">): QrMatrix {
  const r = encode(payload, { ecc: design.ecc, border: design.margin });
  let seed = r.size * 2654435761;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };
  const data = r.data.map((row, y) => row.map((v, x) => (r.types[y][x] === QrCodeDataType.Data ? rand() < 0.5 : v)));
  return { size: r.size, data };
}

/** Един SVG path за всички тъмни модули; съседните модули в ред се сливат. */
export function matrixToPath(m: QrMatrix): string {
  let d = "";
  for (let y = 0; y < m.size; y++) {
    const row = m.data[y];
    let x = 0;
    while (x < m.size) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < m.size && row[x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return d;
}

export function toSvgString(m: QrMatrix, design: QrDesign, px = 1024): string {
  const bg = design.transparent ? "" : `<rect width="${m.size}" height="${m.size}" fill="${design.bg}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${m.size} ${m.size}" shape-rendering="crispEdges">` +
    `${bg}<path fill="${design.fg}" d="${matrixToPath(m)}"/></svg>`
  );
}

/** Рисува директно върху canvas (по-остро от растеризиране на SVG). */
export function toCanvas(m: QrMatrix, design: QrDesign, targetPx: number, forceBg = false) {
  const scale = Math.max(1, Math.floor(targetPx / m.size));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = m.size * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas не се поддържа");
  if (!design.transparent || forceBg) {
    ctx.fillStyle = design.transparent ? "#ffffff" : design.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = design.fg;
  for (let y = 0; y < m.size; y++)
    for (let x = 0; x < m.size; x++) if (m.data[y][x]) ctx.fillRect(x * scale, y * scale, scale, scale);
  return canvas;
}

export type ExportFormat = "png" | "svg" | "jpg";

export async function downloadQr(
  m: QrMatrix,
  design: QrDesign,
  format: ExportFormat,
  filename: string,
  px = 1024,
) {
  let blob: Blob;
  if (format === "svg") {
    blob = new Blob([toSvgString(m, design, px)], { type: "image/svg+xml" });
  } else {
    // JPG няма прозрачност — фонът се запълва
    const canvas = toCanvas(m, design, px, format === "jpg");
    const type = format === "png" ? "image/png" : "image/jpeg";
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Неуспешно генериране"))), type, 0.95),
    );
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(filename)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFilename = (s: string) =>
  s.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "qr-code";

/** Относителна яркост (WCAG) — за предупреждение при слаб контраст. */
function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Код за предупреждение при слаб контраст (текстът е в речника qr.contrast). */
export function contrastWarning(design: QrDesign): "inverted" | "low" | null {
  const fg = luminance(design.fg);
  const bg = design.transparent ? 1 : luminance(design.bg);
  if (fg > bg) return "inverted";
  if ((bg + 0.05) / (fg + 0.05) < 3) return "low";
  return null;
}
