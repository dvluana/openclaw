import { afterEach, describe, expect, it, vi } from "vitest";
import { createUxnHoursTool } from "./tool.js";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const clients = [
  {
    id: "client-1",
    name: "Loumar",
    status: "active",
    plan: {
      id: "plan-1",
      name: "Plano Loumar",
      planType: "metered",
      contractedHours: 40,
    },
  },
];

const projects = [
  {
    id: "plan-1",
    name: "Plano Loumar",
    status: "active",
    planType: "metered",
    contractedHours: 40,
    monthlyValue: null,
    clientId: "client-1",
    clientName: "Loumar",
    primaryClientId: "client-1",
  },
];

describe("UXN Hours tool", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires confirmation before creating entries by default", async () => {
    const tool = createUxnHoursTool({
      pluginConfig: {
        token: "uxn_pat_test",
      },
      fetchImpl: async () => response([]),
    });

    const result = await tool.execute("call-1", {
      action: "create_entry",
      clientName: "Loumar",
      activity: "Wireframes",
      durationMinutes: 60,
    });

    expect(result.details).toMatchObject({
      ok: false,
      needsConfirmation: true,
    });
  });

  it("creates entries using resolved client/project and optional tags", async () => {
    let createdPayload: unknown = null;
    const tool = createUxnHoursTool({
      pluginConfig: {
        token: "uxn_pat_test",
      },
      fetchImpl: async (url, init) => {
        const pathname = new URL(String(url)).pathname;
        if (pathname === "/api/v1/clients") {
          return response(clients);
        }
        if (pathname === "/api/v1/projects") {
          return response(projects);
        }
        if (pathname === "/api/v1/tags") {
          return response([{ id: "tag-1", name: "Design", color: "#765eff" }]);
        }
        if (pathname === "/api/v1/time-entries") {
          createdPayload = JSON.parse(String(init?.body));
          return response(
            {
              id: "entry-1",
              clientId: "client-1",
              planId: "plan-1",
              activity: "Wireframes",
              workDate: "2026-05-27",
              startTime: null,
              endTime: null,
              durationMinutes: 120,
              status: "completed",
              notes: null,
              tags: [{ id: "tag-1", name: "Design", color: "#765eff" }],
            },
            201,
          );
        }
        return response({ error: "not_found" }, 404);
      },
    });

    const result = await tool.execute("call-1", {
      action: "create_entry",
      confirmed: true,
      clientName: "loumar",
      activity: "Wireframes",
      workDate: "2026-05-27",
      durationMinutes: 120,
      tagNames: ["design"],
    });

    expect(createdPayload).toMatchObject({
      clientId: "client-1",
      planId: "plan-1",
      activity: "Wireframes",
      durationMinutes: 120,
      tagIds: ["tag-1"],
    });
    expect(result.details).toMatchObject({
      ok: true,
      duration: "2h",
      message: "Lancado 2h para Loumar.",
    });
  });

  it("uses the configured timezone for default day and month actions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T02:30:00.000Z"));

    const requestedUrls: string[] = [];
    const tool = createUxnHoursTool({
      pluginConfig: {
        token: "uxn_pat_test",
        timezone: "America/Sao_Paulo",
      },
      fetchImpl: async (url) => {
        requestedUrls.push(String(url));
        return response([]);
      },
    });

    const dayResult = await tool.execute("call-1", {
      action: "summarize_day",
    });
    const monthResult = await tool.execute("call-2", {
      action: "summarize_month",
    });

    expect(dayResult.details).toMatchObject({ ok: true, date: "2026-04-30" });
    expect(monthResult.details).toMatchObject({
      ok: true,
      from: "2026-04-01",
      to: "2026-04-30",
    });
    expect(requestedUrls).toEqual([
      "http://localhost:3002/api/v1/time-entries?from=2026-04-30&to=2026-04-30",
      "http://localhost:3002/api/v1/time-entries?from=2026-04-01&to=2026-04-30",
    ]);
  });
});
