<script module>
    export { settingsSeparator, globalThemeSetting };
</script>

<script lang="ts">
    import GlobalThemeRadio from "$lib/components/GlobalThemeRadio.svelte";
    import { mergeProps, Popover, Separator } from "bits-ui";
    import type { Snippet } from "svelte";
    import type { RestProps } from "$lib/types";

    interface Props extends RestProps {
        content: Snippet;
    }

    let { content, ...restProps }: Props = $props();

    const defTriggerProps = {
        class: "size-8 rounded-md p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800",
    };

    let triggerProps = $derived(mergeProps(defTriggerProps, restProps));
</script>

{#snippet settingsSeparator()}
    <Separator.Root class="my-2 h-[1px] w-full bg-gray-300 dark:bg-gray-700" />
{/snippet}

{#snippet globalThemeSetting()}
    <div class="flex flex-col">
        <span>Theme</span>
        <GlobalThemeRadio />
    </div>
{/snippet}

<Popover.Root>
    <Popover.Trigger {...triggerProps}>
        <span class="iconify octicon--gear-16" aria-hidden="true"></span>
    </Popover.Trigger>
    <Popover.Portal>
        <Popover.Content aria-label="Options" class="mx-2 flex flex-col rounded-md border border-gray-300 bg-neutral p-3 shadow-md dark:border-gray-700">
            <div class="mb-4 flex flex-row justify-between">
                <span class="iconify text-blue-500 octicon--gear-16" aria-hidden="true"></span>
                <Popover.Close class="size-4">
                    <span class="iconify text-blue-500 octicon--x-16"></span>
                </Popover.Close>
            </div>
            {@render content()}
        </Popover.Content>
    </Popover.Portal>
</Popover.Root>
