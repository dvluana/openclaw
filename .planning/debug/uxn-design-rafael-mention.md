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

## Remaining Risk

This fixes the edited-message drop path that matches the observed evidence. If Rafael sends a new non-edited message and it still does not appear in `web-inbound`, the next layer to inspect is Baileys live delivery / connection catch-up rather than mention matching.
