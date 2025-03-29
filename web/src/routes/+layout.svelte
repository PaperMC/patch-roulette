<script lang="ts">
    import "../app.css";
    import { initThemeHooks } from "$lib/theme.svelte";

    let { children } = $props();

    initThemeHooks();
</script>

<div class="min-h-screen bg-blue-500">
    {@render children()}
</div>
