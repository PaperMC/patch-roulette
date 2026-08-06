import { auth } from "./auth.svelte";
import { handleUnauthorized } from "./auth.svelte";

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export interface FetchApiOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    /** JSON body; serialized and sent with Content-Type: application/json. */
    body?: unknown;
    /** Query string parameters. */
    params?: Record<string, string>;
    signal?: AbortSignal;
}

/**
 * Fetches from the backend API under `/api`. Attaches Basic auth from the
 * auth module when a token exists. Throws `ApiError` with the text body as
 * message on non-2xx responses; a 401 also triggers the shared
 * auto-logout/redirect handling. Parses JSON responses; returns `undefined`
 * for non-JSON (e.g. text/plain) responses.
 */
export async function fetchApi<T>(path: string, options: FetchApiOptions = {}): Promise<T> {
    const { method = "GET", body, params, signal } = options;

    const query = params ? new URLSearchParams(params).toString() : "";
    const url = `/api${path}${query ? `?${query}` : ""}`;

    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth.token) headers["Authorization"] = `Basic ${auth.token}`;

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
    });

    if (!response.ok) {
        const message = (await response.text()) || response.statusText || `Request failed with status ${response.status}`;
        if (response.status === 401) {
            handleUnauthorized();
        }
        throw new ApiError(response.status, message);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        return (await response.json()) as T;
    }
    return undefined as T;
}
