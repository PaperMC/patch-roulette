// Wrap the generated SvelteKit Worker so the API and frontend share one Worker.
import frontend from "../.svelte-kit/cloudflare/_worker.js";
import { createWorker } from "./lib/server/worker";

export { PatchRoulette } from "./lib/server/worker";

export default createWorker(frontend);
