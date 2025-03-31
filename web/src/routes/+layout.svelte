<script lang="ts">
    import "../app.css";
    import { initThemeHooks } from "$lib/theme.svelte";
    import { Tooltip } from "bits-ui";

    let { children } = $props();

    initThemeHooks();
</script>

<Tooltip.Provider delayDuration={100}>
    <div class="min-h-screen dark:bg-gray-950">
        {@render children()}
    </div>
</Tooltip.Provider>
