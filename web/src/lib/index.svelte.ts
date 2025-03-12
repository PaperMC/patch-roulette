import { fetchApi } from "./api";
import type { PatchDetails } from "$lib/types";

export const token: { value: string | null } = $state({ value: null });

export function getUsername() {
    if (token.value == null) {
        throw new Error("No token present.");
    }
    return atob(token.value).split(":")[0];
}

export async function onVersionSelect(select: HTMLSelectElement) {
    const mcVersion = select.value;
    if (!mcVersion) {
        alert("Please enter a Minecraft version.");
        return;
    }

    const response = await fetchApi(`/get-all-patches?minecraftVersion=${mcVersion}`, {
        method: "GET",
        token: localStorage.getItem("token")!,
    });

    if (response.ok) {
        const patches: PatchDetails[] = await response.json();
        const patchesList = document.getElementById("patches-list");
        if (patchesList == null) {
            throw Error("Patches list not found.");
        }
        patchesList.innerHTML = "";

        if (patches.length === 0) {
            patchesList.innerHTML = '<tr><td colspan="3" class="text-gray-500 italic text-center py-4">No patches available for this version.</td></tr>';
        } else {
            patches.forEach((patch) => {
                const patchRow = document.createElement("tr");
                patchRow.className = "patch-item border-b border-gray-200";
                patchRow.innerHTML = `
                    <td class="p-2 w-8/12">${patch.path}</td>
                    <td class="p-2 w-1/12">${patch.status}</td>
                    <td class="p-2 w-3/12">${patch.responsibleUser}</td>
                `;
                patchesList.appendChild(patchRow);
            });
        }

        document.getElementById("patches-container")!.classList.remove("hidden");
    } else {
        alert("Failed to fetch patches. Please try again.");
    }
}
