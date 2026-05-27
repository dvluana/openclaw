import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createUxnHoursTool } from "./src/tool.js";

export default definePluginEntry({
  id: "uxn-hours",
  name: "UXN Hours",
  description: "UXN Gestao hours tool for agents and WhatsApp requests.",
  register(api) {
    api.registerTool((ctx) =>
      createUxnHoursTool({
        config: ctx.runtimeConfig ?? ctx.config,
        pluginConfig: api.pluginConfig as {
          baseUrl?: string;
          token?: string | { source?: string; provider?: string; id?: string };
          requireConfirmationForCreate?: boolean;
        },
      }),
    );
  },
});
