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

Личности (консультанты чатов)

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

Аудитории: id для добавления контактов без запуска общения

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
task_status, propose_changes, pending_changes, apply_changes, discard_changes, export, import, agent_routes, agent_events,
agent_ack — the same as the REST methods above. At most 10 messages per request, 120 tool calls and 10 imports a minute.
