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

### `GET /shared/{token}`

Задание по ссылке «Поделиться» (ADR 141): что в нём и что сделает установка в этот аккаунт (ничего не меняется)

token — часть ссылки https://kra.name/app/t/<token>. Установка — действие automation_install_shared {"target":0,"value":"<ссылка или токен>","payload":"{\"worker_id\":N}"} через POST /changes и POST /changes/apply. Поделиться своим заданием — automation_share {"target":<id задания>,"payload":"{\"include_profile\":false,\"show_author\":false,\"expires_days\":30}"}, отозвать — automation_share_revoke; адрес новой ссылки — в ответе /changes/apply. Ссылки задания — поле shares в GET /tasks/{id}.
- `token` (path, required)

### `GET /chats`

Онлайн-чаты с настройками

### `GET /personas`

Личности (консультанты чатов): роль, число источников знаний (knowledge_sources), вопросов FAQ (faq) и чатов (chats); чат отвечает по базе знаний своей личности

### `POST /personas/{id}/ask`

Ответ, написанный личностью: её роль, «Вопросы и ответы» и база знаний (например отклик на заказ по шаблонам личности). Никуда не отправляется и не сохраняется как чат; входит в лимит токенов ИИ, не больше 30 вызовов в минуту. Перед использованием проверьте факты и ссылки.
- `id` (path, required) — id личности этого аккаунта

Body: `{"text":"string","lang":"string","context":"string","max_chars":"integer","translate_to":"string"}`, required: text

### `GET /personas/{id}/blocks`

Обязательные блоки ответов личности (ADR 139): дословные (сервер вставляет текст владельца) и по фактам (сервер проверяет ссылки, обязательные фразы и подписи). Меняются через POST /changes: persona_block_set (field — имя блока, payload — JSON) и persona_block_remove.
- `id` (path, required)

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

## Коннектор n8n и Make

ADR 132. Работает на любом оплаченном тарифе ИИ-сотрудника, включая «Мини» ($15); на тарифе только с онлайн-чатом — 403 connector_not_in_plan. Доступ — API-ключ аккаунта или OAuth-токен со scope connector (кнопка «Connect» в n8n и Make). Задания из описания словами, запуск с данными, результаты и запуски по курсору, мгновенные триггеры через подписки REST-hooks с подписью, сообщение в диалог. Остальной REST API — с тарифа «Бизнес».

### `GET /connector/me`

Аккаунт, тариф, ИИ-сотрудники, браузеры с расширением, лимит заданий (проверка подключения)

### `GET /connector/tasks`

Задания аккаунта (для выпадающего списка)
- `archived` (query)

### `POST /connector/tasks`

Создать задание по описанию словами

С sites задание создаётся сразу (проверки мастера настройки), без sites описание читает ИИ мастера и сам выбирает сайты. Сценарий затем составляет ИИ-сотрудник (phase = authoring, обычно 2–5 минут) и, если activate не false, сразу включает задание. Если мастер не может сделать такое задание, заявка уходит разработчикам: ответ 202 с request = AW-N (при if_unclear = ask — 422 needs_details с вопросом мастера). Лимит заданий тарифа — 409 task_limit.

Body: `{"description":"string","name":"string","sites":"array","criteria":"string","kind":"string","run_on":"string","no_browser":"string","every_minutes":"integer","daily_at":"string","mode":"string","worker_id":"integer","needs_auth":"boolean","accepts_input":"boolean","activate":"boolean","email_to":"string","telegram_to":"string","results_off":"boolean","if_unclear":"string"}`, required: description

### `GET /connector/tasks/{id}`

Статус задания: фаза, последние запуски с длительностью, заявка разработчикам, чего ждёт
- `id` (path, required)

### `POST /connector/tasks/{id}/run`

Запустить сейчас, с входными данными

Активное задание запускается при первой возможности; на паузе или на проверке — один запуск без включения; пока ИИ составляет сценарий — сразу после него. input — объект или список до 20 объектов: каждый становится событием запуска (как у вебхука задания).
- `id` (path, required)

Body: `{"input":"object"}`

### `GET /connector/tasks/{id}/results`

Результаты по курсору (опрос вместо вебхука): сохранённое и решённое заданием, по порядку появления
- `id` (path, required)
- `after` (query) — курсор: next_cursor прошлого ответа
- `limit` (query)

