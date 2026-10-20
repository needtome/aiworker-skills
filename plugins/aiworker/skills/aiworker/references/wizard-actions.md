# Actions of connected mode (MCP propose_changes)

The same closed list the panel's setup wizard uses. Every action has the fields `type`, `target`, `field`, `lang`,
`value`, `question`, `answer`, `index`, `payload` (unused ones empty). The server checks each one on proposal and again
on apply. 

- `persona_instruction_append` — Дополнить инструкцию личности
- `persona_instruction_replace` — Заменить инструкцию личности
- `persona_field` — Изменить имя, фамилию, пол или должность личности
- `worker_instruction_append` — Дополнить инструкцию ИИ-сотрудника
- `worker_instruction_replace` — Заменить инструкцию ИИ-сотрудника
- `faq_add` — Добавить вопрос в FAQ
- `faq_update` — Изменить вопрос FAQ
- `faq_delete` — Удалить вопрос FAQ
- `chat_greeting` — Приветствие чата
- `chat_suggestions` — Быстрые вопросы чата
- `chat_name` — Название чата
- `chat_title` — Подпись под именем в чате
- `chat_appearance` — Вид чата
- `chat_leads` — Заявки из чата
- `chat_enabled` — Включить или выключить чат
- `source_add` — Добавить сайт или страницу в базу знаний
- `chat_create` — Создать онлайн-чат
- `automation_create` — Создать задание на сайте или в Telegram
- `automation_update` — Изменить задание
- `automation_targets_add` — Добавить сайты или группы в задание
- `automation_targets_remove` — Убрать сайты или группы из задания
- `audience_collect` — Собрать в интернете контакты или Telegram-каналы (аудитория)
- `audience_start` — Запустить или продолжить сбор контактов (аудитория из context.audiences)
- `audience_pause` — Поставить сбор контактов на паузу
- `feature_request` — Оставить заявку разработчикам на функционал, которого пока нет
- `automation_activate` — Включить задание после проверки сценария
- `automation_run` — Запустить задание сейчас
- `automation_pause` — Поставить задание на паузу
- `automation_secret_set` — Сохранить ключ API, который владелец прислал в чат, в «Ключи доступа» задания
- `agent_route_create` — Создать маршрут ИИ-агента: события аккаунта сразу в Claude Code или Codex владельца
- `agent_route_update` — Изменить маршрут ИИ-агента
- `agent_route_pause` — Поставить маршрут ИИ-агента на паузу

The fields of each action, the payload JSON of automation_* / audience_collect and the rules come from the `guide`
tool of the connected account — read it before proposing.
