<script lang="ts">
    import { getUsername, onVersionSelect, token } from "$lib/index.svelte";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchApi } from "$lib/api";

    let minecraftVersions: string[] = $state([]);
    let selectedVersion = $state("");

    async function loadMinecraftVersions() {
        const response = await fetchApi("/get-minecraft-versions", {
            method: "GET",
            token: token.value!,
        });

        if (response.ok) {
            minecraftVersions = await response.json();
        } else {
            console.error("Failed to fetch Minecraft versions");
        }
    }

    async function handleVersionSelect(event: Event) {
        selectedVersion = (event.target as HTMLSelectElement).value;
        if (selectedVersion === "" || selectedVersion === null) {
            document.getElementById("patches-container")?.classList.add("hidden");
        } else if (selectedVersion) {
            document.getElementById("patches-container")?.classList.remove("hidden");

            await onVersionSelect(event.target as HTMLSelectElement);
        }
    }

    onMount(async () => {
        token.value = localStorage.getItem("token");

        if (token.value === null) {
            await goto("/login");
        } else {
            await loadMinecraftVersions();
        }
    });
</script>

<div id="content-container" class="flex min-h-screen items-center justify-center p-4">
    <div class="w-full max-w-10/12 rounded-lg bg-white p-6 shadow-md">
        <h2 class="mb-4 text-2xl font-bold text-gray-800">Patch Roulette</h2>
        <p id="user-info" class="mb-4 text-sm text-gray-600">
            Logged in as: <span id="logged-user" class="font-medium">{token.value === null ? "" : getUsername()}</span>
        </p>

        <div class="mb-4">
            <label for="mcVersion" class="mb-2 block text-sm font-bold text-gray-700">Minecraft Version</label>
            <select
                id="mcVersion"
                bind:value={selectedVersion}
                onchange={handleVersionSelect}
                class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                <option value="">Select a version...</option>
                {#each minecraftVersions as version (version)}
                    <option value={version}>{version}</option>
                {/each}
            </select>
        </div>

        <div id="patches-container" class="mt-6 hidden">
            <h3 class="mb-3 text-xl font-semibold text-gray-800">Patches{selectedVersion === null ? "" : " for " + selectedVersion}</h3>
            <div class="max-h-80 rounded border border-gray-200 p-2">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="sticky top-0 bg-gray-50">
                        <tr>
                            <th class="w-8/12 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Path</th>
                            <th class="w-1/12 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Status</th>
                            <th class="w-3/12 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Responsible User</th>
                        </tr>
                    </thead>
                </table>
                <div class="max-h-64 overflow-y-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <tbody id="patches-list" class="divide-y divide-gray-200 bg-white">
                            <!-- Patches will be loaded here -->
                            <tr><td colspan="3" class="py-4 text-center text-gray-500 italic">Loading patches for {selectedVersion}...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="mt-6 flex justify-end">
            <button
                id="logout-button"
                type="button"
                class="focus:shadow-outline rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400 focus:outline-none"
                onclick={() => {
                    localStorage.removeItem("token");
                    token.value = null;
                    goto("/login");
                }}
            >
                Logout
            </button>
        </div>
    </div>
</div>
