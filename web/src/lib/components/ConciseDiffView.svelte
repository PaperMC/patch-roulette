<script lang="ts">
    import makeLines, { type PatchLine, patchLineTypeProps } from "$lib/components/scripts/ConciseDiffView.svelte.js";

    let { rawPatchContent, preRenderedPatchLines } = $props<{
        rawPatchContent?: string;
        preRenderedPatchLines?: PatchLine[];
    }>();

    let patchRows: PatchLine[] = $derived.by(() => {
        if (preRenderedPatchLines) {
            return preRenderedPatchLines;
        }
        return makeLines(rawPatchContent);
    });
</script>

{#each patchRows as row (row)}
    {@const rowType = patchLineTypeProps[row.type]}
    <div class="h-auto py-1 ps-0.5 {rowType.classes} flex w-full flex-row break-all">
        {#if rowType.prefix}
            <span class="inline-block font-mono whitespace-pre-wrap">{rowType.prefix}</span>
        {/if}
        <span class="inline-block font-mono whitespace-pre-wrap {row.innerPatchContentClasses}">{row.content}</span>
    </div>
{/each}
