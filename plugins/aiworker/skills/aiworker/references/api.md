# AI Worker API: every method

Generated from the OpenAPI document of the server (live: https://kra.name/app/api/v1/openapi.json, reader:
https://kra.name/app/api/docs). Base URL `https://kra.name/app/api/v1`, header `Authorization: Bearer <API key>` (panel →
Settings → Integrations; Business plan and above). Answers are JSON; 401 — no or wrong key, 422 — validation error,
429 — too many requests.

## Аккаунт

### `GET /me`

Кто я: компания, ИИ-сотрудники, события вебхуков

## Настройка: задания, чаты, личности

То же, что делает мастер настройки в панели (и MCP-сервер /api/mcp): обзор аккаунта, статус заданий, изменения из закрытого списка действий. Изменения — в два шага: POST /changes проверяет и откладывает, POST /changes/apply применяет (каждое действие проверяется ещё раз).

### `GET /account`

Обзор аккаунта: онлайн-чаты, личности, ИИ-сотрудники, задания (статус, сайты, критерии, расписание), браузеры — id для действий

### `GET /tasks`

Задания ИИ-сотрудникам

### `GET /tasks/{id}`

Задание: статус, последняя ошибка, шаги сценария, последние запуски, какие ключи нужны
- `id` (path, required)

### `GET /chats`

Онлайн-чаты с настройками

### `GET /personas`

Личности (консультанты чатов): роль, число источников знаний (knowledge_sources), вопросов FAQ (faq) и чатов (chats); чат отвечает по базе знаний своей личности

### `POST /personas/{id}/ask`

Ответ, написанный личностью: её роль, «Вопросы и ответы» и база знаний (например отклик на заказ по шаблонам личности). Никуда не отправляется и не сохраняется как чат; входит в лимит токенов ИИ, не больше 30 вызовов в минуту. Перед использованием проверьте факты и ссылки.
- `id` (path, required) — id личности этого аккаунта

Body: `{"text":"string","lang":"string","context":"string","max_chars":"integer"}`, required: text

### `GET /workers`

ИИ-сотрудники

### `POST /lookup`

Что задания сделали со ссылками из текста: найдено ли, когда, оценка ИИ и причина, ушло ли письмо

Body: `{"text":"string","task_id":"integer"}`, required: text

### `GET /guide`

Список действий для /changes, их поля и правила мастера

### `GET /changes`

Ожидающие изменения

### `POST /changes`

Предложить изменения: создать задание, чат, сбор контактов; изменить задание, FAQ, приветствие, инструкции; запустить, поставить на паузу… Ничего не меняется до /changes/apply

Действия — тот же закрытый список, что у мастера (GET /guide). Поля действия: type, target (id объекта; 0 — новый), field, lang, value, question, answer, index, payload (JSON-строка для automation_* и audience_collect). Ответ: что будет изменено (pending) и что отклонено с причиной (refused).

Body: `{"actions":"array"}`, required: actions

```json
{"actions":[{"type":"automation_update","target":12,"payload":"{\"criteria\":\"Только Laravel, бюджет от $300\"}"}]}
```

### `DELETE /changes`

Отменить ожидающие изменения

### `POST /changes/apply`

Применить ожидающие изменения (каждое проверяется ещё раз)

## Файлы настроек

Экспорт и импорт aiworker.bundle/1 (схема: /api/v1/bundle.schema.json). Ключей, паролей и токенов в файле нет.

### `GET /export`

Экспорт настроек в aiworker.bundle/1
- `kind` (query)
- `id[]` (query)

### `POST /import`

Импорт aiworker.bundle/1: по умолчанию только проверка; dry_run=false — создать

Body: `{"bundle":"object","dry_run":"boolean","worker_id":"integer"}`, required: bundle

## Контакты и очередь

### `GET /contacts`

Список контактов
- `search` (query) — по имени, телефону, email
- `per_page` (query)
- `page` (query)

### `POST /contacts`

Создать контакт; с campaign_id — поставить в очередь ИИ-сотруднику

Body: `[]`

### `POST /queue`

Поставить контакт в очередь кампании (то же, что POST /contacts с обязательным campaign_id)

Body: `[]`

## Кампании и аудитории

### `GET /campaigns`

Кампании: id для постановки в очередь, статус, аудитория

### `GET /audiences`

Аудитории и парсинг (сбор в интернете): id, статус, число контактов; collect_month — месячный лимит сбора тарифа. С source / status / page — подробный список: ход сбора, настройки, страницы
- `source` (query) — web — только парсинг
- `status` (query)
- `with_archived` (query)
- `limit` (query)
- `page` (query)

### `GET /audiences/{id}`

Аудитория или задача парсинга: статус, ход сбора (percent, round), настройки, журнал сборщика, какие действия /changes к ней применимы (audience_pause, audience_start, audience_finish, audience_archive)
- `id` (path, required)

### `GET /audiences/{id}/contacts`

Собранные контакты аудитории по страницам (до 500): имя, телефон, email, Telegram, мессенджеры, сайт, страница, где найден, адрес, когда добавлен
- `id` (path, required)
- `from` (query) — добавлен не раньше (часовой пояс аккаунта)
- `to` (query)
- `has` (query) — через запятую: phone, email, telegram, messenger
- `search` (query)
- `include_disabled` (query)
- `without_do_not_contact` (query)
- `limit` (query)
- `page` (query)

