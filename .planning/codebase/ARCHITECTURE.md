# Architecture

**Analysis Date:** 2026-06-02

## Pattern Overview

**Overall:** Operational workspace containing a large plugin-based TypeScript
gateway monorepo plus local OpenClaw runtime/workspace repos.

**Key Characteristics:**

- `openclaw/` is a TypeScript monorepo and npm-distributed CLI/gateway product.
- `.openclaw/` is a local runtime/config repo with real operational state and
  separate nested workspaces.
- `.openclaw/workspace-uxnaut/` and `.openclaw/workspace-paritech/` are
  Git-tracked operational knowledge bases with custom skills and client ledgers.
- Runtime state is file-based: configs, cron jobs, sessions, credentials,
  memory, task logs, and reports live on disk.
- OpenClaw core exposes a gateway control plane, plugin system, agents,
  channels, cron, tools, and companion-app surfaces.

## Layers

**Launcher / Bootstrap Layer:**

- Purpose: Start the OpenClaw CLI safely across source checkout and packaged
  install contexts.
- Contains: Node version guard, compile-cache handling, respawn behavior,
  command argv normalization.
- Key files: `openclaw/openclaw.mjs`, `openclaw/src/entry.ts`,
  `openclaw/src/entry.compile-cache.ts`, `openclaw/src/entry.respawn.ts`.
- Depends on: Node.js built-ins, CLI profile/container helpers.
- Used by: Global `openclaw` command and package bin entry.

**CLI / Commands Layer:**

- Purpose: Provide user/operator commands for gateway, agents, nodes, channels,
  cron, setup, doctor, models, secrets, and status.
- Contains: Commander setup, command handlers, root help, command-specific
  modules.
- Key directories: `openclaw/src/cli/`, `openclaw/src/commands/`.
- Depends on: Config, gateway call client, runtime modules.
- Used by: Local terminal usage and automation scripts.

**Configuration Layer:**

- Purpose: Load, validate, normalize, mutate, and render OpenClaw config.
- Contains: Zod schemas, generated schema metadata, config IO, legacy
  migrations, sensitive path helpers, plugin auto-enable logic.
- Key directories: `openclaw/src/config/`.
- Key files: `openclaw/src/config/config.ts`,
  `openclaw/src/config/io.ts`, `openclaw/src/config/schema.ts`,
  `openclaw/src/config/zod-schema*.ts`.
- Depends on: Filesystem, schema libraries, plugin/channel metadata.
- Used by: CLI, gateway, doctor, setup, runtime services.

**Gateway Layer:**

- Purpose: Local control plane for WebSocket clients, HTTP routes, RPC methods,
  model/gateway auth, nodes, tools, sessions, approvals, chat, and plugins.
- Contains: Server startup, WS connection handling, gateway method registry,
  server method handlers, HTTP endpoints, node/device pairing.
- Key directories: `openclaw/src/gateway/`, especially
  `openclaw/src/gateway/server/`,
  `openclaw/src/gateway/server-methods/`, and
  `openclaw/src/gateway/methods/`.
- Depends on: Config, agents, sessions, plugins, channels, auth, tools.
- Used by: Control UI, CLI gateway calls, mobile/native nodes, cron, plugins.

**Agent Runtime Layer:**

- Purpose: Run model-backed agent turns with tools, sessions, context,
  failover, hooks, auth profiles, transcript management, and sandbox policy.
- Contains: CLI runner, embedded Pi runner, tool schemas, bootstrap/context,
  auth profiles, bash tools, model selection, failover.
- Key directories: `openclaw/src/agents/`, `openclaw/src/tools/`,
  `openclaw/src/context-engine/`.
- Key files: `openclaw/src/agents/cli-runner.ts`,
  `openclaw/src/agents/pi-embedded-runner/`,
  `openclaw/src/agents/tools/`.
- Depends on: Model providers, plugin runtime, config, sessions, tools.
- Used by: Gateway `agent`/`chat.send`, cron isolated agent jobs, CLI agent
  command, channel auto-reply.

**Plugin / Extension Layer:**

