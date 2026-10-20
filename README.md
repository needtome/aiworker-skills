# AI Worker skills and MCP for Codex and Claude

[AI Worker](https://kra.name/) rents out AI employees: they talk to your customers in messengers and in a web chat, and do
recurring work on websites and in Telegram groups. This repository teaches **your own** Codex or Claude to set up your
AI Worker account from a plain description.

**[Русский — ниже](#скилы-и-mcp-ai-worker-для-codex-и-claude)** · All add-ons: https://kra.name/integrations/

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

## Before you start: the API key

Needed for the MCP server (the settings-file way works without it).

1. Open [Settings → Integrations](https://kra.name/app/panel/settings?section=integrations&lang=en) in the panel
   and issue a key.
2. Put it into the environment variable `AIWORKER_API_KEY`, for example in `~/.zshrc`:
   ```bash
   export AIWORKER_API_KEY=aiw_live_...
   ```
3. Restart the terminal (and Codex or Claude Code).

## Install

### The easy way: ask your AI

Write to your Codex or Claude Code:

> Install the AI Worker MCP server and the aiworker skill from the repository https://github.com/needtome/aiworker-skills.
> The API key is in the environment variable AIWORKER_API_KEY.

Only the skill:

> Install the aiworker skill from the repository https://github.com/needtome/aiworker-skills — the folder
> plugins/aiworker/skills/aiworker.

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
  - store an API key a task needs.
- Export settings to a file and import a file (a check first, then creation).

Every change is proposed first and applied only by a separate call after you agree.

The same is available as a plain REST API: https://kra.name/app/api/docs.

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

## Сначала: API-ключ

Нужен для MCP-сервера (способ с файлом настроек работает и без него).

1. Откройте в панели [«Настройки → Интеграции»](https://kra.name/app/panel/settings?section=integrations&lang=ru)
   и выпустите ключ.
2. Положите его в переменную окружения `AIWORKER_API_KEY`, например в `~/.zshrc`:
   ```bash
   export AIWORKER_API_KEY=aiw_live_...
   ```
3. Перезапустите терминал (и Codex или Claude Code).

## Установка

### Проще всего: попросите ваш ИИ

Напишите вашему Codex или Claude Code:

> Установи MCP-сервер AI Worker и скил aiworker из репозитория https://github.com/needtome/aiworker-skills.
> API-ключ — в переменной окружения AIWORKER_API_KEY.

Только скил:

> Установи скил aiworker из репозитория https://github.com/needtome/aiworker-skills — папка
> plugins/aiworker/skills/aiworker.

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
  - сохранить ключ API, нужный заданию.
- Выгружать настройки в файл и загружать файл (сначала проверка, потом создание).

Каждое изменение сначала только предлагается и применяется отдельной командой после вашего согласия.

То же доступно как обычный REST API: https://kra.name/app/api/docs.

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
