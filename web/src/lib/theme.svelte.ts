import { browser } from "$app/environment";
import { watchLocalStorage } from "$lib/util";

export type Theme = "dark" | "light" | "auto";

// Used indirectly in app.html
const themeKey = "theme";

function initialTheme() {
    if (browser) {
        const storedTheme = localStorage.getItem(themeKey);
        if (storedTheme) {
            return storedTheme as Theme;
        }
    }
    return "auto";
}

let theme: Theme = $state(initialTheme());

export function initThemeHooks() {
    watchLocalStorage(themeKey, (newValue) => {
        if (newValue) {
            theme = newValue as Theme;
        }
    });
    $effect(() => {
        localStorage.setItem(themeKey, theme);
        document.documentElement.setAttribute("data-theme", theme);
    });
}

export function setGlobalTheme(newTheme: Theme) {
    theme = newTheme;
}

export function getGlobalTheme(): Theme {
    return theme;
}
