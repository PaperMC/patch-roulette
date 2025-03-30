<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";
    import { type FileTreeNodeData, splitMultiFilePatch } from "$lib/util";
    import { VList } from "virtua/svelte";
    import { getGithubUsername, GITHUB_URL_PARAM, installGithubApp, loginWithGithub, logoutGithub } from "$lib/github.svelte";
    import { onMount } from "svelte";
    import { type FileDetails, getFileStatusProps, GlobalOptions, MultiFileDiffViewerState } from "$lib/diff-viewer-multi-file.svelte";
    import Tree from "$lib/components/Tree.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import type { TreeNode } from "$lib/components/scripts/Tree.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import ImageDiff from "$lib/components/ImageDiff.svelte";
    import { Popover, Label, Dialog, Separator } from "bits-ui";
    import SimpleSwitch from "$lib/components/SimpleSwitch.svelte";
    import AddedOrRemovedImage from "$lib/components/AddedOrRemovedImage.svelte";
    import ShikiThemeSelector from "$lib/components/ShikiThemeSelector.svelte";
    import GlobalThemeRadio from "$lib/components/GlobalThemeRadio.svelte";

    const globalOptions: GlobalOptions = GlobalOptions.load();
    const viewer = new MultiFileDiffViewerState();

    let sidebarCollapsed = $state(false);
    let modalOpen = $state(false);
    let githubUrl = $state("");
    let dragActive = $state(false);
    onMount(async () => {
        const url = page.url.searchParams.get(GITHUB_URL_PARAM);
        if (url !== null) {
            githubUrl = url;
            await handleGithubUrl();
        } else {
            modalOpen = true;
        }
    });

    function filterFileNode(file: TreeNode<FileTreeNodeData>): boolean {
        return file.data.type === "file" && viewer.filterFile(file.data.data as FileDetails);
    }

    function loadFromFile(patchContent: string) {
        const files = splitMultiFilePatch(patchContent);
        if (files.length === 0) {
            alert("No valid patches found in the file.");
            modalOpen = true;
            return;
        }
        viewer.loadPatches(files);
    }

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files || files.length === 0) {
            return;
        }
        if (files.length > 1) {
            alert("Only one file can be loaded at a time.");
            return;
        }
        modalOpen = false;
        loadFromFile(await files[0].text());
    }

    function handleDragOver(event: DragEvent) {
        dragActive = true;
        event.preventDefault();
    }

    function handleDragLeave(event: DragEvent) {
        if (event.currentTarget === event.target) {
            dragActive = false;
        }
        event.preventDefault();
    }

    async function handleFileDrop(event: DragEvent) {
        dragActive = false;
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (!files || files.length !== 1) {
            alert("Only one file can be dropped at a time.");
            return;
        }
        modalOpen = false;
        loadFromFile(await files[0].text());
    }

    async function handleGithubUrl() {
        modalOpen = false;
        const success = await viewer.loadFromGithubApi(githubUrl);
        if (success) {
            const newUrl = new URL(page.url);
            newUrl.searchParams.set(GITHUB_URL_PARAM, githubUrl);
            await goto(`?${newUrl.searchParams}`);
            return;
        }
        modalOpen = true;
    }

    function scrollToFileClick(event: Event, index: number) {
        const element: HTMLElement = event.target as HTMLElement;
        // Don't scroll if we clicked the inner checkbox
        if (element.tagName.toLowerCase() !== "input") {
            viewer.scrollToFile(index);
        }
    }
</script>

