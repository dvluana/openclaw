# Codebase Structure

**Analysis Date:** 2026-06-02

## Directory Layout

```text
/home/luana/
|-- openclaw/                         # Main OpenClaw TypeScript monorepo
|   |-- src/                          # Core runtime, gateway, agents, config, tools
|   |-- extensions/                   # Bundled provider/channel/tool plugins
|   |-- packages/                     # Published/internal SDK packages
|   |-- ui/                           # Vite/Lit control UI
|   |-- apps/                         # macOS, iOS, Android, shared native apps
|   |-- scripts/                      # Build, release, checks, e2e, maintenance
|   |-- test/                         # Test configs, script tests, fixtures
|   |-- docs/                         # User/developer documentation
|   |-- config/                       # Lint, format, deadcode, tsconfig shards
|   |-- security/                     # Security scans/rules/readmes
|   |-- skills/                       # OpenClaw bundled skills
|   |-- package.json                  # Root package and scripts
|   |-- pnpm-workspace.yaml           # Monorepo package policy
|   `-- tsconfig.json                 # Root TS config
|-- .openclaw/                        # Local OpenClaw runtime/config repo
|   |-- openclaw.json                 # Real local config; contains secrets refs/values
|   |-- cron/jobs.json                # Scheduled jobs
|   |-- workspace-uxnaut/             # UXNaut agent workspace repo
|   |-- workspace-paritech/           # Paritech agent workspace repo
|   |-- workspace/                    # Historical/snapshot workspace
|   |-- agents/                       # Runtime sessions/auth state; sensitive
|   |-- credentials/                  # Channel/API credentials; sensitive
|   `-- logs/                         # Runtime logs; sensitive/ephemeral
|-- .codex/                           # Codex runtime config, GSD skills/agents
|-- .claude/                          # Claude runtime config, GSD skills/agents
|-- .gsd/                             # GSD defaults
|-- paritech/                         # Additional Paritech reports/logs
|-- docs/                             # Loose local docs
|-- reports/outputs as *.md/*.json    # Generated operational reports
`-- .planning/codebase/               # This GSD codebase map
```

## Directory Purposes

**`openclaw/`:**

- Purpose: Main product source checkout.
- Contains: TypeScript monorepo, plugin ecosystem, UI, native apps, tests,
  scripts, docs, package metadata.
- Key files: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`,
  `openclaw.mjs`, `README.md`, `Dockerfile`, `docker-compose.yml`.
- Subdirectories: `src/`, `extensions/`, `ui/`, `apps/`, `packages/`,
  `scripts/`, `test/`, `docs/`, `config/`.

**`openclaw/src/`:**

- Purpose: Core OpenClaw runtime.
- Contains: CLI entry/runtime, gateway, agents, config, cron, channels, tools,
  plugins, media, memory, sessions, web, talk, TTS, routing.
- Key locations:
  - `src/entry.ts` - CLI bootstrap.
  - `src/gateway/` - Gateway control plane.
  - `src/agents/` - Agent runner/runtime/tooling.
  - `src/config/` - Config schema/IO/mutations.
  - `src/cron/` - Cron service and isolated agent runner.
  - `src/channels/` - Channel normalization/access/routing.
  - `src/plugins/` and `src/plugin-sdk/` - Plugin runtime and public SDK.

**`openclaw/extensions/`:**

- Purpose: Plugin packages for channels, model providers, tools, media, memory,
  diagnostics, migrations, and integrations.
- Contains: One directory per plugin/provider/channel.
- Key files per extension: often `package.json`, `openclaw.plugin.json`,
  `index.ts`, `api.ts`, tests, provider/channel runtime files.
- Add new bundled integrations here unless a core module is explicitly needed.

**`openclaw/packages/`:**

- Purpose: Published/internal packages split from core.
- Contains:
  - `packages/sdk/` - OpenClaw client SDK.
  - `packages/plugin-sdk/` - Package SDK surface.
  - `packages/memory-host-sdk/` - Memory host SDK.
  - `packages/plugin-package-contract/` - Package/manifest contract helpers.

**`openclaw/ui/`:**

- Purpose: Control UI web app.
- Contains: `ui/src/main.ts`, `ui/src/ui/`, `ui/src/styles/`, UI tests,
  Vite/Vitest config.
- Add UI modules under `ui/src/ui/` and styles under `ui/src/styles/`.

**`openclaw/apps/`:**

- Purpose: Native companion apps and shared protocol packages.
- Contains:
  - `apps/macos/`
  - `apps/ios/`
  - `apps/android/`
  - `apps/shared/`
  - `apps/swabble/`
  - `apps/macos-mlx-tts/`

**`openclaw/scripts/`:**

