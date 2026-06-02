# External Integrations

**Analysis Date:** 2026-06-02

## Scope

This file documents integrations visible from source/config names and operational
workspace conventions. It intentionally avoids secret values and does not read
credential stores.

## APIs & External Services

**Model Providers:**

- Moonshot/Kimi - Active configured model provider in `.openclaw/openclaw.json`.
  - Runtime model currently used by cron/agents: `moonshot/kimi-k2.6`.
  - Config location: `.openclaw/openclaw.json`.
  - Plugin/source locations: `openclaw/extensions/moonshot/`,
    `openclaw/src/plugins/provider-*`, `openclaw/src/model-catalog/`.
  - Auth: secret-managed provider config; do not document actual API keys.
- OpenAI-compatible providers - Broad provider ecosystem supported through
  OpenClaw core and bundled extensions.
  - Source locations: `openclaw/extensions/openai/`,
    `openclaw/src/plugins/openai-compatible-embedding-provider.ts`,
    `openclaw/src/gateway/openai-http.ts`,
    `openclaw/src/gateway/openresponses-http.ts`.
  - Env names appear in tests/contracts, e.g. `OPENAI_API_KEY`, but docs must
    not include real values.
- Google, Anthropic, DeepSeek, OpenRouter, Ollama, LM Studio, Bedrock, Azure,
  and many others are pluginized under `openclaw/extensions/`.
  - Add provider work in `openclaw/extensions/{provider}/`.
  - Provider package metadata generally includes `openclaw.plugin.json`,
    `package.json`, `index.ts`, and provider-specific runtime files.

**Messaging Channels:**

- WhatsApp - Operationally configured in `.openclaw/openclaw.json` bindings and
  used for UXNaut/Paritech delivery.
  - Source location: `openclaw/extensions/whatsapp/`.
  - Credentials location: `.openclaw/credentials/whatsapp/` (do not read or
    commit).
  - Runtime access policies: `.openclaw/openclaw.json` and
    `openclaw/src/channels/message-access/`.
- Telegram, Slack, Discord, Google Chat, Signal, Matrix, LINE, Mattermost,
  Microsoft Teams, Feishu, IRC, Nextcloud Talk, Nostr, Tlon, Twitch, Zalo,
  QQ, Synology Chat, iMessage, WeChat, and others are supported by bundled
  channel plugins.
  - Source locations: `openclaw/extensions/{channel}/`.
  - Registry/runtime glue: `openclaw/src/channels/plugins/`,
    `openclaw/src/channels/message/`, `openclaw/src/channels/registry.ts`.

**ClickUp:**

- UXNaut ClickUp sync is a workspace skill, not an OpenClaw core module.
  - Source: `.openclaw/workspace-uxnaut/skills/clickup-sync/`.
  - Key files: `_lib.py`, `drift_check.py`, `health_check.py`,
    `scheduled_checks.py`, `push_status.py`, `lookup_task.py`, `populate.py`,
    `bootstrap_markdown.py`.
  - Config: `.openclaw/workspace-uxnaut/skills/clickup-sync/config.json`.
  - Token source documented in
    `.openclaw/workspace-uxnaut/skills/clickup-sync/lib.md`: environment
    variable `CLICKUP_TOKEN` or `/home/luana/.openclaw/credentials/clickup/env`.
    Do not include token values in docs or commits.
- Paritech has separate ClickUp/task helpers.
  - Source: `.openclaw/workspace-paritech/skills/paritech-tasks/`.
  - Key files: `_lib.py`, `create_task.py`, `move_task.py`, `list_open.py`,
    `update_tags.py`, `retry_queue.py`, `cleanup_tags.py`.

**Web Search / Research Providers:**

- Kimi web search is configured via `.openclaw/openclaw.json`
  `tools.web.search.provider = "kimi"`.
