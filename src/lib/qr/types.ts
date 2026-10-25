// Регистър на типовете QR съдържание.
// Всеки тип описва полетата си (за автоматично генериране на формата),
// допълнителна валидация и как стойностите се кодират в текста на QR кода.
// Модулът е изоморфен: използва се и в браузъра (генератор), и на сървъра
// (повторна валидация преди запис). Нов тип = нов запис в QR_TYPES +
// текстове в речниците (qr.types.<id>, qr.fields.<поле>).
//
// Грешките са кодове, не текст: "required", "max:100", "email"… —
// интерфейсът ги превежда чрез речника (qr.errors).

export type FieldKind =
  | "text"
  | "textarea"
  | "url"
  | "email"
  | "tel"
  | "password"
  | "number"
  | "select"
  | "checkbox";

export interface FieldDef {
  /** Също ключ в речника: qr.fields.<name> */
  name: string;
  kind: FieldKind;
  required?: boolean;
  /** Универсален пример (напр. https://example.com); за превеждаем — placeholderKey */
  placeholder?: string;
  placeholderKey?: "text";
  maxLength?: number;
  /** Стойностите; етикетите са в речника: qr.options.<value> */
  options?: string[];
  defaultValue?: string | boolean;
  /** Поле на половин ширина (две в ред) */
  half?: boolean;
}

export type FieldValue = string | boolean;
export type QrValues = Record<string, FieldValue>;
/** поле → код на грешка */
export type FieldErrors = Record<string, string>;

export const QR_TYPE_IDS = ["url", "text", "wifi", "email", "phone", "sms", "vcard", "location"] as const;
export type QrTypeId = (typeof QR_TYPE_IDS)[number];

export interface QrTypeDef {
  id: QrTypeId;
  fields: FieldDef[];
  /** Допълнителна валидация освен общата (задължително, дължина, формат) */
  validate?: (v: QrValues) => FieldErrors;
  /** Превръща валидните стойности в текста, който се кодира в QR кода */
  encode: (v: QrValues) => string;
}

// Максимален капацитет на QR (версия 40, ниво L, байтов режим) е 2953 байта.
// Държим се по-ниско, за да остане кодът четим.
export const MAX_PAYLOAD_LENGTH = 2000;

const str = (v: QrValues, k: string) => {
  const x = v[k];
  return typeof x === "string" ? x.trim() : "";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9]{3,20}$/;

export const normalizePhone = (s: string) => s.replace(/[\s\-().]/g, "");

/** Добавя https:// ако липсва протокол; връща null при невалиден адрес */
export function normalizeUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Специалните символи в Wi-Fi и vCard формата се екранират с обратна наклонена черта.
const escWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
const escVcard = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([;,])/g, "\\$1");

