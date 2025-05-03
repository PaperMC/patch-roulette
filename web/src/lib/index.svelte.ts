import { fetchApi } from "./api";
import type { PatchDetails, Stats } from "./types";

export const token: { value: string | null } = $state({ value: null });

export function getUsername() {
    if (token.value == null) {
        throw new Error("No token present.");
    }
    return atob(token.value).split(":")[0];
}

export class PatchRouletteState {
    patches: PatchDetails[] = $state([]);
    stats: Stats | null = $state(null);
    refreshing: boolean = $state(false);
    autoRefresh: boolean = $state(false);
    selectedVersion: string = $state("");

    private refreshTask: ReturnType<typeof setInterval> | null = null;

    constructor() {
        const refreshInterval = 1;

        $effect(() => {
            if (this.autoRefresh && this.selectedVersion) {
                this.refreshTask = setInterval(async () => {
                    await this.onVersionSelect(this.selectedVersion);
                }, refreshInterval * 60000); // interval is in minutes
            }

            return () => {
                if (this.refreshTask) {
                    clearInterval(this.refreshTask);
                    this.refreshTask = null;
                }
            };
        });
    }

    async onVersionSelect(mcVersion: string) {
        try {
            this.refreshing = true;
            await this.onVersionSelect_(mcVersion);
        } finally {
            this.refreshing = false;
        }
    }

    async onVersionSelect_(mcVersion: string) {
        if (!mcVersion) {
            alert("Please enter a Minecraft version.");
            return;
        }

        const patchResponse = await fetchApi(`/get-all-patches?minecraftVersion=${mcVersion}`, {
            method: "GET",
            token: localStorage.getItem("token")!,
        });

        if (patchResponse.ok) {
            this.patches = await patchResponse.json();
        } else {
            alert("Failed to fetch patches. Please try again.");
        }

        const statsResponse = await fetchApi(`/stats?minecraftVersion=${mcVersion}`, {
            method: "GET",
            token: localStorage.getItem("token")!,
        });

        if (statsResponse.ok) {
            this.stats = await statsResponse.json();
        } else {
            alert("Failed to fetch stats. Please try again.");
        }
    }
}
