---
name: aiworker
description: Set up the user's AI Worker (kra.name) account — tasks for AI employees on websites and in Telegram, web chats, personas, contact collections and dialog scenarios. Use when the user asks to create, change or review anything in AI Worker / kra.name. Works without access to the account by writing an aiworker.bundle/1 settings file the user imports, or directly through the account's MCP server when it is connected.
---

# AI Worker (kra.name)

AI Worker rents out AI employees: they talk to customers in messengers and a web chat, and do recurring work on websites
and in Telegram groups ("tasks"). The owner sets things up in the panel at https://kra.name/app/panel. You help the
owner do that from their own Codex or Claude.

Two ways to work — pick by what is available:

1. **Connected (MCP).** If tools named `get_account`, `guide`, `propose_changes`, `apply_changes`, `import` are available
   (server `aiworker`), use them. See "Connected mode".
2. **File.** Otherwise write a settings file `aiworker.bundle/1` (JSON) and give it to the owner to import:
   panel → «Задания ИИ-сотрудникам» → «Импорт» (check, then «Импортировать»), or `POST https://kra.name/app/api/v1/import`.
   See "File mode".

Never ask the owner for passwords and never put keys, tokens or passwords into a file. Sites that need a login: set
`needs_auth: true`; the owner signs in himself on the employee's desktop. An API key goes only into the key store of a
task (connected mode: action `automation_secret_set`; file mode: list its name in `secret_names` and reference it as
`{{secret.NAME}}` in the program — the owner enters the value on the task page).

## File mode

