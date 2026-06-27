# Деплой KantTools — бесплатно и навсегда онлайн

Схема: **кабинет → Vercel**, **backend+бот → Render (free)**, **база → Neon** (уже готова).
Бот в проде работает через webhook прямо внутри backend, поэтому хватает одного бесплатного сервиса Render.

Тебе понадобятся бесплатные аккаунты: **GitHub**, **Render**, **Vercel** (везде можно войти через Google/GitHub).

---

## Шаг 1. Залить код на GitHub

1. Зайди на https://github.com/new → создай **пустой** репозиторий, например `kanttools` (можно private). НЕ добавляй README/gitignore.
2. В PowerShell выполни (я уже сделал commit, осталось только запушить под твоим аккаунтом):

```powershell
cd C:\Users\nurse\Downloads\Claude\kanttools
git remote add origin https://github.com/ТВОЙ_ЛОГИН/kanttools.git
git branch -M main
git push -u origin main
```

При первом `push` откроется окно входа в GitHub — войди (это нужно один раз).

> ⚠️ Файлы `.env` с твоими паролями **не попадут** в GitHub — они в `.gitignore`. Это правильно.

---

## Шаг 2. Backend + бот на Render

1. https://render.com → войди → **New → Blueprint**.
2. Подключи свой GitHub и выбери репозиторий `kanttools`. Render увидит файл `render.yaml` и предложит создать сервис **kanttools-api**.
3. Перед созданием Render попросит ввести секреты (`sync: false`). Заполни:
   - **DATABASE_URL** — строка от Neon (та же, что мы вписали локально).
   - **TELEGRAM_BOT_TOKEN** — токен твоего бота.
   - **ADMIN_PASSWORD** — пароль админа (например `KantAdmin2026!`).
   - **TELEGRAM_WEBAPP_URL** — пока поставь `https://example.com` (поменяем в Шаге 4).
   - **CORS_ORIGINS** — пока тоже `https://example.com`.
   - Ключи `JWT_*` и `LICENSE_SIGNING_SECRET` Render сгенерирует сам.
4. Нажми **Apply / Create**. Render соберёт и запустит сервис.
5. Когда статус станет **Live**, скопируй адрес сервиса — вид `https://kanttools-api.onrender.com`. Это твой **API-адрес**.

Проверка: открой `https://kanttools-api.onrender.com/api/v1/health` — должно вернуть `{"success":true,...}`.

---

## Шаг 3. Кабинет на Vercel

1. https://vercel.com → войди → **Add New → Project** → выбери репозиторий `kanttools`.
2. В настройках проекта:
   - **Root Directory** → нажми Edit и выбери папку **`web`**.
   - **Environment Variables** → добавь:
     `NEXT_PUBLIC_API_URL` = `https://kanttools-api.onrender.com/api/v1` (адрес из Шага 2 + `/api/v1`).
3. Нажми **Deploy**. Через минуту получишь адрес кабинета — вид `https://kanttools.vercel.app`.

---

## Шаг 4. Связать всё вместе (1 минута)

Вернись в **Render → kanttools-api → Environment** и поменяй два значения на адрес из Vercel:

- **TELEGRAM_WEBAPP_URL** = `https://kanttools.vercel.app`
- **CORS_ORIGINS** = `https://kanttools.vercel.app`

Сохрани — Render перезапустит сервис. При старте backend **сам**:
- зарегистрирует webhook бота,
- повесит кнопку-меню в боте, открывающую кабинет.

Ничего в BotFather делать вручную не нужно.

---

## Готово ✅

- Открой бота [@ergeshv505_bot](https://t.me/ergeshv505_bot) → синяя кнопка-меню слева от поля ввода открывает кабинет.
- Кабинет работает с любого телефона, **даже когда твой ПК выключен**.
- Админка: `https://kanttools.vercel.app/admin/login`.

### Важные мелочи (бесплатный тариф)
- Render free «засыпает» после 15 мин простоя — первый запрос/сообщение боту после паузы идёт ~30–50 сек, потом быстро. Чтобы реже засыпал, можно бесплатно настроить пинг на https://cron-job.org каждые 10 минут на адрес `…/api/v1/health`.
- Когда задеплоишь webhook-бота — **закрой локальное окно с ботом на ПК** (`bot`), иначе один токен будет конфликтовать (webhook vs polling).
- Поменял код? `git push` → Render и Vercel пересоберут автоматически.
