interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
    token?: string;
}

export async function fetchApi(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const { params = {}, token, ...fetchOptions } = options;

    const base = `/api${endpoint}`;
    const query = new URLSearchParams(params).toString();
    const url = query ? `${base}${base.includes("?") ? "&" : "?"}${query}` : base;

    const init: RequestInit = { ...fetchOptions };
    if (token) {
        init.headers = { ...init.headers, Authorization: `Basic ${token}` };
    }
    return await fetch(url, init);
}
