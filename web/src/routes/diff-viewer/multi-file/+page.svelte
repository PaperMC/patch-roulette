<script lang="ts">
    import { PUBLIC_GITHUB_CLIENT_ID, PUBLIC_GITHUB_APP_NAME } from "$env/static/public";
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";
    import makeLines, { type PatchLine } from "$lib/components/scripts/ConciseDiffView.svelte";
    import { debounce } from "$lib/util";
    import { VList } from "virtua/svelte";
    import { getGithubUsername, type GithubPRFile, githubUsername } from "$lib/github.svelte";
    import { onMount } from "svelte";

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

    let modal: HTMLDialogElement | null = $state(null);
    onMount(() => {
        if (modal) {
            modal.showModal();
        }
    });

    async function handleFileUpload(event: Event) {
        if (modal) {
            modal.close();
        }

        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            const patchContent = await file.text();

            loadMultiFilePatch(patchContent);
        }
    }

    let githubUrl = $state("");

    async function handleGithubUrl() {
        if (modal) {
            modal.close();
        }
        const success = await loadFromGithubApi(githubUrl);
        if (!success) {
            if (modal) {
                modal.showModal();
            }
        }
    }

    // convert commit or PR url to an API url
    async function loadFromGithubApi(url: string): Promise<boolean> {
        const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(commit|pull)\/([^/]+)$/;
        const match = url.match(regex);

        if (!match) {
            alert("Invalid GitHub URL. Use: https://github.com/owner/repo/(commit|pull)/id");
            return false;
        }

        const [, owner, repo, type, id] = match;

        if (type === "commit") {
            const opts: RequestInit = {
                headers: {
                    Accept: "application/vnd.github.v3.diff",
                },
            };
            if (localStorage.getItem("github_token")) {
                opts.headers = {
                    ...opts.headers,
                    Authorization: "Bearer " + localStorage.getItem("github_token"),
                };
            }
            const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${id}`, opts);

            if (!resp.ok) {
                alert(`Error ${resp.status}: ${await resp.text()}`);
                return false;
            }

            loadPatches(splitMultiFilePatch(await resp.text()));
            return true;
        } else if (type === "pull") {
            let page = 1;
            let hasMorePages = true;

            while (hasMorePages) {
                const opts: RequestInit = {
                    headers: {
                        Accept: "application/vnd.github+json",
                    },
                };
                if (localStorage.getItem("github_token")) {
                    opts.headers = {
                        ...opts.headers,
                        Authorization: "Bearer " + localStorage.getItem("github_token"),
                    };
                }
                const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${id}/files?per_page=100&page=${page}`, opts);

                if (!resp.ok) {
                    alert(`Error ${resp.status}: ${await resp.text()}`);
                    return false;
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
            return true;
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

    function loginWithGithub() {
        if (getGithubUsername()) {
            return;
        }
        localStorage.setItem("authReferrer", window.location.pathname);
        const params = new URLSearchParams({
            client_id: PUBLIC_GITHUB_CLIENT_ID,
            redirect_uri: window.location.origin + "/github-callback",
        });
        window.location.href = "https://github.com/login/oauth/authorize?" + params.toString();
    }

    function logoutGithub() {
        localStorage.removeItem("github_token");
        localStorage.removeItem("github_token_expires");
        localStorage.removeItem("github_username");
        githubUsername.value = "";
    }

    function installGithub() {
        const url = `https://github.com/apps/${PUBLIC_GITHUB_APP_NAME}/installations/new`;
        localStorage.setItem("authReferrer", window.location.href);
        window.location.href = url;
    }
</script>

{#snippet githubIcon()}
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
        <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
        />
    </svg>
{/snippet}

<dialog bind:this={modal} class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md p-4 backdrop:bg-black/50">
    <div class="flex flex-col">
        <div class="mb-2 flex flex-row justify-end">
            <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600 focus-visible:outline-0" onclick={() => modal?.close()}>
                Close
            </button>
        </div>
        <hr class="mb-2 text-gray-300" />

        <div class="mb-2 flex flex-row items-center gap-2">
            <label for="githubUrl">
                <span class="font-semibold">Load from GitHub commit or PR URL</span>
            </label>
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
                {@render githubIcon()}
                {#if getGithubUsername()}{getGithubUsername()}{:else}Login to GitHub{/if}
            </button>
            {#if getGithubUsername()}
                <button type="button" class="rounded-md bg-red-400 px-2 py-1 text-white hover:bg-red-500" onclick={logoutGithub}>Logout</button>
            {:else}
                <span id="loginToGitHubLabel">Login to GitHub for higher rate limits.</span>
            {/if}
        </div>
        <div class="mb-2 flex flex-row items-center gap-2">
            <button
                aria-labelledby="githubAppLabel"
                type="button"
                class="flex w-fit flex-row items-center gap-2 rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                onclick={installGithub}
            >
                {@render githubIcon()} Install/configure GitHub App
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
        <div class="mb-2 flex justify-between">
            <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={() => modal?.showModal()}>
                Load another diff
            </button>
            <div class="flex flex-row gap-2">
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={expandAll}>Expand All</button>
                <button type="button" class="rounded-md bg-blue-500 px-2 py-1 text-white hover:bg-blue-600" onclick={collapseAll}>Collapse All</button>
            </div>
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
