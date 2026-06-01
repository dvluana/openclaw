import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { WhatsAppSendResult } from "../../inbound/send-result.js";
import {
  createWhatsAppGroupHistoryStore,
  pruneGroupHistoryEntries,
  resolveVisibleWhatsAppGroupHistory,
  resolveVisibleWhatsAppReplyContext,
} from "./inbound-context.js";

type ReplyContextParams = Parameters<typeof resolveVisibleWhatsAppReplyContext>[0];

function acceptedSendResult(kind: "media" | "text", id: string): WhatsAppSendResult {
  return {
    kind,
    messageId: id,
    keys: [{ id }],
    providerAccepted: true,
  };
}

const makeBlockedQuotedReplyMessage = (id: string): ReplyContextParams["msg"] => ({
  id,
  from: "123@g.us",
  conversationId: "123@g.us",
  to: "+2000",
  accountId: "default",
  chatType: "group",
  chatId: "123@g.us",
  body: "Current message",
  senderName: "Alice",
  senderJid: "111@s.whatsapp.net",
  senderE164: "+111",
  selfE164: "+999",
  replyToId: "blocked-reply",
  replyToBody: "Blocked quoted text",
  replyToSender: "Mallory (+999)",
  replyToSenderJid: "999@s.whatsapp.net",
  sendComposing: async () => {},
  reply: async () => acceptedSendResult("text", "r1"),
  sendMedia: async () => acceptedSendResult("media", "m1"),
});

describe("whatsapp inbound context visibility", () => {
  it("persists and reloads group history from disk", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-group-history-"));
    const filePath = path.join(dir, "history.json");
    try {
      const store = createWhatsAppGroupHistoryStore({ filePath, limit: 20 });
      await store.save(
        new Map([
          [
            "whatsapp:default:group:123@g.us",
            [
              {
                sender: "Rafael (+111)",
                body: "Ainda nao tive tempo de trabalhar nos refinamentos",
                timestamp: Date.now(),
              },
            ],
          ],
        ]),
      );

      await expect(store.load()).resolves.toEqual(
        new Map([
          [
            "whatsapp:default:group:123@g.us",
            [
              {
                sender: "Rafael (+111)",
                body: "Ainda nao tive tempo de trabalhar nos refinamentos",
                timestamp: expect.any(Number),
              },
            ],
          ],
        ]),
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("prunes group history by count and age", () => {
    const now = 10_000;
    expect(
      pruneGroupHistoryEntries({
        now,
        maxAgeMs: 5_000,
        limit: 2,
        entries: [
          { sender: "Old", body: "old", timestamp: 1_000 },
          { sender: "A", body: "a", timestamp: 6_000 },
          { sender: "B", body: "b", timestamp: 7_000 },
          { sender: "C", body: "c", timestamp: 8_000 },
        ],
      }),
    ).toEqual([
      { sender: "B", body: "b", timestamp: 7_000 },
      { sender: "C", body: "c", timestamp: 8_000 },
    ]);
  });

  it("treats corrupt persisted group history as empty", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-group-history-"));
    const filePath = path.join(dir, "history.json");
    try {
      await fs.writeFile(filePath, "not json");
      const store = createWhatsAppGroupHistoryStore({ filePath, limit: 20 });
      await expect(store.load()).resolves.toEqual(new Map());
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("filters non-allowlisted group history from supplemental context", () => {
    const history = resolveVisibleWhatsAppGroupHistory({
      history: [
        {
          sender: "Alice (+111)",
          body: "Allowed context",
          senderJid: "111@s.whatsapp.net",
        },
        {
          sender: "Mallory (+999)",
          body: "Blocked context",
          senderJid: "999@s.whatsapp.net",
        },
      ],
      mode: "allowlist",
      groupPolicy: "allowlist",
      groupAllowFrom: ["+111"],
    });

    expect(history).toEqual([
      {
        sender: "Alice (+111)",
        body: "Allowed context",
        senderJid: "111@s.whatsapp.net",
      },
    ]);
  });

  it("redacts blocked quoted replies in allowlist mode", () => {
    const reply = resolveVisibleWhatsAppReplyContext({
      msg: makeBlockedQuotedReplyMessage("msg-reply-1"),
      mode: "allowlist",
      groupPolicy: "allowlist",
      groupAllowFrom: ["+111"],
    });

    expect(reply).toBeNull();
  });

  it("keeps blocked quoted replies in allowlist_quote mode", () => {
    const reply = resolveVisibleWhatsAppReplyContext({
      msg: makeBlockedQuotedReplyMessage("msg-reply-2"),
      mode: "allowlist_quote",
      groupPolicy: "allowlist",
      groupAllowFrom: ["+111"],
    });

    expect(reply).toEqual({
      id: "blocked-reply",
      body: "Blocked quoted text",
      sender: {
        jid: "999@s.whatsapp.net",
        lid: null,
        e164: "+999",
        label: "Mallory (+999)",
      },
    });
  });
});
