<script lang="ts">
    import { type FileStatus, getGithubUsername, GITHUB_URL_PARAM, installGithubApp, loginWithGithub, logoutGithub } from "$lib/github.svelte";
    import { Button, Dialog, Separator } from "bits-ui";
    import InfoPopup from "./InfoPopup.svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { type FileDetails, MultiFileDiffViewerState } from "$lib/diff-viewer-multi-file.svelte";
    import { splitMultiFilePatch } from "$lib/util";
    import { onMount } from "svelte";
    import FileInput from "$lib/components/FileInput.svelte";
    import SingleFileSelect from "$lib/components/SingleFileSelect.svelte";
    import { createTwoFilesPatch } from "diff";

    const viewer = MultiFileDiffViewerState.get();

    let modalOpen = $state(false);
    let githubUrl = $state("https://github.com/");
    let dragActive = $state(false);

    let fileA = $state<File | undefined>(undefined);
    let fileB = $state<File | undefined>(undefined);

    onMount(async () => {
        const url = page.url.searchParams.get(GITHUB_URL_PARAM);
        if (url !== null) {
            githubUrl = url;
            await handleGithubUrl();
        } else {
            modalOpen = true;
        }
    });

    async function compareFiles() {
        if (!fileA || !fileB) {
            alert("Both files must be selected to compare.");
            return;
        }

        const [textA, textB] = await Promise.all([fileA.text(), fileB.text()]);
        if (textA === textB) {
            alert("The files are identical.");
            return;
        }

        const diff = createTwoFilesPatch(fileA.name, fileB.name, textA, textB);
        let status: FileStatus = "modified";
        if (fileA.name !== fileB.name) {
            status = "renamed_modified";
        }

        const fileDetails: FileDetails = {
            content: diff,
            fromFile: fileA.name,
            toFile: fileB.name,
            status,
        };

        viewer.loadPatches([fileDetails], { fileName: `${fileA.name}...${fileB.name}.patch` });
        await updateUrlParams();
        modalOpen = false;
    }

    async function loadFromPatchFile(fileName: string, patchContent: string) {
        const files = splitMultiFilePatch(patchContent);
        if (files.length === 0) {
            alert("No valid patches found in the file.");
            modalOpen = true;
            return;
        }
        viewer.loadPatches(files, { fileName });
        await updateUrlParams();
    }

    async function handlePatchFile(file?: File) {
        if (!file) {
            return;
        }
        modalOpen = false;
        await loadFromPatchFile(file.name, await file.text());
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

    async function handlePatchFileDrop(event: DragEvent) {
        dragActive = false;
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (!files || files.length !== 1) {
            alert("Only one file can be dropped at a time.");
            return;
        }
        modalOpen = false;
        const file = files[0];
        await loadFromPatchFile(file.name, await file.text());
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
            await updateUrlParams({ githubUrl });
            return;
        }
        modalOpen = true;
    }

    async function updateUrlParams(opts: { githubUrl?: string } = {}) {
        const newUrl = new URL(page.url);
        if (opts.githubUrl) {
            newUrl.searchParams.set(GITHUB_URL_PARAM, opts.githubUrl);
        } else {
            newUrl.searchParams.delete(GITHUB_URL_PARAM);
        }
        await goto(`?${newUrl.searchParams}`);
    }
</script>

