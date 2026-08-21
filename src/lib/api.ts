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
 * Fetches from the same-origin API under `/api`. Cloudflare Access handles
 * browser and Managed OAuth authentication before the request reaches the
 * Worker. Throws `ApiError` with the text body as message on non-2xx
 * responses. Parses JSON responses; returns `undefined` for non-JSON
 * (e.g. text/plain) responses.
 */
export async function fetchApi<T>(path: string, options: FetchApiOptions = {}): Promise<T> {
    const { method = "GET", body, params, signal } = options;

    const query = params ? new URLSearchParams(params).toString() : "";
    const url = `/api${path}${query ? `?${query}` : ""}`;

    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
    });

    if (!response.ok) {
        const message = (await response.text()) || response.statusText || `Request failed with status ${response.status}`;
        throw new ApiError(response.status, message);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        return (await response.json()) as T;
    }
    return undefined as T;
}
