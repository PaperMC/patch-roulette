<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";
    import makeLines, { type PatchLine } from "$lib/components/scripts/ConciseDiffView.svelte";
    import { debounce } from "$lib/util";
    import { VList } from "virtua/svelte";

    type GithubPRFile = {
        filename: string;
        previous_filename?: string;
        patch: string;
    };
    type FileDetails = {
        content: string;
        fromFile: string;
        toFile: string;
    };
    let data: { values: FileDetails[]; lines: PatchLine[][] } = $state({ values: [], lines: [] });
    let searchQuery: string = $state("");
    let debouncedSearchQuery: string = $state("");
    let filteredFiles: FileDetails[] = $derived(
        debouncedSearchQuery
            ? data.values.filter((file) => {
                  return (
                      file.toFile.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                      file.fromFile.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                  );
              })
            : data.values,
    );
    let vlist: VList<FileDetails> | undefined = $state();

    const updateDebouncedSearch = debounce((value: string) => {
        debouncedSearchQuery = value;
    }, 500);

    $effect(() => {
        updateDebouncedSearch(searchQuery);
    });

    const fileRegex = /diff --git a\/(\S+) b\/(\S+)\r?\n(?:.+\r?\n)*?(?=diff --git|Z)/g;

    let collapsedState: boolean[] = $state([]);
    let checkedState: boolean[] = $state([]);

    function loadPatches(patches: FileDetails[], reset: boolean = true) {
        if (reset) {
            collapsedState = [];
            checkedState = [];
            data.values = [];
        }
        data.values.push(...patches);
        patches.forEach((patch) => {
            const lines = makeLines(patch.content);
            data.lines.push(lines);
            if (lines.length == 0) {
                checkedState[data.lines.length - 1] = true;
            }
        });
    }

    function splitMultiFilePatch(patchContent: string): FileDetails[] {
        let patches: FileDetails[] = [];
        // Process each file in the diff
        let fileMatch;
        while ((fileMatch = fileRegex.exec(patchContent)) !== null) {
            const [fullFileMatch, fromFile, toFile] = fileMatch;
            patches.push({ content: fullFileMatch, fromFile: fromFile, toFile: toFile });
        }
        return patches;
    }

    function loadMultiFilePatch(patchContent: string) {
        loadPatches(splitMultiFilePatch(patchContent));
    }

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            const patchContent = await file.text();

            loadMultiFilePatch(patchContent);
        }
    }

    async function handleGithubUrl(event: Event) {
        const url = (event.target as HTMLInputElement).value;
        await loadFromGithubApi(url);
    }

    // convert commit or PR url to an API url
    async function loadFromGithubApi(url: string) {
        const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(commit|pull)\/([^/]+)$/;
        const match = url.match(regex);

        if (!match) {
            alert("Invalid GitHub URL. Use: https://github.com/owner/repo/(commit|pull)/id");
            return null;
        }

        const [, owner, repo, type, id] = match;

        if (type === "commit") {
            const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${id}`, {
                headers: {
                    Accept: "application/vnd.github.v3.diff",
                },
            });

            if (!resp.ok) {
                alert(`Error ${resp.status}: ${await resp.text()}`);
                return null;
            }

            loadPatches(splitMultiFilePatch(await resp.text()));
            return;
        } else if (type === "pull") {
            let page = 1;
            let hasMorePages = true;

            while (hasMorePages) {
                const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${id}/files?per_page=100&page=${page}`, {
                    headers: {
                        Accept: "application/vnd.github+json",
                    },
                });

                if (!resp.ok) {
                    alert(`Error ${resp.status}: ${await resp.text()}`);
                    return null;
                }

                const pageFiles: GithubPRFile[] = await resp.json();
                loadPatches(
                    pageFiles.map((file) => {
                        return {
                            content: file.patch,
                            fromFile: file.previous_filename || file.filename,
                            toFile: file.filename,
                        };
                    }),
                    page === 1,
                );

                const linkHeader = resp.headers.get("Link");
                hasMorePages = linkHeader?.includes('rel="next"') || false;
                page++;

                if (pageFiles.length === 0) break;
            }
            return;
        }

        throw new Error("Unsupported URL type " + url);
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

    function getOriginalIndex(filteredIndex: number): number {
        const file = filteredFiles[filteredIndex];
        return data.values.findIndex((f) => f.fromFile === file.fromFile && f.toFile === file.toFile);
    }

    function clearSearch() {
        searchQuery = "";
        debouncedSearchQuery = "";
    }

    function toggleChecked(index: number) {
        const originalIdx = getOriginalIndex(index);
        checkedState[originalIdx] = !checkedState[originalIdx];
        if (checkedState[originalIdx]) {
            // Auto-collapse on check
            collapsedState[originalIdx] = true;
        }
    }