- Search/provider plugin locations include `openclaw/extensions/brave/`,
  `openclaw/extensions/exa/`, `openclaw/extensions/firecrawl/`,
  `openclaw/extensions/tavily/`, `openclaw/extensions/searxng/`,
  and `openclaw/src/web-search/`.
- UXNaut `gastosapi` references Tavily usage via
  `.openclaw/workspace-uxnaut/skills/gastosapi/helpers.py`.

**Speech, TTS, Media, and Realtime:**

- Text-to-speech core: `openclaw/src/tts/`.
- Speech and voice providers: `openclaw/extensions/elevenlabs/`,
  `openclaw/extensions/azure-speech/`, `openclaw/extensions/speech-core/`,
  `openclaw/extensions/tts-local-cli/`.
- Talk mode core: `openclaw/src/talk/`.
- Media understanding: `openclaw/src/media-understanding/`,
  `openclaw/extensions/media-understanding-core/`,
  `openclaw/extensions/deepgram/`, and provider-specific media plugins.
- Image/music/video generation: `openclaw/src/image-generation/`,
  `openclaw/src/music-generation/`, `openclaw/src/video-generation/`,
  plus extensions like `fal`, `runway`, `vydra`, `pixverse`, `byteplus`.

## Data Storage

**Runtime State:**

- OpenClaw runtime state lives under `.openclaw/`.
- Config repo note in `.openclaw/README.md` says only a local, allowlisted slice
  is versioned; sensitive runtime folders are excluded.
- Sensitive/non-versioned areas include `.openclaw/agents/`,
  `.openclaw/credentials/`, `.openclaw/devices/`, `.openclaw/delivery-queue/`,
  `.openclaw/logs/`, `.openclaw/media/`, `.openclaw/tasks/`, and channel auth
  stores.

**Sessions and Agent Workspaces:**

- OpenClaw agent workspaces:
  - `.openclaw/workspace-uxnaut/`
  - `.openclaw/workspace-paritech/`
  - `.openclaw/workspace/` (snapshot/pre-multiagent per `.openclaw/README.md`)
- Session/runtime files live in `.openclaw/agents/*/sessions/` and should not
  be treated as source code.

**Plugin State:**

- Plugin state store code lives in `openclaw/src/plugin-state/`.
- Persistent plugin/runtime stores may use SQLite/Kysely depending on feature.

**Operational Documents:**

- UXNaut task ledgers live in
  `.openclaw/workspace-uxnaut/operacional/retainer/*/*.md`,
  `.openclaw/workspace-uxnaut/operacional/daily-log/rafael/*.md`, and
  `.openclaw/workspace-uxnaut/reports/`.
- Paritech project ledgers live in
  `.openclaw/workspace-paritech/projects/`, `profiles/`, `memory/`, and
  `reports/`.

## Authentication & Identity

**Gateway Auth:**

- Gateway config: `.openclaw/openclaw.json`.
- The current gateway mode is local with token auth and loopback bind.
- Security/auth source modules:
  - `openclaw/src/gateway/auth.ts`
  - `openclaw/src/gateway/connection-auth.ts`
  - `openclaw/src/gateway/http-auth-utils.ts`
  - `openclaw/src/gateway/device-auth.ts`
  - `openclaw/src/gateway/operator-scopes.ts`

**Agent Auth Profiles:**

- Auth profile source modules live in `openclaw/src/agents/auth-profiles/`.
- Provider auth and secret resolution live across `openclaw/src/plugins/`,
  `openclaw/src/secrets/`, and `openclaw/src/config/types.secrets.ts`.

**Channel Access:**

- DM/group access, pairing, allowlists, and sender gates live in:
  - `openclaw/src/channels/message-access/`
  - `openclaw/src/channels/direct-dm*.ts`
  - `openclaw/src/channels/plugins/pairing*.ts`
  - `openclaw/src/channels/allowlists/`

## Monitoring & Observability

**Logs:**

- Gateway log path from `.openclaw/openclaw.json`:
  `.openclaw/logs/gateway/openclaw.log`.