- Purpose: Add providers, channels, tools, media capabilities, memory engines,
  web/search providers, and setup surfaces without hardcoding each integration
  into core.
- Contains: Plugin manifests, runtime registry, plugin SDK, contract tests,
  bundled extension packages.
- Key directories: `openclaw/extensions/`, `openclaw/src/plugins/`,
  `openclaw/src/plugin-sdk/`, `openclaw/packages/plugin-sdk/`.
- Depends on: Core runtime APIs and manifest contracts.
- Used by: Provider model execution, channel ingress/egress, tool surfaces,
  UI, setup wizards.

**Channels / Messaging Layer:**

- Purpose: Normalize inbound/outbound messages, sender identity, allowlists,
  message access, replies, channel plugins, bindings, and DM/group policy.
- Contains: Message runtime, access decisions, channel plugin registry, target
  parsing, setup helpers, pairing, outbound bridge.
- Key directories: `openclaw/src/channels/`,
  `openclaw/src/channels/message/`,
  `openclaw/src/channels/message-access/`,
  `openclaw/src/channels/plugins/`.
- Depends on: Plugin layer, config, gateway, auto-reply.
- Used by: WhatsApp/Telegram/etc. runtime, agent delivery, cron delivery.

**Cron / Automation Layer:**

- Purpose: Persist scheduled jobs, calculate schedules, run system events or
  isolated agent turns, deliver success/failure announcements, and retain run
  logs.
- Contains: Cron service, job store, schedule parser, delivery planner,
  isolated agent runner, run logs.
- Key directories: `openclaw/src/cron/`, `openclaw/src/cron/service/`,
  `openclaw/src/cron/isolated-agent/`.
- Runtime config: `.openclaw/cron/jobs.json`.
- Depends on: Gateway runtime, agent runtime, delivery/channel layer.
- Used by: UXNaut daily flows, security audit, consolidate-day jobs,
  reminders, ClickUp health.

**Control UI Layer:**

- Purpose: Browser UI for chat/control, settings, sessions, usage, activity,
  cron quick creation, and gateway interaction.
- Contains: Lit components/modules, CSS, storage, gateway client, rendering,
  markdown handling.
- Key directories: `openclaw/ui/src/ui/`, `openclaw/ui/src/styles/`.
- Entry: `openclaw/ui/src/main.ts`.
- Build config: `openclaw/ui/vite.config.ts`.
- Depends on: Gateway HTTP/WS endpoints and UI package dependencies.
- Used by: Gateway-hosted control surfaces.

**Companion App Layer:**

- Purpose: Optional native nodes/apps for macOS, iOS, Android, shared protocol,
  TTS, wake, canvas, voice, push, and device flows.
- Key directories: `openclaw/apps/macos/`, `openclaw/apps/ios/`,
  `openclaw/apps/android/`, `openclaw/apps/shared/`, `openclaw/apps/swabble/`.
- Depends on: Gateway protocol and platform SDKs.
- Used by: Local/remote device experiences.

**Operational Workspace Layer:**

- Purpose: Store business/client workflow knowledge and custom automation for
  UXNaut and Paritech.
- UXNaut workspace: `.openclaw/workspace-uxnaut/`.
- Paritech workspace: `.openclaw/workspace-paritech/`.
- Contains: `AGENTS.md`, `skills/`, `memory/`, `profiles/`, `operacional/`,
  `projects/`, reports, and client task ledgers.
- Depends on: OpenClaw agent execution and optional external APIs such as
  ClickUp.
- Used by: WhatsApp-bound agents `uxnaut` and `paritech`.

## Data Flow

**CLI Command Execution:**

1. User runs `openclaw ...`.
2. `openclaw/openclaw.mjs` verifies Node version and respawns/loads source or
   packaged entry.
3. `openclaw/src/entry.ts` normalizes argv/env/profile/container flags.
4. CLI command modules in `openclaw/src/cli/` and `openclaw/src/commands/`
   load config and call local logic or gateway RPC.
5. Results are printed to terminal or delivered through configured channels.

**Gateway WebSocket Request:**

