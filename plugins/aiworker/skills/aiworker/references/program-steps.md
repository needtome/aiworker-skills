# Program steps (task scenarios)

Generated from the server's catalogue — the same list the AI Worker editor and its own AI use. A program is
`{"start_url": "https://…", "steps": [ {"op": "…", …}, … ]}`. Values may use variables: `{{item.title}}`,
`{{d.reply}}`, `{{params.profile}}`, filters `{{query|url}}`, `{{list|count}}`, `{{x|json}}`. Account-wide reusable values are
`{{account.NAME}}`; read-only profile values are `{{company.name}}`, `{{company.site}}`, `{{company.email}}`, and `{{owner.name}}`.
Only referenced global values are sent to the task runtime; missing values block the run, and values marked personal are
masked in runtime logs and reports. Keys only as `{{secret.NAME}}` (and only in `api` steps). Steps marked «kind: web» are for
site tasks, «telegram» for Telegram tasks, «common» for both. A step that sends something (`submit: true`, `tg_send`) runs only after a `decide` allowed it.

## Semantic field bindings

`selector` can be a CSS/XPath string or a semantic descriptor. The shared runtime resolves visible elements by an
accessible name, explicit label, placeholder, `aria-label`, button text, or role. Text is matched after normalizing
whitespace and case; an exact match wins over a partial match. If multiple best matches remain, the step fails and lists
the candidate elements; it never picks one arbitrarily. A missing match is also a step error for required actions.

```json
{"op":"set_value","selector":{"by":"label","any":["Текст ставки","Коментар до ставки","Proposal text"]},"value":"{{item.text}}"}
```

Allowed `by` values: `label`, `placeholder`, `aria-label`, `button`, `role`, `name`. `role` also supplies a role, such as
`{"by":"role","role":"combobox","any":["Portfolio work"]}`. The selector resolver is shared by the extension's
client browser and the server's Playwright driver.

## Freelancehunt bid template (`fh_bid`, ADR-207)

`fh_bid` is a platform web template for `freelancehunt.com`, restricted to `client_browser`. It takes `project_url`
(must contain `/project/` on the exact Freelancehunt host), approved `text`, positive `price`, `days` (1–365), optional
`currency`, optional portfolio `sample_title`, and `mode` (`fill_only` by default, or `submit`). It opens the project,
checks login/closed/already-bid states, opens and fills the form, reads back the supplied values, and saves a screenshot.
It chooses one exact portfolio option title from a custom combobox as well as from a native select. Missing or duplicate
titles fail the step. `fill_only` leaves the form unsent. `submit` clicks with `submit:true`, checks the existing task
decision and server permit, verifies a success notice or closed form, and saves a second screenshot. A Cloudflare
challenge stops for the owner to handle in their own browser; the template does not bypass it.

For webhook items or a task-built `items` list, pass the values per item. Keep `decide` and the `d.action == send`
condition before the template so a task in automatic mode sends only the items its regular decision approved. There is
no extra confirmation for each item, and every submission still passes ADR-094's `permit(action_id)` and ADR-200's
server pacing limits.

```json
{
  "start_url":"https://freelancehunt.com/",
  "steps":[{"op":"for_each","list":"events","as":"item","limit":10,"steps":[
    {"op":"decide","input":["item"],"into":"d"},
    {"op":"if","cond":{"var":"d.action","eq":"send"},"then":[{
      "op":"use","template":"fh_bid","where":"client_browser","params":{
        "project_url":"{{item.project_url}}","text":"{{item.text}}","price":"{{item.price}}",
        "days":"{{item.days}}","sample_title":"{{item.sample_title}}","mode":"submit"
      }
    }]}
  ]}]
}
```

Example task pacing: `max_actions_per_day=10`, `min_interval_minutes=60`, `events_per_run=10` and optionally
`event_max_age_minutes=1440`. Keep `fill_only` while validating labels in the owner's logged-in browser. After the owner
confirms the live checklist, the original draft templates #30/#31 can be archived with
`cd laravel && php artisan automation:archive-freelancehunt-drafts --live-validated`; this command preserves both rows
and their versions and has not been run by the DEV implementation.

## Step templates

### `use` — Step template (kind: common)

Готовая группа шагов, которую собрали и проверили разработчики платформы для трудного сайта (например, публикация поста или одобрение заявок в группе Facebook): выполняется как один шаг, вы указываете только параметры — адрес группы, текст. Шаблон работает на своих сайтах: они должны быть среди сайтов задания. Задание хранит выбранную версию шаблона: правки шаблона не меняют уже сохранённые задания. Чтобы применить новую версию, обновите шаг шаблона в задании. Шаблон с отправкой ставьте туда же, где обычную отправку: внутрь «Для каждого» после «ИИ оценивает» или в процедуру respond.

| field | type | meaning |
|---|---|---|
| `template` | tpl | Which template |
| `params` | tparams | Template parameters |

```json
{"op":"use","template":"facebook_group_approve_requests","params":{"group_url":"https://www.facebook.com/groups/gloap"}}
```

## Page and navigation

### `goto` — Open page (kind: web)

