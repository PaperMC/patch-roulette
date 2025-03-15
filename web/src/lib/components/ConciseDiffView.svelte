<script lang="ts">
    import makeLines, { innerPatchLineTypeProps, type PatchLine, patchLineTypeProps } from "$lib/components/scripts/ConciseDiffView.svelte.js";

    let { rawPatchContent, preRenderedPatchLines } = $props<{
        rawPatchContent?: string;
        preRenderedPatchLines?: PatchLine[];
    }>();

    let patchLines: PatchLine[] = $derived.by(() => {
        if (preRenderedPatchLines) {
            return preRenderedPatchLines;
        }
        return makeLines(rawPatchContent);
    });
</script>

{#each patchLines as line (line)}
    {@const lineType = patchLineTypeProps[line.type]}
    {@const innerLineType = innerPatchLineTypeProps[line.innerPatchLineType]}
    <div class="h-auto py-1 ps-0.5 {lineType.classes} flex w-full flex-row break-all">
        {#if lineType.prefix}
            <span class="inline-block font-mono whitespace-pre-wrap">{lineType.prefix}</span>
        {/if}
        <span class="inline-block font-mono whitespace-pre-wrap {innerLineType.classes}">
            {#each line.content as segment, index (index)}
                {#if segment.classes}
                    <span class="inline font-mono whitespace-pre-wrap {segment.classes}">{segment.text}</span>
                {:else}{segment.text}{/if}
            {/each}
        </span>
    </div>
{/each}
