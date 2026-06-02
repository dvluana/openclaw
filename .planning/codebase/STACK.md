# Technology Stack

**Analysis Date:** 2026-06-02

## Scope

This map covers `/home/luana` as an operational VPS workspace, not a single
application repository. The technical codebase is mainly the OpenClaw monorepo
at `openclaw/`; runtime configuration and client-operation workspaces live in
`.openclaw/`, `.openclaw/workspace-uxnaut/`, and
`.openclaw/workspace-paritech/`.

## Languages

**Primary:**

- TypeScript - Core OpenClaw runtime, gateway, CLI, agents, plugin SDK, bundled
  extensions, UI, scripts, and tests under `openclaw/src/`, `openclaw/extensions/`,
  `openclaw/packages/`, `openclaw/ui/src/`, and `openclaw/scripts/`.
- Markdown - Operational source of truth for UXNaut/Paritech client workspaces,
  GSD docs, skills, daily logs, reports, and task ledgers.

**Secondary:**

- JavaScript / MJS - Package launcher and operational build scripts, including
  `openclaw/openclaw.mjs` and many files in `openclaw/scripts/`.
- Python 3 - Workspace automation and sync helpers, especially
  `.openclaw/workspace-uxnaut/skills/clickup-sync/*.py`,
  `.openclaw/workspace-paritech/skills/paritech-tasks/*.py`, and
  `skills/*/scripts/*.py`.
- Shell - Cron, release, Docker, install, and local automation scripts such as
  `openclaw/scripts/e2e/*.sh` and
  `.openclaw/workspace-paritech/scripts/motivacional-daily.sh`.
- Swift - macOS and iOS companion apps under `openclaw/apps/macos/`,
  `openclaw/apps/ios/`, `openclaw/apps/shared/`, and `openclaw/apps/swabble/`.
- Kotlin / Gradle - Android companion app under `openclaw/apps/android/`.

## Runtime

**Environment:**

- Node.js `>=22.19.0`; OpenClaw README recommends Node 24 for normal use.
- OpenClaw package version in this checkout: `2026.5.26` from
  `openclaw/package.json`.
- OpenClaw CLI currently installed globally on the VPS as Codex output showed
  `OpenAI Codex (v0.136.0)` and OpenClaw local CLI help showed
  `OpenClaw 2026.5.26`.

**Package Manager:**

- `pnpm@11.2.2` via `openclaw/package.json` `packageManager`.
- Workspace config: `openclaw/pnpm-workspace.yaml`.
- Lockfile: `openclaw/pnpm-lock.yaml` present.
- Hoisted node linker and dependency policy live in `openclaw/pnpm-workspace.yaml`.

## Frameworks

**Core OpenClaw Runtime:**

- Node.js ESM - `openclaw/package.json` uses `"type": "module"` and
  `openclaw/tsconfig.json` uses `module: NodeNext`.
- Commander `14.0.3` - CLI command parsing and command surfaces.
- Express `5.2.1` and `ws` `8.21.0` - Gateway HTTP and WebSocket surfaces.
- TypeBox `1.1.38` and Zod `4.4.3` - Runtime schemas and validation.
- Kysely `0.29.2` - SQL/query layer for state stores where present.
- `@earendil-works/pi-*` packages `0.75.5` - Embedded agent, model session, and
  TUI runtime foundation.
- `@modelcontextprotocol/sdk` `1.29.0` and `@agentclientprotocol/sdk` `0.22.1`
  - MCP/ACP integration surfaces.

**UI:**

- Vite `8.0.14` - Control UI bundling in `openclaw/ui/vite.config.ts`.
- Lit `3.3.3` - Web component UI implementation in `openclaw/ui/src/ui/`.
- `markdown-it`, `marked`, `highlight.js`, `dompurify`,
  `@create-markdown/preview` - Markdown rendering and sanitization stack.

**Mobile / Native Apps:**

- Swift Package Manager / XcodeGen for macOS/iOS (`openclaw/apps/macos/Package.swift`,
  `openclaw/apps/ios/project.yml`).
- Gradle Kotlin DSL for Android (`openclaw/apps/android/build.gradle.kts`,
  `openclaw/apps/android/settings.gradle.kts`).

**Testing:**

- Vitest `4.1.7` - Main TypeScript test framework.
- Playwright browser provider for UI browser tests via
  `openclaw/ui/vitest.config.ts`.
- SwiftLint/SwiftFormat for Swift app checks via `openclaw/config/swiftlint.yml`
  and `openclaw/config/swiftformat`.
- Gradle test/lint tasks for Android via package scripts in `openclaw/package.json`.

**Build/Dev:**

