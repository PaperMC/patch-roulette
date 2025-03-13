import { fetchApi } from "./api";
import type { PatchDetails } from "$lib/types";

export const token: { value: string | null } = $state({ value: null });
export const patches: { value: PatchDetails[] } = $state({ value: [] });

export function getUsername() {
    if (token.value == null) {
        throw new Error("No token present.");
    }
    return atob(token.value).split(":")[0];
}

export async function onVersionSelect(mcVersion: string) {
    if (!mcVersion) {
        alert("Please enter a Minecraft version.");
        return;
    }

    const response = await fetchApi(`/get-all-patches?minecraftVersion=${mcVersion}`, {
        method: "GET",
        token: localStorage.getItem("token")!,
    });

    if (response.ok) {
        patches.value = await response.json();
    } else {
        alert("Failed to fetch patches. Please try again.");
    }
}
