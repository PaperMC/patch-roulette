import { browser } from "$app/environment";
import { createContext } from "svelte";
import { fetchApi } from "./api";
import { type UserProfile } from "./domain";

/** Whether the identity has been resolved, is signed in, is signed out, or could not be resolved. */
export type AuthStatus = "loading" | "authenticated" | "logged-out" | "failed";

export class AuthState {
  userId = $state<string | null>(null);
  username = $state<string | null>(null);
  status = $state<AuthStatus>("loading");

  /** Stores the current identity from an authenticated API response. */
  setUser(user: UserProfile): void {
    this.userId = user.id;
    this.username = user.username;
    this.status = "authenticated";
  }

  /** Ends the Cloudflare Access browser session. */
  logout(): void {
    if (!browser) return;
    this.userId = null;
    this.username = null;
    this.status = "logged-out";
    window.location.assign("/cdn-cgi/access/logout");
  }
}

export const [getAuth, setAuth] = createContext<AuthState>();

/**
 * Creates the per-request (SSR-safe) auth state and registers it in context.
 * Must be called during component initialization — see +layout.svelte.
 */
export function initAuth(): AuthState {
  const auth = new AuthState();
  setAuth(auth);
  if (browser) {
    void fetchApi<UserProfile>("/me")
      .then((user) => auth.setUser(user))
      .catch(() => {
        // Access owns the browser login flow; the next request will be
        // redirected or rejected by Access if the session is unavailable.
        auth.userId = null;
        auth.username = null;
        auth.status = "failed";
      });
  }
  return auth;
}