- TypeScript `6.0.3` with `strict: true`, `noImplicitReturns: true`,
  `isolatedModules: true`, `verbatimModuleSyntax: true`.
- `tsdown` `0.22.0` for TypeScript bundling (`openclaw/tsdown.config.ts`).
- `tsx` `4.22.3` and Node `--import tsx` for script execution.
- `oxlint` `1.66.0` and `oxfmt` `0.51.0` for TypeScript lint/format.
- Docker support via `openclaw/Dockerfile`, `openclaw/docker-compose.yml`, and
  many `openclaw/scripts/e2e/*docker*` scripts.

## Key Dependencies

**Critical:**

- `openai` `6.39.0` - OpenAI-compatible model runtime and providers.
- `@google/genai` `2.6.0` - Google model/provider integration.
- `grammy` `1.43.0` and `@grammyjs/runner` `2.0.3` - Telegram plugin/runtime.
- `playwright-core` `1.60.0` - Browser automation/tooling and tests.
- `croner` `10.0.1` - Cron scheduling support.
- `yaml` `2.9.0` and `json5` `2.2.3` - Config and plugin manifest parsing.
- `file-type`, `pdfjs-dist`, `qrcode`, `tar`, `jszip` - Media, document,
  packaging, QR, and archive support.

**Infrastructure:**

- `@openclaw/fs-safe` and `@openclaw/proxyline` - OpenClaw-specific filesystem
  safety and proxy support.
- `tokenjuice` - Token accounting/cost helpers.
- `chokidar` - File watching.
- `dotenv` - Environment loading.
- `undici` - HTTP client.
- `web-push` - Browser/device push integrations.

## Configuration

**OpenClaw Runtime Config:**

- Main config: `.openclaw/openclaw.json`.
- Template guidance: `.openclaw/README.md` explains that
  `.openclaw/openclaw.json` contains real secrets and must stay local.
- Runtime config currently defines agents `uxnaut` and `paritech`, a local
  gateway on port `18789`, WhatsApp bindings, Moonshot/Kimi model defaults,
  and tool policies.
- Do not read `.openclaw/credentials/`, `.openclaw/agents/`, or channel auth
  stores unless explicitly working on credential/debug tasks.

**OpenClaw Build Config:**

- Root package: `openclaw/package.json`.
- Monorepo workspace: `openclaw/pnpm-workspace.yaml`.
- TypeScript root config: `openclaw/tsconfig.json`.
- UI config: `openclaw/ui/package.json`, `openclaw/ui/vite.config.ts`,
  `openclaw/ui/vitest.config.ts`.
- Test configs: `openclaw/vitest.config.ts`, `openclaw/test/vitest/*.ts`.
- Formatting/lint configs: `openclaw/config/markdownlint-cli2.jsonc`,
  `openclaw/config/swiftlint.yml`, `openclaw/config/swiftformat`,
  `openclaw/config/tsconfig/oxlint*.json`.

**Workspace Automation Config:**

- UXNaut ClickUp sync config: `.openclaw/workspace-uxnaut/skills/clickup-sync/config.json`.
- UXNaut daily workflow config: `.openclaw/workspace-uxnaut/skills/daily-rafael/config.json`.
- Paritech task sync config: `.openclaw/workspace-paritech/skills/paritech-tasks/config.json`.
- Cron jobs: `.openclaw/cron/jobs.json`.

## Platform Requirements

**Development:**

- Node.js 22.19+ or Node 24.
- pnpm 11.2.2.
- Python 3 for workspace sync/test helpers.
- Docker for OpenClaw sandbox/e2e lanes.
- Swift/Xcode tooling for macOS/iOS app work.
- Android SDK/Gradle for Android app work.

**Production / VPS Runtime:**

- Ubuntu 24.04.4 LTS on the current VPS.
- OpenClaw gateway managed locally, with WhatsApp and cron automation.
- Tailscale is installed and the VPS tailnet IP observed earlier was
  `100.81.135.83`.
- OpenClaw gateway config binds loopback by default; remote access is normally
  mediated by SSH/Tailscale or explicit gateway config changes.

## Practical Stack Rules

- For OpenClaw source changes, work inside `openclaw/`, not `/home/luana` root.
- For UXNaut operational/task changes, work inside `.openclaw/workspace-uxnaut/`.
- For Paritech operational/task changes, work inside `.openclaw/workspace-paritech/`.
- Do not introduce new package managers; keep `pnpm` for OpenClaw and Python
  stdlib/simple scripts for workspace skills unless a task explicitly changes that.
- Do not add secrets to `.planning/codebase/`; mention env var names and paths
  only, never values.

---

_Stack analysis: 2026-06-02_
_Update after major dependency, runtime, or workspace-scope changes_
