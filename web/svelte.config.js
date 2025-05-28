import bunAdapter from "svelte-adapter-bun";
import staticAdapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

let adapter = staticAdapter({
    fallback: process.env.PREVIEW === "true" ? "index.html" : "frontend.html",
});
if (process.env.NODE_ENV === "development") {
    adapter = bunAdapter();
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter,
    },
};

export default config;