- Purpose: Build, release, dependency, quality, Docker, CI, and e2e tooling.
- Add automation here when it is product/repo-level, not workspace-specific.

**`.openclaw/`:**

- Purpose: Local runtime/config state for the VPS.
- Contains: real config, cron jobs, workspaces, credentials, sessions, logs.
- Key files: `.openclaw/README.md`, `.openclaw/openclaw.json`,
  `.openclaw/cron/jobs.json`.
- Treat as sensitive and local. `.openclaw/README.md` says `openclaw.json`
  contains real secrets and should not be pushed publicly.

**`.openclaw/workspace-uxnaut/`:**

- Purpose: UXNaut agent operational workspace.
- Contains: agent instructions, skills, client task ledgers, reports, memory,
  profiles, commercial/admin docs.
- Key locations:
  - `AGENTS.md`
  - `skills/clickup-sync/`
  - `skills/daily-rafael/`
  - `operacional/retainer/`
  - `operacional/daily-log/rafael/`
  - `reports/ops/`

**`.openclaw/workspace-paritech/`:**

- Purpose: Paritech agent operational workspace.
- Contains: agent instructions, skills, project ledgers, profiles, memory,
  vitals/research data.
- Key locations:
  - `AGENTS.md`
  - `skills/paritech-tasks/`
  - `skills/consolidate-day/`
  - `projects/`
  - `profiles/`
  - `memory/`

**`.codex/` and `.claude/`:**

- Purpose: AI runtime configuration and installed GSD assets.
- Contains: GSD skills, agents, hooks, runtime config, manifests.
- For GSD behavior changes, inspect `.codex/get-shit-done/` and
  `.codex/skills/`.

## Key File Locations

**Entry Points:**

- `openclaw/openclaw.mjs` - npm bin launcher.
- `openclaw/src/entry.ts` - OpenClaw CLI/runtime entry.
- `openclaw/ui/src/main.ts` - Control UI entry.
- `openclaw/apps/ios/Sources/OpenClawApp.swift` - iOS app entry.
- `openclaw/apps/macos/Package.swift` - macOS package/app entry.
- `openclaw/apps/android/app/build.gradle.kts` - Android app module config.

**Configuration:**

- `openclaw/package.json` - Scripts, dependencies, package export surface.
- `openclaw/pnpm-workspace.yaml` - Workspaces, dependency overrides,
  package manager policy.
- `openclaw/tsconfig.json` - Root TS config and path aliases.
- `openclaw/ui/vite.config.ts` - UI build config.
- `openclaw/vitest.config.ts` and `openclaw/test/vitest/*.ts` - Test routing.
- `.openclaw/openclaw.json` - Live OpenClaw runtime config.
- `.openclaw/cron/jobs.json` - Live cron schedule config.

**Core Logic:**

- `openclaw/src/gateway/` - Gateway server/control plane.
- `openclaw/src/gateway/server-methods/` - Gateway RPC handlers.
- `openclaw/src/agents/` - Agent runtime.
- `openclaw/src/channels/` - Channel access/routing/message runtime.
- `openclaw/src/plugins/` - Plugin registry/runtime/contracts.
- `openclaw/src/cron/` - Scheduled jobs.
- `openclaw/src/config/` - Config validation/mutations.
- `openclaw/src/tools/` - Agent tool descriptors/planning/execution.

**Testing:**

- `openclaw/src/**/*.test.ts` - Source-adjacent tests.
- `openclaw/extensions/**/*.test.ts` - Extension tests.
- `openclaw/ui/src/**/*.test.ts` - UI unit/node/browser tests.
- `openclaw/test/scripts/*.test.ts` - Script/CI/tooling tests.
- `openclaw/test/vitest/` - Vitest shard/config infrastructure.
- `.openclaw/workspace-uxnaut/skills/clickup-sync/tests/` - UXNaut sync tests.
- `.openclaw/workspace-paritech/skills/paritech-tasks/tests/` - Paritech task tests.

**Documentation and Reports:**

- `openclaw/README.md` and `openclaw/docs/` - Product docs.
- `.openclaw/workspace-uxnaut/reports/` - Operational drift/health reports.
- Top-level `/home/luana/*.md` - Generated ad hoc reports and handoffs.
- `.planning/codebase/` - This generated GSD map.

## Naming Conventions

**Files:**

- TypeScript modules mostly use kebab-case or descriptive dot-separated names,
  e.g. `openclaw/src/gateway/server-methods/agent.ts`,
  `openclaw/src/cron/isolated-agent/run-executor.ts`,
  `openclaw/src/config/zod-schema.agent-runtime.ts`.
