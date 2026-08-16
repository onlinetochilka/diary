# 🏗️ INFRASTRUCTURE_MIGRATION.md — Точилка (Tochilka)

> **Назначение документа:** Ультимативная инструкция по инфраструктуре проекта «Точилка».  
> Любой ИИ-агент или разработчик берёт этот файл и получает полную картину:  
> где живут секреты, как устроена база, куда приходят вебхуки, как деплоить.  
> **⚠️ Реальные пароли и токены в этом файле НЕ хранятся.**

---

## Содержание

1. [Общая архитектура](#1-общая-архитектура)
2. [Карта секретов и переменных окружения](#2-карта-секретов-и-переменных-окружения)
3. [Чек-лист ручного переноса (Инструкция для владельца)](#3-чек-лист-ручного-переноса)
4. [Настройка GitHub Secrets](#4-настройка-github-secrets)
5. [PocketBase в деталях](#5-pocketbase-в-деталях)
6. [Внешние API и вебхуки](#6-внешние-api-и-вебхуки)
7. [Инструкция по автономной работе для ИИ-агента](#7-инструкция-по-автономной-работе-для-ии-агента)

---

## 1. Общая архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Beget VPS (Ubuntu)                            │
│                         IP: 5.35.89.238                                │
│                                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │     Caddy (порт 443)     │  │   PocketBase (порт 8090) │            │
│  │                          │  │                          │            │
│  │  api.tochilka.app ────┐  │  │  /opt/pocketbase/        │            │
│  │                       ├──┼──┤  ├─ pocketbase (binary)   │            │
│  │  tutor.tochilka.app   │  │  │  ├─ pb_data/data.db       │            │
│  │   ├─ /api/pb/* ───────┘  │  │  ├─ pb_hooks/             │            │
│  │   └─ /* → SPA (dist)    │  │  └─ pb_migrations/         │            │
│  │                          │  └──────────────────────────┘            │
│  │  write.tochilka.app      │                                          │
│  │   ├─ /api/pb/* → PB     │  ┌──────────────────────────┐            │
│  │   └─ /* → SPA (dist)    │  │  notifier-service (PM2)  │            │
│  └──────────────────────────┘  │  /root/notifier-service/  │            │
│                                │  ├─ Telegram Bot (Telegraf)│           │
│                                │  ├─ MAX Bot (Long Polling)│            │
│                                │  └─ Cron-планировщик      │            │
│                                └──────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  GitHub Actions   │────▶│  Build (Vite)     │────▶│  SCP → /var/www/    │
│  push → main      │     │  npm ci && build  │     │  + PB hooks copy    │
└───────────────────┘     └───────────────────┘     └─────────────────────┘
```

### Стек технологий

| Слой | Технология | Версия |
|---|---|---|
| **Frontend** | React + Vite + TailwindCSS | React 19, Vite 8, TW 3.4 |
| **State management** | TanStack React Query | v5 |
| **Маршрутизация** | react-router-dom | v7 |
| **Backend / BaaS** | PocketBase (embedded SQLite) | v0.23+ |
| **Реверс-прокси** | Caddy | latest |
| **Бот уведомлений** | Node.js + Telegraf + PM2 | Node 20 |
| **Платежи** | ЮKassa API v3 | — |
| **CI/CD** | GitHub Actions | — |
| **Хостинг** | Beget VPS (Ubuntu) | — |

### Доменная структура

| Домен | Назначение | Webroot / Proxy |
|---|---|---|
| `api.tochilka.app` | PocketBase API (прямой доступ) | `→ 127.0.0.1:8090` |
| `tutor.tochilka.app` | SPA для репетиторов | `/var/www/tutor.tochilka.app` |
| `write.tochilka.app` | Второй проект (журнал) | `/var/www/write.tochilka.app` |

---

## 2. Карта секретов и переменных окружения

> **⚠️ ВАЖНО:** Здесь перечислены только **названия** ключей. Реальные значения хранятся в защищённых `.env` файлах, которые **никогда не попадают в git**.

### 2.1. Переменные фронтенда (Vite → `import.meta.env`)

| Переменная | Описание | Где используется | Как получить |
|---|---|---|---|
| `VITE_POCKETBASE_URL` | URL PocketBase API | `src/services/pocketbase.js` | Значение по умолчанию: `/api/pb` (через Caddy/Vite прокси) |

> Фронтенд **не содержит секретов** — все Vite-переменные публичные (`VITE_` prefix).  
> Файлы: `.env` (dev), `.env.production` (prod).

### 2.2. Переменные сервера — notifier-service

| Переменная | Описание | Где используется | Как получить |
|---|---|---|---|
| `POCKETBASE_URL` | URL PocketBase для бота | `notifier-service/db.js` | По умолчанию: `http://127.0.0.1:8090` (бот на том же сервере) |
| `ADMIN_EMAIL` | Email суперпользователя PB | `notifier-service/db.js` | Создаётся при инициализации PocketBase |
| `ADMIN_PASSWORD` | Пароль суперпользователя PB | `notifier-service/db.js` | Задаётся вручную при первой настройке PB |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота | `notifier-service/index.js` | Получить через [@BotFather](https://t.me/BotFather) |
| `MAX_BOT_TOKEN` | Токен бота MAX (max.ru) | `notifier-service/index.js` | Получить в панели разработчика MAX |

> Файл на сервере: `/root/notifier-service/.env`

### 2.3. Переменные PocketBase Hooks (серверный JS)

| Переменная | Описание | Где используется | Как получить |
|---|---|---|---|
| `YOOKASSA_SHOP_ID` | ID магазина ЮKassa | `pb_hooks/yookassa.pb.js` | Личный кабинет [ЮKassa](https://yookassa.ru/my) → Настройки |
| `YOOKASSA_SECRET_KEY` | Секретный ключ ЮKassa | `pb_hooks/yookassa.pb.js` | Там же → API ключи → Секретный ключ |

> **Внимание:** В `yookassa.pb.js` есть fallback-значения (дефолтные значения прописаны в коде).  
> В продакшене переменные читаются через `$os.getenv()`.  
> Рекомендуется вынести их в `/opt/pocketbase/.env` или в systemd-unit.

### 2.4. Переменные для утилитных скриптов (локальный запуск)

| Переменная | Описание | Где используется | Как получить |
|---|---|---|---|
| `PB_ADMIN_EMAIL` | Email админа PB | `scripts/setup-pocketbase.mjs` | `admin@tochilka.app` |
| `PB_ADMIN_PASSWORD` | Пароль админа PB | `scripts/setup-pocketbase.mjs` | Задаётся при инициализации PB |
| `DEMO_EMAIL` | Email демо-аккаунта | `seed_demo.mjs` | `demo@tochilka.app` |
| `DEMO_PASSWORD` | Пароль демо-аккаунта | `seed_demo.mjs` | Задаётся вручную |
| `TEST_EMAIL` | Email тестового аккаунта | `.env.example` | Для E2E тестов |
| `TEST_PASSWORD` | Пароль тестового аккаунта | `.env.example` | Для E2E тестов |

### 2.5. Переменные для CI/CD (GitHub Actions)

| Переменная | Описание | Где используется | Как получить |
|---|---|---|---|
| `SERVER_PASSWORD` | Пароль root от VPS | `.github/workflows/deploy.yml` | Панель Beget или `.env.server` |

### 2.6. Переменные инфраструктуры (`.env.server`)

| Переменная | Описание | Назначение |
|---|---|---|
| `SERVER_HOST` | IP-адрес VPS | SSH-доступ, деплой |
| `SERVER_USER` | Пользователь SSH | По умолчанию: `root` |
| `SERVER_PASSWORD` | Пароль SSH | Деплой через SCP/SSH |
| `TELEGRAM_BOT_USERNAME` | Username бота в TG | Для формирования deep-link `t.me/{username}?start=student_{id}` |

### 2.7. Сводная таблица `.env` файлов

| Файл | Где хранится | В git? | Назначение |
|---|---|---|---|
| `.env` | Корень проекта | ❌ | Vite dev переменные (безопасные) |
| `.env.production` | Корень проекта | ❌ | Vite prod переменные |
| `.env.local` | Корень проекта | ❌ | Vercel CLI + PB admin credentials |
| `.env.server` | Корень проекта | ❌ | SSH-доступы, IP сервера |
| `.env.example` | Корень проекта | ✅ | Шаблон для `.env.local` |
| `notifier-service/.env` | `notifier-service/` | ❌ | Бот: PB + TG + MAX токены |
| `notifier-service/.env.example` | `notifier-service/` | ✅ | Шаблон для бота |

---

## 3. Чек-лист ручного переноса

> **Сценарий:** Вы создаёте новый репозиторий в Google Antigravity 2.0 и хотите, чтобы ИИ-агенты могли автономно работать с проектом.

### Шаг 1. Создание нового рабочего пространства

1. Откройте Google Antigravity 2.0
2. Создайте новую папку проекта (например, `D:\new-project`)
3. Инициализируйте git: `git init` (или `git clone`)
4. Привяжите папку к Antigravity как workspace

### Шаг 2. Копирование секретных файлов

Физически скопируйте следующие файлы **из папки Ежедневника** в новую папку:

```
КОПИРОВАТЬ ИЗ: D:\daily\
КОПИРОВАТЬ В:  D:\new-project\

Файлы для копирования:
──────────────────────────────────────────────────────

📁 Обязательные секреты:
├── .env                   → содержит VITE_POCKETBASE_URL
├── .env.local             → PB admin email/password (Vercel OIDC-токен можно не копировать)
├── .env.server            → SSH доступы к серверу
└── .env.production        → VITE_POCKETBASE_URL для прода

📁 Шаблоны (уже в git, копировать не нужно, но убедитесь):
├── .env.example           → шаблон основных переменных
└── notifier-service/.env.example → шаблон бота

📁 Конфигурации агентов (если нужны те же skills):
└── .agents/               → весь каталог навыков агентов
```

### Шаг 3. Создание `.env` для нового бота (если проект имеет бота)

В папке `notifier-service/` создайте `.env` по образцу `.env.example`:

```bash
POCKETBASE_URL=http://127.0.0.1:8090
ADMIN_EMAIL=admin@tochilka.app
ADMIN_PASSWORD=<пароль из панели PocketBase>
TELEGRAM_BOT_TOKEN=<токен из BotFather>
MAX_BOT_TOKEN=<токен из MAX, если используется>
```

### Шаг 4. Проверка `.gitignore`

Убедитесь, что `.gitignore` содержит:

```gitignore
.env
.env.*
!.env.example
```

### Шаг 5. Проверка доступности агентам

После копирования файлов ИИ-агент (Antigravity) **автоматически** получит доступ к `.env*` файлам, поскольку они лежат в рабочей директории. `.gitignore` не влияет на видимость для агентов — он влияет только на git.

> **⚠️ Предупреждение:** `.env.server` содержит SSH-пароли. Не публикуйте эти файлы и не добавляйте в git.

---

## 4. Настройка GitHub Secrets

> **Путь:** GitHub → Settings → Secrets and variables → Actions → New repository secret

### Обязательные секреты для CI/CD

| Secret name | Значение | Где взять | Используется в |
|---|---|---|---|
| `SERVER_PASSWORD` | Пароль root-пользователя VPS | Панель Beget → VPS → Доступы **или** из файла `.env.server` (поле `SERVER_PASSWORD`) | `deploy.yml` — все три шага (scp-action и ssh-action) |

### Текущая конфигурация CI/CD

Workflow `deploy.yml` при `push → main` выполняет:

1. **Checkout** → `actions/checkout@v4`
2. **Setup Node** → `actions/setup-node@v4` (Node 20, npm cache)
3. **Install** → `npm ci`
4. **Build** → `npm run build` (Vite → `dist/`)
5. **Deploy Frontend** → `appleboy/scp-action@v0.1.7`
   - Source: `dist/*`
   - Target: `/var/www/tutor.tochilka.app`
   - Host: `5.35.89.238`, user: `root`
6. **Deploy PB Hooks** → `appleboy/scp-action@v0.1.7`
   - Source: `pb_hooks/*, pb_migrations/*`
   - Target: `/root/pb_updates`
7. **Apply & Restart** → `appleboy/ssh-action@v1.0.3`
   ```bash
   cp -r /root/pb_updates/pb_hooks /opt/pocketbase/
   cp -r /root/pb_updates/pb_migrations /opt/pocketbase/
   systemctl restart pocketbase
   ```

> **Примечание:** Workflow НЕ деплоит `notifier-service`. Бот деплоится вручную через `deploy_bot.bat` или SSH.

### Если нужно расширить CI/CD

Чтобы добавить деплой бота в pipeline, потребуется дополнительный secret:

| Secret name | Значение | Для чего |
|---|---|---|
| `SSH_PRIVATE_KEY` | Содержимое приватного SSH-ключа (ed25519) | Альтернатива паролю; ключ уже установлен на сервере |

---

## 5. PocketBase в деталях

### 5.1. Расположение на сервере

```
/opt/pocketbase/
├── pocketbase              ← бинарник PocketBase
├── pb_data/
│   ├── data.db             ← ОСНОВНАЯ БАЗА ДАННЫХ (SQLite, WAL mode)
│   ├── auxiliary.db        ← Логи запросов и система
│   ├── types.d.ts          ← TypeScript типы для хуков
│   └── storage/            ← Загруженные файлы (аватары и пр.)
├── pb_hooks/
│   ├── yookassa.pb.js      ← Хук платежей ЮKassa
│   └── support.pb.js       ← Хук обратной связи
└── pb_migrations/
    └── 1710000000_add_subscription_fields.js
```

**Системный сервис:** PocketBase запущен как systemd-сервис (`pocketbase`).
- Перезапуск: `systemctl restart pocketbase`
- Логи: `journalctl -u pocketbase -f`
- Порт: `8090` (только localhost, Caddy проксирует наружу)

### 5.2. Каталог коллекций (полная схема)

#### 🔐 `users` (Auth Collection — встроенная)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `id` | text (auto) | ✅ | PocketBase ID |
| `email` | email | ✅ | Email пользователя |
| `name` | text | — | Имя пользователя (кастомное) |
| `subscription_status` | select(`active`, `inactive`) | — | Статус подписки |
| `subscription_until` | date | — | Дата окончания подписки |
| `yookassa_payment_id` | text | — | ID последнего платежа ЮKassa |

**API Rules:**
- `listRule`: `id = @request.auth.id`
- `viewRule`: `id = @request.auth.id`
- `createRule`: `""` (публичная регистрация)
- `updateRule`: `id = @request.auth.id`
- `deleteRule`: `id = @request.auth.id`

---

#### 👩‍🎓 `students` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `tutorId` | text | ✅ | ID владельца (репетитора) |
| `name` | text | ✅ | Имя ученика |
| `gender` | text | — | Пол (для склонений в уведомлениях) |
| `studentGender` | text | — | Пол ученика |
| `grade` | text | — | Класс |
| `timezone` | text | — | Часовой пояс ученика |
| `phone` | text | — | Телефон |
| `guestHash` | text | — | Хеш для гостевой ссылки |
| `tgChatId` | text | — | Telegram Chat ID (привязан ботом) |
| `maxChatId` | text | — | MAX Chat ID (привязан ботом) |
| `balance` | number | — | Текущий баланс (± руб.) |
| `ltv` | number | — | Lifetime Value (сумма всех оплат) |
| `hwDebtCount` | number | — | Количество несданных ДЗ |
| `colorVersion` | number | — | Версия цветовой схемы |
| `colorHue` | number | — | Hue цвета |
| `isArchived` | bool | — | Архивирован ли ученик |
| `active` | bool | — | Активен ли ученик |
| `colorOklch` | json | — | Цвет в формате OKLCH `{l, c, h}` |
| `contacts` | json | — | Контакты родителей |
| `subjects` | json | — | Предметы, ставки, программы |
| `notes` | editor | — | Заметки преподавателя (rich text) |

**API Rules:** Стандартная изоляция по `tutorId`:
- `listRule` / `viewRule`: `@request.auth.id != "" && tutorId = @request.auth.id`
- `createRule`: `@request.auth.id != ""`
- `updateRule` / `deleteRule`: `@request.auth.id != "" && tutorId = @request.auth.id`

> **Примечание:** Поля `tgChatId` и `maxChatId` отсутствуют в скрипте `setup-pocketbase.mjs`.  
> Они создаются динамически при первой привязке через бота.  
> Рекомендуется добавить их в setup-скрипт.

---

#### 👥 `groups` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `tutorId` | text | ✅ | ID репетитора |
| `name` | text | ✅ | Название группы |
| `subject` | text | — | Предмет |
| `studentIds` | json | — | Массив ID учеников |
| `colorOklch` | json | — | Цвет группы |
| `colorVersion` | number | — | — |
| `colorHue` | number | — | — |
| `programs` | json | — | Привязанные программы |
| `active` | bool | — | — |

**API Rules:** Стандартная изоляция по `tutorId`

---

#### 📚 `programs` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `tutorId` | text | ✅ | — |
| `name` | text | ✅ | Название программы |
| `subject` | text | — | Предмет |
| `colorOklch` | json | — | Цвет |
| `colorVersion` | number | — | — |
| `colorHue` | number | — | — |
| `sections` | json | — | Разделы программы |
| `topics` | json | — | Темы/уроки |

**API Rules:** Стандартная изоляция по `tutorId`

---

#### 📅 `lessons` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `tutorId` | text | ✅ | — |
| `date` | text | — | Дата урока `YYYY-MM-DD` |
| `startTime` | text | — | Начало `HH:mm` |
| `endTime` | text | — | Конец `HH:mm` |
| `type` | text | — | `individual` или `group` |
| `studentId` | text | — | ID ученика (для инд.) |
| `groupId` | text | — | ID группы |
| `displayName` | text | — | Отображаемое имя |
| `subjectName` | text | — | Предмет |
| `status` | text | — | `planned`, `conducted`, `cancelled`, `skipped_paid` |
| `seriesId` | text | — | ID серии повторяющихся уроков |
| `repeatUntil` | text | — | Конец повторения |
| `price` | number | — | Цена урока |
| `paymentAmount` | number | — | Фактическая оплата |
| `homework` | json | — | Данные домашнего задания |
| `hwDoneBy` | json | — | Кто сдал ДЗ (для групп) |
| `reschedules` | json | — | История переносов |
| `studentPayments` | json | — | Индивидуальные оплаты в группе |
| `groupStudentIds` | json | — | Ученики в групповом уроке |
| `isRecurring` | bool | — | Повторяющийся ли урок |

**API Rules:** Стандартная изоляция по `tutorId`

---

#### 💰 `payments` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `tutorId` | text | ✅ | — |
| `studentId` | text | — | ID ученика |
| `studentName` | text | — | Имя (для удобства) |
| `amount` | number | — | Сумма |
| `currency` | text | — | Валюта (`RUB`) |
| `paidAt` | text | — | Дата/время оплаты |
| `comment` | text | — | Комментарий / тег `[урок:ID:studentId]` |

**API Rules:** Стандартная изоляция по `tutorId`

---

#### ⚙️ `user_config` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `userId` | text | ✅ | ID пользователя |
| `theme` | text | — | Тема интерфейса |
| `timezone` | text | — | Часовой пояс |
| `currency` | text | — | Валюта |
| `scheduleColorBy` | text | — | Раскраска расписания |
| `workingDays` | json | — | Рабочие дни |
| `dashboardMetrics` | json | — | Метрики дашборда |
| `requisites` | editor | — | Реквизиты для оплаты (rich text) |
| `notifications` | json | — | Настройки уведомлений бота |
| `displayName` | text | — | Отображаемое имя репетитора |
| `subjects` | json | — | Предметы репетитора |

**API Rules:** Изоляция по `userId`:
- `listRule` / `viewRule`: `@request.auth.id != "" && userId = @request.auth.id`
- `createRule`: `@request.auth.id != ""`
- `updateRule` / `deleteRule`: `@request.auth.id != "" && userId = @request.auth.id`

> **Примечание:** Поля `notifications`, `displayName`, `subjects` используются notifier-service, но не указаны в `setup-pocketbase.mjs`. Они создаются вручную через UI PocketBase или добавляются динамически.

---

#### 📰 `community_news` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `text` | editor | — | Текст поста |
| `channelName` | text | — | Имя канала `@tochilka_online` |
| `postUrl` | url | — | Ссылка на пост |
| `imageData` | text | — | Base64 изображения |
| `isVideo` | bool | — | Видео-пост? |
| `messageId` | number | — | Telegram message_id (для дедупликации) |

**API Rules:**
- `listRule` / `viewRule`: `""` (публичное чтение)
- `createRule` / `updateRule` / `deleteRule`: `null` (только суперпользователь / бот)

---

#### 📝 `daily_notes` (Base Collection)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `userId` | relation → `users` | ✅ | Владелец (каскадное удаление) |
| `date` | text | ✅ | Дата `YYYY-MM-DD` |
| `color` | text | — | Цвет заметки |
| `items` | json | ✅ | Массив чек-лист элементов |

**API Rules:** Изоляция по `userId = @request.auth.id` (все операции)

---

### 5.3. PocketBase Hooks

#### `pb_hooks/yookassa.pb.js`

**1. Хук автоактивации триала** (при регистрации):
- Триггер: `onRecordCreateRequest("users")`
- Действие: автоматически устанавливает `subscription_status = "active"` и `subscription_until = now + 3 месяца`
- Новые пользователи получают бесплатный пробный период

**2. Роут создания платежа** → `POST /api/payments/create`:
- Требует авторизации
- Принимает `{ plan: "monthly"|"yearly", return_url: "..." }`
- Тарифы:
  - `monthly` → 390 ₽ / 1 месяц
  - `yearly` → 3 490 ₽ / 12 месяцев
- Отправляет запрос к ЮKassa API (`https://api.yookassa.ru/v3/payments`)
- Возвращает `{ payment_id, confirmation_url }` для редиректа пользователя

**3. Вебхук ЮKassa** → `POST /api/payments/webhook`:
- Принимает уведомления от ЮKassa
- При `event === "payment.succeeded"`: продлевает подписку пользователя
- Логика продления: если текущая подписка ещё активна — продлевает от `subscription_until`, иначе от `now`
- Записывает `yookassa_payment_id` в запись пользователя

#### `pb_hooks/support.pb.js`

**Роут обратной связи** → `POST /api/support`:
- Принимает `{ name, email, message }`
- Отправляет email на `help@tochilka.app` через встроенный SMTP-клиент PocketBase
- Требуется настройка SMTP в панели PocketBase (Settings → Mail Settings)

### 5.4. Настройка PocketBase с нуля

```bash
# 1. Скачать бинарник PocketBase для Linux
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_X.X.X_linux_amd64.zip

# 2. Распаковать в /opt/pocketbase/
unzip pocketbase_*.zip -d /opt/pocketbase/

# 3. Первый запуск (создаст суперпользователя)
/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090

# 4. Зайти в Admin UI (через SSH-туннель или временно без localhost)
# Создать суперпользователя admin@tochilka.app

# 5. Запустить setup-скрипт с локальной машины
PB_ADMIN_PASSWORD="ваш_пароль" node scripts/setup-pocketbase.mjs

# 6. (Опционально) Создать коллекцию daily_notes
node add_notes_collection.mjs

# 7. Настроить systemd-сервис
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

---

## 6. Внешние API и вебхуки

### 6.1. Telegram Bot — Входящий трафик

```
Telegram Cloud ──▶ (Long Polling) ──▶ notifier-service (PM2)
                                        на порту: нет (polling)
                                        процесс: /root/notifier-service/
```

**Режим работы:** Long Polling (НЕ webhook).

Бот запускается через `bot.launch()` (Telegraf), который использует `getUpdates` long polling. Порт не слушает, исходящие запросы к Telegram API.

**Deep-link для привязки ученика:**
```
https://t.me/tochilka_mail_bot?start=student_{studentId}
```

**Обработчики бота:**
| Команда/событие | Действие |
|---|---|
| `/start` (без payload) | Приветствие |
| `/start student_{id}` | Привязка tgChatId к ученику в PB |
| `/help` | Описание возможностей |
| `channel_post` | Сохранение постов из `@tochilka_online` в `community_news` |
| `edited_channel_post` | Обновление сохранённого поста |
| Любой текст | «Я бот, не отвечаю на сообщения» |

### 6.2. MAX Bot — Входящий трафик

```
MAX Cloud ──▶ (Long Polling) ──▶ notifier-service (PM2)
                                    GET https://platform-api.max.ru/updates?timeout=30
```

**Режим работы:** Long Polling к `https://platform-api.max.ru`.

**Deep-link для привязки ученика:**
```
/start student_{studentId}
# или base64-encoded JSON: /start {base64({ studentId: "..." })}
```

### 6.3. ЮKassa — Входящий вебхук

```
ЮKassa Servers ──▶ POST https://api.tochilka.app/api/payments/webhook
                    (через Caddy reverse proxy → PocketBase :8090)
```

**Настройка в кабинете ЮKassa:**
1. Зайти в [yookassa.ru/my](https://yookassa.ru/my)
2. Настройки → HTTP-уведомления
3. URL для уведомлений: `https://api.tochilka.app/api/payments/webhook`
4. Событие: `payment.succeeded`

**Исходящий запрос (создание платежа):**
```
PocketBase Hook ──▶ POST https://api.yookassa.ru/v3/payments
                     Authorization: Basic {base64(SHOP_ID:SECRET_KEY)}
```

### 6.4. PocketBase SMTP (исходящая почта)

```
PocketBase ──▶ SMTP сервер ──▶ help@tochilka.app
```

Настраивается в Admin UI PocketBase:
- Settings → Mail Settings → SMTP Host, Port, User, Password

Используется для:
- Верификации email при регистрации
- Сброса пароля
- Отправки обращений из `/api/support`

### 6.5. Cron-задачи (notifier-service)

| Расписание | Действие | Описание |
|---|---|---|
| `0 * * * *` (каждый час) | `runHourlyChecks()` | Проверка долгов, отправка напоминаний об оплате через Telegram/MAX |

### 6.6. Карта портов

| Порт | Сервис | Доступ |
|---|---|---|
| `443` | Caddy (HTTPS) | Публичный |
| `80` | Caddy (HTTP → redirect) | Публичный |
| `8090` | PocketBase | Только localhost |
| — | notifier-service (PM2) | Не слушает порт (outbound polling) |

---

## 7. Инструкция по автономной работе для ИИ-агента

> **Памятка для самого себя (Antigravity / любой AI-агент).**  
> Этот раздел описывает, как запустить, тестировать и деплоить проект.

### 7.1. Структура проекта

```
D:\daily\                          ← РАБОЧАЯ ДИРЕКТОРИЯ
├── src/                           ← React frontend (Vite + TailwindCSS)
│   ├── api/databaseApi.js         ← Основной API-клиент PocketBase
│   ├── services/pocketbase.js     ← Инициализация PB SDK
│   ├── services/billingService.js ← Логика платежей
│   ├── pages/                     ← Страницы приложения
│   ├── components/                ← React компоненты
│   ├── hooks/                     ← Custom React hooks
│   └── contexts/                  ← Auth и Confirm контексты
├── pb_hooks/                      ← Серверные хуки PocketBase (JS)
├── pb_migrations/                 ← Миграции схемы БД
├── notifier-service/              ← Микросервис уведомлений (Node.js)
│   ├── providers/                 ← Telegram + MAX провайдеры
│   └── .env                       ← Секреты бота (только на сервере)
├── deploy/                        ← Конфигурация Caddy
├── scripts/                       ← Утилитные скрипты (setup PB, тесты)
├── tests/                         ← Playwright E2E тесты
├── .github/workflows/deploy.yml   ← CI/CD pipeline
└── package.json                   ← Scripts: dev, build, lint, preview
```

### 7.2. Локальный запуск

```bash
# 1. Установка зависимостей
cd D:\daily
npm install

# 2. Запуск dev-сервера (с прокси к production PocketBase)
npm run dev
# → http://localhost:5173
# → /api/pb/* проксируется на https://api.tochilka.app

# 3. Для полностью локальной работы (без удалённого PB):
# Скачать PocketBase, запустить на :8090, поменять VITE_POCKETBASE_URL
```

### 7.3. Сборка и проверка

```bash
# Сборка production бандла
npm run build
# → Результат в dist/

# Предпросмотр production сборки
npm run preview

# Линтинг
npm run lint
# → Используется oxlint (быстрый Rust-линтер)
```

### 7.4. Тестирование

```bash
# Установка Playwright браузеров (однократно)
npx playwright install chromium

# Запуск E2E тестов
npx playwright test

# Запуск с отображением браузера
npx playwright test --headed
```

### 7.5. Деплой

#### Автоматический (основной способ):
```bash
git add . && git commit -m "описание" && git push origin main
# → GitHub Actions автоматически:
#   1. npm ci && npm run build
#   2. scp dist/* → /var/www/tutor.tochilka.app
#   3. scp pb_hooks, pb_migrations → /opt/pocketbase/
#   4. systemctl restart pocketbase
```

#### Ручной деплой бота:
```bash
# Из PowerShell:
D:\daily\deploy_bot.bat
# → Загружает файлы notifier-service на сервер через SCP
# → npm install --production на сервере
# → pm2 restart notifier-service
```

#### Ручной деплой PB хуков:
```bash
D:\daily\deploy_pb.bat
# → Загружает pb_hooks/ и pb_migrations/ на сервер
# → Требует ручной перезапуск PocketBase
```

### 7.6. SSH-доступ к серверу

```bash
# SSH с ключом (уже настроен, пароль не нужен):
ssh root@5.35.89.238

# Полезные команды на сервере:
pm2 logs notifier-service         # Логи бота
pm2 restart notifier-service      # Перезапуск бота
systemctl status pocketbase       # Статус PocketBase
systemctl restart pocketbase      # Перезапуск PocketBase
journalctl -u pocketbase -f       # Логи PocketBase в реальном времени
caddy reload --config /etc/caddy/Caddyfile  # Перезагрузка Caddy
```

### 7.7. Работа с базой данных

```bash
# Создание коллекций с нуля:
PB_ADMIN_PASSWORD="пароль" node scripts/setup-pocketbase.mjs

# Заполнение демо-данными:
DEMO_PASSWORD="пароль" node seed_demo.mjs

# Добавление коллекции daily_notes:
node add_notes_collection.mjs

# Admin UI PocketBase:
# https://api.tochilka.app/_/ (логин: admin@tochilka.app)
```

### 7.8. Чек-лист перед работой с кодом

- [ ] Убедиться, что `.env` файлы на месте (`D:\daily\.env`, `.env.local`, `.env.server`)
- [ ] `npm install` выполнен
- [ ] `npm run dev` запускает dev-сервер на `localhost:5173`
- [ ] Страница авторизации доступна по `http://localhost:5173/login`
- [ ] API проксируется: запрос к `/api/pb/api/health` возвращает `200`
- [ ] Линтер работает: `npm run lint`

### 7.9. Ключевые файлы для агента

| Что нужно | Файл |
|---|---|
| Понять маршруты | `src/App.jsx` |
| Работать с данными PB | `src/api/databaseApi.js` |
| Логика платежей | `src/services/billingService.js` |
| Логика уроков | `src/services/lessonFacadeService.js` |
| Стили и дизайн-система | `src/index.css`, `tailwind.config.js`, `DESIGN_SYSTEM.md` |
| Хуки PocketBase (сервер) | `pb_hooks/yookassa.pb.js` |
| CI/CD | `.github/workflows/deploy.yml` |
| Бот уведомлений | `notifier-service/index.js` |
| Этот документ | `INFRASTRUCTURE_MIGRATION.md` |

---

> **Последнее обновление:** 2026-08-14  
> **Автор:** Antigravity AI Agent, по результатам полного аудита кодовой базы
