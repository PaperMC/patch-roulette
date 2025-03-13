interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
    token?: string;
}

export async function fetchApi(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const { params = {}, token, ...fetchOptions } = options;

    const url = new URL(`${window.location.origin}/api${endpoint}`);
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const init = {
        headers: {
            ...fetchOptions.headers,
        },
        ...fetchOptions,
    };
    if (token) {
        init.headers = {
            ...init.headers,
            Authorization: `Basic ${token}`,
        };
    }
    return await fetch(url, init);
}
