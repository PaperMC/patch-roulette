<script lang="ts">
    import { makeLines, innerPatchLineTypeProps, type PatchLine, patchLineTypeProps, getBaseColors } from "$lib/components/scripts/ConciseDiffView.svelte.js";
    import { type BundledTheme, bundledThemes, type ThemeRegistration } from "shiki";
    import Spinner from "$lib/components/Spinner.svelte";

    interface Props {
        rawPatchContent: string;
        syntaxHighlighting?: boolean;
        syntaxHighlightingTheme?: BundledTheme;
        omitPatchHeaderOnlyHunks?: boolean;
    }

    let { rawPatchContent, syntaxHighlighting = true, syntaxHighlightingTheme, omitPatchHeaderOnlyHunks = true }: Props = $props();

    let patchLines: Promise<PatchLine[]> = $state(new Promise<PatchLine[]>(() => []));
    $effect(() => {
        const promise = makeLines(rawPatchContent, syntaxHighlighting, syntaxHighlightingTheme, omitPatchHeaderOnlyHunks);
        promise.then(
            () => {
                // Don't replace a potentially completed promise with a pending one, wait until the replacement is ready for smooth transitions
                patchLines = promise;
            },
            () => {
                // Propagate errors
                patchLines = promise;
            },
        );
    });

    let themeData: Promise<null | { default: ThemeRegistration }> = $derived.by(() => {
        if (!syntaxHighlightingTheme) {
            return (async () => null)();
        }
        return bundledThemes[syntaxHighlightingTheme]();
    });

    let baseColors: Promise<string> = $state(new Promise<string>(() => []));
    $effect(() => {
        const promise = getBaseColors(themeData, syntaxHighlighting);
        // Same idea as above
        promise.then(
            () => {
                baseColors = promise;
            },
            () => {
                baseColors = promise;
            },
        );
    });
</script>

{#await Promise.all([baseColors, patchLines])}
    <div class="flex items-center justify-center bg-gray-300 p-4 dark:bg-gray-700"><Spinner /></div>
{:then [baseColors, lines]}
    <div style={baseColors} class="diff-content text-patch-line bg-[var(--editor-bg)] font-mono text-[var(--editor-fg)] selection:bg-[var(--select-bg)]">
        {#each lines as line, index (index)}
            {@const lineType = patchLineTypeProps[line.type]}
            {@const innerLineType = innerPatchLineTypeProps[line.innerPatchLineType]}
            <div class="flex h-auto w-full flex-row py-1 ps-0.5 {lineType.classes}">
                {#if lineType.prefix}
                    <span class="inline-block shrink-0">{lineType.prefix}</span>
                {/if}
                <div class="flex grow items-center">
                    <span class="inline" style={innerLineType.style}>
                        {#each line.content as segment, index (index)}
                            {@const iconClass = segment.iconClass}
                            {#if iconClass}
                                <span class="ms-0.5 iconify inline-block size-4 {segment.classes || ''} {iconClass}" aria-label={segment.caption}></span>
                            {:else}<span class="inline {segment.classes || ''}" style={segment.style || ""}>{segment.text}</span>{/if}
                        {/each}
                    </span>
                </div>
            </div>
        {/each}
    </div>
{/await}

<style>
    .diff-content {
        /* TODO: find default tailwind vars for fallbacks, remove dark mode overrides */
        --editor-fg: var(--editor-fg-themed, var(--color-black));
        --select-bg: var(--select-bg-themed, var(--color-blue-300));
        --editor-bg: var(--editor-bg-themed, var(--color-white));

        --inserted-text-bg: var(--inserted-text-bg-themed, initial);
        --removed-text-bg: var(--removed-text-bg-themed, initial);
        --inserted-line-bg: var(--inserted-line-bg-themed, initial);
        --removed-line-bg: var(--removed-line-bg-themed, initial);
        --inner-inserted-line-bg: var(--inner-inserted-line-bg-themed, initial);
        --inner-removed-line-bg: var(--inner-removed-line-bg-themed, initial);
        --inner-inserted-line-fg: var(--inner-inserted-line-fg-themed, initial);
        --inner-removed-line-fg: var(--inner-removed-line-fg-themed, initial);

        --color-editor-bg-600: oklch(0.6 var(--editor-background-c) var(--editor-background-h));
        --color-editor-fg-200: oklch(calc(max(0.9, var(--editor-foreground-l))) var(--editor-foreground-c) var(--editor-foreground-h));
        --hunk-header-bg: var(--hunk-header-bg-themed, var(--color-editor-bg-600, var(--color-gray-200)));
        --hunk-header-fg: var(--hunk-header-fg-themed, var(--editor-fg));

        word-break: break-all;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }
</style>