{#snippet sidebarToggle()}
    <button
        type="button"
        class="size-8 rounded-md p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800"
        onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
    >
        {#if sidebarCollapsed}
            <span class="iconify octicon--sidebar-collapse-16"></span>
        {:else}
            <span class="iconify octicon--sidebar-expand-16"></span>
        {/if}
    </button>
{/snippet}

{#snippet mainDialog()}
    <Dialog.Root bind:open={modalOpen}>
        <Dialog.Trigger class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={() => (dragActive = false)}>
            Load another diff
        </Dialog.Trigger>
        <Dialog.Portal>
            <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 dark:bg-white/20" />
            <Dialog.Content
                class="fixed top-1/2 left-1/2 z-50 w-full max-w-fit -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-4 shadow-md dark:bg-gray-950"
            >
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="file-drop-target flex flex-col"
                    data-drag-active={dragActive}
                    ondragover={handleDragOver}
                    ondrop={handleFileDrop}
                    ondragleavecapture={handleDragLeave}
                >
                    <div class="relative mb-4 flex flex-row items-center justify-center">
                        <Dialog.Title class="text-lg font-semibold">Load a diff</Dialog.Title>
                        <Dialog.Close
                            class="absolute top-0 right-0 flex size-8 items-center justify-center rounded-md text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800"
                        >
                            <span class="iconify octicon--x-16"></span>
                        </Dialog.Close>
                    </div>
                    <Separator.Root class="mb-2 h-[1px] w-full bg-gray-300 dark:bg-gray-700" />

                    <label for="githubUrl">
                        <span>Load from GitHub URL</span>
                        <br />
                        <span class="text-sm text-gray-600">Supports commit, PR, and comparison URLs</span>
                    </label>
                    <div class="mb-4 flex flex-row items-center gap-2">
                        <input
                            id="githubUrl"
                            type="text"
                            class="grow rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700"
                            bind:value={githubUrl}
                            onkeyup={(event) => {
                                if (event.key === "Enter") {
                                    handleGithubUrl();
                                }
                            }}
                            autocomplete="off"
                        />
                        <button type="button" onclick={handleGithubUrl} class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600">Go</button>
                    </div>

                    <div class="mb-2 flex flex-row items-center gap-2">
                        <button
                            aria-labelledby="loginToGitHubLabel"
                            class="flex w-fit flex-row items-center justify-between gap-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                            onclick={loginWithGithub}
                            type="button"
                        >
                            <span class="iconify shrink-0 octicon--mark-github-16"></span>
                            {#if getGithubUsername()}{getGithubUsername()}{:else}Login to GitHub{/if}
                        </button>
                        {#if getGithubUsername()}
                            <button type="button" class="rounded-md bg-red-400 px-2 py-1 text-white hover:bg-red-500" onclick={logoutGithub}>Logout</button>
                        {:else}
                            <span id="loginToGitHubLabel">Login to GitHub for higher rate limits.</span>
                        {/if}
                    </div>
                    <div class="mb-4 flex flex-row items-center gap-2">
                        <button
                            aria-labelledby="githubAppLabel"
                            type="button"
                            class="flex w-fit flex-row items-center gap-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                            onclick={installGithubApp}
                        >
                            <span class="iconify shrink-0 octicon--mark-github-16"></span> Install/configure GitHub App
                        </button>
                        <span id="githubAppLabel">Install the GitHub App to view private repos.</span>
                    </div>

                    <div class="w-fit cursor-pointer rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600">
                        <label for="patchUpload">
                            Load Patch File
                            <input id="patchUpload" type="file" class="hidden" onchange={handleFileUpload} />
                        </label>
                    </div>
                </div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
{/snippet}

{#snippet settingsPopover()}
    <Popover.Root>
        <Popover.Trigger class="size-8 rounded-md p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800">
            <span class="iconify octicon--gear-16" aria-hidden="true"></span>
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content
                aria-label="Options"
                class="mx-2 flex flex-col rounded-md border border-gray-300 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-950"
            >
                <div class="mb-4 flex flex-row justify-between">
                    <span class="iconify text-blue-500 octicon--gear-16" aria-hidden="true"></span>
                    <Popover.Close class="size-4">
                        <span class="iconify text-blue-500 octicon--x-16"></span>
                    </Popover.Close>
                </div>
                <div class="flex flex-col">
                    <span>Theme</span>
                    <GlobalThemeRadio />
                </div>
                <Separator.Root class="my-2 h-[1px] w-full bg-gray-300 dark:bg-gray-700" />
                <Label.Root for="syntax-highlight-toggle" id="syntax-highlight-label" class="mb-0.5">Syntax Highlighting</Label.Root>
                <SimpleSwitch id="syntax-highlight-toggle" aria-labelledby="syntax-highlight-label" bind:checked={globalOptions.syntaxHighlighting} />
                <ShikiThemeSelector class="flex flex-col gap-0.5" bind:value={globalOptions.syntaxHighlightingThemeLight} mode="light" />
                <ShikiThemeSelector class="flex flex-col gap-0.5" bind:value={globalOptions.syntaxHighlightingThemeDark} mode="dark" />
                <Separator.Root class="my-2 h-[1px] w-full bg-gray-300 dark:bg-gray-700" />
                <Label.Root id="omit-hunks-label" class="max-w-64 break-words" for="omit-hunks">
                    Omit hunks containing only second-level patch header line changes
                </Label.Root>
                <SimpleSwitch id="omit-hunks" aria-labelledby="omit-hunks-label" bind:checked={globalOptions.omitPatchHeaderOnlyHunks} />
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
{/snippet}

<div class="relative flex min-h-screen flex-row justify-center">
    <div
        class="absolute top-0 left-0 z-10 h-full w-full flex-col border-e border-gray-300 bg-white md:w-[350px] md:shadow-md lg:static lg:h-auto lg:shadow-none dark:border-gray-700 dark:bg-gray-950"
        class:flex={!sidebarCollapsed}
        class:hidden={sidebarCollapsed}
    >
        <div class="m-2 flex flex-row items-center gap-2">
            <div class="relative grow">
                <input
                    type="text"
                    placeholder="Search files..."
                    bind:value={viewer.searchQuery}
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700"
                    autocomplete="off"
                />
                {#if viewer.debouncedSearchQuery}
                    <button class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 hover:text-gray-700" onclick={() => viewer.clearSearch()}>✕</button>
                {/if}
            </div>
            <div class="flex items-center lg:hidden">
                {@render sidebarToggle()}
            </div>
        </div>
        {#if viewer.filteredFileDetails.length !== viewer.fileDetails.length}
            <div class="ms-2 mb-2 text-sm text-gray-600">
                Showing {viewer.filteredFileDetails.length} of {viewer.fileDetails.length} files
            </div>
        {/if}
        <div class="flex h-full flex-col overflow-y-auto border-t border-gray-300 dark:border-gray-700">
            <div class="h-100">
                {#snippet fileSnippet(value: FileDetails)}
                    <div
                        class="flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onclick={(e) => scrollToFileClick(e, viewer.getIndex(value))}
                        onkeydown={(e) => e.key === "Enter" && viewer.scrollToFile(viewer.getIndex(value))}
                        role="button"
                        tabindex="0"
                    >
                        <span
                            class="{getFileStatusProps(value.status).iconClasses} me-1 flex shrink-0 items-center justify-center"
                            aria-label={getFileStatusProps(value.status).title}
                        ></span>
                        <span class="grow overflow-hidden break-all">{value.toFile.substring(value.toFile.lastIndexOf("/") + 1)}</span>
                        <input
                            type="checkbox"
                            class="ms-1 size-4 shrink-0 rounded-sm border border-gray-300 dark:border-gray-700"
                            autocomplete="off"
                            aria-label="File reviewed"
                            onchange={() => viewer.toggleChecked(viewer.getIndex(value))}
                            checked={viewer.checked[viewer.getIndex(value)]}
                        />
                    </div>
                {/snippet}
                <Tree roots={viewer.fileTreeRoots} filter={filterFileNode}>
                    {#snippet nodeRenderer({ node, collapsed, toggleCollapse })}
                        {@const folderIcon = collapsed ? "octicon--file-directory-fill-16" : "octicon--file-directory-open-fill-16"}
                        {#if node.data.type === "file"}
                            {@render fileSnippet(node.data.data as FileDetails)}
                        {:else}
                            <div
                                class="flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                                onclick={toggleCollapse}
                                onkeydown={(e) => e.key === "Enter" && toggleCollapse()}
                                role="button"
                                tabindex="0"
                            >
                                <span class="me-1 iconify shrink-0 text-blue-500 {folderIcon}"></span>
                                <span class="grow overflow-hidden break-all">{node.data.data}</span>
                                {#if collapsed}
                                    <span class="iconify shrink-0 text-blue-500 octicon--chevron-right-16"></span>
                                {:else}
                                    <span class="iconify shrink-0 text-blue-500 octicon--chevron-down-16"></span>
                                {/if}
                            </div>
                        {/if}
                    {/snippet}
                    {#snippet childWrapper({ node, collapsed, children })}
                        <div class:dir-header={node.data.type === "directory" && !collapsed} class="ps-4">
                            {@render children({ node })}
                        </div>
                    {/snippet}
                </Tree>
            </div>
        </div>
    </div>
    <div class="flex grow flex-col bg-white p-3 dark:bg-gray-950">
        <div class="mb-2 flex justify-between gap-2">
            <div class="flex flex-row items-center gap-2">
                {@render sidebarToggle()}
                {@render mainDialog()}
            </div>
            <div class="flex flex-row items-center gap-2">
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={() => viewer.expandAll()}
                    >Expand All</button
                >
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={() => viewer.collapseAll()}
                    >Collapse All</button
                >
                {@render settingsPopover()}
            </div>
        </div>
        <div class="flex flex-1 flex-col border border-gray-300 dark:border-gray-700">
            <VList data={viewer.fileDetails} style="height: 100%;" getKey={(_, i) => i} bind:this={viewer.vlist} overscan={3}>
                {#snippet children(value, index)}
                    {@const lines = viewer.diffText[index] !== undefined ? viewer.diffText[index] : null}
                    {@const image = viewer.images[index] !== undefined ? viewer.images[index] : null}

                    <div id={`file-${index}`}>
                        <div
                            class="sticky top-0 flex cursor-pointer flex-row items-center justify-between gap-2 border-b border-gray-300 bg-white px-2 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-950"
                            onclick={() => viewer.toggleCollapse(index)}
                            tabindex="0"
                            onkeyup={(event) => event.key === "Enter" && viewer.toggleCollapse(index)}
                            role="button"
                        >
                            {#if value.fromFile === value.toFile}
                                <span class="max-w-full overflow-hidden break-all">{value.toFile}</span>
                            {:else}
                                <span class="flex max-w-full flex-wrap items-center gap-0.5 overflow-hidden break-all">
                                    {value.fromFile}
                                    <span class="iconify inline-block text-blue-500 octicon--arrow-right-16"></span>
                                    {value.toFile}
                                </span>
                            {/if}
                            <div class="ms-0.5 flex items-center gap-2">
                                {#if viewer.patchHeaderDiffOnly[index]}
                                    <span class="rounded-sm bg-gray-300 px-1 text-gray-800">Patch-header-only diff</span>
                                {/if}
                                {#if !viewer.patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks || (image !== null && image !== undefined)}
                                    <span
                                        class="flex size-6 items-center justify-center rounded-md p-0.5 text-blue-500 hover:bg-gray-100 hover:shadow dark:hover:bg-gray-800"
                                    >
                                        {#if viewer.collapsed[index]}
                                            <span class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-right-16"></span>
                                        {:else}
                                            <span class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-down-16"></span>
                                        {/if}
                                    </span>
                                {/if}
                            </div>
                        </div>
                        {#if !viewer.collapsed[index] && image !== null}
                            <div class="mb border-b border-gray-300 text-sm dark:border-gray-700">
                                {#if image.load}
                                    {#if image.fileA !== null && image.fileB !== null}
                                        {#await Promise.all([image.fileA.getValue(), image.fileB.getValue()])}
                                            <div class="flex items-center justify-center bg-gray-300 p-4 dark:bg-gray-700"><Spinner /></div>
                                        {:then images}
                                            <ImageDiff fileA={images[0]} fileB={images[1]} />
                                        {/await}
                                    {:else}
                                        {#await (image.fileA || image.fileB).getValue()}
                                            <div class="flex items-center justify-center bg-gray-300 p-4 dark:bg-gray-700"><Spinner /></div>
                                        {:then file}
                                            <AddedOrRemovedImage {file} mode={image.fileA === null ? "add" : "remove"} />
                                        {/await}
                                    {/if}
                                {:else}
                                    <div class="flex justify-center bg-gray-300 p-4 dark:bg-gray-700">
                                        <button
                                            type="button"
                                            class=" flex flex-row items-center justify-center gap-1 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                                            onclick={() => (image.load = true)}
                                        >
                                            <span class="iconify size-4 shrink-0 octicon--image-16"></span><span>Load image diff</span>
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                        {#if !viewer.collapsed[index] && lines !== null && (!viewer.patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks)}
                            <div class="mb border-b border-gray-300 text-sm dark:border-gray-700">
                                <ConciseDiffView
                                    rawPatchContent={lines}
                                    syntaxHighlighting={globalOptions.syntaxHighlighting}
                                    syntaxHighlightingTheme={globalOptions.getSyntaxHighlightingTheme()}
                                    omitPatchHeaderOnlyHunks={globalOptions.omitPatchHeaderOnlyHunks}
                                    cache={viewer.diffViewCache}
                                    cacheKey={value}
                                />
                            </div>
                        {/if}
                    </div>
                {/snippet}
            </VList>
        </div>
    </div>
</div>

<style>
    .file-drop-target[data-drag-active="true"]::before {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        content: "Drop file here";
        font-size: var(--text-3xl);
        color: var(--color-black);

        background-color: rgba(255, 255, 255, 0.7);

        border: dashed var(--color-blue-500);
        border-radius: inherit;
    }

    .dir-header {
        position: relative;
    }
    .dir-header::before {
        content: "";
        position: absolute;
        height: 100%;
        width: 1px;
        top: 0;
        left: 1rem;
        background-color: var(--color-gray-500);
        z-index: 50;
        display: block;
    }
</style>