## Диалоги

### `GET /conversations`

Диалоги
- `status` (query)
- `channel` (query)
- `since` (query) — last_message_at не раньше
- `per_page` (query)
- `page` (query)

### `POST /conversations`

Написать контакту первым в Slack (личное сообщение от бота ИИ-сотрудника; уходит через обычную очередь отправки)

Body: `{"contact_id":"integer","channel":"string","text":"string","worker_id":"integer"}`, required: contact_id, channel, text

### `GET /conversations/{id}/messages`

Сообщения диалога
- `id` (path, required)

### `POST /conversations/{id}/messages`

Написать клиенту от имени компании (уходит через обычную очередь отправки)
- `id` (path, required)

Body: `{"text":"string","takeover":"boolean"}`, required: text

## Вебхуки

### `GET /webhooks/log`

Адрес, подписка и журнал последних доставок вебхуков

Подпись каждого вебхука: заголовок X-Signature-Timestamp (unix-время, секунды) и X-AIWorker-Signature-V2 = "sha256=" + HMAC-SHA256(X-Signature-Timestamp + "." + тело запроса) секретом из панели. Сравнивайте подпись за постоянное время и отклоняйте запрос, если метка времени отличается от текущего времени больше чем на 5 минут: так перехваченный запрос нельзя повторить. Устаревший заголовок X-AIWorker-Signature (HMAC только тела, без метки времени) пока отправляется для совместимости и будет убран.

## Плагин WordPress

Мастер настройки и статистика онлайн-чатов в админке плагина AI Worker Chat. Вход — OAuth 2.1 + PKCE со scope=chat (регистрация POST /app/api/oauth/register, затем /app/oauth/authorize): токен открывает только онлайн-чаты, личности, FAQ, базу знаний, статистику и расход токенов ИИ; задания, ИИ-сотрудники, мессенджеры, оплата и ключи ему закрыты. Подходит и API-ключ.

### `GET /plugin/me`

Аккаунт, тариф, онлайн-чаты (сайты, личность) и доступность мастера
- `lang` (query)

### `GET /plugin/assistant`

Текущий разговор с мастером настройки (тот же, что в панели у того, кто подключил сайт); новый начинается с приветствия по состоянию чата
- `chat_id` (query) — чат в фокусе мастера / статистики

### `POST /plugin/assistant/ask`

Запрос мастеру своими словами; он может предложить изменения (pending). С доступом chat — только онлайн-чат, личности, FAQ, база знаний, заявка разработчикам. 20 запросов в минуту на аккаунт, токены ИИ — как в панели

Body: `{"text":"string","chat_id":"integer"}`, required: text

### `POST /plugin/assistant/apply`

Применить ожидающие изменения (каждое проверяется ещё раз)

### `POST /plugin/assistant/discard`

Отменить ожидающие изменения

### `POST /plugin/assistant/clear`

Очистить разговор (начнётся с приветствия)
- `chat_id` (query) — чат в фокусе мастера / статистики

### `GET /plugin/stats`

Статистика онлайн-чатов за период, токены ИИ аккаунта и счётчики тарифа
- `chat_id` (query) — чат в фокусе мастера / статистики
- `period` (query) — month — с 1-го числа текущего месяца
- `from` (query)
- `to` (query)

## ИИ-агенты

События аккаунта для вашего Claude Code или Codex (ADR 102). Слушатель aiworker-listen.mjs на вашем компьютере ждёт сигнал (long-poll OMS по адресу wake.url маршрута) и забирает события этим методом; агент отмечает событие через MCP agent_ack или POST /agent/events/{id}/ack. Публичный адрес маршрута для CRM — в панели, «ИИ-агенты».

### `GET /agent/routes`

Маршруты ИИ-агентов: агент, режим сессии, инструкция, сколько ждёт, адрес сигнала для слушателя (wake.url)

### `GET /agent/events`

Забрать ждущие события маршрута (помечаются «передано агенту»): данные, агент, сессия, готовый промпт
- `route` (query) — имя маршрута; без него — все активные
- `after` (query) — только события с id больше
- `limit` (query)

### `POST /agent/events`

Отправить событие в маршрут из своего скрипта (источник api)

Body: `{"route":"string","title":"string","payload":"object"}`, required: route, payload

### `GET /agent/events/recent`

Последние события и их статус (ничего не помечается)
- `route` (query)
- `status` (query)
- `limit` (query)

### `GET /agent/events/{id}`

Одно событие с данными и промптом
- `id` (path, required)

### `POST /agent/events/{id}/ack`

Отметить событие: обработано или нет, и что сделано
- `id` (path, required)

Body: `{"status":"string","result":"string"}`, required: status

## MCP server

`POST https://kra.name/app/api/mcp` (Streamable HTTP, JSON answers), the same key. Tools: get_account, guide, lookup,
task_status, task_gallery, propose_changes, pending_changes, apply_changes, discard_changes, export, import, agent_routes, agent_events,
agent_ack — the same as the REST methods above; persona_ask (REST `POST /personas/{id}/ask`) — a reply written by one of
the owner's personas, sent to nobody. At most 10 messages per request, 120 tool calls, 10 imports and 30 persona_ask calls a minute.