1. Gateway server accepts HTTP/WS clients through `openclaw/src/gateway/server/`.
2. Connection/auth checks run through gateway auth modules and method scopes.
3. WS messages reach `openclaw/src/gateway/server/ws-connection/message-handler.ts`.
4. Method registry resolves handlers from `openclaw/src/gateway/server-methods/`.
5. Handler reads/mutates config, sessions, agents, cron, plugins, tools, or
   node state.
6. Gateway responds to the caller and may broadcast events to other clients.

**Inbound Channel Message to Agent:**

1. Channel plugin receives a message, e.g. WhatsApp under
   `openclaw/extensions/whatsapp/`.
2. Channel message/access modules normalize sender, peer, allowlist, DM/group
   policy, mention state, and routing.
3. Binding config in `.openclaw/openclaw.json` selects `uxnaut` or `paritech`.
4. Auto-reply/agent runner builds a session prompt and context.
5. Agent runtime uses configured model/provider, tools, workspace, and sandbox
   policy.
6. Reply payload is delivered back through the channel plugin or suppressed
   when a workflow uses `NO_REPLY`/silent behavior.

**Cron Agent Job:**

1. `openclaw/src/cron/service.ts` loads `.openclaw/cron/jobs.json`.
2. Schedule logic identifies due jobs.
3. Agent-turn jobs run via `openclaw/src/cron/isolated-agent/`.
4. Model and tool constraints come from job payload plus agent/global config.
5. Result is logged and optionally delivered through configured success/failure
   destination.
6. Run status is visible through `openclaw cron list` and run logs.

**UXNaut ClickUp Sync:**

1. Markdown task ledgers live under
   `.openclaw/workspace-uxnaut/operacional/`.
2. ClickUp sync scripts parse Markdown and ClickUp API data using
   `.openclaw/workspace-uxnaut/skills/clickup-sync/_lib.py`.
3. Drift/health reports are written to
   `.openclaw/workspace-uxnaut/reports/ops/`.
4. Daily workflow skills reference ClickUp mapping rules and status semantics.
5. Cron or explicit agent/tool calls reconcile state when needed.

## State Management

**File-Based Runtime State:**

- `.openclaw/openclaw.json` - Main config.
- `.openclaw/cron/jobs.json` - Scheduled job definitions.
- `.openclaw/agents/` - Agent runtime sessions/auth metadata; sensitive.
- `.openclaw/credentials/` - Channel/provider credentials; sensitive.
- `.openclaw/logs/` - Gateway/token usage/log output.

**Git Repositories:**

- `openclaw/` - Main upstream/source checkout.
- `.openclaw/` - Git-tracked local config slice; current working tree has
  `cron/jobs.json` modified.
- `.openclaw/workspace-uxnaut/` - UXNaut operational workspace; current working
  tree has pending operational changes.
- `.openclaw/workspace-paritech/` - Paritech operational workspace; current
  working tree has `memory/soul-guardian/audit.jsonl` modified.
- `/home/luana` root is not currently a Git repo.

**Operational Source of Truth:**

- UXNaut retainers/tasks: `.openclaw/workspace-uxnaut/operacional/retainer/`.
- Daily logs: `.openclaw/workspace-uxnaut/operacional/daily-log/rafael/`.
- Paritech projects: `.openclaw/workspace-paritech/projects/`.
- Agent instructions: `.openclaw/workspace-*/AGENTS.md`.

## Key Abstractions

**Gateway Method:**

- Purpose: RPC operation exposed to clients/nodes/control UI.
- Examples: files in `openclaw/src/gateway/server-methods/`.
- Registry: `openclaw/src/gateway/methods/registry.ts`.
- Pattern: Descriptor plus handler with scope validation.

**Plugin:**

- Purpose: Externalize providers/channels/tools/runtime capabilities.
- Examples: `openclaw/extensions/moonshot/`,
  `openclaw/extensions/telegram/`, `openclaw/extensions/active-memory/`.
- Pattern: `openclaw.plugin.json` plus TypeScript entry/API files.

**Agent:**

- Purpose: Workspace-bound assistant identity with model/tool policy.
- Examples: `uxnaut` and `paritech` entries in `.openclaw/openclaw.json`.
- Pattern: Config entry chooses workspace, tools, model/thinking defaults,
  and routing bindings.

