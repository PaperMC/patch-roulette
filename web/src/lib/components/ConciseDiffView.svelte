<script lang="ts">
    import makeRows, { type PatchRow } from "$lib/components/scripts/ConciseDiffView.svelte.js";

    let { rawPatchContent, preRenderedPatchRows } = $props<{
        rawPatchContent?: string;
        preRenderedPatchRows?: PatchRow[];
    }>();

    let patchRows = $derived.by(() => {
        if (preRenderedPatchRows) {
            return preRenderedPatchRows;
        }
        return makeRows(rawPatchContent);
    });
</script>

{#each patchRows as row (row)}
    <div class="h-auto py-1 ps-0.5 {row.backgroundClasses} flex w-full flex-row">
        <div class="w-max">
            <pre>{row.content.charAt(0)}</pre>
        </div>
        <div class="w-max max-w-full">
            <pre class="break-all whitespace-pre-wrap {row.innerPatchContentClasses}">{row.content.substring(1)}</pre>
        </div>
    </div>
{/each}
