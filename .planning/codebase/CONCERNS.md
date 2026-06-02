# Codebase Concerns

**Analysis Date:** 2026-06-02

## Scope Caveat

`/home/luana` is not a single clean repo. It contains the OpenClaw source repo,
local OpenClaw runtime/config state, two active workspace repos, ad hoc reports,
archives, credentials, logs, and installed AI runtime config. Treat this map as
a workspace map. For implementation work, choose the relevant nested repo first.

## Tech Debt

**Home directory as project root:**

- Issue: GSD was invoked from `/home/luana`, which is not currently a Git repo
  and contains multiple independent repos plus sensitive runtime folders.
- Files/dirs: `/home/luana`, `openclaw/`, `.openclaw/`,
  `.openclaw/workspace-uxnaut/`, `.openclaw/workspace-paritech/`.
- Impact: A naive `git init` or broad `git add` in `/home/luana` could expose
  huge archives, reports, or sensitive runtime files.
- Fix approach: For real project initialization, create/use a dedicated project
  directory or explicitly initialize GSD inside the intended nested repo.

**Runtime config and source code are adjacent:**

- Issue: `.openclaw/` stores both Git-tracked local config and sensitive runtime
  state.
- Files/dirs: `.openclaw/openclaw.json`, `.openclaw/credentials/`,
  `.openclaw/agents/`, `.openclaw/logs/`, `.openclaw/cron/jobs.json`.
- Impact: Easy to accidentally read or document secrets, or commit runtime
  artifacts.
- Fix approach: Respect `.openclaw/README.md` allowlist model. Commit only
  explicitly intended files and never include credentials/session/log folders.

**Large OpenClaw orchestrator modules:**

- Issue: Several core runtime files are thousands of lines, which increases
  local reasoning cost and regression risk.
- Examples:
  - `openclaw/src/gateway/server-methods/chat.ts` around 3.7k lines.
  - `openclaw/src/agents/openai-transport-stream.ts` around 3.7k lines.
  - `openclaw/src/agents/pi-embedded-runner/run/attempt.ts` around 5.4k lines.
  - `openclaw/src/plugins/loader.ts` around 3k lines.
  - `openclaw/ui/src/ui/app-render.ts` around 3k lines.
- Impact: Small changes can have broad side effects; tests are essential.
- Fix approach: Make minimal changes, add focused regression tests, and extract
  helpers only when directly reducing risk.

**Plugin compatibility/deprecation surface is broad:**

- Issue: Many deprecated plugin SDK and channel access compatibility paths are
  still tracked by contracts and guard scripts.
- Files: `openclaw/src/plugins/compat/registry.ts`,
  `openclaw/src/plugins/types.ts`, `openclaw/src/plugins/contracts/*.test.ts`,
  `openclaw/scripts/check-no-deprecated-channel-access.ts`.
- Impact: New extension work can accidentally use deprecated compatibility
  surfaces.
- Fix approach: Use current plugin SDK subpaths and run plugin contract/guard
  tests after SDK or extension changes.

**Workspace operational Markdown doubles as application state:**

- Issue: UXNaut and Paritech workspaces use Markdown ledgers as source of truth
  for client work, while ClickUp/API state may diverge.
- Files: `.openclaw/workspace-uxnaut/operacional/retainer/*/*.md`,
  `.openclaw/workspace-uxnaut/skills/clickup-sync/`,
  `.openclaw/workspace-paritech/projects/*.md`.
- Impact: Text edits can break sync parsers or audit assumptions.
- Fix approach: Preserve existing heading/status/checklist formats; run focused
  sync/parser tests and drift checks after edits.

## Known Bugs / Current Dirty State

**Dirty working trees exist before this map:**

- `.openclaw/` has `cron/jobs.json` modified.
- `.openclaw/workspace-uxnaut/` has pending changes including
  `memory/soul-guardian/audit.jsonl`, CTECH files, a daily log, reports, and a
  temporary `.openclaw/` directory.
- `.openclaw/workspace-paritech/` has `memory/soul-guardian/audit.jsonl`
  modified.
- Impact: Commits should be scoped carefully and must not sweep unrelated user
  or runtime changes.
- Fix approach: Check `git status --short` in the specific repo before every
  commit. Add only intended paths.

**Cron list still showed unrelated job errors after model compatibility fix:**

- Prior investigation showed `clickup-sync-health` and `daily-rafael-weekly`
  had separate errors, not the Kimi temperature/model issue.
