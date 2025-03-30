<script lang="ts">
    import "../app.css";
    import { initThemeHooks } from "$lib/theme.svelte";

    let { children } = $props();

    initThemeHooks();
</script>

<div class="min-h-screen dark:bg-gray-950">
    {@render children()}
</div>
