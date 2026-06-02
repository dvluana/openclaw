# Testing Patterns

**Analysis Date:** 2026-06-02

## Test Framework

**Runner:**

- Vitest `4.1.7` for OpenClaw TypeScript tests.
- Root config: `openclaw/vitest.config.ts`, which re-exports
  `openclaw/test/vitest/vitest.config.ts`.
- Focused configs live under `openclaw/test/vitest/`.
- UI tests use `openclaw/ui/vitest.config.ts` with unit, node, and browser
  projects.

**Assertion Library:**

- Vitest built-in `expect`, `vi`, `describe`, `it`.
- Tests frequently use `vi.mock`, `vi.hoisted`, `vi.stubEnv`, and explicit mock
  helpers.

**Run Commands:**

```bash
cd openclaw
pnpm test:fast                         # Fast unit suite
pnpm test:unit                         # Unit suite
pnpm test:gateway                      # Gateway-focused suite
pnpm test:ui                           # UI tests plus UI i18n/raw-window guard
pnpm test:extensions                   # Extension package tests
pnpm test:e2e                          # Gateway and UI e2e lanes
pnpm check                             # Broad check pipeline
pnpm tsgo                              # Core TypeScript check
pnpm lint                              # Root lint
```

**Workspace Skill Tests:**

```bash
cd .openclaw/workspace-uxnaut
pytest -q skills/clickup-sync/tests/test_lookup.py

cd .openclaw/workspace-paritech
pytest -q skills/paritech-tasks/tests
```

## Test File Organization

**Location:**

- OpenClaw source-adjacent tests: `openclaw/src/**/*.test.ts`.
- Extension tests: `openclaw/extensions/**/*.test.ts`.
- UI tests: `openclaw/ui/src/**/*.test.ts`,
  `openclaw/ui/src/**/*.node.test.ts`, `openclaw/ui/src/**/*.browser.test.ts`.
- Script tests: `openclaw/test/scripts/*.test.ts`.
- Workspace Python tests:
  - `.openclaw/workspace-uxnaut/skills/clickup-sync/tests/`
  - `.openclaw/workspace-paritech/skills/paritech-tasks/tests/`

**Naming:**

- Unit/regression tests: `*.test.ts`.
- Runtime boundary tests: `*.runtime.test.ts`.
- Contract tests: `*.contract.test.ts`.
- Live tests: `*.live.test.ts`.
- E2E tests: `*.e2e.test.ts`.
- Browser tests: `*.browser.test.ts`.
- Node-specific UI tests: `*.node.test.ts`.

**Structure Example:**

```text
openclaw/src/cron/
|-- service.ts
|-- service.jobs.test.ts
|-- service.issue-regressions.test.ts
|-- isolated-agent/
|   |-- run.ts
|   |-- run.tools-allow.test.ts
|   `-- model-selection.ts

openclaw/ui/src/ui/
|-- app.ts
|-- app-chat.test.ts
|-- gateway.node.test.ts
`-- navigation.browser.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
describe("domain behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles the specific regression or success case", async () => {
    const result = await runSubjectUnderTest();
    expect(result).toEqual(expected);
  });
});
```

**Patterns:**

- Regression tests are specific and often mention production hot paths or issue
  scenarios in comments.
- Gateway tests commonly build harnesses and call handlers with fake request
  objects.
- Cron tests use fixture factories such as `makeCronJob` and service harnesses.
- Config tests validate both accepted and rejected config shapes.
- Plugin contract tests enforce public SDK/API boundaries.

## Mocking

**Framework:**

- Vitest `vi.mock`, `vi.hoisted`, `vi.fn`, `vi.stubEnv`.
- UI tests use `jsdom` and browser Playwright provider depending on project.

**Patterns:**

```typescript
const dependencyMock = vi.hoisted(() => vi.fn());

vi.mock("../some-runtime.js", () => ({
  someRuntimeFunction: dependencyMock,
}));

beforeEach(() => {
  dependencyMock.mockReset();
});
```

**What to Mock:**

- External provider calls.
- Gateway network calls when testing CLI/client behavior.
- Filesystem/runtime stores when the behavior is not about real persistence.
- Time/env for config and cron behavior.

**What NOT to Mock:**

- Pure helpers and validators.
- Registry/schema code when a contract test is meant to protect actual
  generated/loaded behavior.
- Internal business logic that the test claims to verify.

## Fixtures and Factories

**Common Locations:**

- `openclaw/test/fixtures/` for tar, hooks, and script fixtures.
- `openclaw/src/**/test-helpers.ts` and `*.test-helpers.ts` for local harnesses.
- `openclaw/src/gateway/server/__tests__/test-utils.ts`.
- `openclaw/src/cron/delivery.test-helpers.ts`.
- `openclaw/src/agents/*test-support.ts`.
- Workspace pytest fixtures in `tests/conftest.py`.