### `GET /connector/tasks/{id}/runs`

Законченные запуски по курсору (опрос «запуск завершён»)
- `id` (path, required)
- `after` (query) — курсор: next_cursor прошлого ответа
- `limit` (query)

### `GET /connector/hooks`

Подписки REST-hooks аккаунта

### `POST /connector/hooks`

Подписаться на событие (триггер n8n / Make)

События: result.created — новый результат задания; run.finished — запуск закончился (удачно или нет); task.stopped — задание остановилось и ждёт человека (ошибка, нужен вход). target_url — публичный https-адрес. Ответ содержит secret один раз: каждая доставка подписана X-Signature-Timestamp и X-AIWorker-Signature-V2 = "sha256=" + HMAC-SHA256(timestamp + "." + тело, secret). Ответ 2xx — доставлено; 410 — подписка удаляется; 5xx/429 — повтор (до 6 попыток с паузами до часа); 20 неудачных доставок подряд отключают подписку.

Body: `{"event":"string","target_url":"string","task_id":"integer","source":"string"}`, required: event, target_url

### `DELETE /connector/hooks/{id}`

Отписаться
- `id` (path, required)

### `POST /connector/hooks/{id}/test`

Тестовая доставка сейчас (data.hello, test = true)
- `id` (path, required)

### `GET /connector/conversations`

Диалоги (для выбора, кому написать)
- `per_page` (query)
- `page` (query)

### `POST /connector/conversations/{id}/messages`

Написать в диалог от имени владельца (обычная очередь отправки)
- `id` (path, required)

Body: `{"text":"string","takeover":"boolean"}`, required: text

## Галерея заданий

Готовые задания ИИ-сотрудникам (те же, что «Галерея заданий» в панели и инструмент MCP task_gallery): список на ru/en/uk, задание из элемента с вашими значениями полей и элемент файлом настроек aiworker.bundle/1 для POST /import.

### `GET /gallery`

Галерея готовых заданий на выбранном языке и сколько ещё заданий позволяет тариф
- `lang` (query)

### `GET /gallery/{slug}`

Одно задание галереи: что делает и какие поля заполнить
- `slug` (path, required)
- `lang` (query)

### `POST /gallery/{slug}/tasks`

Создать задание из галереи с вашими значениями — те же проверки, что у «Взять» в панели (поля, лимит тарифа, сотрудник компании). Без готового сценария задание «new»: ИИ-сотрудник составит сценарий сам; с готовым — «review»: проверьте шаги и включите его. Режим — черновики на одобрение. 30 запросов в минуту.
- `slug` (path, required)

Body: `{"values":"object","name":"string","worker_id":"integer"}`

### `POST /gallery/{slug}/bundle`

Задание галереи файлом настроек aiworker.bundle/1 (ничего не создаётся): поправьте его в своём ИИ и загрузите через POST /import
- `slug` (path, required)

Body: `{"values":"object","name":"string"}`

## Шаблоны шагов

Черновики приватны для tenant. template_submit принимает scope tenant (default, только эта компания) или public (все клиенты); оба scope проходят AI-модерацию. Для public после явного подтверждения владельца нужен отдельный propose/apply с повторной проверкой сохранённой версии и блок-листа. Версии задач закреплены точными id и hash.

### `GET /step-templates`

Общий каталог одобренных шаблонов и собственные черновики только этого аккаунта

### `POST /step-templates`

Создать приватный черновик

Body: `{"slug":"string","name":"string","description":"string","domains":"array","inputs":"array","steps":"array","procedures":"object","allowed_places":"array","default_place":"string","show_author":"boolean"}`, required: name, description, domains, inputs, steps

### `GET /step-templates/{slug}`

Состояния и хеши собственных версий с verdict/reasons/categories
- `slug` (path, required)

### `PATCH /step-templates/{slug}`

Создать новый приватный draft version; опубликованные задания остаются закреплены за своей версией
- `slug` (path, required)

Body: `{"slug":"string","name":"string","description":"string","domains":"array","inputs":"array","steps":"array","procedures":"object","allowed_places":"array","default_place":"string","show_author":"boolean"}`, required: name, description, domains, inputs, steps

### `POST /step-templates/{slug}/validate`

Детерминированные проверки без модели
- `slug` (path, required)