Read `references/bundle-format.md` (all kinds and fields) and the schema `references/bundle.schema.json`
(live copy: https://kra.name/app/api/v1/bundle.schema.json). Examples are in `examples/`.

Workflow:
1. Ask what is unclear only when it changes the result: which sites or Telegram groups, what fits and what does not,
   how often, what to do with what is found (just collect and send to the owner, or reply/apply — sending needs the
   owner's approval or "auto" mode, which the owner switches on himself).
2. Write the file. Usually a task needs only `kind`, `name`, `goal` (what to do every run, in the owner's words, with
   every site and how to read it), `criteria` (what fits), `targets`, `every_minutes`. **Leave `program` out** unless
   the owner asked for an exact scenario: AI Worker's own AI opens the sites in the employee's browser, writes the
   scenario and shows it to the owner. Write a program only from `references/program-steps.md`; wrong selectors fail.
3. Check it: valid JSON, `format` is `aiworker.bundle/1`, every `ref` unique, every `*_ref` points to an item of the file.
4. Give the owner the file (save it as `aiworker-<what>.json`) and the import steps above. In the panel the import starts
   everything by default («Сразу запустить»): tasks run (one without a program once AI Worker has written it), contact
   collections start; keys from `secret_names` are entered on the task page.

Import only creates new items (a taken name gets " (2)"); it never changes existing ones. To change an existing task
from a file, the owner exports it («Экспорт» on the task), you edit the file, he imports it as a new task and archives
the old one — or use connected mode, which changes things in place.

## Connected mode (MCP)

The account is an MCP server: `https://kra.name/app/api/mcp`, header `Authorization: Bearer <API key>` (panel →
Настройки → Интеграции; the API is on the Business plan and above). Setup:

If the owner says the key is in a file (usually `~/Downloads/aiworker-key.txt` from «Скачать файлом» in the panel),
never print it, `cat` it into your answer or paste it into a command line you show: move it with the shell, e.g.
`printf '\nexport AIWORKER_API_KEY="%s"\n' "$(tr -d '\r\n' < ~/Downloads/aiworker-key.txt)" >> ~/.zshrc` (bash: `~/.bashrc`;
Windows PowerShell: `setx AIWORKER_API_KEY (Get-Content $HOME\Downloads\aiworker-key.txt -Raw).Trim()`), check that the
variable is set in a new shell without echoing it (`[ -n "$AIWORKER_API_KEY" ] && echo set`), then delete the file and
tell the owner to restart Codex or Claude Code.

- Claude Code plugin (this skill + the MCP server): `/plugin marketplace add needtome/aiworker-skills`, then
  `/plugin install aiworker@aiworker-skills`; the key comes from the environment variable `AIWORKER_API_KEY`.
- Claude Code, MCP only: `claude mcp add --transport http aiworker https://kra.name/app/api/mcp --header "Authorization: Bearer $AIWORKER_API_KEY"`
- Claude in the browser or the app: Customize → Connectors → custom connector with the URL above and the request header
  `Authorization: Bearer <API key>`.
- Codex (`~/.codex/config.toml`):
  ```toml
  [mcp_servers.aiworker]
  url = "https://kra.name/app/api/mcp"
  bearer_token_env_var = "AIWORKER_API_KEY"
  ```

Tools: `get_account` (chats, personas, employees, tasks with ids), `guide` (the actions and their rules — read it
before proposing), `lookup` (what tasks did with given links), `task_status`, `propose_changes`, `pending_changes`,
`apply_changes`, `discard_changes`, `export`, `import`.

Without MCP but with the API key, the same is plain REST (`Authorization: Bearer <key>`, base
`https://kra.name/app/api/v1`, reference https://kra.name/app/api/docs): `GET /account`, `GET /tasks/{id}`,
`POST /lookup`, `GET /guide`, `POST /changes` → `POST /changes/apply` (or `DELETE /changes`), `GET /export`,
`POST /import` (dry run unless `"dry_run": false`).

Always two steps, like the panel's setup wizard: `propose_changes` checks the actions and keeps the valid ones; show
the owner the returned summaries and refusals; call `apply_changes` **only after the owner agrees**. For a set of new
items use `import` with `dry_run: true` first, then `dry_run: false` after the owner agrees — this creates **and
starts** them (`activate`, default true: tasks run, collections start, «auto» mode as in the file; `activate: false`
leaves them for the owner). Run, switch on or pause a task: `automation_run`, `automation_activate`,
`automation_pause`; start or pause a contact collection: `audience_start`, `audience_pause` (ids in
`get_account().audiences`).

## Working with tasks

- **Create.** File mode: a `task` item (see `references/bundle-format.md`). Connected: action `automation_create` with the
  payload from `guide`. AI Worker's own AI then opens the sites, writes the scenario and shows it to the owner; a task
  with a scenario from a file waits «на проверке» until the owner switches it on (`automation_activate`).
- **Edit.** `automation_update` with only the fields that change. What fits (`criteria`), the schedule, where results go,
  the threshold and the name never rewrite the scenario. A new goal or other sites do: add `"reauthor": true` (or
  `automation_targets_add` / `automation_targets_remove` for sites and groups). Run now — `automation_run`; pause —
  `automation_pause`; a key the scenario needs — `automation_secret_set`.
- **Logs and results.** `task_status` (REST `GET /tasks/{id}`): status, the last error, the scenario's steps, the last
  runs with what was seen, judged, matched and mailed, and which keys are missing. For a concrete element («why did it
  not send me this project?») — `lookup` (REST `POST /lookup`) with the link: whether the task found it, when, the AI's
  score and reason, whether it was mailed, and the run log lines about it. The owner sees the same on the task page
  («Отчёт») in the panel.
- Every method of the REST API and the MCP tools: `references/api.md`.

## Good tasks

- One task = one recurring job. Put each source and how to read it into `goal` ("1) freelancehunt.com/projects —
  open the list, collect cards …; 2) …").
- `criteria` is what the AI judges every found element against (score 0–100); be concrete about what fits and what
  does not.
- A named time («every day at 7 am») is `daily_at: "07:00"` (connected mode: in the `automation_create` /
  `automation_update` payload; file mode: `params.daily_at`) — exact, in the AI employee's time zone. `every_minutes`
  is an interval with ±20 % jitter, so «daily» alone may drift by hours.
- Prefer `every_minutes` ≥ 30 for sites; Telegram groups: ≥ 60. `0` means only by hand, by webhook or from another
  task's results.
- Results go to the owner by mail by default. A chain (one task's results become another's input) is
  `deliver_to_refs` on the source; the target then reads the list `events`.
- An API source (JSON) is faster and steadier than a page: if the site has a public API, say so in `goal`.

## Files in this skill

- `references/bundle-format.md` — the file format, every kind and field, safe defaults.
- `references/bundle.schema.json` — JSON Schema of the file.
- `references/program-steps.md` — every step a task program may use, with fields and examples.
- `references/wizard-actions.md` — the actions of connected mode (same list as the `guide` tool).
- `references/api.md` — every REST API method and the MCP tools, generated from the server's OpenAPI document.
- `examples/` — ready files: a task that watches freelance sites, a web chat with FAQ, a chain of two tasks, a contact
  collection with an outreach scenario.
