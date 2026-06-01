export type ClickUpStatus = {
  status?: string;
};

export type ClickUpTask = {
  id: string;
  name: string;
  url?: string;
  status?: ClickUpStatus;
};

type RequestOptions = {
  method?: "GET" | "PUT";
  body?: unknown;
  query?: Record<string, string | undefined>;
};

export class ClickUpApiClient {
  constructor(
    private readonly options: {
      apiBase: string;
      token: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  private buildUrl(path: string, query?: Record<string, string | undefined>) {
    const url = new URL(
      path,
      this.options.apiBase.endsWith("/") ? this.options.apiBase : `${this.options.apiBase}/`,
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
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
        authorization: this.options.token,
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
        `ClickUp API returned ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
      );
    }

    return (await response.json()) as T;
  }

  async listTasks(listId: string) {
    const result = await this.requestJson<{ tasks?: ClickUpTask[] }>(`list/${listId}/task`, {
      query: {
        archived: "false",
        include_closed: "true",
        subtasks: "true",
      },
    });
    return result.tasks ?? [];
  }

  async updateTaskStatus(taskId: string, status: string) {
    return await this.requestJson<ClickUpTask>(`task/${taskId}`, {
      method: "PUT",
      body: { status },
    });
  }
}
