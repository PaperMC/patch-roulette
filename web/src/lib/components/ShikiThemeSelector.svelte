<script lang="ts">
    import { type BundledTheme, bundledThemes } from "shiki";
    import { Label, Select, useId } from "bits-ui";
    import { capitalizeFirstLetter, resizeObserver } from "$lib/util";
    import type { RestProps } from "$lib/types";

    interface Props extends RestProps {
        value: BundledTheme;
        mode: "light" | "dark";
    }

    let { value = $bindable<BundledTheme>(), mode, ...restProps }: Props = $props();

    let triggerLabelContainerW: number = $state(0);
    let triggerLabelW: number = $state(0);
    let scrollDistance: number = $derived(triggerLabelW - triggerLabelContainerW);
    let labelId = useId();
    let triggerId = useId();
</script>

<div {...restProps}>
    <Label.Root id={labelId} for={triggerId} class="text-sm">{capitalizeFirstLetter(mode)} theme</Label.Root>
    <Select.Root type="single" bind:value>
        <Select.Trigger
            aria-labelledby={labelId}
            id={triggerId}
            class="flex w-44 cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-sm  select-none hover:bg-gray-100 dark:hover:bg-gray-800"
        >
            <span aria-hidden="true" class="iconify shrink-0 text-base text-blue-500 octicon--single-select-16"></span>
            <div bind:clientWidth={triggerLabelContainerW} class="flex grow overflow-hidden" class:reveal-right={scrollDistance !== 0}>
                <div
                    use:resizeObserver={(e) => (triggerLabelW = e[0].target.scrollWidth)}
                    aria-label="Current {mode} syntax highlighting theme"
                    class="scrolling-text grow text-center text-nowrap"
                    style="--scroll-distance: -{scrollDistance}px;"
                >
                    {value}
                </div>
            </div>
        </Select.Trigger>
        <Select.Portal>
            <Select.Content class="max-h-64 overflow-y-auto rounded-lg border bg-neutral shadow-md">
                {#each Object.keys(bundledThemes) as theme (theme)}
                    <Select.Item value={theme} class="data-highlighted:bg-blue-400 data-highlighted:text-white">
                        {#snippet children({ selected })}
                            <div class="cursor-default px-2 py-1 text-sm" class:bg-blue-500={selected} class:text-white={selected}>
                                {theme}
                            </div>
                        {/snippet}
                    </Select.Item>
                {/each}
            </Select.Content>
        </Select.Portal>
    </Select.Root>
</div>

<style>
    .reveal-right {
        mask-image: linear-gradient(to right, var(--color-neutral) 0%, var(--color-neutral) 90%, transparent 100%);
    }
    .reveal-right:hover {
        mask-image: initial;
    }

    .scrolling-text:hover {
        animation: scrollText 5s ease-in-out infinite;
    }

    @keyframes scrollText {
        0% {
            transform: translateX(0);
        }
        50% {
            transform: translateX(var(--scroll-distance));
        }
        100% {
            transform: translateX(0);
        }
    }
</style>
