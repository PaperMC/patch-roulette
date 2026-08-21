import { browser } from "$app/environment";
import { PersistedState } from "runed";
import { MediaQuery } from "svelte/reactivity";

export type Theme = "light" | "dark" | "auto";
export type EffectiveTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

function isTheme(value: string | null): value is Theme {
    return value === "light" || value === "dark" || value === "auto";
}

export const theme = new PersistedState<Theme>(THEME_STORAGE_KEY, "auto", {
    // Keep the existing unquoted storage format used by app.html's pre-paint
    // script, while rejecting malformed values.
    serializer: {
        serialize: String,
        deserialize: (value) => (isTheme(value) ? value : "auto"),
    },
});

const prefersDark = new MediaQuery("(prefers-color-scheme: dark)");

/** The currently applied mode: "auto" resolves against prefers-color-scheme. */
export function effectiveTheme(): EffectiveTheme {
    return theme.current === "auto" ? (prefersDark.current ? "dark" : "light") : theme.current;
}

function applyTheme(): void {
    if (!browser) return;
    const mode = effectiveTheme();
    const root = document.documentElement;
    // Kumo's dark tokens only apply via data-mode="dark" on <html>; light is
    // the default. color-scheme is set explicitly so native controls (select
    // dropdowns, scrollbars, autofill) match the mode.
    root.setAttribute("data-mode", mode);
    root.style.colorScheme = mode;
}

/**
 * Sets the persisted theme preference ("light" | "dark" | "auto").
 * `effectiveTheme()` reacts immediately (and to OS changes while in auto
 * mode, via the MediaQuery).
 */
export function setTheme(next: Theme): void {
    theme.current = next;
}

/**
 * Applies the effective mode reactively. PersistedState handles storage and
 * cross-tab synchronization; app.html's pre-paint script handles initial paint.
 */
export function initTheme(): void {
    $effect(() => {
        applyTheme();
    });
}
