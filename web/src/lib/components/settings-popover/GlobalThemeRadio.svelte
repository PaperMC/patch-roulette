<script lang="ts">
    import { getGlobalTheme, setGlobalTheme } from "$lib/theme.svelte";
    import { Label, RadioGroup, useId } from "bits-ui";
    import { capitalizeFirstLetter } from "$lib/util";

    let { ...props } = $props();
</script>

{#snippet themeItem(theme: string)}
    {@const labelId = useId()}
    {@const itemId = useId()}
    <Label.Root id={labelId} for={itemId} class="flex cursor-pointer flex-row items-center gap-1 text-sm">
        <RadioGroup.Item
            class="flex size-4 cursor-pointer items-center justify-center rounded-full border hover:bg-gray-100 dark:hover:bg-gray-800"
            value={theme}
            id={itemId}
            aria-labelledby={labelId}
        >
            {#snippet children({ checked })}
                {#if checked}
                    <span class="size-2.5 rounded-full bg-blue-500" aria-hidden="true"></span>
                {/if}
            {/snippet}
        </RadioGroup.Item>
        {capitalizeFirstLetter(theme)}
    </Label.Root>
{/snippet}

<RadioGroup.Root class="flex flex-row items-center gap-2" bind:value={getGlobalTheme, setGlobalTheme} {...props}>
    {@render themeItem("light")}
    {@render themeItem("dark")}
    {@render themeItem("auto")}
</RadioGroup.Root>
