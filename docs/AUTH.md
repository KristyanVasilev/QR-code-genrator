# Автентикация: как работи и какво да се настрои в Supabase

## Как работи

| Действие | Къде е кодът | Какво прави |
|---|---|---|
| Регистрация | `lib/auth/actions.ts` → `signUp` | Валидира на сървъра и извиква `supabase.auth.signUp`. Тригерът в базата създава профил и безплатен план. Изпраща се имейл за потвърждение. |
| Вход / изход | `signIn` / `signOut` (езикът идва от скрито поле `lang`) | Сесията се пази в бисквитки (`sb-<проект>-auth-token`). |
| Забравена парола | `requestPasswordReset` | Изпраща линк. Отговорът е еднакъв, независимо дали имейлът съществува, за да не може да се разбере кои имейли са регистрирани. |
| Линк от имейл | `app/auth/confirm/route.ts` | Проверява токена и създава сесия. После пренасочва към таблото или към формата за нова парола. |
| Нова парола | `updatePassword` | Изисква активна сесия. |
| Защита на маршрути | `src/proxy.ts` | Опреснява токена. Пренасочва гостите от `/dashboard` към `/login?next=…`, а влезлите — от страниците за вход към таблото. |
| Проверка в кода | `lib/auth/session.ts` | `getCurrentUser()` / `requireUser()` — единственото място, където се чете сесията (Data Access Layer). |

**Сигурност:**
- `getClaims()` проверява подписа на JWT, затова не вярваме сляпо на бисквитката.
- Параметърът `?next=` приема само вътрешни пътища, т.е. няма отворено пренасочване към чужди сайтове.
- Паролите се хешират от Supabase и никога не стигат до нашата база.
- Supabase има вградено ограничение на броя опити (rate limiting).

**Производителност:** proxy-то се изпълнява само за `/dashboard`, `/login`, `/register`, `/forgot-password` и `/reset-password`. Публичните страници остават изцяло статични. Хедърът определя дали потребителят е влязъл само по наличието на бисквитката, без заявка към сървъра.

## Настройки в Supabase (еднократно)

### 1. URL адреси — **задължително**
**Authentication → URL Configuration**
- **Site URL:** `http://localhost:3000` (при публикуване го сменете с домейна)
- **Redirect URLs:** добавете `http://localhost:3000/**` (а по-късно и `https://<домейн>/**`)

Без тази стъпка линковете от имейлите водят към грешен адрес.

### 2. Имейл шаблони — препоръчително
**Authentication → Emails → Templates.** С шаблоните по подразбиране линкът работи само в **същия браузър**, в който е направена регистрацията. С долните шаблони работи и когато имейлът се отвори на телефона.

Шаблоните ползват езика на потребителя (`{{ .Data.locale }}`, записва се при регистрация). Ако езикът липсва, текстът е на английски.

**Confirm signup** — Subject: `Confirm your email · QRly`
```html
{{ $lang := "en" }}{{ with .Data.locale }}{{ $lang = . }}{{ end }}
{{ $link := printf "%s/auth/confirm?token_hash=%s&type=email&next=/%s/dashboard" .SiteURL .TokenHash $lang }}
{{ if eq $lang "bg" }}
  <h2>Добре дошли!</h2><p>Натиснете бутона, за да потвърдите имейла си:</p>
  <p><a href="{{ $link }}">Потвърди имейла</a></p><p>Ако не сте се регистрирали, игнорирайте това писмо.</p>
{{ else if eq $lang "es" }}
  <h2>¡Bienvenido!</h2><p>Pulsa el botón para confirmar tu correo:</p>
  <p><a href="{{ $link }}">Confirmar correo</a></p><p>Si no te has registrado, ignora este mensaje.</p>
{{ else if eq $lang "de" }}
  <h2>Willkommen!</h2><p>Klicke auf den Button, um deine E-Mail zu bestätigen:</p>
  <p><a href="{{ $link }}">E-Mail bestätigen</a></p><p>Wenn du dich nicht registriert hast, ignoriere diese Nachricht.</p>
{{ else if eq $lang "fr" }}
  <h2>Bienvenue !</h2><p>Cliquez sur le bouton pour confirmer votre e-mail :</p>
  <p><a href="{{ $link }}">Confirmer l'e-mail</a></p><p>Si vous ne vous êtes pas inscrit, ignorez ce message.</p>
{{ else if eq $lang "it" }}
  <h2>Benvenuto!</h2><p>Premi il pulsante per confermare la tua email:</p>
  <p><a href="{{ $link }}">Conferma email</a></p><p>Se non ti sei registrato, ignora questo messaggio.</p>
{{ else }}
  <h2>Welcome!</h2><p>Click the button to confirm your email:</p>
  <p><a href="{{ $link }}">Confirm email</a></p><p>If you didn't sign up, you can ignore this email.</p>
{{ end }}
```

