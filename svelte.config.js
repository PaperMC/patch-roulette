import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const cloudflareAdapter = adapter({
  // Where the adapter writes the generated `_worker.js` and static assets at build time.
  config: "wrangler.svelte.jsonc",
  // Bindings exposed to `vite dev` (`event.platform.env`) come from the dev config.
  platformProxy: { configPath: "wrangler.dev.jsonc" },
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: cloudflareAdapter,
  },
};

export default config;
