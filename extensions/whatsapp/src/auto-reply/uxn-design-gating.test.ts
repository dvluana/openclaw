import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isToolAllowedByPolicies,
  resolveEffectiveToolPolicy,
  resolveGroupToolPolicy,
} from "../../../../src/agents/pi-tools.policy.js";
import {
  mergeAlsoAllowPolicy,
  resolveToolProfilePolicy,
} from "../../../../src/agents/tool-policy.js";
import { resolveSourceReplyDeliveryMode } from "../../../../src/auto-reply/reply/source-reply-delivery-mode.js";
import { buildMentionConfig } from "./mentions.js";
import { applyGroupGating, type GroupHistoryEntry } from "./monitor/group-gating.js";
import type { WebInboundMsg } from "./types.js";

let sessionDir: string | undefined;
let sessionStorePath: string;

beforeEach(async () => {
  sessionDir = await fs.mkdtemp(path.join(os.tmpdir(), "uxn-design-gating-"));
  sessionStorePath = path.join(sessionDir, "sessions.json");
  await fs.writeFile(sessionStorePath, "{}");
});

afterEach(async () => {
  if (sessionDir) {
    await fs.rm(sessionDir, { recursive: true, force: true });
    sessionDir = undefined;
  }
});

const UXN_DESIGN_GROUP = "120363075763910564@g.us";
const UXN_DESIGN_SESSION = `agent:uxnaut:whatsapp:group:${UXN_DESIGN_GROUP}`;

function makeConfig() {
  return {
    agents: {
      list: [
        {
          id: "uxnaut",
          tools: {
            profile: "coding",
            deny: ["canvas"],
            alsoAllow: ["browser", "message", "uxn_hours", "uxn_clickup", "uxn-clickup"],
            exec: { security: "allowlist", ask: "on-miss" },
          },
        },
      ],
    },
    channels: {
      whatsapp: {
        groupPolicy: "allowlist",
        groups: {
          [UXN_DESIGN_GROUP]: {
            requireMention: true,
            tools: {
              deny: [
                "exec",
                "sessions_send",
                "cron",
                "browser",
                "group:runtime",
                "sessions_spawn",
                "gateway",
                "nodes",
              ],
            },
            toolsBySender: {
              "e164:+5547988348202": {
                deny: ["exec", "process"],
                alsoAllow: [
                  "sessions_send",
                  "cron",
                  "browser",
                  "group:runtime",
                  "uxn_clickup",
                  "uxn-clickup",
                ],
              },
              "e164:+554788348202": {
                deny: ["exec", "process"],
                alsoAllow: [
                  "sessions_send",
                  "cron",
                  "browser",
                  "group:runtime",
                  "uxn_clickup",
                  "uxn-clickup",
                ],
              },
              "e164:+554784224636": {
                deny: ["exec", "process"],
                alsoAllow: ["uxn_clickup", "uxn-clickup"],
              },
            },
          },
        },
      },
    },
    messages: {
      groupChat: {
        visibleReplies: "automatic",
        mentionPatterns: ["Nauter", "Nauter Caramelo"],
      },
    },
    session: { store: sessionStorePath },
  } as unknown as import("openclaw/plugin-sdk/config-contracts").OpenClawConfig;
}

function createGroupMessage(overrides: Partial<WebInboundMsg>): WebInboundMsg {
  return {
    id: "uxn-message",
    from: UXN_DESIGN_GROUP,
    conversationId: UXN_DESIGN_GROUP,
    chatId: UXN_DESIGN_GROUP,
    chatType: "group",
    to: "+554891880265",
    accountId: "default",
    body: "",
    senderE164: "+554788348202",
    senderName: "Luana UXN",
    selfE164: "+554891880265",
    selfJid: "554891880265@s.whatsapp.net",
    sendComposing: async () => {},
    reply: async () => ({ kind: "text", messageId: "reply-1", keys: [], providerAccepted: true }),
    sendMedia: async () => ({
      kind: "media",
      messageId: "media-1",
      keys: [],
      providerAccepted: true,
    }),
    ...overrides,
  };
}

async function run(msg: WebInboundMsg) {
  const cfg = makeConfig();
  const groupHistories = new Map<string, GroupHistoryEntry[]>();
  const result = await applyGroupGating({
    cfg,
    msg,
    conversationId: UXN_DESIGN_GROUP,
    groupHistoryKey: `whatsapp:default:group:${UXN_DESIGN_GROUP}`,
    agentId: "uxnaut",
    sessionKey: `agent:uxnaut:whatsapp:group:${UXN_DESIGN_GROUP}`,
    baseMentionConfig: buildMentionConfig(cfg, undefined),
    groupHistories,
    groupHistoryLimit: 10,
    groupMemberNames: new Map(),
    logVerbose: () => {},
    replyLogger: { debug: () => {}, warn: () => {} },
  });
  return { result, groupHistories };
}

