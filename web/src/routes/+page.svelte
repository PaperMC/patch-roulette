<script lang="ts">
    import { getUsername, PatchRouletteState, token } from "$lib/index.svelte";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchApi } from "$lib/api";
    import PatchesTable from "$lib/components/PatchesTable.svelte";
    import PatchesStats from "$lib/components/PatchesStats.svelte";
    import { capitalizeFirstLetter } from "$lib/util";
    import SettingsPopover, { globalThemeSetting } from "$lib/components/settings-popover/SettingsPopover.svelte";
    import SettingsPopoverGroup from "$lib/components/settings-popover/SettingsPopoverGroup.svelte";
    import LabeledCheckbox from "$lib/components/LabeledCheckbox.svelte";
    import Spinner from "$lib/components/Spinner.svelte";

    let instance = new PatchRouletteState();

    const views = ["table", "stats"] as const;
    type View = (typeof views)[number];
    let currentView: View = $state("stats");

    let minecraftVersions: string[] = $state([]);

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
        instance.selectedVersion = (event.target as HTMLSelectElement).value;
        if (instance.selectedVersion === "" || instance.selectedVersion === null) {
            return;
        } else if (instance.selectedVersion) {
            await instance.onVersionSelect((event.target as HTMLSelectElement).value);
        }
    }

    onMount(async () => {
        token.value = localStorage.getItem("token");

        if (token.value === null) {
            await goto("/login");
            return;
        }

        await loadMinecraftVersions();

        if (minecraftVersions.length > 0) {
            // Auto select latest version
            instance.selectedVersion = minecraftVersions[minecraftVersions.length - 1];
            await instance.onVersionSelect(instance.selectedVersion);
        }
    });
</script>

<svelte:head>
    <meta name="description" content="Management frontend for Paper update process" />
</svelte:head>

{#snippet settingsPopover()}
    <SettingsPopover class="ms-2">
        {@render globalThemeSetting()}
        <SettingsPopoverGroup title="Misc.">
            <LabeledCheckbox labelText="Auto refresh" bind:checked={instance.autoRefresh} />
        </SettingsPopoverGroup>
    </SettingsPopover>
{/snippet}

{#snippet refreshButton()}
    <button
        class="me-2 flex items-center justify-center gap-2 rounded btn-primary px-2 py-1"
        onclick={() => instance.onVersionSelect(instance.selectedVersion)}
    >
        {#if instance.refreshing}
            Refreshing...<Spinner size={4} class="border-white" />
        {:else}
            Refresh
        {/if}
    </button>
{/snippet}

{#snippet viewSelector()}
    <div class="flex gap-2">
        {#each views as view (view)}
            <button
                class="flex items-center justify-center rounded-sm btn-ghost px-2 py-1 text-primary data-[active=true]:btn-ghost-visible"
                data-active={currentView === view}
                onclick={() => (currentView = view)}
            >
                {capitalizeFirstLetter(view)}
            </button>
        {/each}
    </div>
{/snippet}

<div class="flex min-h-screen flex-row justify-center px-2">
    <div class="flex min-h-[500px] max-w-7xl grow flex-col p-3 md:p-6">
        <div class="mb-2 flex flex-row items-start justify-between">
            <h2 class="flex text-2xl font-bold">Patch Roulette</h2>

            <div class="mb-2 flex items-center">
                <p id="user-info" class="text-sm">
                    Logged in as: <span id="logged-user" class="font-medium">{token.value === null ? "" : getUsername()}</span>
                </p>

                <button
                    id="logout-button"
                    type="button"
                    class="ms-4 rounded btn-primary px-2 py-1"
                    onclick={() => {
                        localStorage.removeItem("token");
                        token.value = null;
                        goto("/login");
                    }}
                >
                    Logout
                </button>

                {@render settingsPopover()}
            </div>
        </div>

        <div class="mb-2 flex flex-wrap items-center">
            <div class="me-2 flex items-center">
                <label for="mcVersion" class="me-2 block text-sm font-bold">Minecraft Version</label>
                <select
                    id="mcVersion"
                    bind:value={instance.selectedVersion}
                    onchange={handleVersionSelect}
                    class="rounded border px-2 py-1 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                    <option value="">Select a version...</option>
                    {#each minecraftVersions as version (version)}
                        <option value={version}>{version}</option>
                    {/each}
                </select>
            </div>
            <div class="me-2 flex flex-row items-center">
                {@render refreshButton()}
                {@render viewSelector()}
            </div>
        </div>

        <div id="patches-container" class="flex h-full w-full flex-col data-[visible=false]:hidden" data-visible={instance.selectedVersion ? true : false}>
            {#if currentView === "table"}
                <div class="flex h-full">
                    <PatchesTable data={instance.patches} gridClass="ag-theme-quartz w-full"></PatchesTable>
                </div>
            {:else if currentView === "stats"}
                <div class="flex h-full">
                    <PatchesStats data={instance.stats} gridClass="ag-theme-quartz w-full"></PatchesStats>
                </div>
            {/if}
        </div>
    </div>
</div>