### `POST /step-templates/{slug}/test`

Пробный standalone запуск собственного read-only draft в test mode
- `slug` (path, required)

Body: `{"inputs":"object","where":"string","worker_id":"integer","node_id":"integer","device_id":"integer"}`

### `POST /step-templates/{slug}/submit`

Детерминированные проверки, блок-лист и обязательная AI-модерация; scope tenant по умолчанию или public
- `slug` (path, required)

Body: `{"scope":"string"}`

### `POST /step-templates/{slug}/revoke`

Отозвать опубликованную версию; новые запуски блокируются, закреплённые задания ставятся на паузу
- `slug` (path, required)

Body: `{"version_id":"integer"}`

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

Аудитория или задача парсинга: статус, ход сбора (percent, round), настройки, журнал сборщика, какие действия /changes к ней применимы (audience_pause, audience_start, audience_finish, audience_archive, audience_restart, audience_restore, audience_row_upsert); поколения сбора (generation, generations — ADR 142), источник поиска Telegram (discovery)
- `id` (path, required)
- `compare` (query) — сравнить поколения: «1,2» или одно число — с текущим (сохранённые, новые, ушедшие строки)

### `GET /audiences/{id}/contacts`

Собранные контакты аудитории по страницам (до 500): имя, телефон, email, Telegram, мессенджеры, сайт, страница, где найден, адрес, когда добавлен; origin — collector, import, manual или assistant_verified (строка добавлена вручную действием audience_row_upsert, ADR 148)
- `id` (path, required)
- `generation` (query) — строки этого поколения сбора (по умолчанию текущего)
- `from` (query) — добавлен не раньше (часовой пояс аккаунта)
- `to` (query)
- `has` (query) — через запятую: phone, email, telegram, messenger
- `search` (query)
- `sort` (query) — metric — по численности (участники/подписчики/посещаемость) от большей, пустая метрика всегда внизу
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

Для первой отправки передайте country или jurisdictions и recipient_type, если они известны. Если правило требует подтверждения, ответ 409 содержит outreach_warning; повторите запрос с его точным outreach_acknowledgement перед отправкой. При неизвестной стране укажите юрисдикцию. Предупреждение справочное, отправитель отвечает за сообщения.

Body: `{"contact_id":"integer","channel":"string","text":"string","worker_id":"integer","country":"string","jurisdictions":"array","recipient_type":"string","address_class":"string","legal_form":"string","outreach_acknowledgement":"string"}`, required: contact_id, channel, text

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

## Генерация изображений Codex

Локальный помощник imagegen.mjs (ADR 187). Токен выпускается в панели, показывается один раз, хранится только как хэш; имеет право image_worker и не заменяет API-ключ аккаунта.

### `GET /image-worker/status`

Статус Codex-подключения (также обновляет heartbeat)

### `POST /image-worker/heartbeat`

Подтвердить, что Codex-подключение доступно

### `POST /image-worker/jobs/claim`

Взять следующее задание своей компании (long-poll до 25 секунд)
- `wait` (query)

### `POST /image-worker/jobs/{id}/result`

Загрузить PNG, JPEG или WebP (до 10 МБ)
- `id` (path, required)

### `POST /image-worker/jobs/{id}/fail`

Сообщить о неудаче генерации
- `id` (path, required)

Body: `{"reason":"string"}`, required: reason

## MCP server