**Reset password** — Subject: `Reset your password · QRly`
```html
{{ $lang := "en" }}{{ with .Data.locale }}{{ $lang = . }}{{ end }}
{{ $link := printf "%s/auth/confirm?token_hash=%s&type=recovery&next=/%s/reset-password" .SiteURL .TokenHash $lang }}
{{ if eq $lang "bg" }}
  <h2>Смяна на парола</h2><p><a href="{{ $link }}">Изберете нова парола</a></p><p>Ако не сте поискали смяна, игнорирайте това писмо.</p>
{{ else if eq $lang "es" }}
  <h2>Restablecer contraseña</h2><p><a href="{{ $link }}">Elegir nueva contraseña</a></p><p>Si no lo has solicitado, ignora este mensaje.</p>
{{ else if eq $lang "de" }}
  <h2>Passwort zurücksetzen</h2><p><a href="{{ $link }}">Neues Passwort wählen</a></p><p>Wenn du das nicht angefordert hast, ignoriere diese Nachricht.</p>
{{ else if eq $lang "fr" }}
  <h2>Réinitialiser le mot de passe</h2><p><a href="{{ $link }}">Choisir un nouveau mot de passe</a></p><p>Si vous n'avez rien demandé, ignorez ce message.</p>
{{ else if eq $lang "it" }}
  <h2>Reimposta la password</h2><p><a href="{{ $link }}">Scegli una nuova password</a></p><p>Se non l'hai richiesto, ignora questo messaggio.</p>
{{ else }}
  <h2>Reset your password</h2><p><a href="{{ $link }}">Choose a new password</a></p><p>If you didn't request this, ignore this email — your password stays the same.</p>
{{ end }}
```
> Ако профилът няма записан език (създаден преди многоезичността), шаблонът ползва английски (`$lang = "en"`).

### 3. Парола
**Authentication → Sign In / Providers → Email:** задайте **Minimum password length = 8**. Приложението и без това изисква 8 символа, буква и цифра, но така правилото важи и в самия Supabase.

### 4. Имейли за продукция
Вграденият SMTP на Supabase е само за разработка: изпраща само до имейлите на членовете на екипа ви в Supabase и има много нисък лимит на час. Преди публичен старт:
1. Направете безплатен профил в [Resend](https://resend.com) (3000 имейла/месец) и потвърдете домейна си.
2. **Authentication → Emails → SMTP Settings** → въведете данните от Resend.

Не са нужни промени в кода.

### 5. JWT ключове (проверка)
**Project Settings → JWT Keys:** новите проекти ползват асиметрични ключове (ECC/RSA). Тогава `getClaims()` проверява сесията локално, без мрежова заявка. Ако проектът е със стария „Legacy JWT secret“, натиснете *Migrate*. Ще работи и без това, но малко по-бавно.

## Ръчен тест
1. `/register` → създайте профил с **вашия** имейл (вграденият SMTP изпраща само до членове на екипа).
2. Отворете линка от имейла → трябва да влезете в `/dashboard`.
3. Изход → `/dashboard` трябва да ви пренасочи към вход.
4. `/forgot-password` → линк от имейла → нова парола → таблото показва „Паролата е сменена успешно“.
5. В Supabase → **Table Editor → profiles / subscriptions** трябва да има ред за новия потребител с план `free`.
