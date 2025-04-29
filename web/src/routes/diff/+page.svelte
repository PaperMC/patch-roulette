<script lang="ts">
    import ConciseDiffView from "$lib/components/diff/ConciseDiffView.svelte";
    import { type FileTreeNodeData, splitMultiFilePatch } from "$lib/util";
    import { VList } from "virtua/svelte";
    import { getGithubUsername, GITHUB_URL_PARAM, installGithubApp, loginWithGithub, logoutGithub } from "$lib/github.svelte";
    import { onMount } from "svelte";
    import {
        type FileDetails,
        getFileStatusProps,
        GlobalOptions,
        MultiFileDiffViewerState,
        requireEitherImage,
        staticSidebar,
    } from "$lib/diff-viewer-multi-file.svelte";
    import Tree from "$lib/components/tree/Tree.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import { type TreeNode } from "$lib/components/tree/index.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import ImageDiff from "$lib/components/diff/ImageDiff.svelte";
    import { Dialog, Separator } from "bits-ui";
    import AddedOrRemovedImage from "$lib/components/diff/AddedOrRemovedImage.svelte";
    import DiffStats from "$lib/components/diff/DiffStats.svelte";
    import SettingsPopover, { globalThemeSetting } from "$lib/components/settings-popover/SettingsPopover.svelte";
    import SettingsPopoverGroup from "$lib/components/settings-popover/SettingsPopoverGroup.svelte";
    import LabeledCheckbox from "$lib/components/LabeledCheckbox.svelte";
    import ShikiThemeSelector from "$lib/components/settings-popover/ShikiThemeSelector.svelte";
    import DiffSearch from "./DiffSearch.svelte";
    import FileHeader from "./FileHeader.svelte";
    import DiffTitle from "./DiffTitle.svelte";
    import { type Action } from "svelte/action";
    import { on } from "svelte/events";
    import ActionsPopover from "./ActionsPopover.svelte";

    const globalOptions: GlobalOptions = GlobalOptions.load();
    const viewer = new MultiFileDiffViewerState();

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

    function loadFromFile(fileName: string, patchContent: string) {
        const files = splitMultiFilePatch(patchContent);
        if (files.length === 0) {
            alert("No valid patches found in the file.");
            modalOpen = true;
            return;
        }
        viewer.loadPatches(files, { fileName });
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
        const file = files[0];
        loadFromFile(file.name, await file.text());
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
        const file = files[0];
        loadFromFile(file.name, await file.text());
    }

    async function handleGithubUrl() {
        modalOpen = false;
        const url = new URL(githubUrl);
        // exclude hash + query params
        const test = url.protocol + "//" + url.hostname + url.pathname;

        const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(commit|pull|compare)\/(.+)/;
        const match = test.match(regex);

        if (!match) {
            alert("Invalid GitHub URL. Use: https://github.com/owner/repo/(commit|pull|compare)/(id|ref_a...ref_b)");
            modalOpen = true;
            return;
        }

        githubUrl = match[0];
        const success = await viewer.loadFromGithubApi(match);
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

    const focusFileDoubleClick: Action<HTMLDivElement, { index: number }> = (div, { index }) => {
        const destroyDblclick = on(div, "dblclick", (event) => {
            const element: HTMLElement = event.target as HTMLElement;
            if (element.tagName.toLowerCase() !== "input") {
                viewer.scrollToFile(index, { focus: true });
                if (!staticSidebar.current) {
                    viewer.sidebarCollapsed = true;
                }
            }
        });
        const destoryMousedown = on(div, "mousedown", (event) => {
            const element: HTMLElement = event.target as HTMLElement;
            if (element.tagName.toLowerCase() !== "input" && event.detail === 2) {
                // Don't select text on double click
                event.preventDefault();
            }
        });
        return {
            destroy() {
                destroyDblclick();
                destoryMousedown();
            },
        };
    };

    function getPageTitle() {
        if (viewer.diffMetadata) {
            const meta = viewer.diffMetadata;
            if (meta.type === "github" && meta.githubDetails) {
                return `${meta.githubDetails.description} - GitHub/${meta.githubDetails.owner}/${meta.githubDetails.repo} - Patch Roulette Diff Viewer`;
            } else if (meta.type === "file" && meta.fileName) {
                return `${meta.fileName} - Patch Roulette Diff Viewer`;
            }
        }
        return "Patch Roulette Diff Viewer";
    }

    let pageTitle = $derived(getPageTitle());
</script>

<svelte:head>
    <title>{pageTitle}</title>
    <meta name="description" content="Multi-file rich diff viewer for GitHub and diff/patch files" />
</svelte:head>

{#snippet sidebarToggle()}
    <button
        type="button"
        class="flex size-6 items-center justify-center rounded-md btn-ghost text-primary"
        onclick={() => (viewer.sidebarCollapsed = !viewer.sidebarCollapsed)}
    >
        {#if viewer.sidebarCollapsed}
            <span class="iconify size-4 shrink-0 octicon--sidebar-collapse-16"></span>
        {:else}
            <span class="iconify size-4 shrink-0 octicon--sidebar-expand-16"></span>
        {/if}
    </button>
{/snippet}

{#snippet mainDialog()}
    <Dialog.Root bind:open={modalOpen}>
        <Dialog.Trigger class="h-fit rounded-md btn-primary px-2 py-0.5" onclick={() => (dragActive = false)}>Load another diff</Dialog.Trigger>
        <Dialog.Portal>
            <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 dark:bg-white/20" />
            <Dialog.Content class="fixed top-1/2 left-1/2 z-50 w-full max-w-fit -translate-x-1/2 -translate-y-1/2 rounded-md bg-neutral p-4 shadow-md">
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
                        <Dialog.Close class="absolute top-0 right-0 flex size-8 items-center justify-center rounded-md btn-ghost text-primary">
                            <span class="iconify octicon--x-16"></span>
                        </Dialog.Close>
                    </div>
                    <Separator.Root class="mb-2 h-[1px] w-full bg-edge" />

                    <label for="githubUrl">
                        <span>Load from GitHub URL</span>
                        <br />
                        <span class="text-sm text-em-med">Supports commit, PR, and comparison URLs</span>
                    </label>
                    <div class="mb-4 flex flex-row items-center gap-2">
                        <input
                            id="githubUrl"
                            type="text"
                            class="grow rounded-md border px-2 py-1 overflow-ellipsis focus:ring-2 focus:ring-primary focus:outline-none"
                            bind:value={githubUrl}
                            onkeyup={(event) => {
                                if (event.key === "Enter") {
                                    handleGithubUrl();
                                }
                            }}
                            autocomplete="off"
                        />
                        <button type="button" onclick={handleGithubUrl} class="rounded-md btn-primary px-2 py-1">Go</button>
                    </div>

                    <div class="mb-2 flex flex-row items-center gap-2">
                        <button
                            aria-labelledby="loginToGitHubLabel"
                            class="flex w-fit flex-row items-center justify-between gap-2 rounded-md btn-primary px-2 py-1"
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
                            class="flex w-fit flex-row items-center gap-2 rounded-md btn-primary px-2 py-1"
                            onclick={installGithubApp}
                        >
                            <span class="iconify shrink-0 octicon--mark-github-16"></span> Install/configure GitHub App
                        </button>
                        <span id="githubAppLabel">Install the GitHub App to view private repos.</span>
                    </div>

                    <div class="w-fit cursor-pointer rounded-md btn-primary px-2 py-1">
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
    <SettingsPopover class="self-center">
        {@render globalThemeSetting()}
        <SettingsPopoverGroup title="Syntax Highlighting">
            <LabeledCheckbox labelText="Enable" bind:checked={globalOptions.syntaxHighlighting} />
            <ShikiThemeSelector mode="light" bind:value={globalOptions.syntaxHighlightingThemeLight} />
            <ShikiThemeSelector mode="dark" bind:value={globalOptions.syntaxHighlightingThemeDark} />
        </SettingsPopoverGroup>
        <SettingsPopoverGroup title="Misc.">
            <LabeledCheckbox labelText="Concise nested diffs" bind:checked={globalOptions.omitPatchHeaderOnlyHunks} />
            <LabeledCheckbox labelText="Word diffs" bind:checked={globalOptions.wordDiffs} />
            <LabeledCheckbox labelText="Line wrapping" bind:checked={globalOptions.lineWrap} />
        </SettingsPopoverGroup>
    </SettingsPopover>
{/snippet}

<div class="relative flex min-h-screen flex-row justify-center">
    <div
        class="absolute top-0 left-0 z-10 flex h-full w-full flex-col border-e bg-neutral data-[collapsed=true]:hidden md:w-[350px] md:shadow-md lg:static lg:h-auto lg:shadow-none"
        data-collapsed={viewer.sidebarCollapsed}
    >
        <div class="m-2 flex flex-row items-center gap-2">
            <div class="relative grow">
                <input
                    type="text"
                    placeholder="Filter file tree..."
                    bind:value={viewer.fileTreeFilter}
                    class="w-full rounded-md border px-8 py-1 overflow-ellipsis focus:ring-2 focus:ring-primary focus:outline-none"
                    autocomplete="off"
                />
                <span aria-hidden="true" class="absolute top-1/2 left-2 iconify size-4 -translate-y-1/2 text-em-med octicon--filter-16"></span>
                {#if viewer.fileTreeFilterDebounced.current}
                    <button
                        class="absolute top-1/2 right-2 iconify size-4 -translate-y-1/2 text-gray-500 octicon--x-16 hover:text-gray-700"
                        onclick={() => viewer.clearSearch()}
                        aria-label="clear filter"
                    ></button>
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
        <div class="flex h-full flex-col overflow-y-auto border-t">
            <div class="h-100">
                {#snippet fileSnippet(value: FileDetails)}
                    <div
                        class="flex cursor-pointer items-center justify-between btn-ghost px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none focus:ring-inset"
                        onclick={(e) => scrollToFileClick(e, viewer.getIndex(value))}
                        use:focusFileDoubleClick={{ index: viewer.getIndex(value) }}
                        onkeydown={(e) => e.key === "Enter" && viewer.scrollToFile(viewer.getIndex(value))}
                        role="button"
                        tabindex="0"
                        id={"file-tree-file-" + viewer.getIndex(value)}
                    >
                        <span
                            class="{getFileStatusProps(value.status).iconClasses} me-1 flex size-4 shrink-0 items-center justify-center"
                            aria-label={getFileStatusProps(value.status).title}
                        ></span>
                        <span class="grow overflow-hidden break-all">{value.toFile.substring(value.toFile.lastIndexOf("/") + 1)}</span>
                        <input
                            type="checkbox"
                            class="ms-1 size-4 shrink-0 rounded-sm border"
                            autocomplete="off"
                            aria-label="File viewed"
                            onchange={() => viewer.toggleChecked(viewer.getIndex(value))}
                            checked={viewer.checked[viewer.getIndex(value)]}
                        />
                    </div>
                {/snippet}
                <Tree roots={viewer.fileTreeRoots} filter={filterFileNode} bind:instance={viewer.tree}>
                    {#snippet nodeRenderer({ node, collapsed, toggleCollapse })}
                        {@const folderIcon = collapsed ? "octicon--file-directory-fill-16" : "octicon--file-directory-open-fill-16"}
                        {#if node.data.type === "file"}
                            {@render fileSnippet(node.data.data as FileDetails)}
                        {:else}
                            <div
                                class="flex cursor-pointer items-center justify-between btn-ghost px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none focus:ring-inset"
                                onclick={toggleCollapse}
                                onkeydown={(e) => e.key === "Enter" && toggleCollapse()}
                                role="button"
                                tabindex="0"
                            >
                                <span class="me-1 iconify size-4 shrink-0 text-primary {folderIcon}"></span>
                                <span class="grow overflow-hidden break-all">{node.data.data}</span>
                                {#if collapsed}
                                    <span class="iconify size-4 shrink-0 text-primary octicon--chevron-right-16"></span>
                                {:else}
                                    <span class="iconify size-4 shrink-0 text-primary octicon--chevron-down-16"></span>
                                {/if}
                            </div>
                        {/if}
                    {/snippet}
                    {#snippet childWrapper({ node, collapsed, children })}
                        <div
                            class={{
                                hidden: collapsed || node.visibleChildren.length <= 0,
                                "dir-header": node.data.type === "directory" && !collapsed,
                                "ps-4": true,
                            }}
                        >
                            {@render children({ node })}
                        </div>
                    {/snippet}
                </Tree>
            </div>
        </div>
    </div>
    <div class="flex grow flex-col p-3">
        <div class="mb-2 flex flex-wrap items-center gap-2">
            {#if viewer.diffMetadata !== null}
                <DiffTitle meta={viewer.diffMetadata} />
            {/if}
            <div class="ml-auto flex h-fit flex-row gap-2">
                {@render mainDialog()}
                <ActionsPopover {viewer} />
                {@render settingsPopover()}
            </div>
        </div>
        <div class="mb-1 flex flex-row items-center gap-2">
            {@render sidebarToggle()}
            {#await viewer.stats}
                <DiffStats />
            {:then stats}
                <DiffStats add={stats.addedLines} remove={stats.removedLines} />
            {/await}
            <DiffSearch {viewer} />
        </div>
        <div class="flex flex-1 flex-col border">
            <VList data={viewer.fileDetails} style="height: 100%;" getKey={(_, i) => i} bind:this={viewer.vlist} overscan={3}>
                {#snippet children(value, index)}
                    {@const lines = viewer.diffText[index] !== undefined ? viewer.diffText[index] : null}
                    {@const image = viewer.images[index] !== undefined ? viewer.images[index] : null}
                    {@const patch = viewer.diffs[index]}

                    <div id={`file-${index}`}>
                        <FileHeader {viewer} {globalOptions} {index} {value} isImage={image !== null && image !== undefined} />
                        {#if !viewer.collapsed[index] && image !== null}
                            <div class="mb border-b text-sm">
                                {#if image.load}
                                    {#if image.fileA !== null && image.fileB !== null}
                                        {#await Promise.all([image.fileA.getValue(), image.fileB.getValue()])}
                                            <div class="flex items-center justify-center bg-neutral-2 p-4"><Spinner /></div>
                                        {:then images}
                                            <ImageDiff fileA={images[0]} fileB={images[1]} />
                                        {/await}
                                    {:else}
                                        {#await requireEitherImage(image).getValue()}
                                            <div class="flex items-center justify-center bg-neutral-2 p-4"><Spinner /></div>
                                        {:then file}
                                            <AddedOrRemovedImage {file} mode={image.fileA === null ? "add" : "remove"} />
                                        {/await}
                                    {/if}
                                {:else}
                                    <div class="flex justify-center bg-neutral-2 p-4">
                                        <button
                                            type="button"
                                            class=" flex flex-row items-center justify-center gap-1 rounded-md btn-primary px-2 py-1"
                                            onclick={() => (image.load = true)}
                                        >
                                            <span class="iconify size-4 shrink-0 octicon--image-16"></span><span>Load image diff</span>
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                        {#if !viewer.collapsed[index] && lines !== null && (!viewer.patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks)}
                            <div class="mb border-b">
                                <ConciseDiffView
                                    {patch}
                                    syntaxHighlighting={globalOptions.syntaxHighlighting}
                                    syntaxHighlightingTheme={globalOptions.getSyntaxHighlightingTheme()}
                                    omitPatchHeaderOnlyHunks={globalOptions.omitPatchHeaderOnlyHunks}
                                    wordDiffs={globalOptions.wordDiffs}
                                    lineWrap={globalOptions.lineWrap}
                                    searchQuery={viewer.searchQueryDebounced.current}
                                    searchMatchingLines={() => viewer.searchResults.then((r) => r.lines.get(value))}
                                    activeSearchResult={viewer.activeSearchResult && viewer.activeSearchResult.file === value
                                        ? viewer.activeSearchResult.idx
                                        : undefined}
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

        border: dashed var(--color-primary);
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
