import fs from "node:fs";
import path from "node:path";

export type SecretRef = {
  source?: string;
  provider?: string;
  id?: string;
};

export type UxnClickUpPluginConfig = {
  apiBase?: string;
  configPath?: string;
  token?: string | SecretRef;
  credentialsPath?: string;
};

export type ClickUpSyncClientConfig = {
  list_id: string;
  cliente_prefix: string;
  status_map: {
    markdown_to_clickup: Record<string, string>;
    clickup_to_markdown: Record<string, string>;
  };
};

export type ClickUpSyncConfig = {
  api_base?: string;
  clientes: Record<string, ClickUpSyncClientConfig>;
};

const DEFAULT_CONFIG_PATH =
  "/home/luana/.openclaw/workspace-uxnaut/skills/clickup-sync/config.json";
const DEFAULT_CREDENTIALS_PATH = "/home/luana/.openclaw/credentials/clickup/env";

function isSecretRef(value: unknown): value is SecretRef {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readEnvFileValue(filePath: string, key: string) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [name, ...rest] = trimmed.split("=");
    if (name === key) {
      return rest
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

export function resolveStringSecret(
  value: string | SecretRef | undefined,
  envName: string,
  credentialsPath = DEFAULT_CREDENTIALS_PATH,
) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (isSecretRef(value) && value.source === "env" && value.id) {
    return process.env[value.id]?.trim() ?? "";
  }
  if (isSecretRef(value) && value.source === "file" && value.id) {
    return readEnvFileValue(value.id, envName);
  }
  return process.env[envName]?.trim() || readEnvFileValue(credentialsPath, envName);
}

export function loadClickUpSyncConfig(pluginConfig?: UxnClickUpPluginConfig) {
  const configPath = pluginConfig?.configPath?.trim() || DEFAULT_CONFIG_PATH;
  const config = JSON.parse(fs.readFileSync(path.resolve(configPath), "utf8")) as ClickUpSyncConfig;
  return { configPath, config };
}

export function getClientConfig(config: ClickUpSyncConfig, clientSlug: string) {
  const key = clientSlug.trim().toLowerCase();
  return config.clientes[key] ? { slug: key, config: config.clientes[key] } : null;
}

export function resolveApiBase(
  pluginConfig: UxnClickUpPluginConfig | undefined,
  syncConfig: ClickUpSyncConfig,
) {
  return pluginConfig?.apiBase?.trim() || syncConfig.api_base || "https://api.clickup.com/api/v2";
}

export function resolveClickUpToken(pluginConfig?: UxnClickUpPluginConfig) {
  const credentialsPath = pluginConfig?.credentialsPath?.trim() || DEFAULT_CREDENTIALS_PATH;
  const token = resolveStringSecret(pluginConfig?.token, "CLICKUP_TOKEN", credentialsPath);
  if (!token) {
    throw new Error("UXN ClickUp needs CLICKUP_TOKEN or plugins.entries.uxn-clickup.config.token.");
  }
  return token;
}
