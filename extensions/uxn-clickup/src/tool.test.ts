import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUxnClickUpTool } from "./tool.js";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let tempDir: string | undefined;
let configPath: string;

const tasks = [
  {
    id: "task-raspa",
    name: "[CTECH] [PREMIOS] Raspadinha premiada",
    status: { status: "design-web" },
    url: "https://app.clickup.com/t/task-raspa",
  },
  {
    id: "task-roleta",
    name: "[CTECH] [PREMIOS] Roleta premiada",
    status: { status: "design-mobile" },
    url: "https://app.clickup.com/t/task-roleta",
  },
  {
    id: "task-lorem",
    name: "[CTECH] [PADRONIZACOES] Remover Lorem Ipsum de todas as telas",
    status: { status: "revisão" },
    url: "https://app.clickup.com/t/task-lorem",
  },
  {
    id: "task-retrilhar",
    name: "[RETRILHAR] [PREMIOS] Raspadinha premiada",
    status: { status: "design-web" },
    url: "https://app.clickup.com/t/task-retrilhar",
  },
];

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "uxn-clickup-"));
  configPath = path.join(tempDir, "config.json");
  await fs.writeFile(
    configPath,
    JSON.stringify({
      api_base: "https://api.clickup.com/api/v2",
      clientes: {
        ctech: {
          list_id: "list-ctech",
          cliente_prefix: "CTECH",
          status_map: {
            markdown_to_clickup: {
              backlog: "backlog",
              fazendo: "design-web",
              feito: "revisão",
              impedido: "impedimento",
            },
            clickup_to_markdown: {
              backlog: "backlog",
              "design-web": "fazendo",
              "design-mobile": "fazendo",
              revisão: "feito",
              concluído: "feito",
              impedimento: "impedido",
            },
          },
        },
      },
    }),
  );
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

function createTool(fetchImpl: typeof fetch = async () => response({ tasks })) {
  return createUxnClickUpTool({
    pluginConfig: {
      configPath,
      token: "clickup-test-token",
    },
    fetchImpl,
  });
}

describe("UXN ClickUp tool", () => {
  it("looks up active CTech tasks without leaking another client", async () => {
    const result = await createTool().execute("call-1", {
      action: "lookup_task",
      client: "ctech",
      query: "raspadinha",
    });

    expect(result.details).toMatchObject({
      ok: true,
      client: "ctech",
      count: 1,
      matches: [
        {
          id: "task-raspa",
          title: "[CTECH] [PREMIOS] Raspadinha premiada",
          mdState: "fazendo",
        },
      ],
    });
  });

  it("accepts search as a read-only alias for lookup_task", async () => {
    const fetchMock = vi.fn(async () => response({ tasks }));
    const result = await createTool(fetchMock as unknown as typeof fetch).execute("call-1", {
      action: "search",
      client: "ctech",
      query: "roleta",
    });

    expect(result.details).toMatchObject({
      ok: true,
      client: "ctech",
      count: 1,
      matches: [
        {
          id: "task-roleta",
          title: "[CTECH] [PREMIOS] Roleta premiada",
          mdState: "fazendo",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/list/list-ctech/task");
    expect(init).toMatchObject({ method: "GET" });
  });

  it("reports done-only matches instead of updating them as active work", async () => {
    const result = await createTool().execute("call-1", {
      action: "lookup_task",
      client: "ctech",
      query: "lorem",
    });

    expect(result.details).toMatchObject({
      ok: true,
      state: "done_only",
      matches: [
        {
          id: "task-lorem",
          mdState: "feito",
        },
      ],
    });
  });

  it("asks for clarification on ambiguous active matches", async () => {
    const result = await createTool().execute("call-1", {
      action: "plan_update_status",
      client: "ctech",
      query: "premiada",
      mdState: "feito",
    });

    expect(result.details).toMatchObject({
      ok: false,
      needsClarification: true,
      reason: "task_ambiguous",
    });
    expect((result.details as { matches: unknown[] }).matches).toHaveLength(2);
  });

  it("plans updates without applying until confirmed", async () => {
    const fetchMock = vi.fn(async () => response({ tasks })) as unknown as typeof fetch;
    const result = await createTool(fetchMock).execute("call-1", {
      action: "plan_update_status",
      client: "ctech",
      query: "roleta",
      mdState: "feito",
    });

    expect(result.details).toMatchObject({
      ok: true,
      needsConfirmation: true,
      plan: {
        targetStatus: "revisão",
        task: { id: "task-roleta" },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation before applying status update", async () => {
    const result = await createTool().execute("call-1", {
      action: "update_status",
      client: "ctech",
      query: "roleta",
      mdState: "feito",
    });

    expect(result.details).toMatchObject({
      ok: false,
      needsConfirmation: true,
      plan: {
        targetStatus: "revisão",
        task: { id: "task-roleta" },
      },
    });
  });

  it("applies confirmed status updates through ClickUp API", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      const pathname = new URL(String(url)).pathname;
      if (pathname.endsWith("/list/list-ctech/task")) {
        return response({ tasks });
      }
      if (pathname.endsWith("/task/task-roleta")) {
        return response({
          id: "task-roleta",
          name: "[CTECH] [PREMIOS] Roleta premiada",
          status: { status: "revisão" },
          url: "https://app.clickup.com/t/task-roleta",
        });
      }
      return response({ err: "not found" }, 404);
    }) as unknown as typeof fetch;

    const result = await createTool(fetchImpl).execute("call-1", {
      action: "update_status",
      client: "ctech",
      query: "roleta",
      mdState: "feito",
      confirmed: true,
    });

    expect(result.details).toMatchObject({
      ok: true,
      targetStatus: "revisão",
      before: { id: "task-roleta", mdState: "fazendo" },
      after: { id: "task-roleta", status: "revisão" },
    });
    expect(calls[1]).toMatchObject({
      url: "https://api.clickup.com/api/v2/task/task-roleta",
      init: {
        method: "PUT",
        body: JSON.stringify({ status: "revisão" }),
      },
    });
  });
});
