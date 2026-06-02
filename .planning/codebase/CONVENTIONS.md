# Coding Conventions

**Analysis Date:** 2026-06-02

## Scope

These conventions cover the dominant patterns in `openclaw/` plus practical
rules for the `.openclaw/workspace-*` operational workspaces.

## Naming Patterns

**Files:**

- Use descriptive lowercase/kebab/dot-separated TypeScript filenames in
  OpenClaw core:
  - `openclaw/src/gateway/server-methods/agent.ts`
  - `openclaw/src/cron/isolated-agent/run-executor.ts`
  - `openclaw/src/config/zod-schema.agent-runtime.ts`
- Use `*.test.ts` beside or near the code under test.
- Use suffixes to clarify test type or runtime boundary:
  - `*.runtime.ts`
  - `*.runtime.test.ts`
  - `*.contract.test.ts`
  - `*.e2e.test.ts`
  - `*.live.test.ts`
  - `*.browser.test.ts`
  - `*.node.test.ts`
- Use `openclaw.plugin.json` for extension manifests.
- Use `SKILL.md` for workspace/runtime skills.

**Functions:**

- Use `camelCase` for functions.
- Prefer action-oriented names:
  - `resolveConfiguredPluginAutoEnableCandidates`
  - `createGatewayMethodRegistry`
  - `runCronIsolatedAgentTurn`
  - `normalizeWebchatReplyMediaPathsForDisplay`
- Use `create*` for factories, `resolve*` for derived values, `normalize*` for
  coercion, `assert*` for validation that throws, and `is*`/`has*` for boolean
  guards.

**Variables:**

- Use `camelCase` for locals and params.
- Use `UPPER_SNAKE_CASE` for constants and env vars.
- Do not rely on private underscore naming; prefer module scope or explicit
  types.

**Types:**

- Use `PascalCase` for interfaces/types/classes.
- Type aliases and interfaces are both common.
- Use explicit exported types for public surfaces, especially plugin SDK and
  gateway method contracts.

## Code Style

**Formatting:**

- OpenClaw TypeScript formatting is controlled by `oxfmt`.
- Run root formatting through package scripts:
  - `pnpm format`
  - `pnpm format:check`
  - `pnpm format:diff`
- TypeScript config is strict. Keep new code compatible with
  `openclaw/tsconfig.json`:
  - `strict: true`
  - `noImplicitReturns: true`
  - `isolatedModules: true`
  - `verbatimModuleSyntax: true`
  - `moduleResolution: NodeNext`

**Linting:**

- Use `pnpm lint` or focused lint scripts from `openclaw/package.json`.
- Domain-specific guard scripts exist for plugin boundaries, channel access,
  runtime sidecar loaders, deprecated APIs, raw window opens, webhook body
  order, and more.
- Docs linting uses `openclaw/config/markdownlint-cli2.jsonc`.
- Swift style uses `openclaw/config/swiftlint.yml` and
  `openclaw/config/swiftformat`.

## Import Organization

**Order:**

1. Node built-ins, e.g. `node:fs`, `node:path`, `node:process`.
2. External packages, e.g. `zod`, `commander`, `ws`.
3. Internal modules via relative imports or configured aliases.
4. Type-only imports where appropriate using `import type`.

**Patterns:**

- TypeScript uses ESM and explicit `.js` suffixes in many imports because of
  NodeNext output conventions.
- Public plugin SDK imports should use approved subpaths. Avoid broad/deprecated
  plugin SDK barrels unless compatibility code explicitly requires them.
- Extension code must respect package/plugin boundaries. Guard scripts like
  `openclaw/scripts/check-no-monolithic-plugin-sdk-entry-imports.ts` and
  plugin contract tests enforce this.

**Path Aliases:**

- `openclaw/tsconfig.json` defines aliases including:
  - `openclaw/plugin-sdk`
  - `openclaw/plugin-sdk/*`
  - `@openclaw/plugin-sdk`
  - `@openclaw/*` to `extensions/*`
  - `@openclaw/sdk` to `packages/sdk/src/index.ts`

## Error Handling

**Patterns:**

- Validate at boundaries and fail fast with explicit messages.
- Use `assert*` helpers for unsafe inputs such as session ids and cron targets.
- Use structured gateway responses for RPC errors.
- Use `FailoverError`/classification for model/provider failures.
- Use safe path checks before writing/reading user-controlled files.

