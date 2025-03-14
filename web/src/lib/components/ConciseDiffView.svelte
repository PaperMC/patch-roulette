<script lang="ts">
    import makeRows, { type PatchRow, patchRowTypeProps } from "$lib/components/scripts/ConciseDiffView.svelte.js";

    let { rawPatchContent, preRenderedPatchRows } = $props<{
        rawPatchContent?: string;
        preRenderedPatchRows?: PatchRow[];
    }>();

    let patchRows: PatchRow[] = $derived.by(() => {
        if (preRenderedPatchRows) {
            return preRenderedPatchRows;
        }
        return makeRows(rawPatchContent);
    });
</script>

{#each patchRows as row (row)}
    {@const rowType = patchRowTypeProps[row.type]}
    <div class="h-auto py-1 ps-0.5 {rowType.classes} flex w-full flex-row break-all">
        {#if rowType.prefix}
            <span class="inline-block font-mono whitespace-pre-wrap">{rowType.prefix}</span>
        {/if}
        <span class="inline-block font-mono whitespace-pre-wrap {row.innerPatchContentClasses}">{row.content}</span>
    </div>
{/each}
