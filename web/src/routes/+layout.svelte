<script lang="ts">
    import "../app.css";
    import { initTheme } from "$lib/theme.svelte";

    let { children } = $props();

    initTheme();
</script>

<div class="min-h-screen bg-blue-500">
    {@render children()}
</div>
