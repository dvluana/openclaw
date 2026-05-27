import { jsonResult, readStringParam } from "openclaw/plugin-sdk/channel-actions";
import type { AnyAgentTool, OpenClawConfig } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";
import {
  UxnHoursApiClient,
  type UxnHoursClient,
  type UxnHoursProject,
  type UxnHoursTag,
} from "./client.js";
import { resolveByName, summarizeMinutes } from "./resolve.js";

type SecretRef = {
  source?: string;
  provider?: string;
  id?: string;
};

type UxnHoursPluginConfig = {
  baseUrl?: string;
  token?: string | SecretRef;
  requireConfirmationForCreate?: boolean;
};

type UxnHoursToolOptions = {
  config?: OpenClawConfig;
  pluginConfig?: UxnHoursPluginConfig;
  fetchImpl?: typeof fetch;
};

const UxnHoursToolSchema = Type.Object({
  action: Type.Union([
    Type.Literal("list_clients"),
    Type.Literal("list_projects"),
    Type.Literal("list_tags"),
    Type.Literal("list_entries"),
    Type.Literal("create_entry"),
    Type.Literal("summarize_day"),
    Type.Literal("summarize_month"),
  ]),
  from: Type.Optional(Type.String()),
  to: Type.Optional(Type.String()),
  month: Type.Optional(Type.String()),
  clientId: Type.Optional(Type.String()),
  clientName: Type.Optional(Type.String()),
  projectId: Type.Optional(Type.String()),
  projectName: Type.Optional(Type.String()),
  activity: Type.Optional(Type.String()),
  workDate: Type.Optional(Type.String()),
  startTime: Type.Optional(Type.String()),
  endTime: Type.Optional(Type.String()),
  durationMinutes: Type.Optional(Type.Number()),
  notes: Type.Optional(Type.String()),
  tagIds: Type.Optional(Type.Array(Type.String())),
  tagNames: Type.Optional(Type.Array(Type.String())),
  confirmed: Type.Optional(Type.Boolean()),
});