- Files: `.openclaw/cron/jobs.json`, `.openclaw/cron/runs/*.jsonl`,
  `.openclaw/workspace-uxnaut/skills/clickup-sync/`.
- Impact: Future cron debugging must not conflate model-provider errors with
  ClickUp/workflow-specific errors.
- Fix approach: Inspect run JSONL and session JSONL before changing models or
  prompts.

## Security Considerations

**Real secrets in local config/runtime:**

- Risk: `.openclaw/openclaw.json` and credential folders can contain real
  tokens.
- Current mitigation: `.openclaw/README.md` documents an aggressive allowlist
  and local-only policy.
- Recommendations: Do not publish `.openclaw/openclaw.json`. Use redacted
  templates for remote sharing. Run secret scan on generated docs before commit.

**ClickUp token handling:**

- Risk: ClickUp helpers read `CLICKUP_TOKEN` or
  `/home/luana/.openclaw/credentials/clickup/env`.
- Files: `.openclaw/workspace-uxnaut/skills/clickup-sync/lib.md`,
  `.openclaw/workspace-uxnaut/skills/clickup-sync/_lib.py`.
- Current mitigation: Helpers reference token source; docs should mention only
  env var/path.
- Recommendations: Never log token values. Avoid copying helper output that
  includes Authorization headers.

**Gateway/channel exposure:**

- Risk: OpenClaw connects to real messaging channels; inbound DMs/groups are
  untrusted input.
- Files: `.openclaw/openclaw.json`, `openclaw/src/channels/message-access/`,
  `openclaw/src/gateway/auth*.ts`, `openclaw/src/gateway/operator-scopes.ts`.
- Current mitigation: Gateway is loopback/local in config and channel access
  policies/pairing exist.
- Recommendations: Before exposing remotely, review gateway security docs and
  keep allowlists/pairing strict.

**Tool/exec policy:**

- Risk: Agents can execute host commands depending on config.
- Files: `.openclaw/openclaw.json`, `openclaw/src/agents/bash-tools.*`,
  `openclaw/src/tools/`.
- Current mitigation: Global and per-agent tool policies use allowlists and
  approval-on-miss patterns.
- Recommendations: Avoid broadening exec/tool allowlists without a focused
  security reason and tests.

**Generated planning docs can leak sensitive paths/content:**

- Risk: Codebase maps may mention sensitive credential paths or accidentally
  include values.
- Current mitigation: This map mentions paths/env names only.
- Recommendations: Always run secret-pattern detection on `.planning/codebase/*.md`
  before commit.

## Performance Bottlenecks

**Large test corpus:**

- Problem: OpenClaw has hundreds of thousands of test/source lines and many
  test shards.
- Measurement from local scan: TS/JS line totals are very large; several tests
  exceed 5k lines.
- Cause: Broad product surface: gateway, plugins, channels, agents, UI,
  native apps, live/e2e lanes.
- Improvement path: Run targeted tests first, then broader suites when touching
  shared contracts.

**Gateway/control UI and plugin surfaces are broad:**

- Problem: Gateway and plugin changes can require many tests and contracts.
- Cause: Many external channels/providers share core abstractions.
- Improvement path: Identify exact domain and run focused config/gateway/plugin
  suites before full checks.

## Fragile Areas

**Cron isolated agent execution:**

- Why fragile: Job payload model/tool/message/delivery config interacts with
  live gateway state, agent workspaces, model provider quirks, and failure
  notification.
- Files: `.openclaw/cron/jobs.json`,
  `openclaw/src/cron/isolated-agent/`,
  `openclaw/src/cron/service/`.
- Common failures: Provider parameter rejection, stale gateway state after
  direct JSON edits, wrong skill selection, tool allowlist mismatch.
- Safe modification: Prefer `openclaw cron edit`; test with
  `openclaw cron run <id> --wait`; inspect run/session JSONL.
- Test coverage: Good regression coverage in `openclaw/src/cron/**/*.test.ts`,
  but live runtime validation is still needed for local jobs.

**Gateway server methods:**

- Why fragile: Large shared handler surface with method scopes, auth, sessions,
  tool events, and broadcasts.
- Files: `openclaw/src/gateway/server-methods/`.
- Common failures: Auth/scope mismatch, broadcast omissions, hidden session
  state changes.
- Safe modification: Add/update handler-specific tests and method-scope tests.

**Plugin SDK and bundled extensions:**

- Why fragile: Public API stability and many bundled plugins depend on shared
  contracts.
