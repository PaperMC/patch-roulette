import { PersistedState } from "runed";

export const AUTO_REFRESH_STORAGE_KEY = "auto-refresh";

export const autoRefresh = new PersistedState(AUTO_REFRESH_STORAGE_KEY, false, {
    serializer: {
        serialize: String,
        deserialize: (value) => value === "true",
    },
});

export function setAutoRefresh(next: boolean): void {
    autoRefresh.current = next;
}