Goes to an address. Only the task's sites; the address can be built from variables. How to open it: in the employee's browser (the default: with their sign-in and the site's scripts, like a person) or by a plain request without a browser, like curl — directly or through the platform's proxy. A plain request is faster and does not load the browser, but the site's scripts do not run: it suits pages where the list is visible in the source HTML.

| field | type | meaning |
|---|---|---|
| `url` | s | Address — e.g. `https://… or {{item.url}}` |
| `via` | choice | How to open — one of: `browser` (in the browser), `http` (by a plain request (like curl)), `proxy` (by a plain request through a proxy) |

```json
{"op":"goto","url":"https://site.example/search?q={{query|url}}&page={{page}}"}
```

A WhatsApp chat by number: https://web.whatsapp.com/send?phone={{phone}}

### `back` — Back (kind: web)

Returns to the previous page, like the browser's «Back» button.

```json
{"op":"back"}
```

### `reload` — Reload page (kind: web)

Reloads the current page — for example, if it froze or a fresh state is needed.

```json
{"op":"reload"}
```

### `check_auth` — Check that you’re signed in (kind: web)

Checks the «sign-in marker» from the scenario settings. If the sign-in has dropped, the run stops and you get a request to sign in on the employee's desktop. The employee never types passwords.

```json
{"op":"check_auth"}
```

### `page_state` — Detect page state (kind: web)

Writes into a variable: ok — the page is fine; unavailable — the site does not respond (5xx, 429, 403, network error); challenge — an «I'm not a robot» check, a captcha or Cloudflare; login — a sign-in form is visible. Then «If» decides what to do.

| field | type | meaning |
|---|---|---|
| `into` | s | Save to variable — e.g. `state` |

```json
{"op":"page_state","into":"state"}
```

### `dismiss` — Close pop-ups and cookie banners (kind: web)

Clicks «Accept» / «Close» in cookie banners and dialogs, otherwise presses Escape — up to 4 times. You can give your own button selectors.

| field | type | meaning |
|---|---|---|
| `selectors` | csv | Your own buttons (comma-separated) — e.g. `optional: #accept, .modal .close` |

```json
{"op":"dismiss"}
```

## Actions on the page

### `click` — Click an element (kind: web)

Наводит мышь по плавной траектории и нажимает. «Это отправка» — шаг выполнится, только если отправку разрешил ИИ по вашему порогу или вы одобрили черновик. Для отправки можно задать confirm.gone (и необязательные confirm.appear/error): шаг ждёт подтверждения до 60 секунд, иначе элемент не считается отправленным.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `submit` | b | This is a submission (only with permission) |
| `optional` | b | Optional step |

```json
{"op":"click","selector":"button.search"}
```

### `click_text` — Click an element with text (kind: web)

Находит среди элементов (селектор) тот, в тексте которого есть нужные слова, и нажимает на него мышью. Удобно для строк списка, кнопок и вкладок без стабильных классов. Для отправки можно задать confirm.gone (и необязательные confirm.appear/error): шаг ждёт подтверждения до 60 секунд.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Among which elements — e.g. `[role=row], button, li` |
| `text` | s | Text (or a /regular expression/) — e.g. `{{name}}` |
| `submit` | b | This is a submission (only with permission) |
| `optional` | b | Optional step |

```json
{"op":"click_text","selector":"[role=listitem]","text":"Непрочитанные"}
```

### `type` — Type text (kind: web)

Types like a person: at its own speed, line breaks with Shift+Enter (suits messengers). The field is cleared first.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `text` | t | Text — e.g. `can be {{d.reply}}, {{item.title}}` |

```json
{"op":"type","selector":"input[name=q]","text":"{{query}}"}
```

### `set_value` — Set a field value (kind: web)

Sets the value at once, without typing letter by letter, and tells the page about the change. For number fields, dates and hidden filters.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `value` | s | Value — e.g. `{{dwt_from}}` |

```json
{"op":"set_value","selector":"input[name=dwt_from]","value":"5000"}
```

### `clear` — Clear a field (kind: web)

Selects everything (Ctrl+A) and deletes it — works both in ordinary fields and in editable blocks (a message field in a messenger).

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |

```json
{"op":"clear","selector":"div[contenteditable=true]"}
```

### `select` — Choose from a list (kind: web)

Chooses a drop-down item by its value or by its text (an exact match first, then a partial one).

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `value` | s | Value or item text — e.g. `Master` |

```json
{"op":"select","selector":"select[name=rank]","value":"{{rank}}"}
```

### `check` — Tick a checkbox (kind: web)

Ticks or unticks a checkbox. If it is already in the right position, does nothing.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `checked` | b | Ticked |

```json
{"op":"check","selector":"#remember","checked":true}
```

### `press` — Press a key (kind: web)

Enter, Escape, Tab, arrows, End/Home, Backspace, Shift+Enter (a line break in a messenger), Ctrl+A (select all).

| field | type | meaning |
|---|---|---|
| `key` | key | Key |

```json
{"op":"press","key":"Enter"}
```

### `hover` — Hover the mouse (kind: web)

Moves the cursor over an element — opens menus and tooltips that appear on hover.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `optional` | b | Optional step |

```json
{"op":"hover","selector":".menu"}
```

### `mouse` — Move the mouse like a human (kind: web)

A few random smooth movements across the page. Together with pauses, it makes the behaviour look human.

| field | type | meaning |
|---|---|---|
| `times` | n | How many movements — e.g. `3` |

```json
{"op":"mouse","times":3}
```

### `scroll` — Scroll (kind: web)

Scrolls the page or a single block (a chat list, a message feed): down, up, to the very bottom or to the very top, with the mouse wheel.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Block (empty — the whole page) — e.g. `#pane-side` |
| `direction` | choice | Where — one of: `down` (down), `up` (up), `bottom` (to the very bottom), `top` (to the very top) |
| `times` | n | How many times — e.g. `2` |

```json
{"op":"scroll","selector":"[data-testid=conversation-panel-messages]","direction":"bottom"}
```

## Reading data

### `collection_algorithm` — Алгоритм сбора аудитории (kind: web)

Открывает только заданные публичные страницы и возвращает наблюдения с источником и временем. Взаимодействие с сайтом запрещено.

| field | type | meaning |
|---|---|---|
| `algorithm` | s | Algorithm — e.g. `google_maps_business` |
| `params_json` | t | Параметры JSON — e.g. `{}` |
| `into` | s | Result variable — e.g. `items` |

```json
{"op":"collection_algorithm","algorithm":"google_maps_business","params_json":"{\"niche\":\"кафе\",\"city\":\"София\",\"limit\":3}","into":"items"}
```

### `wait` — Wait for an element (kind: web)

Waits until the element appears on the page.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `timeout` | n | Wait, seconds — e.g. `15` |
| `optional` | b | Optional step |

```json
{"op":"wait","selector":".results","timeout":20}
```

### `wait_until` — Wait for a condition (kind: web)

Checks the condition every half second until the timeout: an element appeared or disappeared, the page has a text, the address contains a word, a list stopped changing. If it does not happen — an error (it can be caught with «Try»).

| field | type | meaning |
|---|---|---|
| `cond` | cond | Condition |
| `timeout` | n | Wait, seconds — e.g. `20` |

```json
{"op":"wait_until","cond":{"selector":"footer [contenteditable]","state":"visible"},"timeout":30}
```

### `get` — Get a value or attribute (kind: web)

Reads one element: its text, link, image, field value, HTML or any attribute. The whole page: selector html, what to take — HTML. Passwords and hidden fields are never read.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Селектор CSS/XPath или semantic-привязка к подписи, placeholder, aria-label, кнопке или роли — e.g. `.card a или {"by":"label","any":["Цена","Price"]}` |
| `attr` | attr | What to take |
| `into` | s | Save to variable — e.g. `value` |
| `optional` | b | Optional step |

```json
{"op":"get","selector":"//h1","attr":"text","into":"title"}
```

### `extract` — Read fields from the page (kind: web)

Reads several page fields at once into one object variable. If every field is empty the layout has changed: the run goes to the AI for repair (inside «For each» — when more than half of the pages are empty). «Optional step» — for pages that may lack these fields. On a field: «canon» — the value becomes its canonical address (strips a search engine's redirect wrapper, reduces t.me/s/… and t.me/<name> to https://t.me/<name>) — for a one-off collection and «Remove duplicates» by this field; «number» — the field's text («12,345 members», «1.2K») becomes a number — the metric for sorting and filtering.

| field | type | meaning |
|---|---|---|
| `page_fields` | fields | Page fields |
| `into` | s | Save to variable — e.g. `detail` |
| `optional` | b | Optional step |

```json
{"op":"extract","fields":{"title":{"selector":"h1","attr":"text"},"price":{"selector":".price","attr":"text"}},"into":"detail"}
```

### `extract_list` — Collect a list of cards (kind: web)

Находит все карточки (результаты поиска, сообщения чата, строки таблицы) и из каждой берёт поля. Ключ — поле, по которому «только новые» узнаёт уже виденные. «Очистить HTML» у поля убирает теги и HTML-сущности; «Исключения» отбрасывают карточки, в полях которых встречается указанный текст (без учёта регистра). «Ошибка, если карточек меньше» — для страниц, где карточки есть всегда (лента, каталог, результаты поиска): если найдено меньше, вёрстка сайта изменилась, и ИИ сам чинит сценарий; клиенту приходит уведомление, только если починить не удалось. Пусто — не проверять (страницы, где пустой список — нормально: новые сообщения, результаты по редкому запросу). «Читать полную карточку» открывает страницу каждой новой карточки на том же сайте, последовательно и с паузой, и записывает описание в item.text; при ошибке item.enrich_error объясняет, почему описание отсутствует. Лимит шага ограничивает число страниц за запуск. «Селектор описания» заменяет body, если в нём нужно выбрать только область описания. У поля: «canon» — значение становится каноническим адресом (снимает обёртку поисковика, t.me/s/… и t.me/<имя> сводит к https://t.me/<имя>) — ставьте на поле-ссылку перед «Убрать дубликаты»; «number» — текст поля становится числом (метрика: численность, посещаемость) — для сортировки и отбора разового сбора.

| field | type | meaning |
|---|---|---|
| `item` | sel | Card selector — e.g. `.project-card` |
| `fields` | fields | Card fields |
| `key_field` | s | Item key (for «new only») — e.g. `url` |
| `limit` | n | At most — e.g. `20` |
| `min_items` | n | Error if fewer cards than — e.g. `do not check` |
| `exclude` | t | Exclusions: one per line — a card with such text in a field does not get into the list — e.g. `archive
closed` |
| `enrich_full_card` | b | Читать полную карточку |
| `card_selector` | sel | Селектор описания (пусто — вся страница) — e.g. `article, main` |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"extract_list","item":".message-in, .message-out","fields":{"text":{"selector":".copyable-text","attr":"text"},"dir":{"selector":":self","attr":"class"}},"key":"text","into":"messages"}
```

### `feed` — Read an RSS feed (kind: web)

Reads the site's RSS/Atom feed with the employee's browser: title, link, description, date. More reliable than parsing the page if a feed exists. «Error if fewer entries» is for a feed that always has entries: if fewer arrive, the AI will check and fix the address.

| field | type | meaning |
|---|---|---|
| `url` | s | Feed address — e.g. `https://site.example/rss` |
| `limit` | n | At most — e.g. `50` |
| `min_items` | n | Error if fewer entries than — e.g. `do not check` |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"feed","url":"https://freelancehunt.com/en/projects.rss","into":"items"}
```

### `fetch` — Request to the site (kind: web)

Loads an address of the task's site from inside the page, with its sign-in (cookies): JSON becomes an object, anything else — text. For filter lists and the site's service data.

| field | type | meaning |
|---|---|---|
| `url` | s | Address — e.g. `/ajax/form-data/?type=rank` |
| `into` | s | Save to variable — e.g. `data` |

```json
{"op":"fetch","url":"/api/options?type=vessel","into":"options"}
```

### `api` — API request (kind: web)

Calls the API of the task's site directly, with no browser and no page: address, method, parameters, headers and a JSON body. A JSON answer becomes an object in the variable, anything else stays text; “List from JSON” takes the items out of it. Do not write an API key into the step: add it to the task's “Access keys” and use it as {{secret.NAME}} in a header, a parameter, the address or the body. The AI sees only the key's name, and logs and reports show *** instead of the value. If the API answers 401 or 403, the task stops and asks you to check the key. A dry run and a check send only GET and HEAD: POST, PUT, PATCH and DELETE may change data and are skipped, unless the step is marked “Safe request” (for example a POST search that changes nothing). The browser's cookies are not sent unless “With browser cookies” is on. A redirect to another site is not followed; answers up to 5 MB. Pages: “Repeat” + “Remember value” (page number, offset or a cursor from the answer).

| field | type | meaning |
|---|---|---|
| `url` | s | Address — e.g. `https://site.example/api/jobs` |
| `method` | choice | Method — one of: `GET` (GET), `POST` (POST), `PUT` (PUT), `PATCH` (PATCH), `DELETE` (DELETE) |
| `query` | map | Query parameters (name → value) — e.g. `page = {{page}}` |
| `headers` | map | Headers (name → value) — e.g. `Authorization = Bearer {{secret.API_TOKEN}}` |
| `body` | t | Request body (JSON; for POST, PUT, PATCH, DELETE) — e.g. `{"query": "{{params.query}}", "page": {{page}}}` |
| `timeout` | n | Wait for the answer, seconds (up to 60) — e.g. `30` |
| `safe` | b | Safe request: changes nothing, allowed in a dry run |
| `submit` | b | This is a submission (only with permission) |
| `with_cookies` | b | With browser cookies (the site login) |
| `optional` | b | Optional step |
| `into` | s | Save to variable — e.g. `data` |

```json
{"op":"api","method":"GET","url":"https://remoteok.com/api","into":"data"}
```

With a key: header Authorization = Bearer {{secret.API_TOKEN}}, the API_TOKEN key in the task's “Access keys”.

### `tgstat` — TGStat API (kind: web)

Ищет каналы или чаты через Stat API, читает их статистику либо ищет публикации через отдельный Search API. Ключ берётся из «Настройки → TGStat API»: свой либо ключ платформы, если администратор задал месячный лимит. Бесплатный Stat API читает статистику только собственных подтверждённых каналов; поиск каналов требует Stat S+. Для поиска каналов через API укажите страну; без страны используйте открытый мировой каталог в сборе аудиторий. Один запрос ключом платформы на вид API за запуск.

| field | type | meaning |
|---|---|---|
| `action` | choice | What to do — one of: `channels_search` (Поиск каналов и чатов), `channel_stat` (Статистика канала/чата), `posts_search` (Поиск публикаций) |
| `source` | choice | Чей ключ — one of: `auto` (Свой, затем платформы), `own` (Только свой), `service` (Платформы (если есть квота)) |
| `query` | s | Search phrase — e.g. `{{params.query}}` |
| `channel` | s | Канал/чат для статистики — e.g. `{{item.telegram}}` |
| `country` | s | Код страны (обязателен для поиска каналов) — e.g. `ua` |
| `peer_type` | choice | Type — one of: `all` (каналы и чаты), `channel` (каналы), `chat` (чаты) |
| `limit` | n | At most — e.g. `20` |
| `into` | s | Save to variable — e.g. `tgstat` |

```json
{"op":"tgstat","action":"channels_search","source":"auto","query":"{{params.query}}","country":"ua","peer_type":"all","limit":20,"into":"tgstat"}
```

В ответе — объект TGStat. Для каналов: «Список из JSON» с from=tgstat, path=response.items, key=username.

### `telemetr` — Telemetr API (kind: web)

Официальный API Telemetr: поиск каналов или групп по названию и описанию, расширенный каталог (при наличии доступа) или статистика по internal_id. Ключ задаётся в «Настройки → Telemetr API». Страна необязательна: без неё поиск идёт по всему миру. API возвращает внутренние ID; ссылку t.me берите отдельным запросом информации о канале. Бесплатный ключ ограничен подтверждёнными каналами, каталог требует Advanced/Team либо отдельное разрешение.

| field | type | meaning |
|---|---|---|
| `action` | choice | What to do — one of: `channels_search` (Поиск каналов и групп), `catalog_search` (Расширенный каталог), `channel_info` (Карточка и ссылка t.me), `channel_stat` (Статистика канала/группы) |
| `source` | choice | Чей ключ — one of: `auto` (Свой, затем платформы), `own` (Только свой), `service` (Платформы (если есть квота)) |
| `query` | s | Search phrase — e.g. `{{params.query}}` |
| `channel` | s | Внутренний ID для карточки или статистики — e.g. `{{item.internal_id}}` |
| `country` | s | Страна (ID из справочника, пусто — весь мир) — e.g. `ukraine` |
| `peer_type` | choice | Type — one of: `channel` (каналы), `group` (groups) |
| `limit` | n | At most — e.g. `20` |
| `into` | s | Save to variable — e.g. `telemetr` |

```json
{"op":"telemetr","action":"channels_search","source":"own","query":"{{params.query}}","peer_type":"channel","limit":20,"into":"telemetr"}
```

В поиске ответ — массив с internal_id, title, members_count и peer. «Список из JSON»: from=telemetr, key=internal_id. Затем по internal_id используйте «Карточка и ссылка t.me». В каталоге массив находится в items.

### `apify` — Apify: community search (kind: web)

Runs one of two paid Actors using your token from Settings → Apify API: Facebook groups or Instagram profiles. Returns an array of cards. Apify bills separately from your AI Worker plan. Up to 50 results and $0.50 per Actor run; each Actor runs at most once per task execution. Preview skips this paid step.

| field | type | meaning |
|---|---|---|
| `actor` | choice | Source — one of: `facebook_groups` (Facebook groups), `instagram_profiles` (Instagram profiles) |
| `query` | s | Search phrase — e.g. `{{params.query}}` |
| `limit` | n | Maximum results (1–50) — e.g. `20` |
| `into` | s | Save to variable — e.g. `apify` |

```json
{"op":"apify","actor":"facebook_groups","query":"{{params.query}}","limit":20,"into":"apify"}
```

Add the key once in Settings → Apify API. JSON list: from=apify, key=url. Apify may charge again on repeated runs.

### `json_list` — List from JSON (kind: web)

Takes the items out of an API answer (or another variable holding JSON). “From” is the variable, “Path to the list” is where the array lies inside it (for example data.jobs; empty means the variable itself). Fields are paths inside an item, dotted, [0] is an array element: company, salary.min, tags[0]. The key is the field “only new” uses to recognise items already seen; items without a key and items that are not objects (such as a service first record) are skipped. “Clean HTML”, “Exclusions”, “Error if fewer items than”, «canon» and «number» on a field work as in “Collect a list of cards”: fewer items means the answer's format changed, and the AI repairs the scenario itself.

| field | type | meaning |
|---|---|---|
| `from` | s | From (variable) — e.g. `data` |
| `path` | s | Path to the list inside (optional) — e.g. `data.jobs` |
| `json_fields` | jfields | Item fields |
| `key_field` | s | Item key (for «new only») — e.g. `id` |
| `limit` | n | At most — e.g. `100` |
| `min_items` | n | Error if fewer items than — e.g. `do not check` |
| `exclude` | t | Exclusions, one per line: an item with such text in any of its fields is left out of the list — e.g. `archive
closed` |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"json_list","from":"data","key":"id","fields":{"position":"position","company":"company","url":"url","tags":"tags","description":"description","date":"date"},"into":"items"}
```

### `storage_get` — Read from site storage (kind: web)

Reads a value from the open site's localStorage (for example, the number signed in to WhatsApp).

| field | type | meaning |
|---|---|---|
| `key` | s | Key — e.g. `last-wid-md` |
| `into` | s | Save to variable — e.g. `value` |

```json
{"op":"storage_get","key":"last-wid-md","into":"me"}
```

## Files and tabs

### `open_tab` — Open in a new tab (kind: web)

Opens the address in a new tab and switches to it; the main tab with the list stays where it is.

| field | type | meaning |
|---|---|---|
| `url` | s | Address — e.g. `{{item.url}}` |

```json
{"op":"open_tab","url":"{{item.url}}"}
```

### `close_tab` — Close tab (kind: web)

Closes the current tab and returns to the previous one.

```json
{"op":"close_tab"}
```

### `download` — Download a file (kind: web)

Downloads a file (by clicking a button or by address) of up to 15 MB and stores it with the task; the variable holds a link to it. The file goes into the found items and the e-mails.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Download button or link — e.g. `a.download` |
| `url` | s | or the file address — e.g. `{{item.cv}}` |
| `into` | s | Save to variable — e.g. `file` |

```json
{"op":"download","selector":"a.cv-pdf","into":"cv"}
```

### `upload` — Выбрать файл в поле загрузки (kind: web)

Выбирает защищённый файл по file_id в точном input[type=file] и сверяет имя, размер, MIME и SHA-256 там, где браузер его читает. Форма не отправляется этим шагом; отправка — отдельное действие после подтверждения владельца. Старый URL файла задания/сайта сначала проходит импорт, MIME/ADR-084/антивирусные проверки и приватное хранение.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Точное поле input[type=file] — e.g. `input[type=file]` |
| `file_id` | s | Защищённый file_id владельца — e.g. `{{resume_file_id}}` |
| `url` | s | Адрес файла задания или сайта (legacy) — e.g. `{{file}}` |

```json
{"op":"upload","selector":"input[type=file]","file_id":"{{resume_file_id}}"}
```

### `screenshot` — Screenshot (kind: web)

Captures the page or a single element and stores it with the task; the variable holds the link. For a report or a QR code.

| field | type | meaning |
|---|---|---|
| `selector` | sel | Element (empty — the visible part of the page) — e.g. `canvas` |
| `into` | s | Save to variable — e.g. `shot` |

```json
{"op":"screenshot","selector":"canvas","into":"qr"}
```

## Telegram

### `tg_join` — Join a group (kind: telegram)

Joins a group or channel if not there yet. The employee never leaves groups.

| field | type | meaning |
|---|---|---|
| `chat` | s | Group or channel — e.g. `@channel or {{chat}}` |

```json
{"op":"tg_join","chat":"@keto_recipes"}
```

### `tg_fetch` — Read messages (kind: telegram)

The latest messages: text, author, date, link, views, media. «For the last days» — only fresh ones (up to 500).

| field | type | meaning |
|---|---|---|
| `chat` | s | Group or channel — e.g. `{{chat}}` |
| `since_days` | n | For the last days — e.g. `7` |
| `limit` | n | At most — e.g. `50` |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"tg_fetch","chat":"{{chat}}","since_days":7,"into":"items"}
```