**Skill:**

- Purpose: Workspace-local operational workflow or reusable tool instructions.
- Examples: `.openclaw/workspace-uxnaut/skills/clickup-sync/SKILL.md`,
  `.openclaw/workspace-paritech/skills/paritech-tasks/SKILL.md`.
- Pattern: `SKILL.md` plus helper scripts/config/tests when needed.

**Cron Job:**

- Purpose: Persisted scheduled system event or isolated agent turn.
- Examples: `paritech-consolidate-day`, `uxnaut-consolidate-day`,
  `clickup-sync-health` in `.openclaw/cron/jobs.json`.
- Pattern: schedule + payload + delivery/failureDestination + optional agentId.

**Channel Binding:**

- Purpose: Route incoming peers/groups to a specific agent.
- Examples: WhatsApp group/direct bindings in `.openclaw/openclaw.json`.
- Pattern: channel + peer kind/id + agentId.

## Entry Points

**OpenClaw CLI:**

- `openclaw/openclaw.mjs` - npm bin launcher and Node version guard.
- `openclaw/src/entry.ts` - CLI bootstrap and root dispatch.

**Gateway:**

- `openclaw/src/commands/gateway/` and `openclaw/src/cli/gateway-cli/` -
  CLI command surface.
- `openclaw/src/gateway/boot.ts` and `openclaw/src/gateway/server/` - server
  startup and request handling.

**Agent Runs:**

- `openclaw/src/gateway/server-methods/agent.ts` - Gateway agent method.
- `openclaw/src/agents/cli-runner.ts` - Agent run orchestration.
- `openclaw/src/cron/isolated-agent/run.ts` - Cron isolated agent execution.

**Control UI:**

- `openclaw/ui/src/main.ts` - UI entry.
- `openclaw/ui/src/ui/app.ts` and `openclaw/ui/src/ui/app-render.ts` - App
  state/rendering.

**Workspace Skills:**

- `.openclaw/workspace-uxnaut/skills/*/SKILL.md`.
- `.openclaw/workspace-paritech/skills/*/SKILL.md`.

## Error Handling

**Core Strategy:**

- Fail fast on invalid config, invalid gateway params, unsafe paths, or bad
  plugin contracts.
- Use typed/schema validation at boundaries.
- Preserve user-facing errors with contextual messages and runtime status.

**Patterns:**

- Gateway methods return structured errors through response handlers.
- Agent/model errors may wrap into `FailoverError` and are classified in
  `openclaw/src/agents/failover-error.ts` and runner helpers.
- Cron records last status and failure delivery; logs live under
  `.openclaw/cron/runs/` and status is surfaced by `openclaw cron list`.
- Config IO has recovery/audit helpers in `openclaw/src/config/io.*.ts`.
- Plugin API compatibility/deprecation is guarded by contract tests in
  `openclaw/src/plugins/contracts/`.

## Cross-Cutting Concerns

**Logging:**

- Core logging in `openclaw/src/logging/`.
- Subsystem logging is used by agent runner and other modules.
- Gateway log configured in `.openclaw/openclaw.json`.

**Validation:**

- Runtime schemas use Zod/TypeBox.
- Config schema generation and lookup live in `openclaw/src/config/schema.ts`.
- Gateway method scopes and validation live in
  `openclaw/src/gateway/method-scopes.ts` and
  `openclaw/src/gateway/server-methods/validation.ts`.

**Authentication / Authorization:**

- Gateway auth, device auth, operator scopes, method scopes, and channel
  message access are separate layers. Avoid bypassing one by adding shortcuts
  in another.

**Security:**

- Credential folders are intentionally excluded from versioned slices.
- Channel DM policies default to controlled/pairing behavior.
- Exec/tool policies are configured globally and per-agent in
  `.openclaw/openclaw.json`.
- Plugin routes enforce auth policy through gateway plugin HTTP helpers.

**Testing:**

- The codebase relies heavily on regression/contract tests near the modules
  they protect. Add targeted tests for any behavior change.

---

_Architecture analysis: 2026-06-02_
_Update when major patterns change_
