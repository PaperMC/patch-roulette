/// <reference types="@cloudflare/workers-types" />

import { type Env } from "$lib/server/types";

declare global {
  namespace App {
    interface Platform {
      env: Env;
      ctx: ExecutionContext;
    }
  }
}

export {};
