<script lang="ts">
    import DiffStats from "$lib/components/diff/DiffStats.svelte";
    import { type FileDetails, GlobalOptions, type MultiFileDiffViewerState } from "$lib/diff-viewer-multi-file.svelte";
    import { Popover, Label, Separator } from "bits-ui";
    import { tick } from "svelte";

    interface Props {
        viewer: MultiFileDiffViewerState;
        globalOptions: GlobalOptions;
        index: number;
        value: FileDetails;
        isImage: boolean;
    }

    let { viewer, globalOptions, index, value, isImage }: Props = $props();

    let popoverOpen = $state(false);

    async function showInFileTree() {
        const fileTreeElement = document.getElementById("file-tree-file-" + index);
        if (fileTreeElement) {
            popoverOpen = false;
            viewer.tree?.expandParents((node) => node.data === value);
            viewer.sidebarCollapsed = false;
            await tick();
            requestAnimationFrame(() => {
                fileTreeElement.focus();
            });
        }
    }
</script>

{#snippet fileName()}
    {#if value.fromFile === value.toFile}
        <span class="max-w-full overflow-hidden break-all">{value.toFile}</span>
    {:else}
        <span class="flex max-w-full flex-wrap items-center gap-0.5 overflow-hidden break-all">
            {value.fromFile}
            <span class="iconify inline-block text-blue-500 octicon--arrow-right-16"></span>
            {value.toFile}
        </span>
    {/if}
{/snippet}

{#snippet collapseToggle()}
    <button
        type="button"
        class="flex size-6 items-center justify-center rounded-md p-0.5 text-blue-500 hover:bg-gray-100 hover:shadow-sm dark:hover:bg-gray-800"
        onclick={(e) => {
            viewer.toggleCollapse(index);
            e.stopPropagation();
        }}
    >
        {#if viewer.collapsed[index]}
            <span aria-label="expand file" class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-right-16"></span>
        {:else}
            <span aria-label="collapse file" class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-down-16"></span>
        {/if}
    </button>
{/snippet}

{#snippet popover()}
    <Popover.Root bind:open={popoverOpen}>
        <Popover.Trigger
            class="flex size-6 items-center justify-center rounded-md p-0.5 hover:bg-gray-100 hover:shadow-sm dark:hover:bg-gray-800"
            onclick={(e) => e.stopPropagation()}
        >
            <span class="iconify size-4 bg-blue-500 octicon--kebab-horizontal-16"></span>
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content class="flex flex-col overflow-hidden rounded-sm border bg-neutral text-sm shadow-sm select-none">
                <button onclick={showInFileTree} type="button" class="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">Show in file tree</button>
                <Separator.Root class="h-[1px] w-full bg-edge" />
                <Label.Root class="flex w-full flex-row items-center justify-between gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                    File viewed
                    <button class="flex items-center" type="button" onclick={() => viewer.toggleChecked(index)}>
                        {#if viewer.checked[index]}
                            <span aria-hidden="true" class="iconify size-4 shrink-0 text-blue-500 octicon--check-16"></span>
                        {:else}
                            <span aria-hidden="true" class="iconify size-4 shrink-0 text-em-med octicon--check-16"></span>
                        {/if}
                    </button>
                </Label.Root>
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
{/snippet}

<div
    class="sticky top-0 z-10 flex flex-row items-center gap-2 border-b bg-neutral px-2 py-1 text-sm shadow-sm"
    tabindex={0}
    role="button"
    onclick={() => viewer.scrollToFile(index, false, true)}
    onkeyup={(event) => event.key === "Enter" && viewer.scrollToFile(index, false, true)}
>
    <!-- Only show stats for text diffs -->
    {#if viewer.diffs[index] !== undefined}
        {#await viewer.stats}
            <DiffStats brief />
        {:then stats}
            <DiffStats brief add={stats.fileAddedLines[index]} remove={stats.fileRemovedLines[index]} />
        {/await}
    {/if}
    {@render fileName()}
    <div class="ms-0.5 ml-auto flex items-center gap-2">
        {#if viewer.patchHeaderDiffOnly[index]}
            <span class="rounded-sm bg-neutral-3 px-1.5">Patch-header-only diff</span>
        {/if}
        {@render popover()}
        {#if !viewer.patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks || isImage}
            {@render collapseToggle()}
        {/if}
    </div>
</div>