function isSecretRef(value: unknown): value is SecretRef {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function resolveStringSecret(value: string | SecretRef | undefined, envName: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (isSecretRef(value) && value.source === "env" && value.id) {
    return process.env[value.id]?.trim() ?? "";
  }
  return process.env[envName]?.trim() ?? "";
}

function resolveClient(options: UxnHoursToolOptions) {
  const baseUrl =
    options.pluginConfig?.baseUrl?.trim() ||
    process.env.UXN_GESTAO_API_URL?.trim() ||
    "http://localhost:3002";
  const token = resolveStringSecret(options.pluginConfig?.token, "UXN_GESTAO_PAT");

  if (!token) {
    throw new Error("UXN Hours needs UXN_GESTAO_PAT or plugins.entries.uxn-hours.config.token.");
  }

  return new UxnHoursApiClient({
    baseUrl,
    token,
    fetchImpl: options.fetchImpl,
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthRange(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error("month must use YYYY-MM.");
  }
  const [year, month] = monthKey.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function cleanIdList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

async function resolveClientAndProject(params: {
  api: UxnHoursApiClient;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
}) {
  const [clients, projects] = await Promise.all([
    params.api.listClients(),
    params.api.listProjects(),
  ]);
  const selectedProject = params.projectId
    ? (projects.find((project) => project.id === params.projectId) ?? null)
    : null;
  if (selectedProject) {
    return {
      clients,
      projects,
      client: clients.find((client) => client.id === selectedProject.clientId) ?? null,
      project: selectedProject,
    };
  }

  const selectedClient = params.clientId
    ? (clients.find((client) => client.id === params.clientId) ?? null)
    : null;
  const clientMatch = selectedClient
    ? { kind: "match" as const, value: selectedClient }
    : resolveByName(clients, params.clientName);
  if (clientMatch.kind !== "match") {
    return { clients, projects, client: null, project: null, clientMatch };
  }

  const clientProjects = projects.filter((project) => project.clientId === clientMatch.value.id);
  if (params.projectName) {
    const projectMatch = resolveByName(clientProjects, params.projectName);
    if (projectMatch.kind !== "match") {
      return {
        clients,
        projects,
        client: clientMatch.value,
        project: null,
        projectMatch,
      };
    }
    return { clients, projects, client: clientMatch.value, project: projectMatch.value };
  }

  return {
    clients,
    projects,
    client: clientMatch.value,
    project: clientProjects[0] ?? null,
  };
}

function formatClientProjectResolutionIssue(issue: {
  clientMatch?: ReturnType<typeof resolveByName<UxnHoursClient>>;
  projectMatch?: ReturnType<typeof resolveByName<UxnHoursProject>>;
}) {
  if (issue.clientMatch?.kind === "none") {
    return {
      ok: false,
      needsClarification: true,
      reason: "client_not_found",
      message: `Nao encontrei cliente para "${issue.clientMatch.query}".`,
    };
  }
  if (issue.clientMatch?.kind === "ambiguous") {
    return {
      ok: false,
      needsClarification: true,
      reason: "client_ambiguous",
      message: "Cliente ambiguo. Escolha um cliente.",
      matches: issue.clientMatch.matches.map(({ id, name }) => ({ id, name })),
    };
  }
  if (issue.projectMatch?.kind === "none") {
    return {
      ok: false,
      needsClarification: true,
      reason: "project_not_found",
      message: `Nao encontrei projeto para "${issue.projectMatch.query}".`,
    };
  }
  if (issue.projectMatch?.kind === "ambiguous") {
    return {
      ok: false,
      needsClarification: true,
      reason: "project_ambiguous",
      message: "Projeto ambiguo. Escolha um projeto.",
      matches: issue.projectMatch.matches.map(({ id, name }) => ({ id, name })),
    };
  }
  return null;
}

async function resolveTagIds(api: UxnHoursApiClient, tagIds: string[], tagNames: string[]) {
  if (tagNames.length === 0) {
    return {
      tagIds: Array.from(new Set(tagIds)),
      unresolved: [],
      ambiguous: [],
    };
  }
  const tags = await api.listTags();
  const resolved = new Set(tagIds);
  const unresolved: string[] = [];
  const ambiguous: Array<{ query: string; matches: UxnHoursTag[] }> = [];

  for (const tagName of tagNames) {
    const match = resolveByName(tags, tagName);
    if (match.kind === "match") {
      resolved.add(match.value.id);
    } else if (match.kind === "ambiguous") {
      ambiguous.push({ query: tagName, matches: match.matches });
    } else {
      unresolved.push(tagName);
    }
  }

  return {
    tagIds: Array.from(resolved),
    unresolved,
    ambiguous,
  };
}

function summarizeEntries(entries: Array<{ durationMinutes: number }>) {
  const minutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  return {
    count: entries.length,
    durationMinutes: minutes,
    duration: summarizeMinutes(minutes),
  };
}

export function createUxnHoursTool(options: UxnHoursToolOptions = {}): AnyAgentTool {
  return {
    label: "UXN Hours",
    name: "uxn_hours",
    description:
      "Read and create UXN Gestao hours entries. Use for WhatsApp requests to launch hours for clients, list clients/projects/tags, and summarize day or month. Tags are optional.",
    parameters: UxnHoursToolSchema,
    execute: async (_toolCallId, args) => {
      const params = (args ?? {}) as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });
      const api = resolveClient(options);

      if (action === "list_clients") {
        return jsonResult({ ok: true, clients: await api.listClients() });
      }
      if (action === "list_projects") {
        return jsonResult({ ok: true, projects: await api.listProjects() });
      }
      if (action === "list_tags") {
        return jsonResult({ ok: true, tags: await api.listTags(), optional: true });
      }
      if (action === "list_entries") {
        const from = readStringParam(params, "from", { required: true });
        const to = readStringParam(params, "to", { required: true });
        const entries = await api.listEntries({ from, to });
        return jsonResult({ ok: true, entries, summary: summarizeEntries(entries) });
      }
      if (action === "summarize_day") {
        const date = readStringParam(params, "workDate") ?? todayKey();
        const entries = await api.listEntries({ from: date, to: date });
        return jsonResult({ ok: true, date, entries, summary: summarizeEntries(entries) });
      }
      if (action === "summarize_month") {
        const range = monthRange(readStringParam(params, "month") ?? currentMonthKey());
        const entries = await api.listEntries(range);
        return jsonResult({ ok: true, ...range, entries, summary: summarizeEntries(entries) });
      }
      if (action === "create_entry") {
        const requireConfirmation = options.pluginConfig?.requireConfirmationForCreate !== false;
        if (requireConfirmation && params.confirmed !== true) {
          return jsonResult({
            ok: false,
            needsConfirmation: true,
            message: "Confirme antes de criar o apontamento de horas.",
          });
        }

        const resolution = await resolveClientAndProject({
          api,
          clientId: readStringParam(params, "clientId"),
          clientName: readStringParam(params, "clientName"),
          projectId: readStringParam(params, "projectId"),
          projectName: readStringParam(params, "projectName"),
        });
        const issue = formatClientProjectResolutionIssue(resolution);
        if (issue) {
          return jsonResult(issue);
        }
        if (!resolution.client) {
          return jsonResult({
            ok: false,
            needsClarification: true,
            reason: "client_required",
            message: "Informe o cliente para lancar horas.",
          });
        }

        const tagResolution = await resolveTagIds(
          api,
          cleanIdList(params.tagIds),
          cleanIdList(params.tagNames),
        );
        if (tagResolution.unresolved.length > 0 || tagResolution.ambiguous.length > 0) {
          return jsonResult({
            ok: false,
            needsClarification: true,
            reason: "tag_resolution_failed",
            message: "Tags sao opcionais; remova ou escolha uma tag existente.",
            unresolved: tagResolution.unresolved,
            ambiguous: tagResolution.ambiguous.map((item) => ({
              query: item.query,
              matches: item.matches.map(({ id, name }) => ({ id, name })),
            })),
          });
        }

        const activity = readStringParam(params, "activity", { required: true });
        const workDate = readStringParam(params, "workDate") ?? todayKey();
        const durationMinutes =
          typeof params.durationMinutes === "number" && Number.isFinite(params.durationMinutes)
            ? Math.trunc(params.durationMinutes)
            : undefined;

        const entry = await api.createEntry({
          clientId: resolution.client.id,
          planId: resolution.project?.id ?? resolution.client.plan?.id ?? null,
          activity,
          workDate,
          startTime: readStringParam(params, "startTime") ?? null,
          endTime: readStringParam(params, "endTime") ?? null,
          durationMinutes: durationMinutes ?? null,
          notes: readStringParam(params, "notes") ?? null,
          tagIds: tagResolution.tagIds,
        });

        return jsonResult({
          ok: true,
          entry,
          client: { id: resolution.client.id, name: resolution.client.name },
          project: resolution.project
            ? { id: resolution.project.id, name: resolution.project.name }
            : null,
          duration: summarizeMinutes(entry.durationMinutes),
          message: `Lancado ${summarizeMinutes(entry.durationMinutes)} para ${resolution.client.name}.`,
        });
      }

      throw new Error(`Unsupported UXN Hours action: ${action}`);
    },
  };
}
