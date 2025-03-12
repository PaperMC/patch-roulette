import { getApiUrl } from "$lib/config";

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
    token?: string;
}

export async function fetchApi(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const { params = {}, token, ...fetchOptions } = options;

    const apiUrl = getApiUrl();
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : window.location.origin + apiUrl;

    const url = new URL(`${baseUrl}${endpoint}`);
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
