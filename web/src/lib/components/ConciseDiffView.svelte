<script lang="ts">
    import { makeLines, innerPatchLineTypeProps, type PatchLine, patchLineTypeProps } from "$lib/components/scripts/ConciseDiffView.svelte.js";

    let { rawPatchContent, preRenderedPatchLines } = $props<{
        rawPatchContent?: string;
        preRenderedPatchLines?: Promise<PatchLine[]>;
    }>();

    let patchLines: Promise<PatchLine[]> = $derived.by(() => {
        if (preRenderedPatchLines) {
            return preRenderedPatchLines;
        }
        return makeLines(rawPatchContent);
    });
</script>

{#await patchLines}
    <div class="flex items-center justify-center bg-gray-300 p-4">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
    </div>
{:then lines}
    {#each lines as line (line)}
        {@const lineType = patchLineTypeProps[line.type]}
        {@const innerLineType = innerPatchLineTypeProps[line.innerPatchLineType]}
        <div class="h-auto py-1 ps-0.5 {lineType.classes} flex w-full flex-row break-all">
            {#if lineType.prefix}
                <span class="inline-block shrink-0 font-mono whitespace-pre-wrap">{lineType.prefix}</span>
            {/if}
            <div class="flex grow items-center">
                <span class="inline w-full font-mono whitespace-pre-wrap {innerLineType.classes}">
                    {#each line.content as segment, index (index)}
                        {@const Icon = segment.icon}
                        {#if segment.classes}
                            <span class="inline font-mono whitespace-pre-wrap {segment.classes}" style={segment.style || ""}>{segment.text}</span>
                        {:else if Icon}
                            <Icon class="ms-0.5 inline text-red-600" aria-label={segment.caption}></Icon>
                        {:else}<span class="inline font-mono whitespace-pre-wrap" style={segment.style || ""}>{segment.text}</span>{/if}
                    {/each}
                </span>
            </div>
        </div>
    {/each}
{/await}
