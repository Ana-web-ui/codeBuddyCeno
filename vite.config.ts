
import vinext from "vinext";
import { createRequire } from "node:module";
import { defineConfig, type PluginOption } from "vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";
import { connectorPreview } from "./build/connector-preview-plugin.mjs";

// ==========================================
// 1. CONFIGURACOES ORIGINAIS
// ==========================================

const require = createRequire(import.meta.url);
const tslibEsm = require.resolve("tslib/tslib.es6.mjs");

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// ==========================================
// 2. IDENTIFICACAO DO AMBIENTE
// ==========================================

// Detecta quando o projeto esta na Vercel.
const isVercel = process.env.VERCEL === "1";

// Configuracoes originais de desenvolvimento.
const isCodexSeatbeltSandbox =
  process.env.CODEX_SANDBOX === "seatbelt";

const managedLinux =
  readExecutionProfile() === "managed-linux";

// ==========================================
// 3. CONFIGURACOES CLOUDFLARE ORIGINAIS
// ==========================================

const localBindingConfig = {
  main: "./build/sites-worker.ts",
  compatibility_flags: ["nodejs_compat"],

  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id:
            SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],

  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

// ==========================================
// 4. CONFIGURACAO VITE
// ==========================================

export default defineConfig(async ({ command }) => {

  // Configuracoes originais do Cloudflare.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??=
    ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??=
    ".wrangler/registry";

  // Carrega Cloudflare somente fora da Vercel.
  const cloudflare = isVercel
    ? null
    : (await import("@cloudflare/vite-plugin"))
        .cloudflare;

  // ========================================
  // 5. PLUGINS ORIGINAIS
  // ========================================

 const plugins: PluginOption[] = [
    vinext(),
    tailwindcss(),
    {
      name: 'code-buddy-ssr-diagnostics',
      enforce: 'pre',
      transform(code, id) {
        if (!id.replace(/\\/g, '/').endsWith('/vinext/dist/server/app-ssr-entry.js')) return;
        return code.replace('errorMetaRenderer.capture(error);',
          "console.error('[Code Buddy SSR]', error); errorMetaRenderer.capture(error);");
      },
    },

   sites({
  mockAuth: !managedLinux && !isVercel,
}),
    connectorPreview(),
  ];

  // ========================================
  // 6. ADAPTADOR DE HOSPEDAGEM
  // ========================================

  if (isVercel) {

    // Vercel utiliza Nitro.
    plugins.push(nitro({
      // A função da Vercel executa em Node; preserva a interoperabilidade CJS/ESM.
      rolldownConfig: { platform: "node" },
    }));

  } else {

    // Mantem a configuracao Cloudflare.
    if (!cloudflare) {
      throw new Error(
        "Plugin Cloudflare nao foi carregado."
      );
    }

    plugins.push(
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },

        inspectorPort: false,

        config: {
          ...localBindingConfig,

          ...(command === "serve"
            ? {
                services: [
                  {
                    binding: "CONNECTORS",
                    service:
                      "sites-connector-preview",
                    entrypoint:
                      "ConnectorPreview",
                  },
                ],
              }
            : {}),
        },

        ...(command === "serve"
          ? {
              auxiliaryWorkers: [
                {
                  config: {
                    name:
                      "sites-connector-preview",
                    main:
                      "./build/connector-preview-worker.mjs",
                    compatibility_date:
                      "2026-05-15",
                  },
                },
              ],
            }
          : {}),
      })
    );
  }

  // ========================================
  // 7. RETORNO FINAL
  // ========================================

  return {
    // Usa os helpers ESM em todas as instalações, inclusive no layout isolado do pnpm.
    resolve: { alias: [{ find: /^tslib$/, replacement: tslibEsm }] },
    ssr: { noExternal: ['tslib'] },
    server: {
      ...(managedLinux
        ? {
            host: "0.0.0.0",
            allowedHosts: ["terminal.local"],
          }
        : {}),

      ...(isCodexSeatbeltSandbox
        ? {
            watch: {
              useFsEvents: false,
              usePolling: true,
            },
          }
        : {}),
    },

    plugins,
  };
});
