<script lang="ts">
    import "../app.css";
    import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
    import { Toasty, TooltipProvider } from "kumo-svelte";
    import { initAuth } from "$lib/auth.svelte";
    import { initTheme } from "$lib/theme.svelte";

    let { children } = $props();

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    });

    initTheme();
    initAuth();
</script>

<svelte:head>
    <title>Patch Roulette</title>
</svelte:head>

<QueryClientProvider client={queryClient}>
    <Toasty>
        <TooltipProvider>
            <div class="bg-kumo-canvas text-kumo-default min-h-screen">
                {@render children()}
            </div>
        </TooltipProvider>
    </Toasty>
</QueryClientProvider>
