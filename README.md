# QRly — SaaS платформа за QR кодове

Генериране, сваляне и управление на QR кодове с платен абонамент. Основни пазари са **САЩ и ЕС**: английският е основен език, а сайтът е и на български, испански, немски, френски и италиански.

**Стек:** Next.js 16 (App Router, TypeScript) · Supabase (PostgreSQL + Auth) · Stripe (Checkout, Billing, Managed Payments) · обикновен CSS

## Възможности

- **8 типа QR съдържание:** уебсайт, текст, Wi-Fi, имейл, телефон, SMS, визитка (vCard), локация
- **Генератор в браузъра:** преглед на живо, цветове, прозрачен фон, поле, корекция на грешки
- **Защитен преглед:** до създаването се показва неразчитаем макет, а свалянето (PNG / SVG / JPG до 2048 px) е само за създадени кодове
- **Профил:** регистрация, вход, забравена парола, потвърждение по имейл
- **Табло:** списък с търсене и страници, редакция, изтриване, сваляне
- **Абонаменти:**

  | План | САЩ | ЕС | Кодове |
  |---|---|---|---|
  | Starter | $5/мес + tax | €5/мес с ДДС | 5 (пробен период 14 дни за $1.99 / €1.99) |
  | Pro | $7/мес | €7/мес | 50 |
  | Business | $15/мес | €15/мес | неограничено |

- **Stripe:**
  - Checkout, Customer Portal (смяна на план, карта, отказ), webhooks
  - Managed Payments: Stripe поема ДДС и sales tax
- **След отказ от абонамента:** кодовете се заключват и се изтриват автоматично след 30 дни
- **6 езика:** автоматичен избор по браузър или държава, превключвател със знаменца, hreflang за SEO

## Бърз старт

Изисквания: Node.js 20+ (тествано с 24).

```bash
npm install
cp .env.example .env.local   # попълнете ключовете — виж по-долу
npm run dev                  # http://localhost:3000
```

| Команда | Описание |
|---|---|
| `npm run dev` | Сървър за разработка |
| `npm run build` / `npm run start` | Продукционен билд / стартиране |
| `npm run typecheck` | Проверка на типовете (вкл. пълнота на преводите) |
| `npm run test:db` | Тест на схемата, RLS, лимитите и изтриването (вграден PostgreSQL, без Docker) |
| `npm run test:i18n` | Проверява, че всички преводи имат същите ключове и `{променливи}` |
| `npm run check:env` | Проверява ключовете в `.env.local`, без да ги показва |
| `npm run stripe:setup` | Създава продуктите, цените (EUR + USD) и Customer Portal в Stripe |

## Променливи на средата

| Променлива | Описание |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Публичен адрес на сайта |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase URL и публичен (publishable) ключ |
| `SUPABASE_SERVICE_ROLE_KEY` | **Тайна.** Supabase secret key (`sb_secret_…`), само за сървъра |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **Тайни.** Stripe API ключ и подпис на webhook-ите |
| `STRIPE_PRICE_*`, `STRIPE_PORTAL_CONFIG` | ID-та от `npm run stripe:setup` |
| `STRIPE_MANAGED_PAYMENTS` | `true`, след като Stripe одобри Managed Payments |
| `STRIPE_TOS_CONSENT` | `true`, след като в Stripe е зададен публичен адрес на Условията |

`.env.local` не се качва в git. Шаблонът е в [`.env.example`](.env.example).

## База данни

1. Нов проект в [Supabase](https://supabase.com), регион **East US (North Virginia)**.
2. В SQL Editor пуснете миграциите от [`supabase/migrations/`](supabase/migrations) по ред.
3. Настройте Authentication: Site URL, Redirect URLs, имейл шаблони. Виж [docs/AUTH.md](docs/AUTH.md).

Промени по схемата се правят само с **нов** файл в `supabase/migrations/`.

## Структура

```
src/
├─ app/[lang]/        страници под езиков префикс (/en, /bg, …)
├─ app/api/stripe/    Stripe webhook
├─ app/auth/confirm/  линкове от имейлите
├─ components/        UI (генератор, табло, цени, превключвател на езика)
├─ i18n/              езици, речници, форматиране на цени и дати
├─ lib/               QR енджин, Supabase, Stripe, абонаменти, планове
└─ proxy.ts           избор на език и защита на маршрутите
supabase/             миграции и тестове на базата
scripts/              настройка на Stripe и проверка на средата
docs/                 документация
```

## Документация

- [Архитектура и избор на технологии](docs/ARCHITECTURE.md)
- [Автентикация и настройки в Supabase](docs/AUTH.md)
- [Абонаменти, плащания и данъци (Stripe)](docs/BILLING.md)
- [Многоезичност](docs/I18N.md)
- [План на разработката](docs/ROADMAP.md)

## Сигурност

- Row Level Security на всички таблици. Лимитите на плана се проверяват и в базата, не само в интерфейса.
- Сървърът валидира и кодира съдържанието наново. Не вярва на данните от браузъра.
- Подписът на Stripe webhook-ите се проверява, а всяко събитие се обработва само веднъж.
- В базата няма данни за карти и IP адреси.

## Статус

Етапи 1–4 и многоезичността са готови и тествани в Stripe sandbox. Следва публикуване: хостинг, домейн, SMTP, жив Stripe. Виж [ROADMAP](docs/ROADMAP.md).