- Tests use `*.test.ts`, sometimes with focused names like
  `run.tools-allow.test.ts`, `provider-runtime.contract.test.ts`, or
  `control-ui.http.test.ts`.
- Markdown project docs use uppercase important names (`AGENTS.md`, `README.md`)
  and lowercase client ledgers (`ctech-feito.md`, `retrilhar-backlog.md`).

**Directories:**

- Feature/domain directories use kebab-case or lowercase domain names:
  `server-methods`, `message-access`, `plugin-sdk`, `clickup-sync`.
- OpenClaw extensions are one directory per plugin id under `openclaw/extensions/`.
- UXNaut operational clients are under
  `.openclaw/workspace-uxnaut/operacional/retainer/{client}/`.

**Special Patterns:**

- `openclaw.plugin.json` identifies plugin packages.
- `SKILL.md` identifies workspace/runtime skills.
- `AGENTS.md` provides agent/repo instructions.
- `*.runtime.ts` often separates runtime-only code from pure/testable code.
- `*.contract.test.ts` protects public/plugin API boundaries.

## Where to Add New Code

**OpenClaw Core Feature:**

- Primary code: `openclaw/src/{domain}/`.
- Tests: adjacent `*.test.ts` under the same domain, plus shard-specific tests
  if the domain already uses them.
- Config/schema changes: `openclaw/src/config/` and related schema tests.
- Gateway method: `openclaw/src/gateway/server-methods/` plus descriptor/scope
  updates in `openclaw/src/gateway/methods/`.

**New Provider or Channel Plugin:**

- Implementation: `openclaw/extensions/{plugin-id}/`.
- Manifest: `openclaw/extensions/{plugin-id}/openclaw.plugin.json`.
- Tests: adjacent `*.test.ts` and contract tests if touching SDK/runtime
  boundaries.
- SDK exports only when needed through `openclaw/src/plugin-sdk/` or
  `openclaw/packages/plugin-sdk/`.

**New Control UI Feature:**

- Implementation: `openclaw/ui/src/ui/`.
- Styles: `openclaw/ui/src/styles/`.
- Tests: `openclaw/ui/src/**/*.test.ts`, `.node.test.ts`, `.browser.test.ts`,
  or `.e2e.test.ts` depending on behavior.
- Gateway interaction: use existing gateway helpers in `openclaw/ui/src/ui/gateway.ts`
  and related modules.

**New Cron Behavior:**

- Core scheduler/service changes: `openclaw/src/cron/`.
- Runtime isolated-agent changes: `openclaw/src/cron/isolated-agent/`.
- Operational job changes: `.openclaw/cron/jobs.json`, preferably through
  `openclaw cron edit` or the CLI so gateway state stays synchronized.

**UXNaut ClickUp/Client Workflow:**

- Skill logic: `.openclaw/workspace-uxnaut/skills/clickup-sync/`.
- Daily workflow: `.openclaw/workspace-uxnaut/skills/daily-rafael/`.
- Client ledgers: `.openclaw/workspace-uxnaut/operacional/retainer/{client}/`.
- Reports: `.openclaw/workspace-uxnaut/reports/ops/{date}/`.

**Paritech Workflow:**

- Task automation: `.openclaw/workspace-paritech/skills/paritech-tasks/`.
- Project ledgers: `.openclaw/workspace-paritech/projects/`.
- Profiles/memory: `.openclaw/workspace-paritech/profiles/`,
  `.openclaw/workspace-paritech/memory/`.

**GSD Project Planning:**

- Generated planning docs: `.planning/`.
- This codebase map: `.planning/codebase/`.
- Do not put product source in `.planning/`.

## Special Directories

**`openclaw/node_modules/`, `openclaw/dist/`, `openclaw/.artifacts/`:**

- Purpose: Dependencies/build/test artifacts.
- Source: Generated by install/build/test flows.
- Committed: Generally no; do not map or modify manually unless debugging
  generated packaging behavior.

**`.openclaw/credentials/`, `.openclaw/agents/`, `.openclaw/logs/`:**

- Purpose: Live secrets, sessions, auth, runtime logs.
- Source: OpenClaw runtime.
- Committed: No. Do not read/write unless the task is explicitly about runtime
  operations or debugging.

**`.openclaw/workspace-*/memory/soul-guardian/`:**

- Purpose: Soul-guardian baseline/audit runtime state.
- Source: Workspace skill/runtime.
- Committed: Sometimes modified by runtime. Avoid unrelated edits.

**Top-level report files (`ctech-*.md`, `retrilhar-*.md`, etc.):**

- Purpose: Ad hoc outputs created for the user.
- Source: Agent/report generation.
- Committed: Not unless copied into a repo-specific reports directory.

---

_Structure analysis: 2026-06-02_
_Update when directory structure changes_