- Files: `openclaw/src/plugin-sdk/`, `openclaw/packages/plugin-sdk/`,
  `openclaw/src/plugins/contracts/`, `openclaw/extensions/*/`.
- Common failures: Importing deprecated/broad SDK paths, missing manifest
  metadata, runtime-only API used during registration.
- Safe modification: Run plugin contract/guardrail tests and respect package
  boundaries.

**UXNaut ClickUp sync:**

- Why fragile: Markdown parser, ClickUp statuses, tags, checklists, and client
  mappings are tightly coupled.
- Files: `.openclaw/workspace-uxnaut/skills/clickup-sync/`,
  `.openclaw/workspace-uxnaut/operacional/retainer/`.
- Common failures: Module names with `/`, duplicate/empty checklists, status
  mapping mismatch, drift between Markdown and ClickUp.
- Safe modification: Run parser tests and direct drift checks for the client.

**Runtime credential/config files:**

- Why fragile: Real config drives the live VPS automation.
- Files: `.openclaw/openclaw.json`, `.openclaw/cron/jobs.json`.
- Common failures: Editing file without updating gateway active state, exposing
  secrets, invalid model/provider references.
- Safe modification: Use OpenClaw CLI commands and validate with `jq`, `openclaw
doctor`, `openclaw cron list`, and targeted manual runs.

## Scaling Limits

**Workspace root size:**

- Current capacity: `/home/luana` contains large archives and multiple repos.
- Limit: Broad scans are noisy and can hit huge generated/runtime areas.
- Symptoms: Slow mapping, accidental inclusion of generated/sensitive folders.
- Scaling path: Run GSD inside a dedicated project repo or use scoped mapping
  with `--paths`.

**OpenClaw extension count:**

- Current capacity: Many extensions under `openclaw/extensions/`.
- Limit: Cross-extension test and build lanes are expensive.
- Symptoms: Broad `pnpm check` or full e2e lanes take substantial time.
- Scaling path: Use changed-lane scripts and targeted extension tests before
  release checks.

## Dependencies at Risk

**Node version floor:**

- Risk: OpenClaw requires Node `>=22.19.0`; older Node exits at launcher.
- Impact: CLI/gateway fails before reaching app code.
- Migration plan: Use Node 24 where possible; launcher already prints nvm
  guidance.

**Deprecated plugin compatibility APIs:**

- Risk: Deprecated surfaces are intentionally tracked for removal.
- Impact: New code written against compatibility paths may fail future guard
  checks.
- Migration plan: Use current plugin SDK subpaths and runtime APIs.

**Local model/provider behavior:**

- Risk: Provider defaults can reject parameter combinations, as seen with
  Moonshot/Kimi temperature behavior.
- Impact: Cron/agent jobs fail before skill logic runs.
- Migration plan: Pin known-compatible models or add model-specific params in
  config when needed; verify with manual job runs.

## Missing Critical Features / Operational Gaps

**Dedicated GSD project root not chosen yet:**

- Problem: `.planning/codebase/` was created in `/home/luana`, but project
  initialization still needs a clear project identity and root.
- Current workaround: This map documents the whole operational workspace.
- Blocks: Clean `PROJECT.md`, `REQUIREMENTS.md`, and `ROADMAP.md` for a single
  product unless the user intends `/home/luana` as the project.
- Implementation complexity: Low. Create a dedicated directory or re-run
  `$gsd-new-project` from the desired repo/root.

**No root `/home/luana` git repo:**

- Problem: GSD commit step cannot safely commit `.planning/codebase/*.md` at
  the home root without initializing a broad home repo.
- Current workaround: Files are generated locally.
- Blocks: Atomic GSD commit for this map at `/home/luana`.
- Implementation complexity: Low if user chooses a repo/root; risky if done in
  home without exclusions.

## Test Coverage Gaps

**This map is documentation-only:**

- What's not tested: The codebase map itself beyond existence, line count, and
  secret-pattern scan.
- Risk: Some architectural details may drift as OpenClaw changes.
- Priority: Medium.
- Difficulty to test: Low; re-run `$gsd-map-codebase` after major changes.

**Operational ClickUp live behavior:**

- What's not tested here: Live ClickUp API drift/health during this mapping run.
- Risk: Workspace docs can be stale relative to ClickUp.
- Priority: Medium for UXNaut operations.
- Difficulty to test: Medium; requires token/API and client-specific drift
  checks.

---

_Concerns audit: 2026-06-02_
_Update as issues are fixed or new ones are found_
