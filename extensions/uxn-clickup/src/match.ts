import type { ClickUpTask } from "./client.js";
import type { ClickUpSyncClientConfig } from "./config.js";

const TITLE_RE = /^\[([A-Z]+)\]\s+\[([A-ZÀ-Ÿ -]+)\]\s+(.+)$/;

export type UxnClickUpTaskRecord = {
  id: string;
  title: string;
  cliente: string | null;
  modulo: string | null;
  nome: string;
  status: string | null;
  mdState: string | null;
  url?: string;
};

export function normalizeMatchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function parseTitle(title: string | undefined) {
  const match = TITLE_RE.exec((title ?? "").trim());
  if (!match) {
    return { cliente: null, modulo: null, nome: title ?? "" };
  }
  return {
    cliente: match[1].toUpperCase(),
    modulo: match[2].toUpperCase(),
    nome: match[3].trim(),
  };
}

export function markdownStateForTask(task: ClickUpTask, clientConfig: ClickUpSyncClientConfig) {
  const status = task.status?.status;
  return status ? (clientConfig.status_map.clickup_to_markdown[status] ?? null) : null;
}

export function taskRecord(
  task: ClickUpTask,
  clientConfig: ClickUpSyncClientConfig,
): UxnClickUpTaskRecord {
  const parsed = parseTitle(task.name);
  return {
    id: task.id,
    title: task.name,
    cliente: parsed.cliente,
    modulo: parsed.modulo,
    nome: parsed.nome || task.name,
    status: task.status?.status ?? null,
    mdState: markdownStateForTask(task, clientConfig),
    url: task.url,
  };
}

export function matchesTask(task: ClickUpTask, params: { query?: string; titleExact?: string }) {
  if (params.titleExact !== undefined) {
    return task.name === params.titleExact;
  }
  const query = normalizeMatchText(params.query);
  if (!query) {
    return false;
  }
  const parsed = parseTitle(task.name);
  return [task.name, parsed.nome, parsed.modulo]
    .filter((value): value is string => typeof value === "string")
    .some((value) => normalizeMatchText(value).includes(query));
}

export function findTaskCandidates(
  tasks: ClickUpTask[],
  clientConfig: ClickUpSyncClientConfig,
  params: { query?: string; titleExact?: string; includeDone?: boolean },
) {
  const prefix = `[${clientConfig.cliente_prefix}]`;
  return tasks
    .filter((task) => task.name.startsWith(prefix))
    .filter((task) => matchesTask(task, params))
    .map((task) => taskRecord(task, clientConfig))
    .filter((record) => params.includeDone || record.mdState !== "feito");
}

export function findDoneTaskCandidates(
  tasks: ClickUpTask[],
  clientConfig: ClickUpSyncClientConfig,
  params: { query?: string; titleExact?: string },
) {
  const prefix = `[${clientConfig.cliente_prefix}]`;
  return tasks
    .filter((task) => task.name.startsWith(prefix))
    .filter((task) => matchesTask(task, params))
    .map((task) => taskRecord(task, clientConfig))
    .filter((record) => record.mdState === "feito");
}

export function resolveTaskMatch(
  tasks: ClickUpTask[],
  clientConfig: ClickUpSyncClientConfig,
  params: { query?: string; titleExact?: string },
) {
  const active = findTaskCandidates(tasks, clientConfig, { ...params, includeDone: false });
  if (active.length === 1) {
    return { kind: "active" as const, match: active[0], matches: active };
  }
  if (active.length > 1) {
    return { kind: "ambiguous_active" as const, matches: active };
  }
  const done = findDoneTaskCandidates(tasks, clientConfig, params);
  if (done.length === 1) {
    return { kind: "done" as const, match: done[0], matches: done };
  }
  if (done.length > 1) {
    return { kind: "ambiguous_done" as const, matches: done };
  }
  return { kind: "none" as const, matches: [] };
}