**When to Throw:**

- Invalid config, unsafe paths, invalid request params, missing required runtime
  state, duplicate registry entries, plugin contract violations.

**When to Return Structured Results:**

- Gateway handlers and runtime operations that need to report status to clients.
- Cron jobs and agent runs that need persisted status and failure delivery.

## Logging

**Framework:**

- Core subsystem logging is in `openclaw/src/logging/`.
- Use existing subsystem loggers rather than ad hoc logging in shared runtime
  code.
- CLI scripts may use stdout/stderr directly when they are command-line tools.

**Patterns:**

- Log context at boundaries: gateway request, plugin load, provider/model
  calls, cron run, channel delivery, auth/credential state.
- Avoid logging secrets. Use redaction utilities and safe snapshot helpers in
  `openclaw/src/config/redact-snapshot*.ts`.

## Comments

**When to Comment:**

- Comment why a guard exists, not what a line does.
- Use comments for historical compatibility constraints, security rationale,
  generated-file boundaries, and known regression context.
- Many tests intentionally document regression scenarios; follow that style for
  non-obvious fixes.

**TODO Comments:**

- TODO/FIXME/HACK comments are not the main backlog mechanism; the codebase has
  dedicated guardrails and issue-specific regression tests. Add a test or docs
  note when the concern is actionable.

## Function Design

**Size:**

- Prefer small helpers for normalization/validation.
- Some runtime orchestrators are large; when touching them, add focused helper
  extraction only if it reduces risk or matches existing patterns.

**Parameters:**

- Prefer object parameters for multi-field functions, especially exported
  helpers and runtime adapters.
- Preserve exact names in gateway/plugin contracts; downstream code depends on
  them.

**Return Values:**

- Use explicit result objects for operations with status/error detail.
- Use guard functions for type narrowing.
- Avoid implicit undefined in functions covered by `noImplicitReturns`.

## Module Design

**Exports:**

- Prefer named exports for helpers and runtime modules.
- Keep public SDK/root entrypoints small and compatibility-aware, e.g.
  `openclaw/src/plugin-sdk/index.ts`.
- Use dedicated subpaths for plugin SDK/provider/channel APIs.

**Barrel Files:**

- Allowed when they define public API surfaces.
- Avoid broad barrel imports in production plugin code when guardrails discourage
  them.

**Tests as Contracts:**

- If changing plugin SDK, gateway method, channel access, cron, or auth
  behavior, search for matching `*.contract.test.ts`, guardrail tests, and
  regression tests before editing.

## Workspace Markdown Conventions

**UXNaut Operational Ledgers:**

- Client tasks are stored in Markdown files under
  `.openclaw/workspace-uxnaut/operacional/retainer/{client}/`.
- Status files follow suffixes such as `*-backlog.md`, `*-fazendo.md`,
  `*-feito.md`, `*-impedido.md`.
- Daily logs live in `.openclaw/workspace-uxnaut/operacional/daily-log/rafael/`.
- ClickUp sync conventions are documented in
  `.openclaw/workspace-uxnaut/skills/clickup-sync/CONVENTIONS.md`.

**Paritech Operational Ledgers:**

- Project task files live under `.openclaw/workspace-paritech/projects/`.
- Skills and helper scripts live under `.openclaw/workspace-paritech/skills/`.

**Editing Rule:**

- Do not normalize unrelated Markdown formatting while making a targeted
  operational change. These files are source-of-truth ledgers and diffs should
  stay attributable.

## Practical Prescriptions

- For OpenClaw source edits, first check the nearest `AGENTS.md`; there are
  domain-specific files like `openclaw/src/gateway/AGENTS.md` and
  `openclaw/src/channels/AGENTS.md`.
- For runtime config edits in `.openclaw/cron/jobs.json`, prefer the OpenClaw
  CLI so the live gateway state and file state are synchronized.
- For ClickUp sync, use the workspace skill scripts/tooling and never expose
  `CLICKUP_TOKEN`.
- For generated docs/reports, place them in the relevant repo/workspace report
  directory before committing.

---

_Convention analysis: 2026-06-02_
_Update when patterns change_
