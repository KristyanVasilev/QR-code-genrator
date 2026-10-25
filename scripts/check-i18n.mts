// Проверява, че всеки превод има същите ключове и {променливи} като английския.
// Стартиране: npm run test:i18n
import { readdirSync } from "node:fs";
const dir = new URL("../src/i18n/dictionaries/", import.meta.url);
const base = dir.href;
const { en } = await import(base + "en.ts");
const flat = (o: any, p = "", out: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (typeof v === "string") out[key] = v; else flat(v, key, out);
  }
  return out;
};
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const E = flat(en);
let bad = 0;
const locales = readdirSync(dir).filter((f) => /^[a-z]{2}.ts$/.test(f) && f !== "en.ts").map((f) => f.slice(0, 2));
for (const l of locales) {
  const d = flat((await import(base + l + ".ts"))[l]);
  for (const [k, v] of Object.entries(E)) {
    if (!(k in d)) { console.log(l, "MISSING", k); bad++; continue; }
    if (vars(v) !== vars(d[k])) { console.log(l, k, "en:", vars(v), "→", vars(d[k])); bad++; }
  }
  console.log(l, "ключове:", Object.keys(d).length, "/", Object.keys(E).length);
}
console.log(bad ? `ПРОБЛЕМИ: ${bad}` : "Всички ключове и променливи съвпадат ✓");
if (bad) process.exit(1);
