# aiworker.bundle/1 — the settings file

```json
{
  "format": "aiworker.bundle/1",
  "items": [
    { "kind": "task", "ref": "t1", "data": { … } }
  ]
}
```

- `items` — up to 200; file up to 2 MB.
- `ref` — a name of the item inside the file (letters, digits, `_ . -`), unique. Links between items use refs only;
  ids of the account are never used.
- Unknown fields are ignored. Wrong values make the import's check list the error; nothing is created until the whole
  file passes.
- Never in a file: passwords, API keys, tokens, webhook addresses, Slack hooks, chat/Telegram ids of people.

## kind: task — a recurring job of an AI employee

| field | type | meaning |
|---|---|---|
| `kind` | `web` \| `telegram` | `web` — sites in the employee's browser; `telegram` — groups and channels |
| `name` | string ≤160 | required |
| `goal` | string ≤6000 | what to do every run, in plain words; required unless `program` is given. List every source and how to read it |
| `criteria` | string ≤6000 | what fits: the AI scores every element 0–100 against it |
| `targets` | string[] | web: start URLs `https://…` (≤10); telegram: `@group` (≤100). May be empty with `webhook` or a chain |
| `needs_auth` | bool | the site needs the owner's login (he signs in on the employee's desktop) |
| `mode` | `draft` \| `auto` | imported as `draft` (everything to the owner for approval); `auto` is the owner's switch |
| `auto_threshold` | 50–100 | score from which "auto" sends by itself (default 98) |
| `every_minutes` | int | 0 — only by hand / webhook / chain; otherwise the period |
| `params.daily_at` | "HH:MM" | every day at this exact time (the AI employee's time zone), no jitter; use it when the owner names a time («every day at 7 am»); `every_minutes` and `hours_*` are then ignored |
| `hours_from`, `hours_to` | `HH:MM` | working hours (the account's time zone) |
| `webhook` | bool | the task gets a webhook address (made on import); the program reads the list `events` |
| `trigger_template` | object | optional task start source (`crm`, `sheet`, `mail`, `webhook`, `telegram`, `rss`, `page_change`, `internal`); imported as a template until the owner reconnects it and enables it |
| `results_off` | bool | do not send results anywhere |
| `params.profile` | string | about the owner — used in replies and decisions ("I am a Laravel developer, 8 years…") |
| `params.email_subject`, `params.email_brief`, `params.email_digest` | | mail of results: subject, short form, one digest per run |
| `params.summary` | `{every: daily\|weekly, hour}` | a periodic summary of runs |
| `params.max_results`, `params.max_actions` | int | caps per run |
| `params.max_actions_per_day` | 0–10000 | external actions per calendar day in the tenant timezone; 0 disables; with warm-up this is the target |
| `params.warmup_enabled` | bool | ramp this task's daily action quota; requires `max_actions_per_day` ≥ 1 |
| `params.warmup_days` | 1–60, default 14 | elapsed days from day 0 to the target quota |
| `params.warmup_start_per_day` | 1–10000 | day-zero quota; default `max(1, round(max_actions_per_day/8))` |
| `params.warmup_started_at` | `YYYY-MM-DD` | tenant-local start date; set on first enable and retained when the target changes |
| `params.interval_jitter_percent` | 0–50, default 20 during warm-up | adds a bounded random delay of 0–this percentage to `min_interval_minutes`; never shortens the configured minimum |
| `params.min_interval_minutes` | 0–40320 | minimum time between external actions across runs; 0 disables |
| `params.event_max_age_minutes` | 0–40320 | queued webhook/trigger events older than this are skipped as stale; 0 disables expiry |
| `params.event_overflow` | `keep_newest` \| `keep_oldest` | queue overflow policy; default `keep_oldest` preserves today's behavior |
| `params.max_queued_events` | 1–500 | maximum queued events for the task |
| `params.events_per_run` | 1–50 | events taken per run; remaining events stay queued |
| `params.run_on` | `client_browser` | run in the owner's own browser (AI Worker extension) |
| `params.no_browser` | `server` \| `wait` | when the owner's browser is offline |
| `audience_ref` | ref → audience | a Telegram task that takes channels collected on the web |
| `deliver_to_refs` | ref[] → task | hand found results to these tasks of the file as input events (no loops) |
| `feeds_ref` | ref → task | a discovery task adds found groups to this task |
| `program` | object | optional exact scenario, see `program-steps.md`. Usually leave it out: AI Worker writes it |
| `manual_program` | bool | the program is hand-made: AI Worker's AI never rewrites it |
| `secret_names` | string[] | names of keys the program uses as `{{secret.NAME}}`; the owner enters values after import |

After import, started (the default through MCP and the API, «Сразу запустить» in the panel): with `program` the task
is switched on and runs; without it AI Worker's AI explores the sites, writes the scenario and runs the task. Not started
(`activate: false`): a task with `program` waits «на проверке», `mode: auto` comes in as `draft`.

### Portable task trigger template

`trigger_template` carries source settings and filters, never a mailbox or bot account id, webhook URL or shared secret.
For mail it may include a mailbox address, but the imported owner selects an account again; a trigger-only mailbox can be
used without letting the AI employee answer mail there. Telegram imports retain the bot username and target, then require a
connected bot to be selected. Webhook templates retain the auth mode, header name and payload filters; if auth is enabled,
the secret must be entered again. RSS and page URLs are revalidated by the safe fetcher at setup. `internal` task-result
sources use `source_task_ref`, so import can link tasks in the same file and reject loops. The template is saved separately
from the active trigger until the owner configures the missing connection and presses «Enable trigger».

## kind: web_chat — a chat widget for a site

| field | meaning |
|---|---|
| `name` | optional — without it the chat is «Чат N» |
| `persona_ref` | ref → persona (the consultant and its knowledge); without it the account's default persona |
| `settings.theme` | `classic` (button + window), `bar` (line at the bottom), `panel` (side panel), `inline` (block in the page) |
| `settings.scheme` | `light`, `dim`, `dark`, `auto` |
| `settings.color` | `#rrggbb` |
| `settings.position` | `left`, `right` |
| `settings.knowledge_mode` | `kb_only` (answers only from the knowledge) or `kb_general` |
| `settings.languages`, `settings.default_lang` | e.g. `["ru","en","uk"]`, `"ru"` |
| `settings.greeting`, `settings.titles`, `settings.names`, `settings.tab_labels` | per language: `{"ru": "Здравствуйте!", "en": "Hello!"}` |
| `settings.suggestions` | per language: up to 4 quick questions `{"ru": ["Цены", "Доставка"]}` |
| `settings.allowed_domains` | sites where the widget may run: `["shop.example.com"]` |
| `knowledge` | the chat's own sources (older files; new knowledge belongs to the persona — if the persona is used only by this chat of the file, they go to it): up to 50 sources: `{"type":"text","name":"Вопросы и ответы","content":"Вопрос: …\nОтвет: …\n\nВопрос: …"}` or `{"type":"site"\|"url"\|"gsheet"\|"gdoc","url":"https://…","max_pages":20,"refresh_days":7}` |

The chat is created off while its linked sources are read and switches on when they are indexed; with text knowledge only, or none
(it then answers from the persona's role), it is on at once. Files are not carried — the owner uploads them.

## kind: persona — the consultant of a chat

`name` (required), `last_name`, `gender` (`male`|`female`), `title` (role shown to visitors), `instruction` (how it
talks, what it may and may not say — e.g. "do not name prices that are not in the knowledge"), `languages`,
`default_lang`, `avatar_url` (https), `knowledge` — the persona's sources, the same shape as a chat's `knowledge`; every chat
of this persona answers from them.

## kind: audience — a contact collection

| `source_type` | `source_config` |
|---|---|
| `web` | `query` (what to look for: "стоматологии Киев"), `geo`, `limit`, `schedule` (`once`/`daily`/`weekly`), `target` (`companies` or `telegram` — Telegram channels of the topic), `check_messengers`, `filter_directories` |
| `sheet` | `sheet_url` (public Google Sheet), `sheet_tab`, `refresh` (`daily`/`hourly`), `filter_col`, `filter_op`, `filter_val` |
| `url` | `url` (CSV/JSON), `refresh`, `field_phone`, `field_name` |

Started on import (or paused with `activate: false`, then `audience_start`). CSV files are not carried.

## kind: scenario — how an AI employee talks in dialogs (messengers)

`name` (required), `type` (`inbound` — answers incoming, `outbound` — writes first in campaigns, `event`), `goal`,
`instruction`, `premoderation_mode` (`inherit`|`all`|`none`), `handoff` (`{reason_left, complaint, ready_to_book}`
booleans — when to hand the dialog to a person), `closing` (`{booked, refused, no_answer}`), `rules`
(`[{text, enabled}]` — behaviour rules), `kb` (`[{question, answer, section}]` — knowledge of this scenario).
Imported into the employee the owner picks (or the first one).
