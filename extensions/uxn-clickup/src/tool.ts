import { jsonResult, readStringParam } from "openclaw/plugin-sdk/channel-actions";
import type { AnyAgentTool, OpenClawConfig } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";
import { ClickUpApiClient } from "./client.js";
import {
  getClientConfig,
  loadClickUpSyncConfig,
  resolveApiBase,
  resolveClickUpToken,
  type UxnClickUpPluginConfig,
} from "./config.js";
import {
  findDoneTaskCandidates,
  findTaskCandidates,
  resolveTaskMatch,
  type UxnClickUpTaskRecord,
} from "./match.js";

type UxnClickUpToolOptions = {
  config?: OpenClawConfig;
  pluginConfig?: UxnClickUpPluginConfig;
  fetchImpl?: typeof fetch;
};

const UxnClickUpToolSchema = Type.Object({
  action: Type.Union([
    Type.Literal("lookup_task"),
    Type.Literal("search"),
    Type.Literal("plan_update_status"),
    Type.Literal("update_status"),
  ]),
  client: Type.String({
    description: "Configured client slug, for example ctech, retrilhar, stant.",
  }),
  query: Type.Optional(Type.String({ description: "Human title fragment to search." })),
  titleExact: Type.Optional(Type.String({ description: "Exact ClickUp task title." })),
  includeDone: Type.Optional(
    Type.Boolean({ description: "Include tasks mapped to markdown state feito." }),
  ),
  mdState: Type.Optional(
    Type.Union([
      Type.Literal("backlog"),
      Type.Literal("fazendo"),
      Type.Literal("feito"),
      Type.Literal("impedido"),
    ]),
  ),
  confirmed: Type.Optional(Type.Boolean({ description: "Must be true for update_status." })),
});

function normalizeAction(action: string) {
  return action === "search" ? "lookup_task" : action;
}

function compactRecord(record: UxnClickUpTaskRecord) {
  return {
    id: record.id,
    title: record.title,
    modulo: record.modulo,
    nome: record.nome,
    status: record.status,
    mdState: record.mdState,
    url: record.url,
  };
}

function needsTaskQuery(params: Record<string, unknown>) {
  if (!readStringParam(params, "query") && !readStringParam(params, "titleExact")) {
    return jsonResult({
      ok: false,
      needsClarification: true,
      reason: "task_query_required",
      message: "Informe um fragmento do nome da task ou o titulo exato.",
    });
  }
  return null;
}