### `tg_search` — Search in a group (kind: telegram)

Searches messages by words inside a group.

| field | type | meaning |
|---|---|---|
| `chat` | s | Group or channel — e.g. `@chat` |
| `query` | s | Query — e.g. `salad` |
| `limit` | n | At most — e.g. `50` |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"tg_search","chat":"@keto","query":"салат","into":"items"}
```

### `tg_send` — Post to a group (kind: telegram)

Sends a message — only with permission (the threshold or your approval). It can be a reply to a message.

| field | type | meaning |
|---|---|---|
| `chat` | s | Group — e.g. `{{chat}}` |
| `text` | t | Text — e.g. `{{d.reply}}` |
| `reply_to` | s | Reply to message — e.g. `{{item.id}}` |

```json
{"op":"tg_send","chat":"{{chat}}","text":"{{d.reply}}","reply_to":"{{item.id}}"}
```

### `tg_discover` — Find channels by query (kind: telegram)

A search of public channels and groups by Telegram itself.

| field | type | meaning |
|---|---|---|
| `query` | s | Query — e.g. `keto recipes` |
| `limit` | n | At most — e.g. `30` |
| `into` | s | Save to variable — e.g. `found` |

```json
{"op":"tg_discover","query":"кето рецепты","into":"found"}
```

### `add_target` — Add a channel to the group list (kind: telegram)

Adds the found channel to this task or to task #N (it will read it on its next runs).

| field | type | meaning |
|---|---|---|
| `chat` | s | Channel — e.g. `{{item.chat}}` |
| `task` | n | To task # |

```json
{"op":"add_target","chat":"{{item.chat}}","task":2}
```

### `audience_fetch` — Take channels collected on the web (kind: telegram)

Channels from the «Telegram channels» collection in the «Audiences» section.

| field | type | meaning |
|---|---|---|
| `limit` | n | At most — e.g. `200` |
| `into` | s | Save to variable — e.g. `found` |

```json
{"op":"audience_fetch","into":"found"}
```

## YouTube

### `youtube` — YouTube (kind: common)

YouTube videos and channels through the official YouTube Data API v3 — no browser, no captcha: search for videos and channels, new videos of channels, video and channel statistics, comments on a video. Every element has title, url, channel, channel_url, published_at, views, likes, comments, subscribers, description (a channel also has videos, country, links and emails from its description); its key is url — ready for «For each» with «only new», «AI judges» and «Save». Key: your own YOUTUBE_API_KEY in the task's «Access keys» (your own Google quota) or the platform's key with a daily limit by plan; when the limit is spent, the step stops the run with the error «today's YouTube quota is spent» instead of an empty list. New videos of a channel without a key (or with the RSS mark) are read from the channel's RSS feed: the last ~15 videos, without views and likes. A repeated request within a day (a search — 6 hours) comes from the cache and spends no quota. Search has its own Google quota, 100 requests a day for the whole platform: search rarely, and take new videos of known channels with the channel_videos action.

| field | type | meaning |
|---|---|---|
| `action` | choice | What to do — one of: `search_videos` (find videos), `search_channels` (find channels), `channel_videos` (new videos of a channel), `video_stats` (video statistics), `channel_stats` (channel statistics), `comments` (comments on a video) |
| `query` | s | Query (for a search) — e.g. `{{params.query}} or coffee machine review` |
| `channel` | s | Channels: UC… id, @handle or link, several separated by commas — e.g. `@mkbhd, UCBJycsmduvYEL83R_U4JriQ` |
| `video` | s | Video: id or link (for statistics — several separated by commas) — e.g. `https://youtu.be/dQw4w9WgXcQ` |
| `limit` | n | At most (up to 200) — e.g. `25` |
| `order` | choice | Order — one of: `relevance` (by relevance), `date` (newest first), `viewCount` (by views), `rating` (by rating), `videoCount` (by number of videos (channels)) |
| `published_after` | s | Not earlier than (a date or a number of days back) — e.g. `7d or 2026-10-01` |
| `region` | s | Country (ISO, for a search) — e.g. `UA` |
| `lang` | s | Language (ISO, for a search) — e.g. `uk` |
| `rss` | b | Through the channel's RSS (no key, no statistics) |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"youtube","action":"channel_videos","channel":"{{params.channels}}","published_after":"7d","limit":30,"into":"items"}
```

Google quota: channels / videos / playlistItems / commentThreads — 1 unit a request of up to 50 ids (10,000 units a day per project), search.list — its own quota of 100 calls a day. The day starts at midnight Pacific Time.

## Execution order

### `for_each` — For each item of a list (kind: common)

Выполняет вложенные шаги для каждого элемента списка (карточки, сообщения, канала). «Только новые» пропускает уже обработанные в прошлых запусках. «Читать полную карточку» открывает страницу каждого элемента с URL на том же сайте, последовательно и с паузой, и записывает описание в item.text; при ошибке item.enrich_error объясняет, почему описание отсутствует. Лимит цикла ограничивает число страниц за запуск.

| field | type | meaning |
|---|---|---|
| `list` | s | List (variable) — e.g. `items` |
| `as` | s | Item as — e.g. `item` |
| `limit` | n | At most — e.g. `20` |
| `only_new` | b | New only |
| `enrich_full_card` | b | Читать полную карточку |
| `card_selector` | sel | Селектор описания (пусто — вся страница) — e.g. `article, main` |

Nested blocks: `steps` (For each item:).

```json
{"op":"for_each","list":"items","as":"item","only_new":true,"steps":[{"op":"decide","input":["item"],"into":"d"}]}
```

### `if` — If (kind: common)

Branching: by a variable (equals a value or another variable, greater than, contains…) or by the page (has an element, has text, the address contains).

| field | type | meaning |
|---|---|---|
| `cond` | cond | Condition |

Nested blocks: `then` (Then:), `else` (Otherwise:).

```json
{"op":"if","cond":{"text":"not on WhatsApp|нет в WhatsApp"},"then":[{"op":"stop","mode":"ok","reason":"номера нет в WhatsApp"}]}
```

### `repeat` — Repeat (kind: common)

Repeats steps until a condition or up to N times: paging, scrolling a list, waiting with a check. The round number is the loop variable (from 1).

| field | type | meaning |
|---|---|---|
| `times` | n | At most times — e.g. `10` |
| `cond` | cond | Stop when (optional) |

Nested blocks: `steps` (Repeat:).

```json
{"op":"repeat","times":30,"cond":{"selector":"a.next","state":"absent"},"steps":[{"op":"extract_list","item":".card","fields":{"url":{"selector":"a","attr":"href"}},"into":"page_items"},{"op":"push","list":"all","value":"page_items"},{"op":"click","selector":"a.next"}]}
```

### `break` — Exit the loop (kind: common)

Breaks out of the nearest «Repeat» or «For each».

```json
{"op":"break"}
```

### `try` — Try (kind: common)

If a step inside breaks (an element not found, the site did not respond), the run does not fail: the «On error» steps run, and the error text is in the error variable. This way one broken item does not stop the processing of the others.

Nested blocks: `steps` (Try:), `catch` (On error:).

```json
{"op":"try","steps":[{"op":"goto","url":"{{item.url}}"},{"op":"get","selector":".phone","into":"phone"}],"catch":[{"op":"notify","text":"Не открылась {{item.url}}: {{error}}"}]}
```

### `call` — Run a procedure (kind: common)

Runs a named procedure of the scenario. The respond procedure sends the reply: it also runs when you approve a draft. Procedures are written by the AI.

| field | type | meaning |
|---|---|---|
| `name` | s | Procedure — e.g. `respond` |

```json
{"op":"call","name":"respond"}
```

### `jump` — Go to step (kind: common)

Goes to the top-level step with the given number. No more than the given number of times — no endless loops.

| field | type | meaning |
|---|---|---|
| `to` | step | To step |
| `max` | n | At most times — e.g. `10` |

```json
{"op":"jump","to":2,"max":5}
```

### `pause` — Random pause (kind: common)

Waits a random time within the range — like a person between actions.

| field | type | meaning |
|---|---|---|
| `min` | n | From, seconds — e.g. `2` |
| `max` | n | To, seconds — e.g. `8` |

```json
{"op":"pause","min":3,"max":12}
```

### `stop` — Stop the run (kind: common)

Ends the current run: «normally» (next one by the schedule), «error» (notifies you) or «sign-in needed» (a captcha, the sign-in dropped — calls you to the employee's desktop).

| field | type | meaning |
|---|---|---|
| `mode` | choice | How — one of: `ok` (normally), `error` (error), `login` (sign-in needed / captcha) |
| `reason` | s | Reason — e.g. `the site showed a captcha` |

```json
{"op":"stop","mode":"login","reason":"Cloudflare просит проверку"}
```

## Data and variables

### `set` — Remember a value (kind: common)

Записывает в переменную текст с подстановками. Так собирается адрес поиска из фильтров. {{x|url}} — кодирует значение для адреса. Для длинного текста max_chars ограничивает длину; fallback берётся вместо исходного текста, а tail добавляется при обрезке на границе блока.

| field | type | meaning |
|---|---|---|
| `var` | s | Variable — e.g. `url` |
| `value` | s | Value — e.g. `https://site.example/search?rank={{rank\|url}}` |
| `max_chars` | n | Не больше символов (необязательно) — e.g. `40000` |
| `fallback` | s | Текст вместо длинного значения (необязательно) — e.g. `{{item.text}}` |
| `tail` | s | Хвост при обрезке (необязательно) — e.g. `… Все вакансии: {{item.url}}` |