</script>

<div class="flex min-h-screen flex-row justify-center">
    <div class="flex max-w-3/12 grow flex-col border-e border-gray-300 bg-white p-3">
        <div class="relative mb-2">
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
        {#if filteredFiles.length !== data.values.length}
            <div class="mb-2 text-sm text-gray-600">
                Showing {filteredFiles.length} of {data.values.length} files
            </div>
        {/if}
        <div class="flex h-full flex-col overflow-y-auto rounded-md border border-gray-300">
            <div class="h-100">
                {#each filteredFiles as value, index (value.toFile)}
                    <div
                        class="flex cursor-pointer items-center justify-between border-b border-gray-300 px-2 py-1 hover:bg-gray-100"
                        onclick={(e) => scrollToFileClick(e, getOriginalIndex(index))}
                        onkeydown={(e) => e.key === "Enter" && scrollToFile(getOriginalIndex(index))}
                        role="button"
                        tabindex="0"
                    >
                        <span class="max-w-full overflow-hidden break-all">{value.toFile}</span>
                        <input
                            type="checkbox"
                            class="mx-1 rounded-sm border border-gray-300"
                            autocomplete="off"
                            onchange={() => toggleChecked(index)}
                            checked={checkedState[getOriginalIndex(index)]}
                        />
                    </div>
                {/each}
            </div>
        </div>
    </div>
    <div class="flex grow flex-col bg-white p-3 lg:max-w-9/12">
        <div class="mb-2 flex items-center justify-between">
            <label for="patchUpload" class="me-2 cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                Load Patch File
                <input id="patchUpload" type="file" class="hidden" onchange={handleFileUpload} />
            </label>
            <label for="githubUrl" class="rounded-lg">
                <span class="me-2 font-semibold">Load from GitHub commit or PR URL</span>
                <input id="githubUrl" type="text" class="border border-gray-300" onchange={handleGithubUrl} autocomplete="off" />
            </label>
        </div>
        <div class="mb-2 flex justify-end">
            <button type="button" class="me-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={expandAll}>Expand All</button>
            <button type="button" class="me-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={collapseAll}>Collapse All</button>
        </div>
        <div class="flex flex-1 flex-col border border-gray-300">
            <VList data={data.values} style="height: 100%;" getKey={(_, i) => i} bind:this={vlist}>
                {#snippet children(value, index)}
                    {@const lines = data.lines[index]}

                    <div id={`file-${index}`}>
                        <div
                            class="sticky top-0 flex cursor-pointer flex-row items-center justify-between border-b border-gray-300 bg-white px-2 py-1 shadow-sm"
                            onclick={() => toggleCollapse(index)}
                            tabindex="0"
                            onkeyup={(event) => event.key === "Enter" && toggleCollapse(index)}
                            role="button"
                        >
                            {#if value.fromFile === value.toFile}
                                <span class="max-w-full overflow-hidden break-all">{value.toFile}</span>
                            {:else}
                                <span class="max-w-full overflow-hidden break-all">{value.fromFile} -> {value.toFile}</span>
                            {/if}
                            {#if lines.length !== 0}
                                <span class="ms-2 rounded-sm bg-blue-500 px-1 text-white hover:bg-blue-600">
                                    {#if collapsedState[index]}
                                        Expand
                                    {:else}
                                        Collapse
                                    {/if}
                                </span>
                            {:else}
                                <span class="ms-2 rounded-sm bg-gray-300 px-1 text-gray-800">Patch-header-only diff</span>
                            {/if}
                        </div>
                        {#if !collapsedState[index] && lines.length !== 0}
                            <div class="mb border-b border-gray-300 text-sm">
                                <ConciseDiffView preRenderedPatchLines={lines}></ConciseDiffView>
                            </div>
                        {/if}
                    </div>
                {/snippet}
            </VList>
        </div>
    </div>
</div>
