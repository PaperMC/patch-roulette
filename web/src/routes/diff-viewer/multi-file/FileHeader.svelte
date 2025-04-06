<script lang="ts">
    import DiffStats from "$lib/components/DiffStats.svelte";
    import { type FileDetails, GlobalOptions, type MultiFileDiffViewerState } from "$lib/diff-viewer-multi-file.svelte";
    import { ContextMenu } from "bits-ui";
    import { tick } from "svelte";

    interface Props {
        viewer: MultiFileDiffViewerState;
        globalOptions: GlobalOptions;
        index: number;
        value: FileDetails;
        isImage: boolean;
    }

    let { viewer, globalOptions, index, value, isImage }: Props = $props();

    async function onSelect() {
        const getFileTreeElement = () => document.getElementById("file-tree-file-" + index);
        let fileTreeElement = getFileTreeElement();
        if (!fileTreeElement) {
            viewer.tree?.expandParents((node) => node.data === value);
            await tick();
            fileTreeElement = getFileTreeElement();
        }
        if (fileTreeElement) {
            requestAnimationFrame(() => {
                fileTreeElement.focus();
            });
        }
    }
</script>

{#snippet triggerContents()}
    <!-- Only show stats for text diffs -->
    {#if viewer.diffs[index] !== undefined}
        {#await viewer.stats}
            <DiffStats brief />
        {:then stats}
            <DiffStats brief add={stats.fileAddedLines[index]} remove={stats.fileRemovedLines[index]} />
        {/await}
    {/if}
    {#if value.fromFile === value.toFile}
        <span class="max-w-full overflow-hidden break-all">{value.toFile}</span>
    {:else}
        <span class="flex max-w-full flex-wrap items-center gap-0.5 overflow-hidden break-all">
            {value.fromFile}
            <span class="iconify inline-block text-blue-500 octicon--arrow-right-16"></span>
            {value.toFile}
        </span>
    {/if}
    <div class="ms-0.5 ml-auto flex items-center gap-2">
        {#if viewer.patchHeaderDiffOnly[index]}
            <span class="rounded-sm bg-gray-300 px-1 text-gray-800">Patch-header-only diff</span>
        {/if}
        {#if !viewer.patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks || isImage}
            <span class="flex size-6 items-center justify-center rounded-md p-0.5 text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800">
                {#if viewer.collapsed[index]}
                    <button
                        type="button"
                        aria-label="expand file"
                        onclick={(e) => {
                            viewer.toggleCollapse(index);
                            e.stopPropagation();
                        }}
                        class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-right-16"
                    ></button>
                {:else}
                    <button
                        type="button"
                        aria-label="collapse file"
                        onclick={(e) => {
                            viewer.toggleCollapse(index);
                            e.stopPropagation();
                        }}
                        class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-down-16"
                    ></button>
                {/if}
            </span>
        {/if}
    </div>
{/snippet}

<ContextMenu.Root>
    <ContextMenu.Trigger>
        {#snippet child({ props })}
            <div
                class="sticky top-0 z-10 flex flex-row items-center gap-2 border-b bg-neutral px-2 py-1 text-sm shadow-sm"
                tabindex="0"
                role="button"
                onclick={() => viewer.scrollToFile(index, false, true)}
                onkeyup={(event) => event.key === "Enter" && viewer.scrollToFile(index, false, true)}
                {...props}
            >
                {@render triggerContents()}
            </div>
        {/snippet}
    </ContextMenu.Trigger>
    <ContextMenu.Portal>
        <ContextMenu.Content class="overflow-hidden rounded-sm border bg-neutral shadow-sm select-none">
            <ContextMenu.Item {onSelect} class="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Show in file tree</ContextMenu.Item>
        </ContextMenu.Content>
    </ContextMenu.Portal>
</ContextMenu.Root>
