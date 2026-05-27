export type UxnHoursClient = {
  id: string;
  name: string;
  status: "active" | "paused" | "archived";
  plan: {
    id: string;
    name: string;
    planType: "metered" | "unmetered";
    contractedHours: number;
  } | null;
};

export type UxnHoursProject = {
  id: string;
  name: string;
  status: "active" | "paused" | "archived";
  planType: "metered" | "unmetered";
  contractedHours: number;
  monthlyValue: number | null;
  clientId: string;
  clientName: string;
  primaryClientId: string | null;
};

export type UxnHoursTag = {
  id: string;
  name: string;
  color: string | null;
};

export type UxnHoursTimeEntry = {
  id: string;
  clientId: string;
  planId: string | null;
  activity: string;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  status: "draft" | "completed" | "archived";
  notes: string | null;
  tags: UxnHoursTag[];
};

export type UxnHoursCreateEntryInput = {
  clientId: string;
  planId?: string | null;
  activity: string;
  workDate: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  tagIds?: string[];
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
};

export class UxnHoursApiClient {
  constructor(
    private readonly options: {
      baseUrl: string;
      token: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  private buildUrl(path: string, query?: Record<string, string | undefined>) {
    const url = new URL(path, this.options.baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
    return url;
  }

  private async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(this.buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        errorBody = "";
      }
      throw new Error(
        `UXN Gestao API returned ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
      );
    }

    return (await response.json()) as T;
  }

  async listClients() {
    return await this.requestJson<UxnHoursClient[]>("/api/v1/clients");
  }

  async listProjects() {
    return await this.requestJson<UxnHoursProject[]>("/api/v1/projects");
  }

  async listTags() {
    return await this.requestJson<UxnHoursTag[]>("/api/v1/tags");
  }

  async listEntries(input: { from: string; to: string }) {
    return await this.requestJson<UxnHoursTimeEntry[]>("/api/v1/time-entries", {
      query: input,
    });
  }

  async createEntry(input: UxnHoursCreateEntryInput) {
    return await this.requestJson<UxnHoursTimeEntry>("/api/v1/time-entries", {
      method: "POST",
      body: input,
    });
  }
}
