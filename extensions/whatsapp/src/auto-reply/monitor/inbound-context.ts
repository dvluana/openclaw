import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { filterChannelInboundQuoteContext } from "openclaw/plugin-sdk/channel-inbound";
import { filterSupplementalContextItems } from "openclaw/plugin-sdk/security-runtime";
import {
  getComparableIdentityValues,
  getReplyContext,
  type WhatsAppIdentity,
  type WhatsAppReplyContext,
} from "../../identity.js";
import { normalizeE164 } from "../../text-runtime.js";
import type { WebInboundMsg } from "../types.js";

export type GroupHistoryEntry = {
  sender: string;
  body: string;
  timestamp?: number;
  id?: string;
  senderJid?: string;
};

export type GroupHistoryStore = {
  load: () => Promise<Map<string, GroupHistoryEntry[]>>;
  save: (history: Map<string, GroupHistoryEntry[]>) => Promise<void>;
};

type ContextVisibilityMode = "all" | "allowlist" | "allowlist_quote";

const DEFAULT_GROUP_HISTORY_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function resolveStateDir() {
  const override = process.env.OPENCLAW_STATE_DIR?.trim();
  if (override) {
    return override;
  }
  return path.join(os.homedir(), ".openclaw");
}

function safeAccountId(accountId?: string) {
  return (accountId?.trim() || "default").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function resolveWhatsAppGroupHistoryStorePath(params: { accountId?: string }) {
  return path.join(
    resolveStateDir(),
    "cache",
    "whatsapp",
    "group-history",
    `${safeAccountId(params.accountId)}.json`,
  );
}

function isGroupHistoryEntry(value: unknown): value is GroupHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<GroupHistoryEntry>;
  return typeof entry.sender === "string" && typeof entry.body === "string";
}

export function pruneGroupHistoryEntries(params: {
  entries: GroupHistoryEntry[];
  limit: number;
  now?: number;
  maxAgeMs?: number;
}): GroupHistoryEntry[] {
  const now = params.now ?? Date.now();
  const maxAgeMs = params.maxAgeMs ?? DEFAULT_GROUP_HISTORY_MAX_AGE_MS;
  const minTimestamp = now - maxAgeMs;
  return params.entries
    .filter((entry) => {
      if (!entry.body.trim()) {
        return false;
      }
      if (entry.timestamp === undefined) {
        return true;
      }
      return entry.timestamp >= minTimestamp;
    })
    .slice(-Math.max(0, params.limit));
}

export function pruneGroupHistories(params: {
  histories: Map<string, GroupHistoryEntry[]>;
  limit: number;
  now?: number;
  maxAgeMs?: number;
}): Map<string, GroupHistoryEntry[]> {
  const pruned = new Map<string, GroupHistoryEntry[]>();
  for (const [key, entries] of params.histories.entries()) {
    const next = pruneGroupHistoryEntries({
      entries,
      limit: params.limit,
      now: params.now,
      maxAgeMs: params.maxAgeMs,
    });
    if (next.length > 0) {
      pruned.set(key, next);
    }
  }
  return pruned;
}

export function createWhatsAppGroupHistoryStore(params: {
  accountId?: string;
  limit: number;
  filePath?: string;
}): GroupHistoryStore {
  const filePath = params.filePath ?? resolveWhatsAppGroupHistoryStorePath(params);
  return {
    async load() {
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return new Map();
        }
        const histories = new Map<string, GroupHistoryEntry[]>();
        for (const [key, value] of Object.entries(parsed)) {
          if (!Array.isArray(value)) {
            continue;
          }
          const entries = value.filter(isGroupHistoryEntry);
          if (entries.length > 0) {
            histories.set(key, entries);
          }
        }
        return pruneGroupHistories({ histories, limit: params.limit });
      } catch {
        return new Map();
      }
    },
    async save(history) {
      const pruned = pruneGroupHistories({ histories: history, limit: params.limit });
      const payload = Object.fromEntries(pruned.entries());
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmpPath, `${JSON.stringify(payload)}\n`);
      await fs.rename(tmpPath, filePath);
    },
  };
}

function isWhatsAppSupplementalSenderAllowed(params: {
  allowFrom: string[];
  sender?: WhatsAppIdentity | null;
}): boolean {
  if (params.allowFrom.includes("*")) {
    return true;
  }
  const senderValues = new Set(getComparableIdentityValues(params.sender));
  if (senderValues.size === 0) {
    return false;
  }
  for (const entry of params.allowFrom) {
    const rawEntry = entry.trim();
    if (!rawEntry) {
      continue;
    }
    const normalizedEntry = normalizeE164(rawEntry);
    if ((normalizedEntry && senderValues.has(normalizedEntry)) || senderValues.has(rawEntry)) {
      return true;
    }
  }
  return false;
}

export function resolveVisibleWhatsAppGroupHistory(params: {
  history: GroupHistoryEntry[];
  mode: ContextVisibilityMode;
  groupPolicy: "open" | "allowlist" | "disabled";
  groupAllowFrom: string[];
}): GroupHistoryEntry[] {
  if (params.groupPolicy !== "allowlist") {
    return params.history;
  }
  return filterSupplementalContextItems({
    items: params.history,
    mode: params.mode,
    kind: "history",
    isSenderAllowed: (entry) =>
      isWhatsAppSupplementalSenderAllowed({
        allowFrom: params.groupAllowFrom,
        sender: entry.senderJid ? { jid: entry.senderJid } : null,
      }),
  }).items;
}

export function resolveVisibleWhatsAppReplyContext(params: {
  msg: WebInboundMsg;
  authDir?: string;
  mode: ContextVisibilityMode;
  groupPolicy: "open" | "allowlist" | "disabled";
  groupAllowFrom: string[];
}): WhatsAppReplyContext | null {
  const replyTo = getReplyContext(params.msg, params.authDir);
  if (!replyTo) {
    return null;
  }
  const senderAllowed =
    params.msg.chatType !== "group" || params.groupPolicy !== "allowlist"
      ? true
      : isWhatsAppSupplementalSenderAllowed({
          allowFrom: params.groupAllowFrom,
          sender: replyTo.sender,
        });
  const visible = filterChannelInboundQuoteContext(params.mode, {
    id: replyTo.id,
    body: replyTo.body,
    sender: replyTo.sender?.label ?? undefined,
    senderAllowed,
  });
  return visible ? replyTo : null;
}