function resolveAllowedToolNames(senderE164: string): Set<string> {
  const cfg = makeConfig();
  const effective = resolveEffectiveToolPolicy({
    config: cfg,
    sessionKey: UXN_DESIGN_SESSION,
    agentId: "uxnaut",
  });
  const profilePolicy = mergeAlsoAllowPolicy(
    resolveToolProfilePolicy(effective.profile),
    effective.profileAlsoAllow,
  );
  const providerProfilePolicy = mergeAlsoAllowPolicy(
    resolveToolProfilePolicy(effective.providerProfile),
    effective.providerProfileAlsoAllow,
  );
  const groupPolicy = resolveGroupToolPolicy({
    config: cfg,
    sessionKey: UXN_DESIGN_SESSION,
    messageProvider: "whatsapp",
    groupId: UXN_DESIGN_GROUP,
    senderE164,
  });
  const policies = [
    profilePolicy,
    providerProfilePolicy,
    effective.globalPolicy,
    effective.globalProviderPolicy,
    effective.agentPolicy,
    effective.agentProviderPolicy,
    groupPolicy,
  ];
  const toolNames = ["exec", "process", "message", "uxn_clickup", "uxn-clickup"];
  return new Set(toolNames.filter((toolName) => isToolAllowedByPolicies(toolName, policies)));
}

describe("UXN Design WhatsApp gating", () => {
  it("processes Luana mentioning Nauter", async () => {
    const { result } = await run(
      createGroupMessage({
        id: "luana-ctech",
        body: "@Nauter retomando CTech, quais cards voce encontrou?",
        senderName: "Luana UXN",
        senderE164: "+554788348202",
        senderJid: "43297682809060@lid",
      }),
    );

    expect(result.shouldProcess).toBe(true);
  });

  it("processes Luana's CTech roleta validation message in UXN Design", async () => {
    const { result } = await run(
      createGroupMessage({
        id: "luana-ctech-roleta-validation",
        body: "@Nauter Caramelo Rafael pode ser reconhecido aqui? E olhando CTech, quais cards voce encontra para roleta antes de mexer?",
        senderName: "Luana UXN",
        senderE164: "+554788348202",
        senderJid: "43297682809060@lid",
      }),
    );

    expect(result.shouldProcess).toBe(true);
  });

  it("processes Rafael mentioning Nauter", async () => {
    const { result } = await run(
      createGroupMessage({
        id: "rafa-ctech",
        body: "@Nauter essa task de raspadinha / roleta pode ser definida como concluida",
        senderName: "Rafael Silva",
        senderE164: "+554784224636",
        senderJid: "554784224636@s.whatsapp.net",
      }),
    );

    expect(result.shouldProcess).toBe(true);
  });

  it("allows ClickUp and visible replies, but blocks exec for Luana and Rafael", () => {
    for (const senderE164 of ["+554788348202", "+554784224636"]) {
      const allowed = resolveAllowedToolNames(senderE164);

      expect(allowed.has("uxn_clickup")).toBe(true);
      expect(allowed.has("message")).toBe(true);
      expect(allowed.has("exec")).toBe(false);
      expect(allowed.has("process")).toBe(false);
    }
  });

  it("keeps normal UXN Design group replies visible without requiring message tool calls", () => {
    const cfg = makeConfig();
    expect(
      resolveSourceReplyDeliveryMode({
        cfg,
        ctx: { ChatType: "group" },
        messageToolAvailable: true,
      }),
    ).toBe("automatic");
  });

  it("stores Rafael context without replying when Nauter is not mentioned", async () => {
    const { result, groupHistories } = await run(
      createGroupMessage({
        id: "rafa-context",
        body: "web e mobile da roleta ja foram concluidos",
        senderName: "Rafael Silva",
        senderE164: "+554784224636",
        senderJid: "554784224636@s.whatsapp.net",
      }),
    );

    expect(result.shouldProcess).toBe(false);
    expect(groupHistories.get(`whatsapp:default:group:${UXN_DESIGN_GROUP}`)).toMatchObject([
      {
        sender: "Rafael Silva (+554784224636)",
        body: "web e mobile da roleta ja foram concluidos",
      },
    ]);
  });
});