```json
{"op":"set","var":"page","value":"1"}
```

### `calc` — Calculate (kind: common)

Simple arithmetic with variables: + − × ÷ and brackets. For example, the next page.

| field | type | meaning |
|---|---|---|
| `var` | s | Variable — e.g. `page` |
| `expr` | s | Expression — e.g. `{{page}} + 1` |

```json
{"op":"calc","var":"page","expr":"{{page}} + 1"}
```

### `regex` — Find by pattern (kind: common)

Searches the text with a regular expression: a phone, an e-mail, a number, a date. Takes the first group (or the whole match); «all matches» gives a list.

| field | type | meaning |
|---|---|---|
| `from` | s | Where to search — e.g. `{{detail.text}}` |
| `pattern` | s | Pattern — e.g. `\+?\d[\d\s()-]{8,}\d` |
| `all` | b | All matches (a list) |
| `into` | s | Save to variable — e.g. `found` |

```json
{"op":"regex","from":"{{detail}}","pattern":"[\\w.+-]+@[\\w-]+\\.[\\w.]+","into":"email"}
```

### `date` — Parse a date (kind: common)

Understands 31.12.2026, 2026-12-31 and English dates; writes them as 2026-12-31, shifted by N days. Dates are then compared in «If» (not earlier / not later). Today is {{today}}.