- Diagnostic/logging modules:
  - `openclaw/src/logging/`
  - `openclaw/src/gateway/server-methods/logs.ts`
  - `openclaw/extensions/diagnostics-otel/`
  - `openclaw/extensions/diagnostics-prometheus/`

**Usage and Cost:**

- OpenClaw usage logic is in `openclaw/src/gateway/server-methods/usage.ts`.
- UXNaut `gastosapi` reads token usage from `.openclaw/logs/token-usage/` via
  `.openclaw/workspace-uxnaut/skills/gastosapi/helpers.py`.

**Health:**

- Core gateway/doctor/health code:
  - `openclaw/src/commands/doctor/`
  - `openclaw/src/gateway/server-methods/doctor.ts`
  - `openclaw/src/gateway/server-methods/health.ts`
  - `openclaw/src/status/`
- Workspace ClickUp health checks:
  - `.openclaw/workspace-uxnaut/skills/clickup-sync/health_check.py`
  - `.openclaw/workspace-uxnaut/skills/clickup-sync/health_check_wrapper.sh`

## CI/CD & Deployment

**OpenClaw CI:**

- Workflows live in `openclaw/.github/workflows/`.
- Major workflows include `ci.yml`, `docs.yml`, `docker-release.yml`,
  `openclaw-release-*.yml`, `plugin-*.yml`, `codeql*.yml`, and many e2e/live
  workflows.

**Packaging:**

- npm package entry: `openclaw/openclaw.mjs`.
- Docker: `openclaw/Dockerfile`, `openclaw/docker-compose.yml`.
- macOS packaging: `openclaw/scripts/package-mac-app.sh`,
  `openclaw/apps/macos/`.
- iOS release: `openclaw/apps/ios/fastlane/`, `openclaw/scripts/ios-*.sh`.
- Android release: `openclaw/apps/android/scripts/build-release-aab.ts`.

## Webhooks & Callbacks

**Incoming / Gateway:**

- Gateway WebSocket server and HTTP routes:
  - `openclaw/src/gateway/server/ws-connection.ts`
  - `openclaw/src/gateway/server/ws-connection/message-handler.ts`
  - `openclaw/src/gateway/server/plugins-http.ts`
  - `openclaw/src/gateway/mcp-http.ts`
- Gateway methods:
  - `openclaw/src/gateway/server-methods/`
  - `openclaw/src/gateway/methods/core-descriptors.ts`
  - `openclaw/src/gateway/methods/registry.ts`

**Plugin HTTP Routes:**

- Plugin route registration and auth:
  - `openclaw/src/gateway/server/plugins-http/route-match.ts`
  - `openclaw/src/gateway/server/plugins-http/route-auth.ts`
  - `openclaw/src/gateway/server/plugins-http/route-capability.ts`

**Cron Automation:**

- Persistent jobs: `.openclaw/cron/jobs.json`.
- Core service: `openclaw/src/cron/service.ts`,
  `openclaw/src/cron/service/`.
- Isolated agent runs: `openclaw/src/cron/isolated-agent/`.
- Current operational cron jobs include daily Rafa flows, Carol checkin,
  security audit, consolidate-day jobs, reminders reconcile, and ClickUp sync
  health.

## Integration Rules

- Never write actual tokens/API keys into Markdown docs, git commits, logs, or
  planning files.
- Use OpenClaw plugin APIs for channel/provider work; avoid importing across
  plugin/package boundaries unless an existing contract permits it.
- For ClickUp, follow the local workspace skills. UXNaut daily flow explicitly
  says to use the native `uxn_clickup` tool in WhatsApp contexts and avoid raw
  curl/status PUTs there.
- For cron job changes, update through the OpenClaw CLI when possible so the
  active gateway state and `.openclaw/cron/jobs.json` stay aligned.
- For credentials, document env var names and credential file paths only.

---

_Integration audit: 2026-06-02_
_Update when adding/removing external services_
