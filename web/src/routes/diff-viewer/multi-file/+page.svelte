<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";
    import makeLines, { type PatchLine } from "$lib/components/scripts/ConciseDiffView.svelte";
    import { debounce, type FileTreeNodeData, isImageFile, makeFileTree, memoize, splitMultiFilePatch } from "$lib/util";
    import { VList } from "virtua/svelte";
    import {
        fetchGithubCommitDiff,
        fetchGithubComparison,
        fetchGithubFile,
        fetchGithubPRComparison,
        getGithubToken,
        getGithubUsername,
        GITHUB_URL_PARAM,
        type GithubDiff,
        installGithubApp,
        loginWithGithub,
        logoutGithub,
    } from "$lib/github.svelte";
    import { onDestroy, onMount } from "svelte";
    import { type FileDetails, getFileStatusProps } from "$lib/diff-viewer-multi-file.svelte";
    import Tree from "$lib/components/Tree.svelte";
    import type { TreeNode } from "$lib/components/scripts/Tree.svelte";
    import FileDirectoryOpen from "virtual:icons/octicon/file-directory-open-fill-16";
    import FileDirectory from "virtual:icons/octicon/file-directory-fill-16";
    import MarkGithub from "virtual:icons/octicon/mark-github-16";
    import SidebarCollapse from "virtual:icons/octicon/sidebar-collapse-16";
    import SidebarExpand from "virtual:icons/octicon/sidebar-expand-16";
    import ChevronDown16 from "virtual:icons/octicon/chevron-down-16";
    import ChevronRight16 from "virtual:icons/octicon/chevron-right-16";
    import ArrowRight24 from "virtual:icons/octicon/arrow-right-24";
    import Image16 from "virtual:icons/octicon/image-16";
    import { page } from "$app/state";
    import { replaceState } from "$app/navigation";
    import ImageDiff from "$lib/components/ImageDiff.svelte";
    import type { MemoizedValue } from "$lib/util.js";

    type ImageDiffDetails = {
        fileA: MemoizedValue<Promise<string>>;
        fileB: MemoizedValue<Promise<string>>;
        load: boolean;
    };

    let data: {
        values: FileDetails[];
        lines: PatchLine[][];
        images: ImageDiffDetails[];
    } = $state({ values: [], lines: [], images: [] });
    let vlist: VList<FileDetails> | undefined = $state();
    let collapsedState: boolean[] = $state([]);
    let checkedState: boolean[] = $state([]);

    let searchQuery: string = $state("");
    let debouncedSearchQuery: string = $state("");
    const updateDebouncedSearch = debounce((value: string) => (debouncedSearchQuery = value), 500);
    $effect(() => updateDebouncedSearch(searchQuery));

    let sidebarCollapsed = $state(false);
    let rootNodes = $derived(makeFileTree(data.values));
    let filteredFiles: FileDetails[] = $derived(debouncedSearchQuery ? data.values.filter(filterFile) : data.values);

    function filterFile(file: FileDetails): boolean {
        const queryLower = debouncedSearchQuery.toLowerCase();
        return file.toFile.toLowerCase().includes(queryLower) || file.fromFile.toLowerCase().includes(queryLower);
    }

    function filterFileNode(file: TreeNode<FileTreeNodeData>): boolean {
        return file.data.type === "file" && filterFile(file.data.data as FileDetails);
    }

    function clearImages() {
        for (let i = 0; i < data.images.length; i++) {
            const image = data.images[i];
            if (image !== null && image !== undefined) {
                image.load = false;
                if (image.fileA.hasValue()) {
                    (async () => {
                        const a = await image.fileA.getValue();
                        URL.revokeObjectURL(a);
                    })();
                }
                if (image.fileB.hasValue()) {
                    (async () => {
                        const b = await image.fileB.getValue();
                        URL.revokeObjectURL(b);
                    })();
                }
            }
        }
        data.images = [];
    }

    onDestroy(() => clearImages());

    async function loadPatches(patches: FileDetails[]) {
        // Reset state
        collapsedState = [];
        checkedState = [];
        data.values = [];
        data.lines = [];
        clearImages();
        vlist?.scrollToIndex(0, { align: "start" });

        // Load new state
        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i];

            if (isImageFile(patch.fromFile) && isImageFile(patch.toFile)) {
                if (githubDetails) {
                    const githubDetailsCopy = githubDetails;
                    const fileA = memoize(() =>
                        fetchGithubFile(getGithubToken(), githubDetailsCopy.owner, githubDetailsCopy.repo, patch.fromFile, githubDetailsCopy.base),
                    );
                    const fileB = memoize(() =>
                        fetchGithubFile(getGithubToken(), githubDetailsCopy.owner, githubDetailsCopy.repo, patch.toFile, githubDetailsCopy.head),
                    );
                    data.images[i] = { fileA, fileB, load: false };
                    continue;
                }
            }

            const lines = makeLines(patch.content);
            data.lines[i] = lines;
            if (lines.length == 0) {
                checkedState[data.lines.length - 1] = true;
            }
        }

        // Set this last since it's what the VList loads
        data.values.push(...patches);
    }

    async function loadFromFile(patchContent: string) {
        const files = splitMultiFilePatch(patchContent);
        if (files.length === 0) {
            alert("No valid patches found in the file.");
            modal?.showModal();
            return;
        }
        await loadPatches(files);
    }

    let modal: HTMLDialogElement | null = $state(null);
    onMount(() => {
        modal?.showModal();
    });

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
        modal?.close();
        await loadFromFile(await files[0].text());
        githubDetails = null;
    }

    let dragActive = $state(false);

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
        modal?.close();
        await loadFromFile(await files[0].text());
    }

    let githubUrl = $state("");
    let githubDetails: GithubDiff | null = $state(null);
    onMount(async () => {
        const url = page.url.searchParams.get(GITHUB_URL_PARAM);
        if (url !== null) {
            githubUrl = url;
            await handleGithubUrl();
        }
    });

    async function handleGithubUrl() {
        modal?.close();
        const success = await loadFromGithubApi(githubUrl);
        if (success) {
            const newUrl = new URL(page.url);
            newUrl.searchParams.set(GITHUB_URL_PARAM, githubUrl);
            replaceState(newUrl, page.state);
            return;
        }
        modal?.showModal();
    }

    // convert commit or PR url to an API url
    async function loadFromGithubApi(url: string): Promise<boolean> {
        const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(commit|pull|compare)\/([^/]+)$/;
        const match = url.match(regex);

        if (!match) {
            alert("Invalid GitHub URL. Use: https://github.com/owner/repo/(commit|pull|compare)/(id|ref_a...ref_b)");
            return false;
        }

        const [, owner, repo, type, id] = match;
        const token = getGithubToken();

        try {
            if (type === "commit") {
                const { info, files } = await fetchGithubCommitDiff(token, owner, repo, id);
                githubDetails = info;
                await loadPatches(files);
                return true;
            } else if (type === "pull") {
                const { info, files } = await fetchGithubPRComparison(token, owner, repo, id);
                githubDetails = info;
                await loadPatches(files);
                return true;
            } else if (type === "compare") {
                const refs = id.split("...");
                if (refs.length !== 2) {
                    alert(`Invalid comparison URL. '${id}' does not match format 'ref_a...ref_b'`);
                    return false;
                }
                const base = refs[0];
                const head = refs[1];
                const { info, files } = await fetchGithubComparison(token, owner, repo, base, head);
                githubDetails = info;
                await loadPatches(files);
                return true;
            }
        } catch (error) {
            console.error(error);
            alert(`Failed to load diff from GitHub: ${error}`);
            return false;
        }

        alert("Unsupported URL type " + url);
        return false;
    }

    function toggleCollapse(index: number) {
        collapsedState[index] = !(collapsedState[index] || false);
    }

    function expandAll() {
        collapsedState = [];
    }

    function collapseAll() {
        collapsedState = data.values.map(() => true);
    }

    function scrollToFileClick(event: Event, index: number) {
        const element: HTMLElement = event.target as HTMLElement;
        // Don't scroll if we clicked the inner checkbox
        if (element.tagName.toLowerCase() !== "input") {
            scrollToFile(index);
        }
    }

    function scrollToFile(index: number) {
        if (vlist) {
            if (!checkedState[index]) {
                // Auto-expand on jump when not checked
                collapsedState[index] = false;
            }
            vlist.scrollToIndex(index, { align: "start" });
        }
    }

    function getIndex(details: FileDetails): number {
        return data.values.findIndex((f) => f.fromFile === details.fromFile && f.toFile === details.toFile);
    }

    function clearSearch() {
        searchQuery = "";
        debouncedSearchQuery = "";
    }

    function toggleChecked(index: number) {
        checkedState[index] = !checkedState[index];
        if (checkedState[index]) {
            // Auto-collapse on check
            collapsedState[index] = true;
        }
    }
