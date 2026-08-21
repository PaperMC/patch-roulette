import { dispatchApi, dispatchDevApi, isApiRequest } from "./api";
import { PatchRoulette } from "./patch-roulette";
import { type Env } from "./types";

export { PatchRoulette };

type Worker = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>;
};

/** Production: Hono handles `/api`, SvelteKit (SSR + static) handles everything else. */
export const createWorker = (frontend: Worker): Worker => ({
  fetch: (request, env, ctx) =>
    isApiRequest(request) ? dispatchApi(request, env, ctx) : frontend.fetch(request, env, ctx),
});

/** Development: Hono only; `vite dev` serves the frontend and proxies `/api`. */
export const createDevWorker = (): Worker => ({
  fetch: (request, env, ctx) => dispatchDevApi(request, env, ctx),
});
