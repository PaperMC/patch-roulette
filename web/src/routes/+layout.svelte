<script lang="ts">
    import "../app.css";
    import { initThemeHooks } from "$lib/theme.svelte";
    import { Tooltip } from "bits-ui";

    let { children } = $props();

    initThemeHooks();
</script>

<svelte:head>
    <title>Patch Roulette</title>
</svelte:head>

<Tooltip.Provider delayDuration={100}>
    <div class="min-h-screen bg-neutral">
        {@render children()}
    </div>
</Tooltip.Provider>
