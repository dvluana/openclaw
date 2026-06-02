---
status: resolved
trigger: "Cron daily-rafael-eod failed at 17:30 with show ~/.openclaw/... tool failure"
created: 2026-06-02
updated: 2026-06-02
---

# Debug Session: Daily Rafael EOD Exec/Show Failure

## Symptom

At 2026-06-02 17:30 America/Sao_Paulo, cron job `daily-rafael-eod` failed with:

`show ~/.openclaw/workspace-uxnaut/operacional/daily-log/rafael/2026-06-02.md (agent) failed`

The job did not deliver the expected EOD prompt to the UXN Design WhatsApp group.

## Evidence

- Cron job id: `dc9299c2-4803-47c0-9095-eb16cda5aedc`
- Cron run file: `/home/luana/.openclaw/cron/runs/dc9299c2-4803-47c0-9095-eb16cda5aedc.jsonl`
- Session id: `a2779a87-955d-4422-9e79-9de41009af81`
- Trajectory: `/home/luana/.openclaw/agents/uxnaut/sessions/a2779a87-955d-4422-9e79-9de41009af81.trajectory.jsonl`

The model produced a valid final message:

`fim do dia rafa, como foi hoje? me conta o que fechou e se ficou algo pra amanhã.`

But the run also recorded a failed tool call:

- tool: `exec`
- meta: `show ~/.openclaw/workspace-uxnaut/operacional/daily-log/rafael/2026-06-02.md (agent)`
- error: `exec denied: Cron runs cannot wait for interactive exec approval.`

Because cron treats tool failures as job failures, the valid final text was not announced.

## Working Hypothesis

The job prompt allowed only by instruction, not by tool policy. In cron isolated mode, the model can still attempt `exec` for a harmless-looking read command such as `show`, and that approval path cannot work without an interactive user.

Fix should be mechanical:

- add `toolsAllow` to non-shell crons;
- keep deterministic shell crons explicitly limited to `exec`;
- deny `exec`/`process` in WhatsApp group contexts where shell access is not intended.

## Fix

Updated `/home/luana/.openclaw/cron/jobs.json` through `openclaw cron edit --tools` so the active gateway state and the stored config match:

- `daily-rafael-morning`: `read`, `edit`, `write`, `uxn_clickup`
- `daily-rafael-eod`: `read`, `edit`, `write`, `uxn_clickup`
- `daily-rafael-weekly`: `read`, `edit`, `write`, `uxn_clickup`
- `carol-checkin-eod`: `read`
- `reminders-reconcile`: `read`, `edit`, `cron`, `message`
- `clickup-sync-health`: `exec`
- `Daily security audit (Prompt Security)`: `exec`

Updated `/home/luana/.openclaw/openclaw.json`:

- WhatsApp/CLI Moonshot channel model now points to `moonshot/kimi-k2.6`, not `moonshot/kimi-k2.5`.
- Removed obsolete `moonshot/kimi-k2.5` fallback from `agents.defaults.model.fallbacks`.
- Added group-level deny for `exec` and `process` in all configured WhatsApp groups.

Updated gateway exec approvals:

- Added `uxnaut` allowlist entry for `/home/luana/.openclaw/skills/openclaw-audit-watchdog/scripts/runner.sh`.
- Existing ClickUp wrapper allowlist entries were already present and working.

Updated workspace skill docs:

- `skills/daily-rafael/SKILL.md` now explicitly forbids `exec`/`process`/shell/`show`/`cat`/`sed`/`grep` in cron isolated mode.
- `skills/clickup-sync/examples.md` no longer instructs WhatsApp flows to use `exec python3 ...push_status.py`; it points to `uxn_clickup`.

Restarted `openclaw-gateway` so `openclaw.json` changes are active.

## Verification

- `jq empty` passed for:
  - `/home/luana/.openclaw/cron/jobs.json`
  - `/home/luana/.openclaw/openclaw.json`
  - `/home/luana/.openclaw/exec-approvals.json`
- `git diff --check` passed for changed files.
- `openclaw cron list` shows all active cron jobs on `moonshot/kimi-k2.6`.
- Search of live config files found no remaining `moonshot/kimi-k2.5` references.
- Query for enabled `agentTurn` cron jobs without `toolsAllow` returned `[]`.
- Gateway restarted cleanly and logged:
  - `agent model: moonshot/kimi-k2.6`
  - `Listening for WhatsApp inbound messages (DM + 3 configured groups).`

## Notes

`daily-rafael-eod` and `daily-rafael-weekly` still show `error` in `openclaw cron list` because that column is the latest historical run status. I did not manually rerun `daily-rafael-eod` because it would send a duplicate EOD message to the UXN Design group.
