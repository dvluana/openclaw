import { describe, expect, it } from "vitest";
import { UxnHoursApiClient } from "./client.js";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

describe("UXN Hours API client", () => {
  it("sends bearer auth and date range query", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const client = new UxnHoursApiClient({
      baseUrl: "http://localhost:3002",
      token: "uxn_pat_test",
      fetchImpl: async (url, init) => {
        requests.push({
          url: String(url),
          authorization: new Headers(init?.headers).get("authorization"),
        });
        return jsonResponse([]);
      },
    });

    await client.listEntries({ from: "2026-05-01", to: "2026-05-31" });

    expect(requests).toEqual([
      {
        url: "http://localhost:3002/api/v1/time-entries?from=2026-05-01&to=2026-05-31",
        authorization: "Bearer uxn_pat_test",
      },
    ]);
  });

  it("posts create entry payloads to the Desktop API", async () => {
    let postedBody: unknown = null;
    const client = new UxnHoursApiClient({
      baseUrl: "http://localhost:3002",
      token: "uxn_pat_test",
      fetchImpl: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return jsonResponse({
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
          tags: [],
        });
      },
    });

    const entry = await client.createEntry({
      clientId: "client-1",
      planId: "plan-1",
      activity: "Wireframes",
      workDate: "2026-05-27",
      durationMinutes: 120,
      tagIds: [],
    });

    expect(postedBody).toMatchObject({
      clientId: "client-1",
      planId: "plan-1",
      activity: "Wireframes",
      durationMinutes: 120,
    });
    expect(entry.id).toBe("entry-1");
  });
});
