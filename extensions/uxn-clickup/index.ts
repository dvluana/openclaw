import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createUxnClickUpTool } from "./src/tool.js";

export default definePluginEntry({
  id: "uxn-clickup",
  name: "UXN ClickUp",
  description: "Restricted ClickUp API tool for UXNaut WhatsApp task operations.",
  register(api) {
    api.registerTool((ctx) =>
      createUxnClickUpTool({
        config: ctx.runtimeConfig ?? ctx.config,
        pluginConfig: api.pluginConfig as {
          apiBase?: string;
          configPath?: string;
          token?: string | { source?: string; provider?: string; id?: string };
          credentialsPath?: string;
        },
      }),
    );
  },
});