| field | type | meaning |
|---|---|---|
| `from` | s | Date — e.g. `{{item.ready}}` |
| `add_days` | n | Add days — e.g. `0` |
| `into` | s | Save to variable — e.g. `date` |

```json
{"op":"date","from":"{{item.ready}}","into":"ready"}
```

### `match` — Pick the closest option from a list (kind: common)

Finds the option in a list most similar to the value (typos, abbreviations, a different word order). For choosing a filter item that the site names differently.

| field | type | meaning |
|---|---|---|
| `value` | s | Value — e.g. `{{rank}}` |
| `options` | s | Options (a variable or comma-separated) — e.g. `options or Master, Chief Officer` |
| `into` | s | Save to variable — e.g. `picked` |

```json
{"op":"match","value":"Ch. Off","options":"Master, Chief Officer, 2nd Officer","into":"rank_label"}
```

### `filter` — Filter a list (kind: common)

Keeps the items that match a condition on their fields — without AI, by rules. For example, only with a ready date no later than in a month.

| field | type | meaning |
|---|---|---|
| `list` | s | List — e.g. `items` |
| `as` | s | Item as — e.g. `item` |
| `cond` | cond | Keep if |
| `into` | s | Save to variable — e.g. `items` |

```json
{"op":"filter","list":"items","as":"item","cond":{"var":"item.rank","contains":"Master"},"into":"items"}
```

