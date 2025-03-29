<script lang="ts">
    import { type BundledTheme, bundledThemes } from "shiki";
    import { Label, Select } from "bits-ui";
    import { capitalizeFirstLetter } from "$lib/util";

    let {
        value = $bindable<BundledTheme>(),
        mode,
        ...restProps
    }: {
        value: BundledTheme;
        mode: "light" | "dark";
    } = $props();

    let triggerLabelContainerW: number = $state(0);
    let triggerLabelW: number = $state(0);
    function observeScrollW(e: HTMLDivElement) {
        const observer = new ResizeObserver(() => {
            triggerLabelW = e.scrollWidth;
        });
        observer.observe(e);
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }
    let scrollDistance: number = $derived(triggerLabelW - triggerLabelContainerW);
</script>

<div {...restProps}>
    <Label.Root class="text-sm">{capitalizeFirstLetter(mode)} mode theme</Label.Root>
    <Select.Root type="single" bind:value>
        <Select.Trigger
            aria-label="Select {mode} mode syntax highlighting theme"
            class="flex w-44 cursor-pointer items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm  select-none hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
            <span aria-hidden="true" class="iconify shrink-0 text-base text-blue-500 octicon--single-select-16"></span>
            <div bind:clientWidth={triggerLabelContainerW} class="flex grow overflow-hidden" class:reveal-right={scrollDistance !== 0}>
                <div
                    use:observeScrollW
                    aria-label="Current {mode} mode theme"
                    class="scrolling-text grow text-center text-nowrap"
                    style="--scroll-distance: -{scrollDistance}px;"
                >
                    {value}
                </div>
            </div>
        </Select.Trigger>
        <Select.Portal>
            <Select.Content class="max-h-64 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-md dark:border-gray-700 dark:bg-gray-950">
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
        mask-image: linear-gradient(to right, black 0%, black 90%, transparent 100%);
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
