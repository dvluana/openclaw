---
status: resolved
trigger: "Cron clickup-sync-health failed at 18:00 with show ~/.openclaw/...health_check_wrapper.sh failed"
created: 2026-06-02
updated: 2026-06-02
---

# Debug Session: ClickUp Sync Health Exec/Show Failure

## Symptom

At 2026-06-02 18:00 America/Sao_Paulo, cron job `clickup-sync-health` failed and sent a private alert:

`show ~/.openclaw/workspace-uxnaut/skills/clickup-sync/health_check_wrapper.sh failed`

## Evidence

- Cron job id: `19ee223c-af9b-438d-8d79-14479b9044e0`
- Failed session id: `4e8f494b-07f5-4809-aabe-a525eed2b27f`
- Fixed validation session id: `4bbbf524-0959-4c20-a09b-72bbf0e291d1`
- The wrapper itself completed successfully from shell in about 18s.

The failed run first called the correct wrapper, but the agent `exec` result came back as `running`.
The agent then attempted a second `exec` call equivalent to `show/cat` on the wrapper path.
Cron isolated mode cannot wait for interactive exec approval, so the second tool call marked the job as failed.

## Root Cause

The job allowed only `exec`, but the prompt did not specify `yieldMs`/`timeout` parameters for the long-enough wrapper call.
With the default exec yield window, the wrapper could return as a pollable running process before stdout was available.
Because only `exec` was available and `process` was not, the model improvised by trying to inspect the wrapper file.

## Fix

Updated `/home/luana/.openclaw/cron/jobs.json` through `openclaw cron edit` so the active Gateway state and stored config match.

The `clickup-sync-health` prompt now requires exactly one `exec` call with:

- `command`: `/home/luana/.openclaw/workspace-uxnaut/skills/clickup-sync/health_check_wrapper.sh`
- `workdir`: `/home/luana/.openclaw/workspace-uxnaut`
- `timeout`: `180`
- `yieldMs`: `120000`

It also forbids second commands such as `cat`, `show`, `head`, `sed`, `grep`, `ls`, `python`, `cron`, `message`, or `process`.

## Verification

- Manual shell wrapper run completed with exit 0.
- Manual cron run completed with status `ok`.
- Validation session used exactly one tool call:
  - `exec`
  - `timeout: 180`
  - `yieldMs: 120000`
- Tool result status was `completed`, exit code 0, duration about 14.5s.
- Delivery was disabled only during the manual validation and restored afterwards.

## Notes

The health output still reports business drift:

- `ctech`: 22 divergentes, 1 só no ClickUp, 2 só no markdown
- `stant`: 4 só no ClickUp, 1 só no markdown

That is a separate sync/state issue, not a cron/tool failure.
