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
| `hours_from`, `hours_to` | `HH:MM` | working hours (the account's time zone) |
| `webhook` | bool | the task gets a webhook address (made on import); the program reads the list `events` |
| `results_off` | bool | do not send results anywhere |
| `params.profile` | string | about the owner — used in replies and decisions ("I am a Laravel developer, 8 years…") |
| `params.email_subject`, `params.email_brief`, `params.email_digest` | | mail of results: subject, short form, one digest per run |
| `params.summary` | `{every: daily\|weekly, hour}` | a periodic summary of runs |
| `params.max_results`, `params.max_actions` | int | caps per run |
| `params.run_on` | `client_browser` | run in the owner's own browser (AI Worker extension) |
| `params.no_browser` | `server` \| `wait` | when the owner's browser is offline |
| `audience_ref` | ref → audience | a Telegram task that takes channels collected on the web |
| `deliver_to_refs` | ref[] → task | hand found results to these tasks of the file as input events (no loops) |
| `feeds_ref` | ref → task | a discovery task adds found groups to this task |
| `program` | object | optional exact scenario, see `program-steps.md`. Usually leave it out: AI Worker writes it |
| `manual_program` | bool | the program is hand-made: AI Worker's AI never rewrites it |
| `secret_names` | string[] | names of keys the program uses as `{{secret.NAME}}`; the owner enters values after import |

After import: no `program` → AI Worker's AI explores the sites and writes the scenario (the owner gets it for review);
with `program` → status «на проверке» until the owner switches the task on.

## kind: web_chat — a chat widget for a site

| field | meaning |
|---|---|
| `name` | required |
| `persona_ref` | ref → persona (the consultant); without it the account's default persona |
| `settings.theme` | `classic` (button + window), `bar` (line at the bottom), `panel` (side panel), `inline` (block in the page) |
| `settings.scheme` | `light`, `dim`, `dark`, `auto` |
| `settings.color` | `#rrggbb` |
| `settings.position` | `left`, `right` |
| `settings.knowledge_mode` | `kb_only` (answers only from the knowledge) or `kb_general` |
| `settings.languages`, `settings.default_lang` | e.g. `["ru","en","uk"]`, `"ru"` |
| `settings.greeting`, `settings.titles`, `settings.names`, `settings.tab_labels` | per language: `{"ru": "Здравствуйте!", "en": "Hello!"}` |
| `settings.suggestions` | per language: up to 4 quick questions `{"ru": ["Цены", "Доставка"]}` |
| `settings.allowed_domains` | sites where the widget may run: `["shop.example.com"]` |
| `knowledge` | up to 50 sources: `{"type":"text","name":"Вопросы и ответы","content":"Вопрос: …\nОтвет: …\n\nВопрос: …"}` or `{"type":"site"\|"url"\|"gsheet"\|"gdoc","url":"https://…","max_pages":20,"refresh_days":7}` |

The chat is created off and switches on when its knowledge is indexed. Files are not carried — the owner uploads them.

## kind: persona — the consultant of a chat

`name` (required), `last_name`, `gender` (`male`|`female`), `title` (role shown to visitors), `instruction` (how it
talks, what it may and may not say — e.g. "do not name prices that are not in the knowledge"), `languages`,
`default_lang`, `avatar_url` (https).

## kind: audience — a contact collection

| `source_type` | `source_config` |
|---|---|
| `web` | `query` (what to look for: "стоматологии Киев"), `geo`, `limit`, `schedule` (`once`/`daily`/`weekly`), `target` (`companies` or `telegram` — Telegram channels of the topic), `check_messengers`, `filter_directories` |
| `sheet` | `sheet_url` (public Google Sheet), `sheet_tab`, `refresh` (`daily`/`hourly`), `filter_col`, `filter_op`, `filter_val` |
| `url` | `url` (CSV/JSON), `refresh`, `field_phone`, `field_name` |

Imported paused; the owner starts it («Продолжить сбор»). CSV files are not carried.

## kind: scenario — how an AI employee talks in dialogs (messengers)

`name` (required), `type` (`inbound` — answers incoming, `outbound` — writes first in campaigns, `event`), `goal`,
`instruction`, `premoderation_mode` (`inherit`|`all`|`none`), `handoff` (`{reason_left, complaint, ready_to_book}`
booleans — when to hand the dialog to a person), `closing` (`{booked, refused, no_answer}`), `rules`
(`[{text, enabled}]` — behaviour rules), `kb` (`[{question, answer, section}]` — knowledge of this scenario).
Imported into the employee the owner picks (or the first one).
