<script lang="ts">
    import { getUsername, onVersionSelect, patches, token, stats } from "$lib/index.svelte";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchApi } from "$lib/api";
    import PatchesTable from "$lib/components/PatchesTable.svelte";
    import PatchesStats from "$lib/components/PatchesStats.svelte";

    const views = ["table", "stats"] as const;
    type View = (typeof views)[number];
    let currentView: View = $state("stats");

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
            return;
        } else if (selectedVersion) {
            await onVersionSelect((event.target as HTMLSelectElement).value);
        }
    }

    onMount(async () => {
        token.value = localStorage.getItem("token");

        if (token.value === null) {
            await goto("/login");
            return;
        }

        await loadMinecraftVersions();

        // TODO remove auto select 1.21.5-pre1
        selectedVersion = "1.21.5-pre1";
        await onVersionSelect(selectedVersion);
    });
</script>

<div class="flex min-h-screen flex-row justify-center px-2 py-2 lg:py-6">
    <div class="flex min-h-[500px] max-w-7xl grow flex-col rounded-lg bg-white p-3 shadow-md md:p-6">
        <div class="mb-2 flex flex-row items-center justify-between">
            <h2 class="flex text-2xl font-bold text-gray-800">Patch Roulette</h2>

            <div class="ms-4 flex items-center">
                <p id="user-info" class="text-sm text-gray-600">
                    Logged in as: <span id="logged-user" class="font-medium">{token.value === null ? "" : getUsername()}</span>
                </p>

                <button
                    id="logout-button"
                    type="button"
                    class="focus:shadow-outline ms-4 rounded bg-gray-300 px-2 py-1 text-gray-800 hover:bg-gray-400 focus:outline-none"
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

        <div class="mb-2 flex items-center">
            <label for="mcVersion" class="me-2 block text-sm font-bold text-gray-700">Minecraft Version</label>
            <select
                id="mcVersion"
                bind:value={selectedVersion}
                onchange={handleVersionSelect}
                class="rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                <option value="">Select a version...</option>
                {#each minecraftVersions as version (version)}
                    <option value={version}>{version}</option>
                {/each}
            </select>
        </div>

        <div
            id="patches-container"
            class="h-full w-full flex-col"
            class:hidden={selectedVersion === "" || selectedVersion === null}
            class:flex={selectedVersion !== "" && selectedVersion !== null}
        >
            <div class="mb-2 flex flex-row items-center">
                <h3 class="text-xl font-semibold text-gray-800">Patches{selectedVersion === null ? "" : " for " + selectedVersion}</h3>
                <button
                    class="focus:shadow-outline ms-4 rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-700 focus:outline-none"
                    onclick={() => onVersionSelect(selectedVersion)}
                >
                    Refresh
                </button>
                <div class="ms-2 flex rounded bg-blue-300 text-white">
                    {#each views as view, index (view)}
                        <button
                            class="px-2 py-1 text-white hover:bg-blue-700 focus:outline-none"
                            class:bg-blue-500={currentView === view}
                            class:rounded-l={index === 0}
                            class:rounded-r={index === views.length - 1}
                            onclick={() => (currentView = view)}
                        >
                            {view.charAt(0).toUpperCase() + view.slice(1)}
                        </button>
                    {/each}
                </div>
            </div>
            {#if currentView === "table"}
                <div class="flex h-full">
                    <PatchesTable data={patches} gridClass="ag-theme-quartz w-full"></PatchesTable>
                </div>
            {:else if currentView === "stats"}
                <div class="flex h-full">
                    <PatchesStats data={stats} gridClass="ag-theme-quartz w-full"></PatchesStats>
                </div>
            {/if}
        </div>
    </div>
</div>