### `dedupe` — Remove duplicates (kind: common)

Merges one or several lists and removes repeats in one step, without loops. The lists are joined in order, the result goes to the given variable (without it: into the same list, and for several lists — into merged). Items with equal values of the given fields count as repeats (for example, url or «title, company»); without fields the whole item is compared. Case and extra spaces do not matter unless exact comparison is on.

| field | type | meaning |
|---|---|---|
| `list` | csv | Lists (one or several, comma-separated) — e.g. `items, page_items` |
| `by` | csv | By which fields (comma-separated) — e.g. `url` |
| `keep` | choice | Which one to keep — one of: `first` (first), `last` (last) |
| `exact` | b | Exact comparison (case-sensitive) |
| `into` | s | Result to variable — e.g. `uniq (empty — the same list)` |

```json
{"op":"dedupe","list":["freelancehunt","useme"],"by":["url"],"into":"all"}
```

### `push` — Add to list (kind: common)

Appends a value (or a whole list) to a list variable — to collect the results from all pages and process them together.

| field | type | meaning |
|---|---|---|
| `list` | s | List — e.g. `all` |
| `value` | s | What to add (variable) — e.g. `page_items` |

```json
{"op":"push","list":"all","value":"page_items"}
```

### `keep` — Remember until the next run (kind: common)