export function createUxnClickUpTool(options: UxnClickUpToolOptions = {}): AnyAgentTool {
  return {
    label: "UXN ClickUp",
    name: "uxn_clickup",
    description:
      "Restricted ClickUp API tool for UXNaut. Use for WhatsApp task lookup, planning status updates, and applying unambiguous status updates. action=search is a read-only alias for lookup_task. Do not use shell or exec for ClickUp in WhatsApp.",
    parameters: UxnClickUpToolSchema,
    execute: async (_toolCallId, args) => {
      const params = (args ?? {}) as Record<string, unknown>;
      const requestedAction = readStringParam(params, "action", { required: true });
      const action = normalizeAction(requestedAction);
      const clientSlug = readStringParam(params, "client", { required: true }).toLowerCase();
      const loaded = loadClickUpSyncConfig(options.pluginConfig);
      const clientEntry = getClientConfig(loaded.config, clientSlug);
      if (!clientEntry) {
        return jsonResult({
          ok: false,
          needsClarification: true,
          reason: "client_not_configured",
          message: `Cliente "${clientSlug}" nao esta configurado no clickup-sync.`,
          configuredClients: Object.keys(loaded.config.clientes).sort(),
        });
      }

      const api = new ClickUpApiClient({
        apiBase: resolveApiBase(options.pluginConfig, loaded.config),
        token: resolveClickUpToken(options.pluginConfig),
        fetchImpl: options.fetchImpl,
      });
      const tasks = await api.listTasks(clientEntry.config.list_id);
      const query = readStringParam(params, "query");
      const titleExact = readStringParam(params, "titleExact");

      if (action === "lookup_task") {
        const queryProblem = needsTaskQuery(params);
        if (queryProblem) {
          return queryProblem;
        }
        const active = findTaskCandidates(tasks, clientEntry.config, {
          query,
          titleExact,
          includeDone: params.includeDone === true,
        });
        if (active.length > 0) {
          return jsonResult({
            ok: true,
            client: clientEntry.slug,
            state: "active_or_included",
            count: active.length,
            matches: active.map(compactRecord),
          });
        }
        const done = findDoneTaskCandidates(tasks, clientEntry.config, { query, titleExact });
        return jsonResult({
          ok: done.length > 0,
          client: clientEntry.slug,
          state: done.length > 0 ? "done_only" : "not_found",
          count: done.length,
          matches: done.map(compactRecord),
          message:
            done.length > 0
              ? "So encontrei task ja mapeada como feita/concluida."
              : "Nao encontrei task com esse termo no cliente informado.",
        });
      }

      if (action === "plan_update_status" || action === "update_status") {
        const queryProblem = needsTaskQuery(params);
        if (queryProblem) {
          return queryProblem;
        }
        const mdState = readStringParam(params, "mdState", { required: true });
        const targetStatus = clientEntry.config.status_map.markdown_to_clickup[mdState];
        if (!targetStatus) {
          return jsonResult({
            ok: false,
            needsClarification: true,
            reason: "md_state_not_mapped",
            message: `Estado markdown "${mdState}" nao tem status ClickUp mapeado para ${clientEntry.slug}.`,
            allowedStates: Object.keys(clientEntry.config.status_map.markdown_to_clickup),
          });
        }

        const resolution = resolveTaskMatch(tasks, clientEntry.config, { query, titleExact });
        if (resolution.kind === "none") {
          return jsonResult({
            ok: false,
            needsClarification: true,
            reason: "task_not_found",
            message: "Nao encontrei task ativa com esse termo.",
          });
        }
        if (resolution.kind === "done") {
          return jsonResult({
            ok: false,
            noop: true,
            reason: "already_done",
            match: compactRecord(resolution.match),
            message: "A task ja esta mapeada como feita/concluida. Nao alterei.",
          });
        }
        if (resolution.kind === "ambiguous_active" || resolution.kind === "ambiguous_done") {
          return jsonResult({
            ok: false,
            needsClarification: true,
            reason: "task_ambiguous",
            matches: resolution.matches.map(compactRecord),
            message: "Encontrei mais de uma task. Informe o titulo exato ou link.",
          });
        }

        const plan = {
          client: clientEntry.slug,
          task: compactRecord(resolution.match),
          mdState,
          targetStatus,
        };

        if (action === "plan_update_status") {
          return jsonResult({
            ok: true,
            needsConfirmation: true,
            plan,
            message: `Plano: mover "${resolution.match.title}" para ClickUp status "${targetStatus}".`,
          });
        }

        if (params.confirmed !== true) {
          return jsonResult({
            ok: false,
            needsConfirmation: true,
            plan,
            message: "Confirme antes de aplicar a mudanca no ClickUp.",
          });
        }

        const updated = await api.updateTaskStatus(resolution.match.id, targetStatus);
        return jsonResult({
          ok: true,
          client: clientEntry.slug,
          before: compactRecord(resolution.match),
          after: {
            id: updated.id,
            title: updated.name,
            status: updated.status?.status ?? targetStatus,
            url: updated.url ?? resolution.match.url,
          },
          mdState,
          targetStatus,
          message: `Atualizado: "${resolution.match.title}" -> ${targetStatus}.`,
        });
      }

      throw new Error(`Unsupported UXN ClickUp action: ${action}`);
    },
  };
}