<Dialog.Root bind:open={modalOpen}>
    <Dialog.Trigger class="h-fit rounded-md btn-primary px-2 py-0.5" onclick={() => (dragActive = false)}>Load another diff</Dialog.Trigger>
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 dark:bg-white/20" />
        <Dialog.Content class="fixed top-1/2 left-1/2 z-50 w-192 max-w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-neutral shadow-md">
            <header class="relative flex flex-row items-center justify-between rounded-t-md bg-neutral-2 p-4">
                <Dialog.Title class="text-xl font-semibold">Load a diff</Dialog.Title>
                <Dialog.Close class="flex size-6 items-center justify-center rounded-md btn-ghost text-primary">
                    <span class="iconify octicon--x-16"></span>
                </Dialog.Close>
            </header>

            <section class="flex flex-col p-4">
                <h3 class="mb-2 flex items-center gap-1 text-lg font-semibold">
                    <span class="iconify size-6 shrink-0 octicon--mark-github-24"></span>
                    From GitHub
                </h3>

                <div class="flex flex-row">
                    <input
                        id="githubUrl"
                        type="url"
                        autocomplete="url"
                        placeholder="https://github.com/"
                        class="grow rounded-l-md border-t border-b border-l px-2 py-1 overflow-ellipsis"
                        bind:value={githubUrl}
                        onkeyup={(event) => {
                            if (event.key === "Enter") {
                                handleGithubUrl();
                            }
                        }}
                    />
                    <Button.Root onclick={handleGithubUrl} class="rounded-r-md btn-primary px-2 py-1">Go</Button.Root>
                </div>
                <span class="mb-2 text-sm text-em-med">Supports commit, PR, and comparison URLs</span>

                <div class="mb-2 flex flex-row gap-1">
                    {#if getGithubUsername()}
                        <div class="flex w-fit flex-row items-center justify-between gap-2 px-2 py-1">
                            <span class="iconify shrink-0 octicon--person-16"></span>
                            {getGithubUsername()}
                        </div>
                        <Button.Root class="flex items-center gap-2 rounded-md bg-red-400 px-2 py-1 text-white hover:bg-red-500" onclick={logoutGithub}>
                            <span class="iconify shrink-0 octicon--sign-out-16"></span>
                            Sign out
                        </Button.Root>
                    {:else}
                        <Button.Root class="flex w-fit flex-row items-center justify-between gap-2 rounded-md btn-primary px-2 py-1" onclick={loginWithGithub}>
                            <span class="iconify shrink-0 octicon--sign-in-16"></span>
                            Sign in to GitHub
                        </Button.Root>
                        <InfoPopup>
                            Sign in to GitHub for higher rate limits and private repository access. Only private repositories configured for the GitHub app will
                            be accessible.
                        </InfoPopup>
                    {/if}
                </div>

                <div class="flex flex-row gap-1">
                    <Button.Root class="flex w-fit flex-row items-center gap-2 rounded-md btn-primary px-2 py-1" onclick={installGithubApp}>
                        <span class="iconify shrink-0 octicon--gear-16"></span>
                        Configure GitHub App
                    </Button.Root>
                    <InfoPopup>
                        In order to view a private repository, the repository owner must have installed the GitHub app and granted it access to the repository.
                        Then, authenticated users will be able to load diffs they have read access to.
                    </InfoPopup>
                </div>
            </section>

            <Separator.Root class="h-px w-full bg-neutral-2" />

            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section
                class="file-drop-target p-4"
                data-drag-active={dragActive}
                ondragover={handleDragOver}
                ondrop={handlePatchFileDrop}
                ondragleavecapture={handleDragLeave}
            >
                <h3 class="mb-2 flex items-center gap-1 text-lg font-semibold">
                    <span class="iconify size-6 shrink-0 octicon--file-directory-open-fill-24"></span>
                    From Files
                </h3>

                <FileInput class="mb-2 flex w-fit items-center gap-2 rounded-md btn-primary px-2 py-1" onChange={handlePatchFile}>
                    <span class="iconify size-4 shrink-0 octicon--file-diff-16"></span>
                    Load Patch File
                </FileInput>

                <section>
                    <h4 class="mb-2 font-semibold">Compare Files</h4>
                    <div class="flex flex-row items-center gap-1">
                        <SingleFileSelect bind:file={fileA} placeholder="File A" />
                        <span class="iconify size-4 shrink-0 octicon--arrow-right-16"></span>
                        <SingleFileSelect bind:file={fileB} placeholder="File B" />
                        <Button.Root onclick={compareFiles} class="rounded-md btn-primary px-2 py-1">Go</Button.Root>
                    </div>
                </section>
            </section>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

<style>
    .file-drop-target {
        position: relative;
    }
    .file-drop-target[data-drag-active="true"]::before {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        content: "Drop patch file here";
        font-size: var(--text-3xl);
        color: var(--color-black);

        background-color: rgba(255, 255, 255, 0.7);

        border: dashed var(--color-primary);
        border-radius: inherit;
    }
</style>
