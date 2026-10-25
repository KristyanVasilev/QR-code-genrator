"use client";

import { errorText, type FieldDef, type FieldErrors, type QrValues } from "@/lib/qr/types";
import { useI18n } from "@/i18n/client";

interface Props {
  fields: FieldDef[];
  values: QrValues;
  errors: FieldErrors;
  touched: Record<string, boolean>;
  onChange: (name: string, value: string | boolean) => void;
  onBlur: (name: string) => void;
}

const INPUT_TYPE: Partial<Record<FieldDef["kind"], string>> = {
  url: "url",
  email: "email",
  tel: "tel",
  password: "text", // показваме Wi-Fi паролата, за да се провери лесно
  number: "text",
  text: "text",
};

export function QrFields({ fields, values, errors, touched, onChange, onBlur }: Props) {
  const { t, fmt } = useI18n();
  const label = (name: string) => t.qr.fields[name as keyof typeof t.qr.fields] ?? name;
  const placeholder = (f: FieldDef) => (f.placeholderKey ? t.qr.placeholders[f.placeholderKey] : f.placeholder);
  return (
    <div className="field-grid">
      {fields.map((f) => {
        const id = `qr-${f.name}`;
        const code = touched[f.name] ? errors[f.name] : undefined;
        const error = code ? errorText(t.qr.errors, code, fmt) : undefined;
        const common = {
          id,
          name: f.name,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? `${id}-err` : undefined,
          onBlur: () => onBlur(f.name),
        };

        if (f.kind === "checkbox") {
          return (
            <label key={f.name} className="checkbox span-2">
              <input
                type="checkbox"
                checked={values[f.name] === true}
                onChange={(e) => onChange(f.name, e.target.checked)}
                {...common}
              />
              {label(f.name)}
            </label>
          );
        }

        const value = typeof values[f.name] === "string" ? (values[f.name] as string) : "";
        return (
          <div key={f.name} className={`field ${f.half ? "" : "span-2"}`}>
            <label htmlFor={id}>
              {label(f.name)}
              {f.required && <span className="req"> *</span>}
            </label>
            {f.kind === "textarea" ? (
              <textarea
                rows={4}
                value={value}
                placeholder={placeholder(f)}
                maxLength={f.maxLength}
                onChange={(e) => onChange(f.name, e.target.value)}
                {...common}
              />
            ) : f.kind === "select" ? (
              <select value={value} onChange={(e) => onChange(f.name, e.target.value)} {...common}>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {t.qr.options[o as keyof typeof t.qr.options] ?? o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={INPUT_TYPE[f.kind] ?? "text"}
                inputMode={f.kind === "number" ? "decimal" : undefined}
                autoComplete="off"
                value={value}
                placeholder={placeholder(f)}
                maxLength={f.maxLength}
                onChange={(e) => onChange(f.name, e.target.value)}
                {...common}
              />
            )}
            {error && (
              <p id={`${id}-err`} className="field-error">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