</script>

{#snippet sidebarToggle()}
    <button type="button" class="rounded-md p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow" onclick={() => (sidebarCollapsed = !sidebarCollapsed)}>
        {#if sidebarCollapsed}
            <SidebarCollapse></SidebarCollapse>
        {:else}
            <SidebarExpand></SidebarExpand>
        {/if}
    </button>
{/snippet}

<dialog
    bind:this={modal}
    class="file-drop-target fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md p-4 backdrop:bg-black/50"
    ondrop={handleFileDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    data-drag-active={dragActive}
>
    <div class="flex flex-col">
        <div class="mb-2 flex flex-row justify-end">
            <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600 focus-visible:outline-0" onclick={() => modal?.close()}>
                Close
            </button>
        </div>
        <hr class="mb-2 text-gray-300" />

        <label for="githubUrl">
            <span>Load from GitHub URL</span>
            <br />
            <span class="text-sm text-gray-600">Supports commit, PR, and comparison URLs</span>
        </label>
        <div class="mb-4 flex flex-row items-center gap-2">
            <input
                id="githubUrl"
                type="text"
                class="grow rounded-sm border border-gray-300"
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
                <MarkGithub class="shrink-0"></MarkGithub>
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
                <MarkGithub class="shrink-0"></MarkGithub> Install/configure GitHub App
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
</dialog>
<div class="relative flex min-h-screen flex-row justify-center">
    <div
        class="absolute top-0 left-0 z-10 h-full w-full flex-col border-e border-gray-300 bg-white md:w-[350px] md:shadow-md lg:static lg:h-auto lg:shadow-none"
        class:flex={!sidebarCollapsed}
        class:hidden={sidebarCollapsed}
    >
        <div class="m-2 flex flex-row items-center gap-2">
            <div class="relative grow">
                <input
                    type="text"
                    placeholder="Search files..."
                    bind:value={searchQuery}
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autocomplete="off"
                />
                {#if debouncedSearchQuery}
                    <button class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 hover:text-gray-700" onclick={clearSearch}>✕</button>
                {/if}
            </div>
            <div class="flex items-center lg:hidden">
                {@render sidebarToggle()}
            </div>
        </div>
        {#if filteredFiles.length !== data.values.length}
            <div class="ms-2 mb-2 text-sm text-gray-600">
                Showing {filteredFiles.length} of {data.values.length} files
            </div>
        {/if}
        <div class="flex h-full flex-col overflow-y-auto border-t border-gray-300">
            <div class="h-100">
                {#snippet fileSnippet(value: FileDetails)}
                    {@const FileIcon = getFileStatusProps(value.status).icon}
                    <div
                        class="flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-gray-100"
                        onclick={(e) => scrollToFileClick(e, getIndex(value))}
                        onkeydown={(e) => e.key === "Enter" && scrollToFile(getIndex(value))}
                        role="button"
                        tabindex="0"
                    >
                        <FileIcon
                            class="{getFileStatusProps(value.status).classes} me-1 flex shrink-0 items-center justify-center"
                            aria-label={getFileStatusProps(value.status).title}
                        ></FileIcon>
                        <span class="grow overflow-hidden break-all">{value.toFile.substring(value.toFile.lastIndexOf("/") + 1)}</span>
                        <input
                            type="checkbox"
                            class="ms-1 h-[1.2em] w-[1.2em] shrink-0 rounded-sm border border-gray-300"
                            autocomplete="off"
                            aria-label="File reviewed"
                            onchange={() => toggleChecked(getIndex(value))}
                            checked={checkedState[getIndex(value)]}
                        />
                    </div>
                {/snippet}
                <Tree roots={rootNodes} filter={filterFileNode}>
                    {#snippet nodeRenderer({ node, collapsed, toggleCollapse })}
                        {@const FolderIcon = collapsed ? FileDirectory : FileDirectoryOpen}
                        {#if node.data.type === "file"}
                            {@render fileSnippet(node.data.data as FileDetails)}
                        {:else}
                            <div
                                class="flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-gray-100"
                                onclick={toggleCollapse}
                                onkeydown={(e) => e.key === "Enter" && toggleCollapse()}
                                role="button"
                                tabindex="0"
                            >
                                <FolderIcon class="me-1 shrink-0 text-blue-500"></FolderIcon>
                                <span class="grow overflow-hidden break-all">{node.data.data}</span>
                                {#if collapsed}
                                    <ChevronRight16 class="shrink-0 text-blue-500"></ChevronRight16>
                                {:else}
                                    <ChevronDown16 class="shrink-0 text-blue-500"></ChevronDown16>
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
    <div class="flex grow flex-col bg-white p-3">
        <div class="mb-2 flex justify-between gap-2">
            <div class="flex flex-row items-center gap-2">
                {@render sidebarToggle()}
                <button
                    type="button"
                    class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                    onclick={() => {
                        dragActive = false;
                        modal?.showModal();
                    }}
                >
                    Load another diff
                </button>
            </div>
            <div class="flex flex-row gap-2">
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={expandAll}>Expand All</button>
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={collapseAll}>Collapse All</button>
            </div>
        </div>
        <div class="flex flex-1 flex-col border border-gray-300">
            <VList data={data.values} style="height: 100%;" getKey={(_, i) => i} bind:this={vlist}>
                {#snippet children(value, index)}
                    {@const lines = data.lines[index]}
                    {@const image = data.images[index]}

                    <div id={`file-${index}`}>
                        <div
                            class="sticky top-0 flex cursor-pointer flex-row items-center justify-between gap-2 border-b border-gray-300 bg-white px-2 py-1 shadow-sm"
                            onclick={() => toggleCollapse(index)}
                            tabindex="0"
                            onkeyup={(event) => event.key === "Enter" && toggleCollapse(index)}
                            role="button"
                        >
                            {#if value.fromFile === value.toFile}
                                <span class="max-w-full overflow-hidden break-all">{value.toFile}</span>
                            {:else}
                                <span class="max-w-full overflow-hidden break-all"
                                    >{value.fromFile} <ArrowRight24 class="inline-block text-blue-500"></ArrowRight24> {value.toFile}</span
                                >
                            {/if}
                            {#if (lines !== null && lines !== undefined && lines.length > 0) || (image !== null && image !== undefined)}
                                <span class="rounded-md p-0.5 text-blue-500 hover:bg-gray-100 hover:shadow">
                                    {#if collapsedState[index]}
                                        <ChevronRight16></ChevronRight16>
                                    {:else}
                                        <ChevronDown16></ChevronDown16>
                                    {/if}
                                </span>
                            {/if}
                            {#if lines !== null && lines !== undefined && lines.length === 0}
                                <span class="ms-2 rounded-sm bg-gray-300 px-1 text-gray-800">Patch-header-only diff</span>
                            {/if}
                        </div>
                        {#if !collapsedState[index] && ((image !== null && image !== undefined) || lines?.length > 0)}
                            <div class="mb border-b border-gray-300 text-sm">
                                {#if image !== null && image !== undefined}
                                    {#if image.load}
                                        {#await Promise.all([image.fileA.getValue(), image.fileB.getValue()])}
                                            <div class="flex items-center justify-center bg-gray-300 p-4">
                                                <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
                                            </div>
                                        {:then images}
                                            <ImageDiff fileA={images[0]} fileB={images[1]}></ImageDiff>
                                        {/await}
                                    {:else}
                                        <div class="flex justify-center bg-gray-300 p-4">
                                            <button
                                                type="button"
                                                class=" flex flex-row items-center justify-center gap-1 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                                                onclick={() => (image.load = true)}
                                            >
                                                <Image16></Image16><span>Load image diff</span>
                                            </button>
                                        </div>
                                    {/if}
                                {:else}
                                    <ConciseDiffView preRenderedPatchLines={lines}></ConciseDiffView>
                                {/if}
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
