<script lang="ts">
    import AddIcon from "virtual:icons/octicon/file-added-16";
    import RemoveIcon from "virtual:icons/octicon/file-removed-16";
    import { type ImageDimensions } from "$lib/image";
    import type { AddOrRemove } from "$lib/diff-viewer-multi-file.svelte";

    interface Props {
        dims: Promise<ImageDimensions> | ImageDimensions;
        mode: AddOrRemove;
    }

    const { dims, mode }: Props = $props();

    let Icon = $derived(mode === "add" ? AddIcon : RemoveIcon);
    let iconColor = $derived(mode === "add" ? "text-green-600" : "text-red-600");
</script>

<div class="flex flex-col items-center justify-center rounded-sm bg-white p-2 shadow-sm">
    <Icon class="{iconColor} mb-1" />
    {#await dims then { width, height }}
        <span class="text-xs"><span class="font-semibold">W:</span> {width}px</span>
        <span class="text-xs"><span class="font-semibold">H:</span> {height}px</span>
    {/await}
</div>
