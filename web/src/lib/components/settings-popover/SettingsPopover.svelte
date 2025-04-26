<script module>
    export { globalThemeSetting, sectionHeader };
</script>

<script lang="ts">
    import GlobalThemeRadio from "./GlobalThemeRadio.svelte";
    import SettingsPopoverGroup from "./SettingsPopoverGroup.svelte";
    import type { RestProps } from "$lib/types";
    import { mergeProps, Popover, type WithChildren } from "bits-ui";

    let { children, ...restProps }: WithChildren<RestProps> = $props();

    const defTriggerProps = {
        class: "size-6 rounded-md flex items-center justify-center text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800 data-[state=open]:bg-gray-100 data-[state=open]:shadow dark:data-[state=open]:bg-gray-800",
    };

    let triggerProps = $derived(mergeProps(defTriggerProps, restProps));
</script>

{#snippet sectionHeader(text: string)}
    <div class="mt-4 font-semibold">{text}</div>
{/snippet}

{#snippet globalThemeSetting()}
    <SettingsPopoverGroup title="Theme">
        <div class="px-2 py-1">
            <GlobalThemeRadio />
        </div>
    </SettingsPopoverGroup>
{/snippet}

<Popover.Root>
    <Popover.Trigger {...triggerProps}>
        <span class="iconify size-4 shrink-0 octicon--gear-16" aria-hidden="true"></span>
    </Popover.Trigger>
    <Popover.Portal>
        <Popover.Content aria-label="Options" class="z-50 mx-2 flex flex-col gap-1 rounded-md border bg-neutral py-1 text-sm shadow-md">
            {#if children}
                {@render children()}
            {/if}
        </Popover.Content>
    </Popover.Portal>
</Popover.Root>
