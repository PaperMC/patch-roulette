<script lang="ts">
    import { Text } from "kumo-svelte";
    import SettingsPopover from "$lib/components/SettingsPopover.svelte";
    import UserMenu from "$lib/components/UserMenu.svelte";
</script>

<header class="border-kumo-line border-b">
    <div class="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
        <Text variant="heading3" as="h1">Patch Roulette</Text>

        <div class="flex items-center gap-3">
            <SettingsPopover />
            <UserMenu />
        </div>
    </div>
</header>
