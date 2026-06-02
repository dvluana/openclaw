---
status: resolved
trigger: "UXN Design group: Nauter did not recognize or respond to Rafael"
created: 2026-06-02
updated: 2026-06-02
---

# Debug Session: UXN Design Rafael Mention

## Symptom

Rafael sent a message in the UXN Design WhatsApp group tagging Nauter, but Nauter did not reply.
Luana later pasted the original evidence in DM:

- `2026-06-02 07:59:37` Rafael Silva: `@Nauter Caramelo Remova a task "[CTECH] [CAMPANHA] Cupons de desconto por campanha" do clickup`
- The pasted WhatsApp export marked it as edited.

Luana also asked Rafael to send a second group test around `2026-06-02 09:14`, and then reported Nauter still did not answer.

## Evidence

- UXN Design group JID: `120363075763910564@g.us`.
- Current config requires a mention in that group and authorizes Rafael as a sender.
- Current mention patterns are safe plain strings: `Nauter`, `Nauter Caramelo`.
- Gateway logs for today include Luana's group messages before and after the incident.
- Gateway logs do not include Rafael's original 07:59 group message as `web-inbound`.
- Group history cache for UXN Design also does not include Rafael's original or test messages.
- The copied original message was explicitly marked as edited by WhatsApp.

## Hypothesis

The failure happened before agent routing and before model execution. Edited WhatsApp messages were being dropped by the inbound extractor because Baileys can wrap edits as:

- `protocolMessage.editedMessage`
- top-level `editedMessage`

The extractor treated protocol envelopes without visible text as non-user content and did not unwrap edited-message payloads, so edited commands could disappear before `web-inbound` logging, group mention gating, and auto-reply.

## Fix

Updated `extensions/whatsapp/src/inbound/extract.ts` so edited-message envelopes are normalized into their inner user-visible message before content detection:

- unwrap `protocolMessage.editedMessage`
- unwrap top-level `editedMessage`
- keep protocol envelopes without edited user content ignored

Added regression coverage for:

- mentioned JIDs inside edited protocol messages
- text extraction from edited protocol messages
- top-level edited messages
- WhatsApp directionality markers around display-name mentions

## Verification

- `pnpm vitest run extensions/whatsapp/src/inbound/extract.test.ts`
  - 32 passed
- `pnpm vitest run extensions/whatsapp/src/monitor-inbox.behavior.test.ts --testNamePattern "web monitor inbox"`
  - 57 passed, 5 skipped
- `pnpm vitest run src/auto-reply/inbound.test.ts --testNamePattern "normalizes WhatsApp directionality markers|normalizes zero-width|matches patterns case-insensitively"`
  - 3 passed, 56 skipped

## Follow-up: Rafael Still Invisible After New Test

After the edited-message fix and gateway restart, Luana reported Rafael sent two new messages in
the UXN Design group and Nauter still did not see them.

Additional evidence:

- Rafael's phone provided by Luana: `+55 47 8422-4636`.
- Normalized E.164 used by WhatsApp config: `+554784224636`.
- Baileys credential store had a valid LID mapping:
  - phone `554784224636` -> LID `24752500506773`
  - LID `24752500506773` -> phone `554784224636`
- Sender key/session files for group `120363075763910564@g.us` and LID `24752500506773`
  were touched around Luana's test window, indicating WhatsApp saw cryptographic sender activity.
- `channels.whatsapp.groups["120363075763910564@g.us"].toolsBySender` already contained
  `e164:+554784224636`, but `channels.whatsapp.groupAllowFrom` was absent and root
  `channels.whatsapp.allowFrom` did not include `554784224636`.

Root cause:

- `toolsBySender` is applied only after an inbound message passes access control.
- The WhatsApp group policy is `allowlist`.
- For groups, access control uses `groupAllowFrom`; when absent, the resolved policy can fall back
  to `allowFrom`.
- Since Rafael was not present in the effective group allowlist, his messages were blocked before
  normal `web-inbound` logging and before mention matching/agent routing.

Follow-up fix:

- Added `channels.whatsapp.groupAllowFrom` in `/home/luana/.openclaw/openclaw.json` with the
  existing authorized group senders plus `554784224636`.
- Kept Rafael out of `channels.whatsapp.allowFrom`, so this does not authorize Rafael DMs.
- Restarted `openclaw-gateway`.

Follow-up verification:

- `jq empty /home/luana/.openclaw/openclaw.json`
- Gateway health: `{"ok":true,"status":"live"}`
- Gateway logs after restart:
  - HTTP server listening on `127.0.0.1:18789`
  - WhatsApp provider started
  - `Listening for WhatsApp inbound messages (DM + 3 configured groups).`
- Local access-control simulation with:
  - group `120363075763910564@g.us`
  - sender `+554784224636`
    returned:
  - `allowed: true`
  - `shouldMarkRead: true`

Live end-to-end verification:

- At `2026-06-02 12:46:01 -03`, Rafael sent `@91762697723906 Quanto é 1+1`.
- Gateway logged it as `web-inbound`.
- The compiled prompt metadata identified:
  - `sender_id`: `+554784224636`
  - `sender`: `Rafael Silva`
  - `was_mentioned`: `true`
- UXNaut session `95f1e2e4-6ec6-4387-9282-fb545af36431` was created.
- Model completed successfully.
- WhatsApp outbound send succeeded:
  - message id `3EB04A7F19297D951DF570`
  - sent at `2026-06-02 12:46:18 -03`

Conclusion:

- Rafael is now recognized.
- Mention gating works for his messages.
- Group routing to UXNaut works.
- WhatsApp outbound send works.

## Remaining Risk

The delivery/recognition bug is resolved. The live test response included irrelevant flavor text,
which is a separate response-style/persona issue rather than an inbound routing issue.