Stores a variable with the task: on the next run it will have the same value. This is how a run continues from the same page or counts the overall progress.

| field | type | meaning |
|---|---|---|
| `var` | s | Variable — e.g. `page` |

```json
{"op":"keep","var":"page"}
```

## AI and results

### `decide` — AI assesses whether it fits (kind: common)

The AI compares the item with the task's goal and criteria: a score of 0–100, a decision (skip / draft / send), a ready reply. Each assessment step can have its own «how to assess» instruction — for that step it outweighs the task's general criteria. Sending happens only by your threshold. Suitable items come to your e-mail and the chosen channels.

| field | type | meaning |
|---|---|---|
| `input` | csv | What to assess — e.g. `item` |
| `instruction` | t | How to assess (optional — otherwise by the task's goal and criteria) — e.g. `Fits only if the budget is from $500 and the client is from the EU. Urgent orders — minus 20 points.` |
| `into` | s | Result to variable — e.g. `d` |

```json
{"op":"decide","input":["item"],"instruction":"Подходит, только если бюджет от $500","into":"d"}
```

### `persona_reply` — Личность решает и пишет ответ (kind: web)

Передаёт выбранной личности текст текущей страницы из браузера или заданный текст и ссылку. Личность использует свою роль и базу знаний, решает отвечать ли (respond или skip) с причиной, а при respond готовит ответ на языке проекта. Внешние команды на странице считаются данными. Ничего не отправляется; расходы ИИ учитываются на аккаунте клиента.

| field | type | meaning |
|---|---|---|
| `persona_id` | s | ID личности аккаунта — e.g. `756` |
| `url` | s | Адрес открытой страницы (необязательно, в пределах сайтов задания) — e.g. `{{item.url}}` |
| `text` | t | Текст страницы или проекта (необязательно) — e.g. `пусто — прочитать открытую страницу в браузере` |
| `instruction` | t | Критерий выбора и задача для личности — e.g. `Реши по моим навыкам, стоит ли откликаться. Если да — составь отклик на языке проекта.` |
| `into` | s | Save to variable — e.g. `persona_reply` |

```json
{"op":"persona_reply","persona_id":"1","url":"https://freelancehunt.com/project/example/","instruction":"Оцени соответствие навыкам и напиши отклик на языке проекта.","into":"persona_reply"}
```

### `ai` — AI request (kind: common)

Your instruction and the collected data (all variables or the chosen ones) — the answer goes into a variable. Translate, shorten, pull out a number, classify.

| field | type | meaning |
|---|---|---|
| `instruction` | t | Instruction for the AI — e.g. `Pull the budget in dollars out of the text as a number` |
| `input` | csv | Which data to pass — e.g. `empty — everything collected` |
| `into` | s | Save to variable — e.g. `ai` |

```json
{"op":"ai","instruction":"Переведи на русский","input":["item"],"into":"ru"}
```

### `save` — Save found items (kind: common)

Adds to the task's «Found items» (and to a Google Sheet, if one is chosen). «Max to save»: once this many are saved in a run, the scenario finishes successfully (the overall limit for the task is «At most N results per run» in the settings). An object is saved with all its fields, a list — each item separately, a text or a number — as text. «How to show» is the line template in «Found items»: the object's fields are substituted as {{title}}, {{url}}, {{price}} — the same as {{item.title}}, {{item.url}} (item here is always the saved item), other variables are visible too; simple tags are allowed — links, bold, lists, images.

| field | type | meaning |
|---|---|---|
| `save_item` | s | What to save (variable) — e.g. `item` |
| `format` | t | How to show (optional) — e.g. `<a href="{{url}}">{{title}}</a> — <b>{{price}}</b>` |
| `max` | n | Max to save (optional) — e.g. `no limit` |

```json
{"op":"save","item":"item","format":"<a href=\"{{url}}\">{{title}}</a> — {{price}}"}
```

### `notify` — Notify me (kind: common)

A short notification to you in the panel and in Telegram, with substitutions.

| field | type | meaning |
|---|---|---|
| `text` | t | Text — e.g. `New candidate: {{item.title}}` |

```json
{"op":"notify","text":"Готово, собрано {{all|count}}"}
```

### `agent` — Hand to AI agent (kind: common)

Hands the element (or a text) to your own Claude Code or Codex through a route from «AI agents»: the agent gets the event at once and follows the route's instruction. Nothing is sent to sites or people — only data to your agent. The route is given by name; the events go when the run ends.

| field | type | meaning |
|---|---|---|
| `route` | s | Route (name from «AI agents») — e.g. `orders` |
| `text` | t | Text for the agent (optional) — e.g. `New order: {{item.title}}` |
| `save_item` | s | What to hand over (a variable, optional) — e.g. `item` |

```json
{"op":"agent","route":"orders","text":"Новый заказ: {{item.title}}","item":"item"}
```
