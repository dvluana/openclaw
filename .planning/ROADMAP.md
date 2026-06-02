# Roadmap: OpenClaw VPS Workspace

## Overview

This roadmap is intentionally conservative because the project already exists and is operational. The first milestone establishes GSD as a safe planning layer over the existing VPS workspace; future phases should be opened around concrete maintenance, audit, cron, ClickUp, or OpenClaw feature work.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work.
- Decimal phases (2.1, 2.2): Urgent insertions between phases, marked as INSERTED.

- [x] **Phase 1: Initialization Baseline** - Create the GSD planning surface and detailed codebase map.
- [ ] **Phase 2: Operational Safety Pass** - Review repo boundaries, dirty state, cron/runtime safety, and verification commands before future work.
- [ ] **Phase 3: Client Operations Readiness** - Confirm ClickUp/workspace reporting conventions and reusable checks for UXNaut/Paritech operations.

## Phase Details

### Phase 1: Initialization Baseline

**Goal**: Make the existing VPS workspace legible to GSD without changing product/runtime behavior.
**Depends on**: Nothing (first phase)
**Requirements**: [BASE-01, BASE-02, BASE-03, BASE-04, BASE-05]
**Success Criteria** (what must be TRUE):

1. `.planning/codebase/` contains the seven standard codebase map documents.
2. `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` exist.
3. Generated planning docs do not expose obvious secret/token patterns.
4. Initialization does not create a Git repo in `/home/luana`.
   **Plans**: 1 plan

Plans:

- [x] 01-01: Map the existing codebase and initialize GSD project docs.

### Phase 2: Operational Safety Pass

**Goal**: Make future maintenance changes safer by recording repo boundaries, dirty worktree handling, cron conventions, and verification commands.
**Depends on**: Phase 1
**Requirements**: [SAFE-01, SAFE-02, SAFE-03, SAFE-04, RUN-01, RUN-02, RUN-03, RUN-04]
**Success Criteria** (what must be TRUE):

1. Future work can identify which repo owns each relevant file path.
2. Dirty worktree state is documented before edits and not reverted accidentally.
3. Cron/job changes use the active scheduler state, not only static JSON edits.
4. Runtime-side-effect cleanup is part of verification.
   **Plans**: TBD

Plans:

- [ ] 02-01: Audit repo boundaries and runtime dirty-state conventions.
- [ ] 02-02: Document cron/job edit and verification routine.

### Phase 3: Client Operations Readiness

**Goal**: Make future UXNaut/Paritech client-operation work easier to validate and report.
**Depends on**: Phase 2
**Requirements**: [OPS-01, OPS-02, OPS-03, OPS-04]
**Success Criteria** (what must be TRUE):

1. ClickUp sync work has an explicit focused-test and drift-check routine.
2. Client report output locations are clear.
3. Daily-log and retainer markdown conventions are documented for future agents.
4. Final reports can separate local files, committed files, and external-service changes.
   **Plans**: TBD

Plans:

- [ ] 03-01: Document ClickUp/workspace validation routines.
- [ ] 03-02: Document report storage and final-answer conventions.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase                          | Plans Complete | Status      | Completed  |
| ------------------------------ | -------------- | ----------- | ---------- |
| 1. Initialization Baseline     | 1/1            | Complete    | 2026-06-02 |
| 2. Operational Safety Pass     | 0/2            | Not started | -          |
| 3. Client Operations Readiness | 0/2            | Not started | -          |

## Backlog

### Backlog Item 999.1: Automation Hardening

**Goal:** Improve recurring job diagnostics and VPS-level health checks after the baseline is stable.
**Source:** v2 requirements
**Plans:**

- [ ] AUTO-01: Add or update automated checks for recurring cron job failures.
- [ ] AUTO-02: Expose provider error bodies in alerts where safe.
- [ ] AUTO-03: Add a repeatable health command for the VPS workspace.

### Backlog Item 999.2: Operator Runbook

**Goal:** Keep a concise runbook for repeated VPS operations.
**Source:** v2 requirements
**Plans:**

- [ ] DOCS-01: Refresh codebase map after major OpenClaw upgrades.
- [ ] DOCS-02: Add runbook entries for Tailscale copy, cron checks, and ClickUp drift checks.
