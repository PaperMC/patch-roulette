import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { ApiError, fetchApi } from "./api";

export const TOKEN_STORAGE_KEY = "token";

// Module state is safe here only because the app is fully prerendered
// (client-only); revisit if SSR is introduced.
export const auth: { token: string | null; username: string | null } = $state({
    token: null,
    username: null,
});

function usernameFromToken(token: string): string {
    try {
        return atob(token).split(":")[0];
    } catch {
        return "";
    }
}

/** Reads the stored token (e.g. on app start) and syncs auth across tabs. */
export function initAuth(): void {
    if (!browser) return;

    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
        auth.token = stored;
        auth.username = usernameFromToken(stored);
    }

    $effect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.storageArea !== localStorage || event.key !== TOKEN_STORAGE_KEY) return;
            if (event.newValue) {
                auth.token = event.newValue;
                auth.username = usernameFromToken(event.newValue);
            } else {
                // Logged out in another tab — end the session here too.
                auth.token = null;
                auth.username = null;
                if (!window.location.pathname.startsWith("/login")) {
                    goto(resolve("/login"));
                }
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    });
}

/**
 * Validates credentials against the backend and stores the token on success.
 * The token is set before the request so fetchApi attaches Basic auth; it is
 * cleared again on any failure so a bad login never leaves a session behind.
 */
export async function login(username: string, password: string): Promise<void> {
    const newToken = btoa(`${username}:${password}`);
    auth.token = newToken;
    auth.username = username;
    try {
        await fetchApi<void>("/test-login", { method: "POST" });
    } catch (error) {
        auth.token = null;
        auth.username = null;
        throw error;
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
}

/** Clears the session and redirects to the login page. */
export function logout(): void {
    auth.token = null;
    auth.username = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (browser) goto(resolve("/login"));
}

/**
 * Shared 401 handling: clears the session and redirects to /login.
 * No-ops when there is no session, so a failed login attempt on the login
 * page (no token yet) does not loop or bounce the user.
 */
export function handleUnauthorized(): void {
    if (!auth.token) return;
    auth.token = null;
    auth.username = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (browser && !window.location.pathname.startsWith("/login")) {
        goto(resolve("/login"));
    }
}

export { ApiError };
