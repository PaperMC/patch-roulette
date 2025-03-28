<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";
    import { debounce, type FileTreeNodeData, isImageFile, makeFileTree, memoizePromise, splitMultiFilePatch } from "$lib/util";
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
    import { type FileDetails, findHeaderChangeOnlyPatches, getFileStatusProps, GlobalOptions } from "$lib/diff-viewer-multi-file.svelte";
    import Tree from "$lib/components/Tree.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import type { TreeNode } from "$lib/components/scripts/Tree.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import ImageDiff from "$lib/components/ImageDiff.svelte";
    import type { MemoizedPromise } from "$lib/util.js";
    import { Popover, Label, Select, Dialog } from "bits-ui";
    import { bundledThemes } from "shiki";
    import SimpleSwitch from "$lib/components/SimpleSwitch.svelte";
    import AddedOrRemovedImage from "$lib/components/AddedOrRemovedImage.svelte";

    type ImageDiffDetails = {
        fileA: MemoizedPromise<string> | null;
        fileB: MemoizedPromise<string> | null;
        load: boolean;
    };

    let data: {
        values: FileDetails[];
        lines: string[];
        images: ImageDiffDetails[];
    } = $state({ values: [], lines: [], images: [] });
    let vlist: VList<FileDetails> | undefined = $state();
    let collapsedState: boolean[] = $state([]);
    let checkedState: boolean[] = $state([]);

    let globalOptions: GlobalOptions = GlobalOptions.load();

    let patchHeaderDiffOnly: boolean[] = $derived(findHeaderChangeOnlyPatches(data.lines));
    $effect(() => {
        for (let i = 0; i < patchHeaderDiffOnly.length; i++) {
            if (patchHeaderDiffOnly[i] && checkedState[i] === undefined) {
                checkedState[i] = true;
            }
        }
    });

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
                const fileA = image.fileA;
                if (fileA?.hasValue()) {
                    (async () => {
                        const a = await fileA.getValue();
                        URL.revokeObjectURL(a);
                    })();
                }
                const fileB = image.fileB;
                if (fileB?.hasValue()) {
                    (async () => {
                        const b = await fileB.getValue();
                        URL.revokeObjectURL(b);
                    })();
                }
            }
        }
        data.images = [];
    }

    onDestroy(() => clearImages());

    function loadPatches(patches: FileDetails[]) {
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

            if (githubDetails && isImageFile(patch.fromFile) && isImageFile(patch.toFile)) {
                const githubDetailsCopy = githubDetails;

                let fileA: MemoizedPromise<string> | null;
                if (patch.status === "added") {
                    fileA = null;
                } else {
                    fileA = memoizePromise(async () =>
                        URL.createObjectURL(
                            await fetchGithubFile(getGithubToken(), githubDetailsCopy.owner, githubDetailsCopy.repo, patch.fromFile, githubDetailsCopy.base),
                        ),
                    );
                }

                let fileB: MemoizedPromise<string> | null;
                if (patch.status === "removed") {
                    fileB = null;
                } else {
                    fileB = memoizePromise(async () =>
                        URL.createObjectURL(
                            await fetchGithubFile(getGithubToken(), githubDetailsCopy.owner, githubDetailsCopy.repo, patch.toFile, githubDetailsCopy.head),
                        ),
                    );
                }

                data.images[i] = { fileA, fileB, load: false };
                continue;
            }

            data.lines[i] = patch.content;
        }

        // Set this last since it's what the VList loads
        data.values.push(...patches);
    }

    let modalOpen = $state(false);

    function loadFromFile(patchContent: string) {
        const files = splitMultiFilePatch(patchContent);
        if (files.length === 0) {
            alert("No valid patches found in the file.");
            modalOpen = true;
            return;
        }
        loadPatches(files);
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
        modalOpen = false;
        loadFromFile(await files[0].text());
    }

    let githubUrl = $state("");
    let githubDetails: GithubDiff | null = $state(null);
    onMount(async () => {
        const url = page.url.searchParams.get(GITHUB_URL_PARAM);
        if (url !== null) {
            githubUrl = url;
            await handleGithubUrl();
        } else {
            modalOpen = true;
        }
    });

    async function handleGithubUrl() {
        modalOpen = false;
        const success = await loadFromGithubApi(githubUrl);
        if (success) {
            const newUrl = new URL(page.url);
            newUrl.searchParams.set(GITHUB_URL_PARAM, githubUrl);
            await goto(`?${newUrl.searchParams}`);
            return;
        }
        modalOpen = true;
    }

    // convert commit or PR url to an API url
    async function loadFromGithubApi(url: string): Promise<boolean> {
        const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(commit|pull|compare)\/([^/]+)\/?$/;
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
                loadPatches(files);
                return true;
            } else if (type === "pull") {
                const { info, files } = await fetchGithubPRComparison(token, owner, repo, id);
                githubDetails = info;
                loadPatches(files);
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
                loadPatches(files);
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
    <button type="button" class="size-8 rounded-md p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow" onclick={() => (sidebarCollapsed = !sidebarCollapsed)}>
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
            <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content class="fixed top-1/2 left-1/2 z-50 w-full max-w-fit -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-4 shadow-md">
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
                            class="absolute top-0 right-0 flex size-8 items-center justify-center rounded-md text-blue-500 hover:bg-gray-100 hover:shadow"
                        >
                            <span class="iconify octicon--x-16"></span>
                        </Dialog.Close>
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
                            class="grow rounded-md border border-gray-300 px-2 py-1"
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
        <Popover.Trigger class="size-8 rounded-md p-1.5 text-blue-500 hover:bg-gray-100 hover:shadow">
            <span class="iconify octicon--gear-16" aria-hidden="true"></span>
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content aria-label="Options" class="mx-2 flex flex-col rounded-md border border-gray-300 bg-white p-3 shadow-md">
                <div class="mb-4 flex flex-row justify-between">
                    <span class="iconify text-blue-500 octicon--gear-16" aria-hidden="true"></span>
                    <Popover.Close>
                        <span class="iconify text-blue-500 octicon--x-16"></span>
                    </Popover.Close>
                </div>
                <Label.Root for="syntax-highlight-toggle" id="syntax-highlight-label" class="mb-0.5">Syntax Highlighting</Label.Root>
                <div class="flex flex-row items-center gap-1.5">
                    <SimpleSwitch id="syntax-highlight-toggle" aria-labelledby="syntax-highlight-label" bind:checked={globalOptions.syntaxHighlighting} />
                    <Select.Root type="single" bind:value={globalOptions.syntaxHighlightingTheme}>
                        <Select.Trigger
                            aria-label="Select syntax highlighting theme"
                            class="flex w-36 cursor-pointer items-center gap-1 rounded-lg border border-gray-300 p-1 text-sm select-none hover:bg-gray-100"
                        >
                            <span aria-hidden="true" class="iconify shrink-0 text-base text-blue-500 octicon--single-select-16"></span>
                            <div aria-label="Current theme" class="grow text-center">{globalOptions.syntaxHighlightingTheme}</div>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content class="max-h-64 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-md">
                                {#each Object.keys(bundledThemes) as theme (theme)}
                                    <Select.Item value={theme} class="data-highlighted:bg-blue-400 data-highlighted:text-white">
                                        {#snippet children({ selected })}
                                            <div class="cursor-default px-2 py-1 text-sm" class:bg-blue-500={selected} class:text-white={selected}>
                                                {theme}
                                            </div>
                                        {/snippet}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>
                <Label.Root id="omit-hunks-label" class="mt-2 max-w-64 break-words" for="omit-hunks">
                    Omit hunks containing only second-level patch header line changes
                </Label.Root>
                <SimpleSwitch id="omit-hunks" aria-labelledby="omit-hunks-label" bind:checked={globalOptions.omitPatchHeaderOnlyHunks} />
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
{/snippet}

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
                    <div
                        class="flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-gray-100"
                        onclick={(e) => scrollToFileClick(e, getIndex(value))}
                        onkeydown={(e) => e.key === "Enter" && scrollToFile(getIndex(value))}
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
                            class="ms-1 size-4 shrink-0 rounded-sm border border-gray-300"
                            autocomplete="off"
                            aria-label="File reviewed"
                            onchange={() => toggleChecked(getIndex(value))}
                            checked={checkedState[getIndex(value)]}
                        />
                    </div>
                {/snippet}
                <Tree roots={rootNodes} filter={filterFileNode}>
                    {#snippet nodeRenderer({ node, collapsed, toggleCollapse })}
                        {@const folderIcon = collapsed ? "octicon--file-directory-fill-16" : "octicon--file-directory-open-fill-16"}
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
    <div class="flex grow flex-col bg-white p-3">
        <div class="mb-2 flex justify-between gap-2">
            <div class="flex flex-row items-center gap-2">
                {@render sidebarToggle()}
                {@render mainDialog()}
            </div>
            <div class="flex flex-row items-center gap-2">
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={expandAll}>Expand All</button>
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={collapseAll}>Collapse All</button>
                {@render settingsPopover()}
            </div>
        </div>
        <div class="flex flex-1 flex-col border border-gray-300">
            <VList data={data.values} style="height: 100%;" getKey={(_, i) => i} bind:this={vlist} overscan={3}>
                {#snippet children(value, index)}
                    {@const lines = data.lines[index] !== undefined ? data.lines[index] : null}
                    {@const image = data.images[index] !== undefined ? data.images[index] : null}

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
                                <span class="flex max-w-full flex-wrap items-center gap-0.5 overflow-hidden break-all">
                                    {value.fromFile}
                                    <span class="iconify inline-block text-blue-500 octicon--arrow-right-16"></span>
                                    {value.toFile}
                                </span>
                            {/if}
                            <div class="ms-0.5 flex items-center gap-2">
                                {#if patchHeaderDiffOnly[index]}
                                    <span class="rounded-sm bg-gray-300 px-1 text-gray-800">Patch-header-only diff</span>
                                {/if}
                                {#if !patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks || (image !== null && image !== undefined)}
                                    <span class="flex size-6 items-center justify-center rounded-md p-0.5 text-blue-500 hover:bg-gray-100 hover:shadow">
                                        {#if collapsedState[index]}
                                            <span class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-right-16"></span>
                                        {:else}
                                            <span class="iconify size-4 shrink-0 text-blue-500 octicon--chevron-down-16"></span>
                                        {/if}
                                    </span>
                                {/if}
                            </div>
                        </div>
                        {#if !collapsedState[index] && image !== null}
                            <div class="mb border-b border-gray-300 text-sm">
                                {#if image.load}
                                    {#if image.fileA !== null && image.fileB !== null}
                                        {#await Promise.all([image.fileA.getValue(), image.fileB.getValue()])}
                                            <div class="flex items-center justify-center bg-gray-300 p-4"><Spinner /></div>
                                        {:then images}
                                            <ImageDiff fileA={images[0]} fileB={images[1]} />
                                        {/await}
                                    {:else}
                                        {#await (image.fileA || image.fileB).getValue()}
                                            <div class="flex items-center justify-center bg-gray-300 p-4"><Spinner /></div>
                                        {:then file}
                                            <AddedOrRemovedImage {file} mode={image.fileA === null ? "add" : "remove"} />
                                        {/await}
                                    {/if}
                                {:else}
                                    <div class="flex justify-center bg-gray-300 p-4">
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
                        {#if !collapsedState[index] && lines !== null && (!patchHeaderDiffOnly[index] || !globalOptions.omitPatchHeaderOnlyHunks)}
                            <div class="mb border-b border-gray-300 text-sm">
                                <ConciseDiffView
                                    rawPatchContent={lines}
                                    syntaxHighlighting={globalOptions.syntaxHighlighting}
                                    syntaxHighlightingTheme={globalOptions.syntaxHighlightingTheme}
                                    omitPatchHeaderOnlyHunks={globalOptions.omitPatchHeaderOnlyHunks}
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