**Pattern:**

- Keep helpers near the subsystem they support.
- Use factory helpers for domain objects rather than duplicating large literals
  in every test.
- Prefer explicit fixture data over hidden global state.

## Coverage

**Requirements:**

- No single universal coverage target was detected in the scan.
- Unit coverage includes source-adjacent behavior and root scripts.
- Many high-risk areas are protected by contract/regression tests rather than a
  blanket line coverage target.

**Configuration:**

- Coverage behavior is configured in `openclaw/test/vitest/vitest.unit.config.ts`.
- The unit config can infer default coverage include patterns from sibling
  source files for `*.test.ts` tests.

**View Coverage:**

```bash
cd openclaw
node scripts/run-vitest.mjs run --config test/vitest/vitest.unit.config.ts --coverage
```

## Test Types

**Unit Tests:**

- Scope: Single module/helper behavior.
- Location: near source files.
- Examples:
  - `openclaw/src/utils/*.test.ts`
  - `openclaw/src/config/*.test.ts`
  - `openclaw/src/tts/*.test.ts`

**Gateway Tests:**

- Scope: RPC handlers, WS connection, auth, control UI HTTP, server behavior.
- Location: `openclaw/src/gateway/**/*.test.ts`.
- Command: `pnpm test:gateway`.

**Contract Tests:**

- Scope: Plugin SDK, provider/channel contracts, public surfaces.
- Location: `openclaw/src/plugins/contracts/*.test.ts` and extension-specific
  contract tests.
- Use these before changing plugin APIs.

**E2E / Live Tests:**

- Scope: Docker, gateway, CLI backends, channels, plugins, live model/provider
  behavior.
- Location: `openclaw/scripts/e2e/`, `openclaw/test/scripts/`,
  `openclaw/src/gateway/*.live.test.ts`, extension live tests.
- Many require env vars or Docker and should not be run casually.

**UI Tests:**

- Unit/jsdom/browser projects in `openclaw/ui/vitest.config.ts`.
- Browser tests use Playwright Chromium headless.

**Native App Tests:**

- iOS Swift tests under `openclaw/apps/ios/Tests/`.
- Android tests via Gradle commands in `openclaw/package.json`.
- macOS/iOS Swift lint/format via SwiftLint/SwiftFormat configs.

**Workspace Python Tests:**

- UXNaut ClickUp parser/sync tests under
  `.openclaw/workspace-uxnaut/skills/clickup-sync/tests/`.
- Paritech task helper tests under
  `.openclaw/workspace-paritech/skills/paritech-tasks/tests/`.

## Common Patterns

**Async Testing:**

```typescript
it("resolves expected async state", async () => {
  const result = await runAsyncCase();
  expect(result.status).toBe("ok");
});
```

**Error Testing:**

```typescript
expect(() => runInvalidCase()).toThrow("expected message");
await expect(runAsyncInvalidCase()).rejects.toThrow("expected message");
```

**Environment Testing:**

```typescript
vi.stubEnv("OPENCLAW_SOME_FLAG", "1");
```

**Gateway Handler Testing:**

- Build a request/response harness.
- Call the method handler directly.
- Assert response payload, side effects, and broadcast events.

**Cron Testing:**

- Use a temporary store path.
- Create a `CronService` harness.
- Run `cron.start()`, `cron.run(id, "force" | "due")`, then `cron.stop()`.
- Assert active-job markers, run logs, delivery, and persisted status.

## Running the Right Check

**Small OpenClaw TS change:**

```bash
cd openclaw
pnpm test:fast
pnpm tsgo
```

**Gateway change:**

```bash
cd openclaw
pnpm test:gateway
```

**UI change:**

```bash
cd openclaw
pnpm test:ui
pnpm ui:build
```

**Plugin/provider/channel change:**

```bash
cd openclaw
pnpm test:extensions
pnpm lint:extensions
```

**UXNaut ClickUp sync change:**

```bash
cd .openclaw/workspace-uxnaut
pytest -q skills/clickup-sync/tests
```

**Paritech task helper change:**

```bash
cd .openclaw/workspace-paritech
pytest -q skills/paritech-tasks/tests
```

## Snapshot Testing

- Snapshot-style prompt generation exists in scripts like
  `openclaw/scripts/generate-prompt-snapshots.ts`.
- Treat snapshots as contracts. Regenerate intentionally and inspect diffs.

---

_Testing analysis: 2026-06-02_
_Update when test patterns change_
