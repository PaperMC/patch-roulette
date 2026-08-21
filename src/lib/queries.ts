import { autoRefresh } from "./settings.svelte";

/** Query key factory — views create their own queries with these keys. */
export const queryKeys = {
  versions: ["versions"] as const,
  patches: {
    /** Root key matching every version — use for broad invalidation. */
    all: ["patches"] as const,
    forVersion: (version: string) => [...queryKeys.patches.all, version] as const,
  },
  stats: {
    /** Root key matching every version — use for broad invalidation. */
    all: ["stats"] as const,
    forVersion: (version: string) => [...queryKeys.stats.all, version] as const,
  },
};

/** Shared query options; spread into createQuery option thunks. */
export const baseQueryOptions = {
  staleTime: 15_000,
} as const;

/**
 * refetchInterval helper — 60s while the auto-refresh setting is on.
 * Reads the reactive `autoRefresh` state, so calling it inside a
 * createQuery option thunk keeps the interval reactive.
 */
export function refreshInterval(): number | false {
  return autoRefresh.current ? 60_000 : false;
}
