import { PersistedState } from "runed";

export const AUTO_REFRESH_STORAGE_KEY = "auto-refresh";
export const BRAINROT_STORAGE_KEY = "brainrot";
export const BRAINROT_LEVEL_STORAGE_KEY = "brainrot-level";

export type BrainrotLevel = "off" | "on" | "weeb";

export const autoRefresh = new PersistedState(AUTO_REFRESH_STORAGE_KEY, false, {
    serializer: {
        serialize: String,
        deserialize: (value) => value === "true",
    },
});

export const brainrot = new PersistedState(BRAINROT_STORAGE_KEY, false, {
    serializer: {
        serialize: String,
        deserialize: (value) => value === "true",
    },
});

export const brainrotLevel = new PersistedState<BrainrotLevel>(BRAINROT_LEVEL_STORAGE_KEY, "off", {
    serializer: {
        serialize: String,
        deserialize: (value) => {
            if (value === "on" || value === "weeb") return value;
            if (value === "paper-chan") return "weeb";
            return "off";
        },
    },
});

export function setAutoRefresh(next: boolean): void {
    autoRefresh.current = next;
}

export function setBrainrot(next: boolean): void {
    brainrot.current = next;
}

export function setBrainrotLevel(next: BrainrotLevel): void {
    brainrotLevel.current = next;
}
