// Тест на схемата, RLS и лимитите в вграден PostgreSQL (PGlite) — без Docker.
// Стартиране: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const db = new PGlite();
// Всички миграции по ред на имената
const dir = join(import.meta.dirname, "..", "migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

// Минимален стъб на Supabase средата
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true),'')::json->>'sub','')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claims', true),'')::json->>'role' $$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`);
for (const f of migrations) await db.exec(readFileSync(join(dir, f), "utf8"));
await db.exec(`grant all on all tables in schema public to service_role;`);

const ok = (m) => console.log("OK  ", m);
const fail = (m) => { console.log("FAIL", m); process.exitCode = 1; };

const a = (await db.query(`insert into auth.users (email, raw_user_meta_data) values ('a@x.bg', '{"full_name":"Ана"}') returning id`)).rows[0].id;
const b = (await db.query(`insert into auth.users (email) values ('b@x.bg') returning id`)).rows[0].id;
const prof = await db.query(`select p.full_name, s.plan from profiles p join subscriptions s on s.user_id = p.id where p.id = $1`, [a]);
prof.rows[0]?.plan === "free" && prof.rows[0].full_name === "Ана" ? ok("профил + ред за абонамент при регистрация") : fail("signup trigger");

async function as(user, fn) {
  await db.exec("begin");
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: user, role: "authenticated" })]);
  await db.exec("set local role authenticated");
  try { return await fn(); } finally { await db.exec("rollback"); }
}
// Опит, който може да се провали, без да прекъсва транзакцията
async function attempt(fn) {
  await db.exec("savepoint t");
  try { await fn(); await db.exec("release savepoint t"); return null; }
  catch (e) { await db.exec("rollback to savepoint t"); return e; }
}
const insert = (n) => db.query(`insert into qr_codes (name, type, payload) values ($1, 'url', 'https://a.bg')`, [n]);
const setPlan = (u, plan, status, endedAt = null) =>
  db.query(`update subscriptions set plan = $2, status = $3, ended_at = $4 where user_id = $1`, [u, plan, status, endedAt]);
const ownInsert = (u, name) =>
  db.query(`insert into qr_codes (user_id, name, type, payload) values ($1, $2, 'url', 'https://a.bg')`, [u, name]);

// Без абонамент: не може да се създава
await as(a, async () => {
  try { await insert("x"); fail("без абонамент трябваше да е отказано"); }
  catch (e) { e.message.includes("subscription_required") ? ok("без абонамент не се създават кодове") : fail(e.message); }
});

// Starter (вкл. пробен период) → 5 кода
await setPlan(a, "starter", "trialing");
await as(a, async () => {
  for (let i = 0; i < 5; i++) await insert(`s${i}`);
  ok("5 кода на Starter по време на пробния период");
  try { await insert("s5"); fail("6-ти код трябваше да е отказан"); }
  catch (e) { e.message.includes("plan_limit_reached") ? ok("лимит 5 на Starter") : fail(e.message); }
});

await as(a, async () => {
  await insert("x");
  try { await db.query(`update qr_codes set scan_count = 99`); fail("scan_count не трябва да се променя"); } catch (e) { ok("scan_count е защитен: " + e.message); }
});
await as(a, async () => {
  try { await db.query(`update subscriptions set plan = 'business'`); fail("абонаментът не трябва да се пише"); } catch (e) { ok("абонаментът е само за четене: " + e.message); }
});
await as(a, async () => {
  try { await db.query(`insert into qr_codes (name, type, payload, is_dynamic) values ('d','url','x', true)`); fail("is_dynamic"); } catch (e) { ok("динамични полета недостъпни: " + e.message); }
});

// Изолация между потребители
await ownInsert(b, "чужд");
await as(a, async () => {
  const r = await db.query(`select count(*)::int n from qr_codes`);
  r.rows[0].n === 0 ? ok("потребител A не вижда кодовете на B") : fail("RLS изтичане");
  const d = await db.query(`delete from qr_codes returning id`);
  d.rows.length === 0 ? ok("A не може да трие кодовете на B") : fail("RLS delete");
  try { await db.query(`select public.effective_plan($1)`, [b]); fail("effective_plan достъпна"); } catch { ok("effective_plan не е достъпна за клиента"); }
  try { await db.query(`select public.purge_lapsed_qr_codes()`); fail("purge достъпна"); } catch { ok("purge_lapsed_qr_codes не е достъпна за клиента"); }
});

// Pro → 50 кода
await setPlan(a, "pro", "active");
await as(a, async () => {
  for (let i = 0; i < 50; i++) await insert(`p${i}`);
  try { await insert("p50"); fail("51-ви код"); } catch { ok("Pro: 50 кода, 51-вият се отказва"); }
});

// Business → без ограничение
await setPlan(a, "business", "active");
await as(a, async () => {
  for (let i = 0; i < 60; i++) await insert(`b${i}`);
  ok("Business: над 50 кода");
});

// Прекратен абонамент: заключено създаване и редакция, изтриването е позволено
await ownInsert(a, "запазен");
await setPlan(a, "starter", "canceled", new Date().toISOString());
await as(a, async () => {
  (await attempt(() => insert("z"))) ? ok("прекратен: не се създават кодове") : fail("canceled insert");
  (await attempt(() => db.query(`update qr_codes set name = 'нов'`))) ? ok("прекратен: не се редактират кодове") : fail("canceled update");
  const d = await db.query(`delete from qr_codes returning id`);
  d.rows.length === 1 ? ok("прекратен: може да изтрива") : fail("delete при прекратен");
});

// Автоматично изтриване 30 дни след прекратяване
await ownInsert(a, "стар");
await setPlan(a, "starter", "canceled", new Date(Date.now() - 10 * 864e5).toISOString());
let n = (await db.query(`select public.purge_lapsed_qr_codes() n`)).rows[0].n;
n === 0 ? ok("10 дни след прекратяване кодовете остават") : fail("ранно изтриване");
await setPlan(a, "starter", "canceled", new Date(Date.now() - 31 * 864e5).toISOString());
const count = async (u) => (await db.query(`select count(*)::int n from qr_codes where user_id = $1`, [u])).rows[0].n;
const before = await count(a);
n = (await db.query(`select public.purge_lapsed_qr_codes() n`)).rows[0].n;
n === before && before > 0 && (await count(a)) === 0 && (await count(b)) === 1
  ? ok(`31 дни след прекратяване кодовете се изтриват (${n} бр.; чуждите остават)`)
  : fail(`purge: ${n}/${before}`);

// Невалидни данни
await setPlan(a, "pro", "active");
await as(a, async () => {
  try { await db.query(`insert into qr_codes (name, type, payload) values ('', 'url', 'x')`); fail("празно име"); } catch { ok("празно име се отказва"); }
});
