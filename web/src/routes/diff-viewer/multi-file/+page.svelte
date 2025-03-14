<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";

    type FileDetails = {
        content: string;
        name: string;
    };
    let data: { values: FileDetails[] } = $state({ values: [] });

    const fileRegex = /diff --git a\/(\S+) b\/(\S+)\r?\n(?:.+\r?\n)*?(?=diff --git|Z)/g;

    let collapsedState: boolean[] = $state([]);

    function loadPatches(patchContent: string) {
        collapsedState = [];
        data.values = [];
        // Process each file in the diff
        let fileMatch;
        while ((fileMatch = fileRegex.exec(patchContent)) !== null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [fullFileMatch, _, toFile] = fileMatch;
            data.values.push({ content: fullFileMatch, name: toFile });
        }
    }

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            const patchContent = await file.text();

            loadPatches(patchContent);
        }
    }

    async function handleGithubUrl(event: Event) {
        const url = (event.target as HTMLInputElement).value;
        const apiUrl = convertToApiUrl(url);
        if (!apiUrl) {
            return;
        }

        const response = await fetch(apiUrl, {
            headers: {
                Accept: "application/vnd.github.v3.diff",
            },
        });
        if (!response.ok) {
            alert(`Error ${response.status}: ${await response.text()}`);
            return;
        }
        const body = await response.text();
        loadPatches(body);
    }

    // convert commit or PR url to an API url
    function convertToApiUrl(url: string): string | null {
        const regex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(commit|pull)\/([^/]+)$/;
        const match = url.match(regex);

        if (!match) {
            alert("Invalid GitHub URL. Use: https://github.com/owner/repo/(commit|pull)/id");
            return null;
        }

        const [, owner, repo, type, id] = match;

        if (type === "commit") {
            return `https://api.github.com/repos/${owner}/${repo}/commits/${id}`;
        } else if (type === "pull") {
            return `https://api.github.com/repos/${owner}/${repo}/pulls/${id}`;
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
</script>

<div class="flex min-h-screen flex-row justify-center px-2 py-2 lg:py-6">
    <div class="flex min-h-[500px] grow flex-col rounded-lg bg-white p-3 shadow-md md:p-6 lg:max-w-10/12">
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
                    <div>
                        <div
                            class="shadow-sm sticky top-0 flex flex-row items-center justify-between border-b border-gray-300 bg-white px-2 py-1"
                            onclick={() => toggleCollapse(index)}
                            tabindex="0"
                            onkeyup={(event) => {
                                if (event.key === "Enter") {
                                    toggleCollapse(index);
                                }
                            }}
                            role="button"
                        >
                            <span class="text-xl">{value.name}</span>
                            <span class="rounded-sm bg-blue-500 px-1 text-white hover:bg-blue-600">
                                {#if collapsedState[index]}
                                    Expand
                                {:else}
                                    Collapse
                                {/if}
                            </span>
                        </div>
                        <div class="mb border-b border-gray-300" class:hidden={collapsedState[index]}>
                            <ConciseDiffView data={{ value: value.content }}></ConciseDiffView>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
