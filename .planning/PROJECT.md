# OpenClaw VPS Workspace

## What This Is

This is an existing VPS workspace centered on the OpenClaw codebase and its local runtime configuration. It includes the main OpenClaw monorepo, the `.openclaw` runtime/config repository, and operational workspaces for UXNaut and Paritech.

The project is already running in production-like local use. GSD is initialized here to make future maintenance, audits, cron fixes, ClickUp sync work, and workspace changes easier to plan, verify, and resume across sessions.

## Core Value

Keep the OpenClaw VPS runtime and client-operation workspaces reliable, traceable, and safe to change without losing context or breaking scheduled automations.

## Requirements

### Validated

- [x] OpenClaw CLI and gateway codebase exists and is locally inspectable under `openclaw/`.
- [x] Local OpenClaw runtime/config exists under `.openclaw/`.
- [x] UXNaut and Paritech operational workspaces exist under `.openclaw/workspace-uxnaut/` and `.openclaw/workspace-paritech/`.
- [x] Codebase map exists under `.planning/codebase/`.
- [x] Existing repos and dirty worktrees are treated as user/runtime state and are not reset by default.

### Active

- [ ] Keep `.planning/` as the local GSD planning surface for this VPS workspace.
- [ ] Use the generated codebase map before planning changes to OpenClaw, cron jobs, ClickUp sync, or workspace skills.
- [ ] Preserve runtime credentials and private config values; document paths and behavior, not secret contents.
- [ ] Keep future changes scoped to the correct repository or workspace.
- [ ] Verify changes with focused tests or operational checks before reporting completion.

### Out of Scope

- Re-initializing Git in `/home/luana` — the home directory contains multiple repos and runtime state; a root repo should only be created after explicit approval.
- Moving or reorganizing the existing OpenClaw/workspace directories — this initialization is documentation and workflow setup only.
- Publishing `.openclaw/openclaw.json` or credential contents — private runtime configuration stays local.
- Defining a new product feature roadmap without a specific user goal — future phases should be opened only when there is a concrete maintenance or feature objective.

## Context

The workspace is not a single repository. It is a VPS home directory with several important code and runtime areas:

- `openclaw/` is the main TypeScript/Node monorepo for the OpenClaw product.
- `.openclaw/` is a local runtime/config slice with cron jobs, agents, credentials, logs, sessions, and workspace pointers.
- `.openclaw/workspace-uxnaut/` contains operational markdown, ClickUp sync skills, daily logs, client retainers, and reports.
- `.openclaw/workspace-paritech/` contains Paritech operational skills and runtime memory.
- `.planning/codebase/` now contains the detailed codebase map produced during initialization.

Recent operational work in this environment included ClickUp/CTECH task sync, CTECH/Retrilhar historical reports, and a cron compatibility fix around Moonshot Kimi model selection. Those are treated as existing context, not as the scope of this initialization.

## Constraints

- **Repository boundaries**: `/home/luana` is not a Git repo; `openclaw/`, `.openclaw/`, and workspace directories have separate Git state.
- **Runtime safety**: Never reset or clean dirty worktrees unless explicitly asked.
- **Credentials**: Do not read, quote, or publish secret values from `.openclaw/credentials/` or `.openclaw/openclaw.json`.
- **External services**: ClickUp, WhatsApp, model providers, and cron delivery can have side effects; use read-only checks first and scoped writes second.
- **Tooling**: Prefer existing local scripts, skills, and tests before inventing new workflows.
- **Documentation**: Keep `.planning/` useful as a compact operating map, not a duplicate of the whole codebase.

## Key Decisions

| Decision                                                                  | Rationale                                                                        | Outcome |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| Initialize GSD at `/home/luana` without creating a root Git repo          | The home directory is a multi-repo runtime workspace, not one project repository | Pending |
| Treat `openclaw/` as the main codebase and `.openclaw/` as runtime/config | This matches the observed structure and existing operational use                 | Pending |
| Generate `.planning/codebase/` before creating project docs               | Brownfield GSD setup should understand existing code before planning new work    | Good    |
| Keep initialization conservative and maintenance-oriented                 | User said the project is already ready and only needed GSD initialized           | Pending |

## Evolution

After each future phase:

1. Move shipped and verified requirements from Active to Validated.
2. Add newly discovered operational constraints to Constraints.
3. Log decisions that affect repository boundaries, cron behavior, external integrations, or credentials handling.
4. Keep the "What This Is" section aligned with the actual workspace.

After each milestone:

1. Review whether `.planning/codebase/` is still accurate.
2. Refresh dirty-state and integration concerns if they changed.
3. Archive completed phase artifacts and prepare the next concrete maintenance or feature milestone.

---

_Last updated: 2026-06-02 after GSD initialization for the existing VPS workspace_
