# AI Worker skills and MCP for Codex and Claude

[AI Worker](https://kra.name/) rents out AI employees: they talk to your customers in messengers and in a web chat, and do
recurring work on websites and in Telegram groups. This repository teaches **your own** Codex or Claude to set up your
AI Worker account from a plain description — no access to AI Worker's code is needed.

**Русский — ниже.** · Page with all add-ons: https://kra.name/integrations/

## What is here

| | |
|---|---|
| `plugins/aiworker/skills/aiworker/` | **The skill** (Agent Skills format: `SKILL.md`, references, examples). Works in Claude Code, Codex and Claude in the browser/app |
| `plugins/aiworker/.mcp.json` | **The MCP server** of your account: `https://kra.name/app/api/mcp`, key from `AIWORKER_API_KEY` |
| `.claude-plugin/marketplace.json` | A Claude Code plugin marketplace with one plugin, `aiworker` (the skill + the MCP server) |

Two ways to work:

1. **Settings file.** The AI writes an `aiworker.bundle/1` JSON file (a task, a web chat with its knowledge, a persona, a
   contact collection, a dialog scenario); you import it in the panel: *AI employee tasks → Import*. The file is checked
   first and nothing is created until you press *Import*. Any plan.
2. **Connected (MCP).** The AI works with your account like the panel's setup wizard: sees your chats and tasks,
   proposes changes and applies them only after you agree. Needs an API key (Business plan and above).

## Install

### Claude Code — plugin (skill + MCP)

```bash
# 1. the API key (panel → Settings → Integrations), in your shell profile, e.g. ~/.zshrc
export AIWORKER_API_KEY=aiw_live_...
```
```text
# 2. inside Claude Code
/plugin marketplace add needtome/aiworker-skills
/plugin install aiworker@aiworker-skills
/reload-plugins
```

Without the key the skill still works in file mode; the MCP server then fails to authorise.

### Claude Code — MCP only

```bash
claude mcp add --transport http aiworker https://kra.name/app/api/mcp --header "Authorization: Bearer $AIWORKER_API_KEY"
```

### Codex

Skill:
```bash
git clone https://github.com/needtome/aiworker-skills /tmp/aiworker-skills
mkdir -p ~/.agents/skills && cp -R /tmp/aiworker-skills/plugins/aiworker/skills/aiworker ~/.agents/skills/
```
MCP — in `~/.codex/config.toml` (the variable must be exported in the shell that starts Codex):
```toml
[mcp_servers.aiworker]
url = "https://kra.name/app/api/mcp"
bearer_token_env_var = "AIWORKER_API_KEY"
```

### Claude in the browser or the desktop app

- Skill: download [aiworker-skill.zip](https://kra.name/skills/aiworker-skill.zip) → *Customize → Skills → + → upload*.
- MCP: *Customize → Connectors* → add a custom connector with the URL `https://kra.name/app/api/mcp` and the request
  header `Authorization: Bearer <API key>`. Use either the connector or the Claude Code plugin, not both.

## What MCP can do

- See the account: web chats, personas, AI employees, tasks with their sites, criteria, schedule and status.
- Explain what a task did with a link: found or not, when, the AI's score and reason, mailed or not; the last runs.
- Change things like the setup wizard: create a task, a web chat or a contact collection; change criteria, sites,
  schedule and delivery of a task; run, pause or switch on a task; edit a chat's greeting, quick questions, FAQ, look
  and knowledge sources; edit persona and employee instructions; store a task's API key.
- Export settings to a file and import a file (check first, then create).

Every change is proposed first and applied only by a separate call after you agree. Billing, users, passwords and other
accounts are out of reach. Keys never come back in answers.

Tools: `get_account`, `guide`, `lookup`, `task_status`, `propose_changes`, `pending_changes`, `apply_changes`,
`discard_changes`, `export`, `import`.

## Examples of requests

- "Create a task: every 30 minutes check new Laravel jobs on freelancehunt and upwork, send me the ones from $300."
- "Make a web chat for a dental clinic with the consultant Anna and these questions and answers: …"
- "Collect dental clinics in Kyiv and prepare a first-message scenario offering them a web chat."
- "Why did the task 'Jobs' not send me this project?" (connected mode)

## Security

Settings files never contain passwords, API keys or tokens — only the *names* of the keys a task needs; you enter the
values on the task page. Imported tasks with a scenario wait for your review; "send by itself" comes in as drafts; a
contact collection is paused until you start it. The API key goes only into an environment variable, never into files.

The skill's references (`program-steps.md`, `bundle.schema.json`, `wizard-actions.md`) are generated from AI Worker's own
code; the live schema is at https://kra.name/app/api/v1/bundle.schema.json.

---

# Скилы и MCP AI Worker для Codex и Claude

[AI Worker](https://kra.name/ru/) сдаёт в аренду ИИ-сотрудников: они общаются с вашими клиентами в мессенджерах и в
онлайн-чате на сайте и регулярно выполняют задания на сайтах и в группах Telegram. Этот репозиторий учит **ваш**
Codex или Claude настраивать аккаунт AI Worker по вашему описанию — доступ к коду AI Worker ему не нужен.

Страница со всеми дополнениями: https://kra.name/ru/integrations/

## Что здесь

- `plugins/aiworker/skills/aiworker/` — **скил** (формат Agent Skills: `SKILL.md`, справочники, примеры). Работает в
  Claude Code, Codex и Claude в браузере или приложении.
- `plugins/aiworker/.mcp.json` — **MCP-сервер** вашего аккаунта: `https://kra.name/app/api/mcp`, ключ из
  переменной `AIWORKER_API_KEY`.
- `.claude-plugin/marketplace.json` — маркетплейс плагинов Claude Code с плагином `aiworker` (скил + MCP).

Два способа работы:

1. **Файл настроек.** ИИ пишет JSON-файл `aiworker.bundle/1` (задание, онлайн-чат с базой знаний, личность, сбор
   контактов, сценарий диалогов), вы загружаете его в панели: «Задания ИИ-сотрудникам» → «Импорт». Файл сначала
   проверяется, ничего не создаётся до кнопки «Импортировать». На любом тарифе.
2. **Подключение (MCP).** ИИ работает с аккаунтом, как мастер настройки панели: видит чаты и задания, предлагает
   изменения и применяет их только после вашего согласия. Нужен API-ключ (с тарифа «Бизнес»).

## Установка

**Claude Code — плагин (скил + MCP).** Выпустите ключ в панели («Настройки → Интеграции»), добавьте в профиль shell
(`~/.zshrc`) строку `export AIWORKER_API_KEY=aiw_live_...`, затем в Claude Code:

```text
/plugin marketplace add needtome/aiworker-skills
/plugin install aiworker@aiworker-skills
/reload-plugins
```

**Codex.** Скил — скопируйте `plugins/aiworker/skills/aiworker` в `~/.agents/skills/`. MCP — в `~/.codex/config.toml`:

```toml
[mcp_servers.aiworker]
url = "https://kra.name/app/api/mcp"
bearer_token_env_var = "AIWORKER_API_KEY"
```

**Claude в браузере или приложении.** Скил: скачайте [aiworker-skill.zip](https://kra.name/skills/aiworker-skill.zip)
→ Customize → Skills → «+» → загрузить. MCP: Customize → Connectors → свой коннектор с адресом
`https://kra.name/app/api/mcp` и заголовком `Authorization: Bearer <API-ключ>`.

## Что умеет MCP

- Видеть аккаунт: онлайн-чаты, личности, ИИ-сотрудников, задания с сайтами, критериями, расписанием и статусом.
- Объяснять, что задание сделало со ссылкой: нашло ли, когда, оценку ИИ и причину, ушло ли письмо; последние запуски.
- Менять настройки, как мастер: создать задание, онлайн-чат или сбор контактов; изменить критерии, сайты, расписание
  и доставку результатов; запустить, поставить на паузу или включить задание; поправить приветствие, быстрые вопросы,
  FAQ, вид и источники знаний чата; инструкции личности и ИИ-сотрудника; сохранить ключ API задания.
- Выгружать настройки в файл и загружать файл (сначала проверка, потом создание).

Каждое изменение сначала только предлагается и применяется отдельной командой после вашего согласия. К оплате,
пользователям, паролям и чужим аккаунтам доступа нет; ключи в ответах не возвращаются.

## Безопасность

В файлах настроек нет паролей, ключей и токенов — только имена ключей, которые нужны заданию; значения вы вводите на
странице задания. Импортированное задание со сценарием ждёт вашей проверки, «отправлять самому» приходит как черновики,
сбор контактов стоит на паузе до запуска. API-ключ хранится только в переменной окружения.
