<script lang="ts">
    import "../app.css";
    import { initThemeHooks } from "$lib/theme.svelte";

    let { children } = $props();

    initThemeHooks();
</script>

<svelte:head>
    <script type="module">
        // This script is in the head and does not import anything to ensure it runs before hydration and avoids FOUC with dark/auto mode
        const initialTheme = localStorage.getItem("theme");
        document.documentElement.setAttribute("data-theme", initialTheme || "auto");
    </script>
</svelte:head>

<div class="min-h-screen bg-blue-500">
    {@render children()}
</div>