export const QR_TYPES: QrTypeDef[] = [
  {
    id: "url",
    fields: [{ name: "url", kind: "url", required: true, placeholder: "https://example.com", maxLength: 2000 }],
    validate: (v): FieldErrors => (str(v, "url") && !normalizeUrl(str(v, "url")) ? { url: "url" } : {}),
    encode: (v) => normalizeUrl(str(v, "url")) ?? "",
  },
  {
    id: "text",
    fields: [{ name: "text", kind: "textarea", required: true, placeholderKey: "text", maxLength: 1000 }],
    encode: (v) => str(v, "text"),
  },
  {
    id: "wifi",
    fields: [
      { name: "ssid", kind: "text", required: true, maxLength: 32 },
      { name: "password", kind: "password", maxLength: 63, half: true },
      { name: "encryption", kind: "select", defaultValue: "WPA", half: true, options: ["WPA", "WEP", "nopass"] },
      { name: "hidden", kind: "checkbox", defaultValue: false },
    ],
    validate: (v): FieldErrors => {
      const enc = str(v, "encryption") || "WPA";
      const pass = str(v, "password");
      if (!["WPA", "WEP", "nopass"].includes(enc)) return { encryption: "invalid" };
      if (enc !== "nopass" && !pass) return { password: "wifi_password" };
      if (enc === "WPA" && pass.length < 8) return { password: "wpa_min" };
      return {};
    },
    encode: (v) => {
      const enc = str(v, "encryption") || "WPA";
      const parts = [`T:${enc}`, `S:${escWifi(str(v, "ssid"))}`];
      if (enc !== "nopass") parts.push(`P:${escWifi(str(v, "password"))}`);
      if (v.hidden === true) parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    },
  },
  {
    id: "email",
    fields: [
      { name: "to", kind: "email", required: true, placeholder: "name@example.com", maxLength: 254 },
      { name: "subject", kind: "text", maxLength: 200 },
      { name: "body", kind: "textarea", maxLength: 1000 },
    ],
    encode: (v) => {
      const q = new URLSearchParams();
      if (str(v, "subject")) q.set("subject", str(v, "subject"));
      if (str(v, "body")) q.set("body", str(v, "body"));
      // URLSearchParams кодира интервала като "+", което имейл клиентите не разбират
      const qs = q.toString().replace(/\+/g, "%20");
      return `mailto:${str(v, "to")}${qs ? `?${qs}` : ""}`;
    },
  },
  {
    id: "phone",
    fields: [{ name: "phone", kind: "tel", required: true, placeholder: "+1 555 123 4567", maxLength: 30 }],
    encode: (v) => `tel:${normalizePhone(str(v, "phone"))}`,
  },
  {
    id: "sms",
    fields: [
      { name: "phone", kind: "tel", required: true, placeholder: "+1 555 123 4567", maxLength: 30 },
      { name: "message", kind: "textarea", maxLength: 500 },
    ],
    encode: (v) => `SMSTO:${normalizePhone(str(v, "phone"))}:${str(v, "message")}`,
  },
  {
    id: "vcard",
    fields: [
      { name: "firstName", kind: "text", required: true, maxLength: 60, half: true },
      { name: "lastName", kind: "text", maxLength: 60, half: true },
      { name: "org", kind: "text", maxLength: 100, half: true },
      { name: "title", kind: "text", maxLength: 100, half: true },
      { name: "phone", kind: "tel", maxLength: 30, half: true },
      { name: "email", kind: "email", maxLength: 254, half: true },
      { name: "website", kind: "url", maxLength: 300 },
      { name: "address", kind: "text", maxLength: 200 },
    ],
    validate: (v): FieldErrors => (str(v, "website") && !normalizeUrl(str(v, "website")) ? { website: "url" } : {}),
    encode: (v) => {
      const first = escVcard(str(v, "firstName"));
      const last = escVcard(str(v, "lastName"));
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${last};${first};;;`,
        `FN:${[first, last].filter(Boolean).join(" ")}`,
      ];
      if (str(v, "org")) lines.push(`ORG:${escVcard(str(v, "org"))}`);
      if (str(v, "title")) lines.push(`TITLE:${escVcard(str(v, "title"))}`);
      if (str(v, "phone")) lines.push(`TEL;TYPE=CELL:${normalizePhone(str(v, "phone"))}`);
      if (str(v, "email")) lines.push(`EMAIL:${str(v, "email")}`);
      if (str(v, "website")) lines.push(`URL:${normalizeUrl(str(v, "website"))}`);
      if (str(v, "address")) lines.push(`ADR:;;${escVcard(str(v, "address"))};;;;`);
      lines.push("END:VCARD");
      return lines.join("\n");
    },
  },
  {
    id: "location",
    fields: [
      { name: "lat", kind: "number", required: true, placeholder: "42.6977", half: true },
      { name: "lng", kind: "number", required: true, placeholder: "23.3219", half: true },
    ],
    validate: (v): FieldErrors => {
      const e: FieldErrors = {};
      const lat = Number(str(v, "lat"));
      const lng = Number(str(v, "lng"));
      if (str(v, "lat") && (!Number.isFinite(lat) || lat < -90 || lat > 90)) e.lat = "lat";
      if (str(v, "lng") && (!Number.isFinite(lng) || lng < -180 || lng > 180)) e.lng = "lng";
      return e;
    },
    encode: (v) => `geo:${Number(str(v, "lat"))},${Number(str(v, "lng"))}`,
  },
];

const TYPE_MAP = new Map<string, QrTypeDef>(QR_TYPES.map((t) => [t.id, t]));

export const getQrType = (id: string) => TYPE_MAP.get(id);

export function defaultValues(def: QrTypeDef): QrValues {
  const out: QrValues = {};
  for (const f of def.fields) out[f.name] = f.defaultValue ?? (f.kind === "checkbox" ? false : "");
  return out;
}

/**
 * Оставя само полетата, дефинирани за типа, с правилния тип стойност.
 * Използва се на сървъра, за да не попадат произволни данни в базата.
 */
export function sanitizeValues(def: QrTypeDef, raw: unknown): QrValues {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: QrValues = {};
  for (const f of def.fields) {
    const v = src[f.name];
    if (f.kind === "checkbox") out[f.name] = v === true;
    else out[f.name] = typeof v === "string" ? v.slice(0, (f.maxLength ?? 2000) + 1) : "";
  }
  return out;
}

/** Обща + специфична валидация. Празен обект означава валидни данни. */
export function validateValues(def: QrTypeDef, values: QrValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of def.fields) {
    const raw = values[f.name];
    if (f.kind === "checkbox") {
      if (raw !== undefined && typeof raw !== "boolean") errors[f.name] = "invalid";
      continue;
    }
    if (raw !== undefined && typeof raw !== "string") {
      errors[f.name] = "invalid";
      continue;
    }
    const s = (raw ?? "").trim();
    if (!s) {
      if (f.required) errors[f.name] = "required";
      continue;
    }
    if (f.maxLength && s.length > f.maxLength) errors[f.name] = `max:${f.maxLength}`;
    else if (f.kind === "email" && !EMAIL_RE.test(s)) errors[f.name] = "email";
    else if (f.kind === "tel" && !PHONE_RE.test(normalizePhone(s))) errors[f.name] = "phone";
    else if (f.kind === "select" && f.options && !f.options.includes(s)) errors[f.name] = "invalid";
  }
  // Специфичната валидация не презаписва вече открити грешки
  return { ...def.validate?.(values), ...errors };
}

export type BuildResult =
  | { ok: true; payload: string }
  | { ok: false; errors: FieldErrors };

/** Валидира и кодира. Използва се и от клиента, и от сървъра. */
export function buildPayload(typeId: string, values: QrValues): BuildResult {
  const def = getQrType(typeId);
  if (!def) return { ok: false, errors: { _type: "unknown_type" } };
  const errors = validateValues(def, values);
  if (Object.keys(errors).length) return { ok: false, errors };
  const payload = def.encode(values);
  if (!payload) return { ok: false, errors: { _payload: "empty" } };
  if (payload.length > MAX_PAYLOAD_LENGTH) return { ok: false, errors: { _payload: "too_long" } };
  return { ok: true, payload };
}

/** Превежда код на грешка ("max:100") чрез речника qr.errors. */
export function errorText(errors: Record<string, string>, code: string, fmtFn: (s: string, v: Record<string, string | number>) => string) {
  const [key, n] = code.split(":");
  const text = errors[key] ?? errors.invalid ?? code;
  return n ? fmtFn(text, { n }) : text;
}
