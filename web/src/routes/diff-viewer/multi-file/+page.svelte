<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";

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
    let data: { values: FileDetails[] } = $state({ values: [] });
    let searchQuery: string = $state("");
    let filteredFiles: FileDetails[] = $derived(
        searchQuery
            ? data.values.filter((file) => {
                  return file.toFile.toLowerCase().includes(searchQuery.toLowerCase()) || file.fromFile.toLowerCase().includes(searchQuery.toLowerCase());
              })
            : data.values,
    );

    const fileRegex = /diff --git a\/(\S+) b\/(\S+)\r?\n(?:.+\r?\n)*?(?=diff --git|Z)/g;

    let collapsedState: boolean[] = $state([]);
    let checkedState: boolean[] = $state([]);

    function loadPatches(patches: FileDetails[]) {
        collapsedState = [];
        checkedState = [];
        data.values = [];
        data.values.push(...patches);
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
        const patches = await getFromGithubApi(url);
        if (patches) {
            loadPatches(patches);
        }
    }

    // convert commit or PR url to an API url
    async function getFromGithubApi(url: string): Promise<FileDetails[] | null> {
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

            return splitMultiFilePatch(await resp.text());
        } else if (type === "pull") {
            let files: GithubPRFile[] = [];
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
                files.push(...pageFiles);

                const linkHeader = resp.headers.get("Link");
                hasMorePages = linkHeader?.includes('rel="next"') || false;
                page++;

                if (pageFiles.length === 0) break;
            }

            return files.map((file) => {
                return {
                    content: file.patch,
                    fromFile: file.previous_filename || file.filename,
                    toFile: file.filename,
                };
            });
        }

        throw new Error("Unsupported URL type");
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
        const fileElement = document.getElementById(`file-${index}`);
        if (fileElement) {
            if (!checkedState[index]) {
                // Auto-expand on jump when not checked
                collapsedState[index] = false;
            }
            fileElement.scrollIntoView({ behavior: "smooth" });
        }
    }

    function getOriginalIndex(filteredIndex: number): number {
        const file = filteredFiles[filteredIndex];
        return data.values.findIndex((f) => f.fromFile === file.fromFile && f.toFile === file.toFile);
    }

    function clearSearch() {
        searchQuery = "";
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

<div class="flex min-h-screen flex-row justify-center px-2 py-2 lg:py-6">
    <div class="lg: me-2 flex min-h-[500px] max-w-3/12 grow flex-col rounded-lg bg-white p-3 shadow-md">
        <div class="relative mb-2">
            <input
                type="text"
                placeholder="Search files..."
                bind:value={searchQuery}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {#if searchQuery}
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
                {#each filteredFiles as value, index (index)}
                    <div
                        class="flex cursor-pointer items-center justify-between border-b border-gray-300 px-2 py-1 hover:bg-gray-100"
                        onclick={(e) => scrollToFileClick(e, getOriginalIndex(index))}
                        onkeydown={(e) => e.key === "Enter" && scrollToFile(getOriginalIndex(index))}
                        role="button"
                        tabindex="0"
                    >
                        <span>{value.toFile}</span>
                        <input type="checkbox" class="mx-1 rounded-sm border border-gray-300" autocomplete="off" onchange={() => toggleChecked(index)} />
                    </div>
                {/each}
            </div>
        </div>
    </div>
    <div class="flex min-h-[500px] grow flex-col rounded-lg bg-white p-3 shadow-md md:p-6 lg:max-w-8/12">
        <div class="mb-2 flex items-center justify-between">
            <label for="patchUpload" class="me-2 cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                Upload Patch File
                <input id="patchUpload" type="file" class="hidden" onchange={handleFileUpload} />
            </label>
            <label for="githubUrl" class="rounded-lg">
                <span class="me-2 font-semibold">Load from GitHub commit or PR URL</span>
                <input id="githubUrl" type="text" class="border border-gray-300" onchange={handleGithubUrl} autocomplete="off" />
            </label>
        </div>
        <div class="mb-2 flex justify-end">
            <button type="button" class="me-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={expandAll}> Expand All </button>
            <button type="button" class="me-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={collapseAll}> Collapse All </button>
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto border border-gray-300">
            <div class="h-100">
                {#each data.values as value, index (index)}
                    <div id={`file-${index}`}>
                        <div
                            class="sticky top-0 flex flex-row items-center justify-between border-b border-gray-300 bg-white px-2 py-1 shadow-sm"
                            onclick={() => toggleCollapse(index)}
                            tabindex="0"
                            onkeyup={(event) => event.key === "Enter" && toggleCollapse(index)}
                            role="button"
                        >
                            {#if value.fromFile === value.toFile}
                                <span>{value.toFile}</span>
                            {:else}
                                <span>{value.fromFile} -> {value.toFile}</span>
                            {/if}
                            <span class="rounded-sm bg-blue-500 px-1 text-white hover:bg-blue-600">
                                {#if collapsedState[index]}
                                    Expand
                                {:else}
                                    Collapse
                                {/if}
                            </span>
                        </div>
                        <div class="mb border-b border-gray-300 text-sm" class:hidden={collapsedState[index]}>
                            <ConciseDiffView data={{ value: value.content }}></ConciseDiffView>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
