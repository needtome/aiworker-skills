# AI Worker skills and MCP for Codex and Claude

[AI Worker](https://kra.name/) rents out AI employees: they talk to your customers in messengers and in a web chat, and do
recurring work on websites and in Telegram groups. This repository teaches **your own** Codex or Claude to set up your
AI Worker account from a plain description.

**[Русский — ниже](#скилы-и-mcp-ai-worker-для-codex-и-claude)** · All add-ons: https://kra.name/integrations/

## What AI employees can do

- Collect information from websites and Telegram channels.
- Do anything on any website except signing in: where a login is needed, you sign in once yourself, and the AI employee
  works with that session from then on.
- Run in your own browser: dedicate an Edge, Chrome or Firefox browser (or one of its profiles) on your computer with
  the AI Worker extension, and the jobs run there, with your logins and your IP.
- Message people on WhatsApp, Telegram, imo, MAX and Slack — including writing first.
- Send emails.
- Hold conversations and answer customers' questions on WhatsApp, Telegram, imo, MAX, Slack, by email and in the chat on your
  website.
- Send you the results by email, Telegram, WhatsApp or Slack.
- Work with any API, and with your Google Sheets and Docs once you connect them.
- Run on a schedule: every N minutes or hours, or every day at an exact time («every day at 07:00»).

Everything above can be set up from your Codex or Claude through this skill and the MCP server.

## What is here

- **The skill** — `plugins/aiworker/skills/aiworker/`. Works in Claude Code, Codex and Claude in the browser or the app.
  Ready archive: [aiworker-skill.zip](https://github.com/needtome/aiworker-skills/releases/latest/download/aiworker-skill.zip).
- **The MCP server** of your account — `https://kra.name/app/api/mcp`, configured in `plugins/aiworker/.mcp.json`.
- **A Claude Code plugin** — the skill and the MCP server in one install (`.claude-plugin/marketplace.json`).

Two ways to work:

1. **Settings file.** The AI writes an `aiworker.bundle/1` JSON file: a task, a web chat with its knowledge, a persona,
   a contact collection, a dialog scenario. You import it in the panel: *AI employee tasks → Import*. The file is
   checked first; nothing is created until you press *Import*. Any plan.
2. **Connected (MCP).** The AI works with your account like the panel's setup wizard: it sees your chats and tasks,
   proposes changes and applies them only after you agree. Needs an API key (Business plan and above).

## Install

### The easy way: let your AI do it

1. Open [Settings → Integrations](https://kra.name/app/panel/settings?section=integrations&lang=en) in the panel and
   press «Issue key». The key is shown once: press «Download as file» — `aiworker-key.txt` appears in Downloads.
2. Send this to your Codex or Claude Code:

   > Install the AI Worker MCP server and the aiworker skill from the repository https://github.com/needtome/aiworker-skills.
   > The API key is in the file ~/Downloads/aiworker-key.txt: move it into the environment variable AIWORKER_API_KEY
   > without showing the key on screen, then delete that file.

3. Restart Codex or Claude Code when it asks.

Only the skill (no key needed):

> Install the aiworker skill from the repository https://github.com/needtome/aiworker-skills — the folder
> plugins/aiworker/skills/aiworker.

### Storing the key yourself

Replace `your-key` with the key from the panel and run one command, then reopen the terminal, Codex or Claude Code.

- Mac (Terminal app): `echo 'export AIWORKER_API_KEY="your-key"' >> ~/.zshrc`
- Windows (PowerShell): `setx AIWORKER_API_KEY "your-key"`
- Linux: `echo 'export AIWORKER_API_KEY="your-key"' >> ~/.bashrc`

Do not paste the key into the chat with the AI and do not keep it in notes or shared documents.

### Claude Code by hand — the plugin (skill + MCP)

Inside Claude Code:

```text
/plugin marketplace add needtome/aiworker-skills
/plugin install aiworker@aiworker-skills
/reload-plugins
```

### Claude Code by hand — MCP only

```bash
claude mcp add --transport http aiworker https://kra.name/app/api/mcp --header "Authorization: Bearer $AIWORKER_API_KEY"
```

### Codex by hand

1. The skill:
   ```bash
   mkdir -p ~/.agents/skills
   curl -L https://github.com/needtome/aiworker-skills/releases/latest/download/aiworker-skill.zip -o /tmp/aiworker-skill.zip
   unzip -o /tmp/aiworker-skill.zip -d ~/.agents/skills
   ```
2. The MCP server — add to `~/.codex/config.toml`:
   ```toml
   [mcp_servers.aiworker]
   url = "https://kra.name/app/api/mcp"
   bearer_token_env_var = "AIWORKER_API_KEY"
   ```

### Claude in the browser or the desktop app

The skill:

1. Download [aiworker-skill.zip](https://github.com/needtome/aiworker-skills/releases/latest/download/aiworker-skill.zip).
2. In Claude open **Customize → Skills**.
3. Press **+** and upload the zip as it is.

The MCP server:

1. In Claude open **Customize → Connectors** and add a custom connector.
2. Address: `https://kra.name/app/api/mcp`.
3. Request header: `Authorization: Bearer <your API key>`.

Use either this connector or the Claude Code plugin, not both on one computer.

## What MCP can do

- See the account: web chats, personas, AI employees, tasks with their sites, criteria, schedule and status.
- Explain what a task did with a link: found or not, when, the AI's score and reason, mailed or not; the last runs.
- Change things like the setup wizard:
  - create a task, a web chat or a contact collection;
  - change a task's criteria, sites, schedule and where results go;
  - run, pause or switch on a task; start or pause a contact collection;
  - edit a chat's greeting, quick questions, FAQ, look and knowledge sources;
  - edit persona and employee instructions;
  - store an API key a task needs;
  - create, change or pause an AI agent route, see its events and mark them done.
- Export settings to a file and import a file (a check first, then creation).

Every change is proposed first and applied only by a separate call after you agree.

The same is available as a plain REST API: https://kra.name/app/api/docs.

## Events straight to your Claude or Codex

MCP cannot wake an idle Claude Code or Codex. AI Worker's **AI agents** do: you create a route in the panel
(*AI employee tasks → AI agents*) — which agent (Claude Code or Codex), how to wake it and what to do with each event —
and a small listener on your computer (`plugins/aiworker/skills/aiworker/scripts/aiworker-listen.mjs`, Node 18+, no
dependencies) brings each event to the agent within seconds.

- Events come from the route's own address (your CRM, shop or form posts JSON to it), from a task step
  *Hand to AI agent*, or from `POST /api/v1/agent/events`.
- **Open session:** tell your Claude Code "listen to AI Worker events of route orders". It starts the listener with its
  Monitor tool; every event wakes that session, and the agent marks the event done itself.
- **In the background:** tell Claude Code or Codex "install the AI Worker background listener for route orders". It sets
  the listener to start with the computer (launchd on macOS, systemd on Linux, Task Scheduler on Windows); for each event
  the listener runs the agent without a window — a given session (`resume`) or a new run (`new`) — and reports the result.
  Don't resume in the background a session you have open in an app at the same time.
- Only a content-free "there is an event" signal goes through the AI Worker server; the event itself is fetched with your
  API key. The key is never put on a command line. Events are kept for 30 days.

## Examples of requests

- "Create a task: every 30 minutes check new Laravel jobs on freelancehunt and upwork, send me the ones from $300."
- "Make a web chat for a dental clinic with the consultant Anna and these questions and answers: …"
- "Collect dental clinics in Kyiv and prepare a first-message scenario offering them a web chat."
- "Why did the task 'Jobs' not send me this project?"

## Security

- Settings files never contain passwords, API keys or tokens — only the *names* of the keys a task needs; you enter the
  values on the task page.
- Everything an import creates starts at once — tasks run, contact collections start — unless you ask for
  `activate: false` (or untick «Сразу запустить» in the panel).
- The API key lives only in an environment variable, never in files.

---

# Скилы и MCP AI Worker для Codex и Claude

[AI Worker](https://kra.name/ru/) сдаёт в аренду ИИ-сотрудников: они общаются с вашими клиентами в мессенджерах и в
онлайн-чате на сайте и регулярно выполняют задания на сайтах и в группах Telegram. Этот репозиторий учит **ваш**
Codex или Claude настраивать аккаунт AI Worker по вашему описанию.

Все дополнения: https://kra.name/ru/integrations/

## Что могут ИИ-сотрудники

- Собирают информацию на сайтах и в Telegram-каналах.
- Выполняют любые действия на любых сайтах, кроме входа в аккаунт: где нужен вход, вы входите сами один раз, и дальше
  ИИ-сотрудник работает с этим входом.
- Работают в вашем браузере: выделите Edge, Chrome или Firefox (или один из его профилей) на своём компьютере с
  расширением AI Worker — задания будут выполняться в нём, с вашими входами и вашим IP.
- Пишут в WhatsApp, Telegram, imo, MAX и Slack — в том числе первыми.
- Пишут письма по email.
- Ведут переписку и отвечают на вопросы клиентов в WhatsApp, Telegram, imo, MAX, Slack, по email и в онлайн-чате на сайте.
- Присылают результаты вам на почту, в Telegram, WhatsApp или Slack.
- Работают с любыми API и с вашими Google Таблицами и Документами, когда вы их подключите.
- Работают по расписанию: каждые N минут или часов либо каждый день в точное время («каждый день в 07:00»).

Всё это настраивается из вашего Codex или Claude через этот скил и MCP-сервер.

## Что здесь

- **Скил** — `plugins/aiworker/skills/aiworker/`. Работает в Claude Code, Codex и Claude в браузере или приложении.
  Готовый архив: [aiworker-skill.zip](https://github.com/needtome/aiworker-skills/releases/latest/download/aiworker-skill.zip).
- **MCP-сервер** вашего аккаунта — `https://kra.name/app/api/mcp`, настройка в `plugins/aiworker/.mcp.json`.
- **Плагин Claude Code** — скил и MCP-сервер одной установкой (`.claude-plugin/marketplace.json`).

Два способа работы:

1. **Файл настроек.** ИИ пишет JSON-файл `aiworker.bundle/1`: задание, онлайн-чат с базой знаний, личность, сбор
   контактов, сценарий диалогов. Вы загружаете его в панели: «Задания ИИ-сотрудникам» → «Импорт». Файл сначала
   проверяется, ничего не создаётся до кнопки «Импортировать». На любом тарифе.
2. **Подключение (MCP).** ИИ работает с аккаунтом, как мастер настройки панели: видит чаты и задания, предлагает
   изменения и применяет их только после вашего согласия. Нужен API-ключ (с тарифа «Бизнес»).

## Установка

### Проще всего: пусть ИИ всё сделает

1. Откройте в панели [«Настройки → Интеграции»](https://kra.name/app/panel/settings?section=integrations&lang=ru) и
   нажмите «Выпустить ключ». Ключ показывается один раз: нажмите «Скачать файлом» — в «Загрузках» появится
   `aiworker-key.txt`.
2. Отправьте вашему Codex или Claude Code:

   > Установи MCP-сервер AI Worker и скил aiworker из репозитория https://github.com/needtome/aiworker-skills.
   > API-ключ лежит в файле ~/Downloads/aiworker-key.txt: перенеси его в переменную окружения AIWORKER_API_KEY,
   > не показывая ключ на экране, а потом удали этот файл.

3. Перезапустите Codex или Claude Code, когда он попросит.

Только скил (ключ не нужен):

> Установи скил aiworker из репозитория https://github.com/needtome/aiworker-skills — папка
> plugins/aiworker/skills/aiworker.

### Сохранить ключ самому

Замените `ваш-ключ` на ключ из панели, выполните одну команду и откройте заново терминал, Codex или Claude Code.

- Mac (программа «Терминал»): `echo 'export AIWORKER_API_KEY="ваш-ключ"' >> ~/.zshrc`
- Windows (PowerShell): `setx AIWORKER_API_KEY "ваш-ключ"`
- Linux: `echo 'export AIWORKER_API_KEY="ваш-ключ"' >> ~/.bashrc`

Не вставляйте ключ прямо в чат с ИИ и не храните его в заметках или общих документах.

### Claude Code вручную — плагин (скил + MCP)

В Claude Code:

```text
/plugin marketplace add needtome/aiworker-skills
/plugin install aiworker@aiworker-skills
/reload-plugins
```

### Claude Code вручную — только MCP

```bash
claude mcp add --transport http aiworker https://kra.name/app/api/mcp --header "Authorization: Bearer $AIWORKER_API_KEY"
```

### Codex вручную

1. Скил:
   ```bash
   mkdir -p ~/.agents/skills
   curl -L https://github.com/needtome/aiworker-skills/releases/latest/download/aiworker-skill.zip -o /tmp/aiworker-skill.zip
   unzip -o /tmp/aiworker-skill.zip -d ~/.agents/skills
   ```
2. MCP-сервер — добавьте в `~/.codex/config.toml`:
   ```toml
   [mcp_servers.aiworker]
   url = "https://kra.name/app/api/mcp"
   bearer_token_env_var = "AIWORKER_API_KEY"
   ```

### Claude в браузере или приложении

Скил:

1. Скачайте [aiworker-skill.zip](https://github.com/needtome/aiworker-skills/releases/latest/download/aiworker-skill.zip).
2. В Claude откройте **Customize → Skills**.
3. Нажмите **+** и загрузите zip целиком.

MCP-сервер:

1. В Claude откройте **Customize → Connectors** и добавьте свой коннектор.
2. Адрес: `https://kra.name/app/api/mcp`.
3. Заголовок запроса: `Authorization: Bearer <ваш API-ключ>`.

Используйте либо этот коннектор, либо плагин Claude Code — не оба на одном компьютере.

## Что умеет MCP

- Видеть аккаунт: онлайн-чаты, личности, ИИ-сотрудников, задания с сайтами, критериями, расписанием и статусом.
- Объяснять, что задание сделало со ссылкой: нашло ли, когда, оценку ИИ и причину, ушло ли письмо; последние запуски.
- Менять настройки, как мастер:
  - создать задание, онлайн-чат или сбор контактов;
  - изменить критерии, сайты, расписание задания и куда слать результаты;
  - запустить, поставить на паузу или включить задание; запустить или остановить сбор контактов;
  - поправить приветствие, быстрые вопросы, FAQ, вид и источники знаний чата;
  - изменить инструкции личности и ИИ-сотрудника;
  - сохранить ключ API, нужный заданию;
  - создать, изменить или поставить на паузу маршрут ИИ-агента, смотреть его события и отмечать их.
- Выгружать настройки в файл и загружать файл (сначала проверка, потом создание).

Каждое изменение сначала только предлагается и применяется отдельной командой после вашего согласия.

То же доступно как обычный REST API: https://kra.name/app/api/docs.

## События сразу в ваш Claude или Codex

MCP не может разбудить Claude Code или Codex, который ничего не делает. Это умеют **ИИ-агенты** AI Worker: вы создаёте
маршрут в панели (*Задания ИИ-сотрудникам → ИИ-агенты*) — какой агент (Claude Code или Codex), как его будить и что
делать с каждым событием, — а маленький слушатель на вашем компьютере (`plugins/aiworker/skills/aiworker/scripts/aiworker-listen.mjs`,
Node 18+, без зависимостей) за секунды доставляет агенту каждое событие.

- События приходят на собственный адрес маршрута (на него шлёт JSON ваша CRM, магазин или форма), из шага задания
  «Передать ИИ-агенту» или через `POST /api/v1/agent/events`.
- **Открытая сессия:** скажите вашему Claude Code «слушай события AI Worker маршрута orders». Он запустит слушатель
  инструментом Monitor; каждое событие разбудит эту сессию, а агент сам отметит, что событие обработано.
- **В фоне:** скажите Claude Code или Codex «установи фоновый слушатель AI Worker для маршрута orders». Он поставит
  слушатель в автозапуск (launchd на macOS, systemd на Linux, Планировщик заданий на Windows); на каждое событие слушатель
  запускает агента без окна — заданную сессию (`resume`) или новый запуск (`new`) — и сам отправляет результат. Не
  продолжайте в фоне сессию, которая в это же время открыта в приложении.
- Через сервер AI Worker идёт только сигнал «есть событие» без содержимого; само событие слушатель забирает по вашему
  API-ключу. Ключ никогда не попадает в командную строку. События хранятся 30 дней.

## Примеры просьб

- «Сделай задание: каждые 30 минут проверять новые заказы по Laravel на freelancehunt и upwork, присылать подходящие от $300».
- «Создай онлайн-чат для стоматологии с консультантом Анной и вот этими вопросами и ответами…»
- «Собери стоматологии Киева и подготовь сценарий первого сообщения с предложением онлайн-чата».
- «Почему задание „Заказы“ не прислало вот этот проект?»

## Безопасность

- В файлах настроек нет паролей, ключей и токенов — только имена ключей, которые нужны заданию; значения вы вводите на
  странице задания.
- Всё, что создаёт импорт, сразу запускается: задания выполняются, сборы контактов стартуют. Если нужно, чтобы всё ждало
  вас, — `activate: false` (или снимите флажок «Сразу запустить» в панели).
- API-ключ хранится только в переменной окружения, не в файлах.
