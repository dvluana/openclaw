# UXN Hours

OpenClaw tool for creating and reading UXN Gestao hours from conversational
channels such as WhatsApp.

The tool does not own hours data. It calls the `uxn-painel-web` Desktop API:

- `GET /api/v1/clients`
- `GET /api/v1/projects`
- `GET /api/v1/tags`
- `GET /api/v1/time-entries?from=&to=`
- `POST /api/v1/time-entries`

## Configuration

Environment:

```bash
UXN_GESTAO_API_URL=http://localhost:3002
UXN_GESTAO_PAT=uxn_pat_...
UXN_GESTAO_TIMEZONE=America/Sao_Paulo
```

OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "uxn-hours": {
        "config": {
          "baseUrl": "http://localhost:3002",
          "token": { "source": "env", "provider": "process", "id": "UXN_GESTAO_PAT" },
          "timezone": "America/Sao_Paulo",
          "requireConfirmationForCreate": true
        }
      }
    }
  }
}
```

## Tool

Tool name: `uxn_hours`

Actions:

- `list_clients`
- `list_projects`
- `list_tags`
- `list_entries`
- `summarize_day`
- `summarize_month`
- `create_entry`

Tags are optional. If `tagNames` are supplied, they must match existing tags;
the tool does not create tags.

Create requests require `confirmed: true` by default. This prevents accidental
hours entries from ambiguous WhatsApp messages.

## WhatsApp usage intent

The WhatsApp channel remains owned by `extensions/whatsapp`. This plugin only
adds the hours capability that an enabled agent can call.

Expected conversational mappings:

- "lanca 2h para Loumar em wireframes hoje" -> `create_entry`
- "quanto deu hoje?" -> `summarize_day`
- "quanto deu em maio?" -> `summarize_month`
- "quais clientes existem?" -> `list_clients`
- "quais tags existem?" -> `list_tags`

For create requests, the agent should resolve the client/project first. If the
client, project, or tag is ambiguous, the tool returns a clarification payload
instead of creating data.

Minimal runtime requirements:

- `uxn-painel-web` reachable at `UXN_GESTAO_API_URL`
- a valid `UXN_GESTAO_PAT`
- timezone configured for local words such as "hoje"; defaults to
  `America/Sao_Paulo`
- the OpenClaw agent that receives WhatsApp messages allowed to use `uxn_hours`
