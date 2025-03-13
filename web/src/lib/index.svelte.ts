import { fetchApi } from "./api";
import type { PatchDetails, Stats } from "$lib/types";

export const token: { value: string | null } = $state({ value: null });
export const patches: { value: PatchDetails[] } = $state({ value: [] });
export const stats: { value: Stats | null } = $state({ value: null });
export const refreshing: { value: boolean } = $state({ value: false });

export function getUsername() {
    if (token.value == null) {
        throw new Error("No token present.");
    }
    return atob(token.value).split(":")[0];
}

export async function onVersionSelect(mcVersion: string) {
    try {
        refreshing.value = true;
        await onVersionSelect_(mcVersion);
    } finally {
        refreshing.value = false;
    }
}

async function onVersionSelect_(mcVersion: string) {
    if (!mcVersion) {
        alert("Please enter a Minecraft version.");
        return;
    }

    const patchResponse = await fetchApi(`/get-all-patches?minecraftVersion=${mcVersion}`, {
        method: "GET",
        token: localStorage.getItem("token")!,
    });

    if (patchResponse.ok) {
        patches.value = await patchResponse.json();
    } else {
        alert("Failed to fetch patches. Please try again.");
    }

    const statsResponse = await fetchApi(`/stats?minecraftVersion=${mcVersion}`, {
        method: "GET",
        token: localStorage.getItem("token")!,
    });

    if (statsResponse.ok) {
        stats.value = await statsResponse.json();
    } else {
        alert("Failed to fetch stats. Please try again.");
    }
}
