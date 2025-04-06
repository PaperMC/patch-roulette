<script lang="ts" generics="K">
    import {
        ConciseDiffViewCachedState,
        ConciseDiffViewState,
        getBaseColors,
        innerPatchLineTypeProps,
        type InnerPatchLineTypeProps,
        makeSearchSegments,
        parseSinglePatch,
        type PatchLine,
        PatchLineType,
        type PatchLineTypeProps,
        patchLineTypeProps,
        type SearchSegment,
    } from "$lib/components/scripts/ConciseDiffView.svelte.js";
    import { type BundledTheme } from "shiki";
    import Spinner from "$lib/components/Spinner.svelte";
    import { type ParsedDiff } from "diff";
    import { onDestroy } from "svelte";
    import type { MutableValue } from "$lib/util";

    interface Props {
        rawPatchContent?: string;
        patch?: Promise<ParsedDiff>;
        syntaxHighlighting?: boolean;
        syntaxHighlightingTheme?: BundledTheme;
        omitPatchHeaderOnlyHunks?: boolean;
        wordDiffs?: boolean;
        searchQuery?: string;
        searchMatchingLines?: () => Promise<number[][] | undefined>;
        activeSearchResult?: number;

        cache?: Map<K, ConciseDiffViewCachedState>;
        cacheKey?: K;
    }

    let {
        rawPatchContent,
        patch,
        syntaxHighlighting = true,
        syntaxHighlightingTheme,
        omitPatchHeaderOnlyHunks = true,
        wordDiffs = true,
        searchQuery,
        searchMatchingLines,
        activeSearchResult = -1,
        cache,
        cacheKey,
    }: Props = $props();

    const view = new ConciseDiffViewState(cache, cacheKey);
    const parsedPatch: Promise<ParsedDiff> = $derived.by(async () => {
        if (rawPatchContent !== undefined) {
            return parseSinglePatch(rawPatchContent);
        } else if (patch !== undefined) {
            return patch;
        }
        throw Error("Either rawPatchContent or patch must be provided");
    });
    $effect(() => {
        view.update(parsedPatch, syntaxHighlighting, syntaxHighlightingTheme, omitPatchHeaderOnlyHunks, wordDiffs);
    });

    let baseColors: Promise<string> = $state(new Promise<string>(() => []));
    $effect(() => {
        const promise = getBaseColors(syntaxHighlightingTheme, syntaxHighlighting);
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

    function getDisplayLineNo(line: PatchLine, num: number | undefined) {
        if (line.type == PatchLineType.HEADER) {
            return "...";
        } else {
            return num ?? " ";
        }
    }

    let searchResultElements: HTMLSpanElement[] = $state([]);
    let didInitialJump = $state(false);
    let scheduledJump: number | undefined = undefined;
    $effect(() => {
        if (didInitialJump) {
            return;
        }
        if (activeSearchResult >= 0 && searchResultElements[activeSearchResult] !== undefined) {
            const element = searchResultElements[activeSearchResult];
            const anchorElement = element.closest("tr");
            // This is an exceptionally stupid and unreliable hack, but at least
            // jumping to a result in a not-yet-loaded file works most of the time with a delay
            // instead of never.
            scheduledJump = setTimeout(() => {
                if (scheduledJump !== undefined) {
                    clearTimeout(scheduledJump);
                    scheduledJump = undefined;
                }

                if (anchorElement !== null) {
                    anchorElement.scrollIntoView({ block: "center", inline: "center" });
                }
            }, 200);
            didInitialJump = true;
        }
    });
    onDestroy(() => {
        if (scheduledJump !== undefined) {
            clearTimeout(scheduledJump);
            scheduledJump = undefined;
        }
    });

    let searchSegments: Promise<SearchSegment[][][]> = $derived.by(async () => {
        if (!searchQuery || !searchMatchingLines) {
            return [];
        }
        const matchingLines = await searchMatchingLines();
        if (!matchingLines || matchingLines.length === 0) {
            return [];
        }
        const lines = await view.patchLines;
        const segments: SearchSegment[][][] = [];
        const count: MutableValue<number> = { value: 0 };
        for (let i = 0; i < lines.length; i++) {
            const hunkMatchingLines = matchingLines[i];
            if (!hunkMatchingLines || hunkMatchingLines.length === 0) {
                continue;
            }

            const hunkSegments: SearchSegment[][] = [];
            segments[i] = hunkSegments;

            const hunkLines = lines[i];
            for (let j = 0; j < hunkLines.length; j++) {
                const line = hunkLines[j];

                let lineText = "";
                for (let k = 0; k < line.content.length; k++) {
                    const segmentText = line.content[k].text;
                    if (segmentText) {
                        lineText += segmentText;
                    }
                }

                // -1 for the hunk header
                if (hunkMatchingLines.includes(j - 1)) {
                    const lineSegments: SearchSegment[] = makeSearchSegments(searchQuery, lineText, count);
                    hunkSegments[j] = lineSegments;
                }
            }
        }
        return segments;
    });
</script>

{#snippet lineContent(line: PatchLine, lineType: PatchLineTypeProps, innerLineType: InnerPatchLineTypeProps)}
    <span class="prefix inline leading-[0.875rem]" style={innerLineType.style} data-prefix={lineType.prefix}>
        {#if line.lineBreak}<br />{:else}
            {#each line.content as segment, index (index)}
                {@const iconClass = segment.iconClass}
                {#if iconClass}
                    <span class="ms-0.5 iconify inline-block size-4 align-middle {segment.classes ?? ''} {iconClass}" aria-label={segment.caption}></span>
                {:else}<span class="inline {segment.classes ?? ''}" style={segment.style ?? ""}>{segment.text}</span>{/if}
            {/each}
        {/if}
    </span>
{/snippet}

{#snippet lineContentWrapper(line: PatchLine, hunkIndex: number, lineIndex: number, lineType: PatchLineTypeProps, innerLineType: InnerPatchLineTypeProps)}
    {#await searchSegments}
        {@render lineContent(line, lineType, innerLineType)}
    {:then completedSearchSegments}
        {@const hunkSegments = completedSearchSegments[hunkIndex]}
        {#if hunkSegments !== undefined && hunkSegments.length > 0}
            {@const lineSegments = hunkSegments[lineIndex]}
            {#if lineSegments !== undefined && lineSegments.length > 0}
                <div class="relative">
                    {@render lineContent(line, lineType, innerLineType)}
                    <span class="pointer-events-none absolute top-0 left-0 text-transparent select-none">
                        <span class="inline leading-[0.875rem]">
                            {#each lineSegments as segment, index (index)}
                                {#if segment.highlighted}<span
                                        bind:this={searchResultElements[segment.id ?? -1]}
                                        class={{
                                            "bg-[#d4a72c66]": segment.id !== activeSearchResult,
                                            "bg-[#ff9632]": segment.id === activeSearchResult,
                                            "text-em-high-light": segment.id === activeSearchResult,
                                        }}
                                        data-match-id={segment.id}>{segment.text}</span
                                    >{:else}{segment.text}{/if}
                            {/each}
                        </span>
                    </span>
                </div>
            {:else}
                {@render lineContent(line, lineType, innerLineType)}
            {/if}
        {:else}
            {@render lineContent(line, lineType, innerLineType)}
        {/if}
    {/await}
{/snippet}

{#snippet renderLine(line: PatchLine, hunkIndex: number, lineIndex: number)}
    {@const lineType = patchLineTypeProps[line.type]}
    <tr class="h-[1px]">
        <td class="line-number h-[inherit] bg-[var(--hunk-header-bg)] select-none">
            <div class="min-h-full px-2 {lineType.lineNoClasses}">{getDisplayLineNo(line, line.oldLineNo)}</div>
        </td>
        <td class="line-number h-[inherit] bg-[var(--hunk-header-bg)] select-none">
            <div class="min-h-full px-2 {lineType.lineNoClasses}">{getDisplayLineNo(line, line.newLineNo)}</div>
        </td>
        <td class="w-full pl-[1rem] {lineType.classes}">
            {@render lineContentWrapper(line, hunkIndex, lineIndex, lineType, innerPatchLineTypeProps[line.innerPatchLineType])}
        </td>
    </tr>
{/snippet}

{#await Promise.all([baseColors, view.patchLines])}
    <div class="flex items-center justify-center bg-gray-300 p-4 dark:bg-gray-700"><Spinner /></div>
{:then [baseColors, lines]}
    <table
        style={baseColors}
        class="diff-content text-patch-line w-full bg-[var(--editor-bg)] font-mono text-xs leading-[1.25rem] text-[var(--editor-fg)] selection:bg-[var(--select-bg)]"
    >
        <tbody>
            {#each lines as hunkLines, hunkIndex (hunkIndex)}
                {#each hunkLines as line, lineIndex (lineIndex)}
                    {@render renderLine(line, hunkIndex, lineIndex)}
                {/each}
            {/each}
        </tbody>
    </table>
{/await}

<style>
    .diff-content {
        --editor-fg: var(--editor-fg-themed, var(--color-em-high));
        /* TODO: better fallback, remove dark mode override */
        --select-bg: var(--select-bg-themed, var(--color-blue-300));
        --editor-bg: var(--editor-bg-themed, var(--color-neutral));

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

    .line-number {
        text-align: end;
        vertical-align: top;
        text-wrap: nowrap;
        width: 1%;
    }
    .line-number::after {
        content: attr(data-line-number);
    }

    .prefix {
        position: relative;
    }
    .prefix::before {
        content: attr(data-prefix);
        position: absolute;
        left: -0.75rem;
        top: 0;
    }
</style>
