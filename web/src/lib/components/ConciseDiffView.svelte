<script lang="ts" generics="K">
    import {
        ConciseDiffViewCachedState,
        ConciseDiffViewState,
        getBaseColors,
        innerPatchLineTypeProps,
        parseSinglePatch,
        type PatchLine,
        PatchLineType,
        type PatchLineTypeProps,
        type InnerPatchLineTypeProps,
        patchLineTypeProps,
    } from "$lib/components/scripts/ConciseDiffView.svelte.js";
    import { type BundledTheme } from "shiki";
    import Spinner from "$lib/components/Spinner.svelte";
    import { type ParsedDiff } from "diff";

    interface Props {
        rawPatchContent?: string;
        patch?: Promise<ParsedDiff>;
        syntaxHighlighting?: boolean;
        syntaxHighlightingTheme?: BundledTheme;
        omitPatchHeaderOnlyHunks?: boolean;
        wordDiffs?: boolean;
        searchQuery?: string;

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
        cache,
        cacheKey,
    }: Props = $props();

    const view = new ConciseDiffViewState(cache, cacheKey);
    const parsedPatch = $derived.by(async () => {
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

    type SearchSegment = {
        text: string;
        highlighted: boolean;
    };

    function makeSearchSegments(line: PatchLine): SearchSegment[] {
        if (!searchQuery) {
            return [];
        }
        let searchQueryLower = searchQuery.toLowerCase();

        let linePlain = "";
        for (const segment of line.content) {
            if (segment.text) {
                linePlain += segment.text;
            }
        }
        linePlain = linePlain.toLowerCase();

        if (linePlain.length === 0) {
            return [];
        }

        let segments: SearchSegment[] = [];
        let idx = linePlain.indexOf(searchQueryLower);
        if (idx === -1) {
            return [];
        }

        while (idx !== -1) {
            const before = linePlain.slice(0, idx);
            const after = linePlain.slice(idx + searchQueryLower.length);
            if (before.length > 0) {
                segments.push({ text: before, highlighted: false });
            }
            segments.push({ text: linePlain.slice(idx, idx + searchQueryLower.length), highlighted: true });
            linePlain = after;
            idx = linePlain.indexOf(searchQueryLower);
        }

        if (linePlain.length > 0) {
            segments.push({ text: linePlain, highlighted: false });
        }

        return segments;
    }
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

{#snippet lineContentWrapper(line: PatchLine, lineType: PatchLineTypeProps, innerLineType: InnerPatchLineTypeProps)}
    {@const searchSegments = makeSearchSegments(line)}
    {#if searchSegments.length > 0}
        <div class="relative">
            {@render lineContent(line, lineType, innerLineType)}
            <span class="absolute top-0 left-0 text-transparent">
                <span class="inline leading-[0.875rem] select-none">
                    {#each searchSegments as segment, index (index)}
                        {#if segment.highlighted}<span class="bg-yellow-300/35">{segment.text}</span>{:else}{segment.text}{/if}
                    {/each}
                </span>
            </span>
        </div>
    {:else}
        {@render lineContent(line, lineType, innerLineType)}
    {/if}
{/snippet}

{#snippet renderLine(line: PatchLine)}
    {@const lineType = patchLineTypeProps[line.type]}
    <tr class="h-[1px]">
        <td class="line-number h-[inherit] bg-[var(--hunk-header-bg)] select-none">
            <div class="min-h-full px-2 {lineType.lineNoClasses}">{getDisplayLineNo(line, line.oldLineNo)}</div>
        </td>
        <td class="line-number h-[inherit] bg-[var(--hunk-header-bg)] select-none">
            <div class="min-h-full px-2 {lineType.lineNoClasses}">{getDisplayLineNo(line, line.newLineNo)}</div>
        </td>
        <td class="w-full pl-[1rem] {lineType.classes}">
            {@render lineContentWrapper(line, lineType, innerPatchLineTypeProps[line.innerPatchLineType])}
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
            {#each lines as line, index (index)}
                {@render renderLine(line)}
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