`POST https://kra.name/app/api/mcp` (Streamable HTTP, JSON answers), the same key. Tools: account_key_remove, account_key_set, account_keys, agent_ack, agent_events, agent_routes, ai_providers, alerts, algorithm_test, algorithm_test_status, apply_changes, attention_items, audience_rows, audience_status, audiences, brand_style_detect_from_site, brand_style_get, brand_style_set, browser_command, browser_open, browser_release, browser_status, browser_targets, capabilities, channel_accounts, chat_test, collection_algorithms, deck_archive, deck_create, deck_diff, deck_export_pdf, deck_export_pptx, deck_generate, deck_get, deck_list, deck_regenerate_slide, deck_restore, deck_revisions, deck_update, desktop_link, discard_changes, export, feature_requests, get_account, guide, image_generate, image_jobs, image_status, import, lookup, mailing_revisions_diff, mailing_revisions_list, mailing_revisions_restore, mailing_template_archive, mailing_template_create, mailing_template_diff, mailing_template_generate, mailing_template_get, mailing_template_restore, mailing_template_revisions, mailing_template_update, mailing_templates_list, outreach_rules, panel_settings, pending_changes, persona_ask, persona_blocks, persona_instruction, propose_changes, request_feature, revision_diff, revisions, server_add, server_audit_report, server_audit_run, server_audit_status, server_fix_apply, server_fix_propose, server_fix_rollback, server_test, shared_task, step_run, step_run_status, step_templates, storage_delete, storage_list, storage_read, storage_write, task_block_test, task_block_test_status, task_gallery, task_items, task_key_use, task_revision_diff, task_revisions, task_status, template_create, template_revoke, template_status, template_submit, template_test, template_update, template_validate; chat_test (MCP only) — start/say/stop/status to test an account chat through the widget answer path; preview sessions are excluded from visitor statistics, leads and chat billing, replies count against the account AI limit, sessions expire after 60 idle minutes, and the per-account rate cap matches persona_ask; persona_ask (REST `POST /personas/{id}/ask`) — a reply written by one of
the owner's personas, sent to nobody; desktop_link (MCP only) — a one-time link, 10 minutes, to an AI employee's desktop; browser_targets, browser_open, browser_command, browser_status, browser_release (MCP only) — an explicit browser with a per-session domain scope and read-only or interactive policy: the AI employee's dedicated server browser (browser=server) or the owner's own browser through the AI Worker extension (browser=client, device_id; only where he allowed it; never drive his browser with OS-level computer use); LinkedIn Jobs/Posts remain under linkedin_read_only; post_link {ref} is the only bounded recovery action and returns a sanitized permalink from the exact post menu; no Firefox. At most 10 messages per request, 120 tool calls, 10 imports and 30 persona_ask calls a minute.
Step templates and owner-authored templates (ADR 156): step_templates, step_run, step_run_status; template_create, template_update, template_validate, template_test, template_submit (scope tenant|public), template_status, template_revoke. Both submit scopes require AI review. tenant is company-only by default. A public-scope AI approval is not publication: after the owner's explicit choice use propose_changes with template_publish {target:version_id, field:slug, value:public}, then apply_changes; at apply time perform an independent deterministic recheck by rerunning validators and the blocklist on the stored version and audit the result. template_status also reads platform version_id, content_hash, status, where and inputs. Tasks pin exact version_id and content_hash. gmail_read_messages is read-only, client_browser-only, checks the Gmail UI account against the expected email, requires exactly one of Gmail query or thread URL, masks OTP/reset links/secrets, treats message text as untrusted, and never follows message links or downloads attachments.
Password actions (extension 0.7.0+, client browser only): vault_status returns only not_initialized|locked|unlocked, protection=master_phrase|none, auto_generate and write_only_available; the default key is session-scoped and locks after 15 idle minutes, while owner-selected none stores the key in extension local storage and stays open; passwords and key never leave the browser; password_entries lists refs/labels/accounts and password_fill reads existing entries only after the owner unlocks locally. password_generate_fill can append a newly generated password while locked using the extension-local public key; it is merged into the encrypted vault on unlock, never overwrites, and possible duplicates are flagged. A separate trusted local confirmation for the exact site is shown only when the owner enables that setting; it is not an unlock prompt. Switching back from none requires setting or confirming a phrase and locks the unchanged encrypted envelope. Secrets never enter MCP results or logs.
Extension-owned MCP windows (0.7.0+): browser_open purpose=housekeeping on an explicit client device opens a short page-free session; browser_command own_windows lists only the extension's tracked MCP tabs, and close_own_window closes eligible tracked tabs after release, with local confirmation for human-edited, unsaved or uninspectable tabs. Handed-over and unrelated tabs are never closed. A repeated release after keep_open says already_released and how to close the old window.
Task block checks: task_block_test starts one read-only top-level block on the task's configured server or client browser; give task_id, a zero-based integer step or editor path such as "2", optional task-site listing URL and limit 1–10. Poll task_block_test_status for intermediate values, opened card URLs, cut card text, per-card errors and would-do actions. Full-card reading is enabled on one extract_list or for_each step with automation_step_patch through propose_changes and apply_changes; card reads are sequential, same-site, politely delayed and capped at 20 per run; failure removes item.text and sets item.enrich_error.
