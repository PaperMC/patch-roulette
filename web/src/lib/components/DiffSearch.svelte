<script lang="ts">
    import type { FileDetails, MultiFileDiffViewerState } from "$lib/diff-viewer-multi-file.svelte";
    import Spinner from "$lib/components/Spinner.svelte";

    interface Props {
        viewer: MultiFileDiffViewerState;
    }

    let { viewer }: Props = $props();

    class MatchingFiles {
        static EMPTY = new MatchingFiles(new Map(), 0, new Map());

        counts: Map<FileDetails, number>;
        mappings: Map<number, FileDetails> = new Map();
        total: number;

        constructor(counts: Map<FileDetails, number>, total: number, mappings: Map<number, FileDetails>) {
            this.counts = counts;
            this.total = total;
            this.mappings = mappings;
        }

        getFile(index: number): FileDetails {
            index++; // Mappings are 1-based

            let file = this.mappings.get(index);
            while (file === undefined && index < this.total) {
                index++;
                file = this.mappings.get(index);
            }
            if (file === undefined) {
                throw new Error("No file found");
            }
            return file;
        }
    }

    let matchingFiles: Promise<MatchingFiles> = $derived(findMatchingFiles(viewer.debouncedSearchQuery));
    let currentMatchIdx = $state(-1);

    $effect(() => {
        matchingFiles.then(() => {}); // Trigger reactivity

        // Reset current match index when search results change
        currentMatchIdx = -1;
    });

    async function findMatchingFiles(query: string): Promise<MatchingFiles> {
        if (!query) {
            return MatchingFiles.EMPTY;
        }
        query = query.toLowerCase();

        const diffs = await Promise.all(viewer.diffs);

        let total = 0;
        const counts: Map<FileDetails, number> = new Map();
        const mappings: Map<number, FileDetails> = new Map();
        for (let i = 0; i < diffs.length; i++) {
            const diff = diffs[i];

            for (let j = 0; j < diff.hunks.length; j++) {
                const hunk = diff.hunks[j];

                for (let k = 0; k < hunk.lines.length; k++) {
                    const count = countOccurrences(hunk.lines[k].toLowerCase(), query);
                    if (count !== 0) {
                        const details = viewer.fileDetails[i];
                        counts.set(details, (counts.get(details) ?? 0) + count);
                        total += count;
                        mappings.set(total, details);
                    }
                }
            }
        }

        return new MatchingFiles(counts, total, mappings);
    }

    function countOccurrences(str: string, substr: string): number {
        let count = 0;
        let idx = 0;
        while (idx > -1) {
            idx = str.indexOf(substr, idx);
            if (idx > -1) {
                count++;
                idx += substr.length;
            }
        }
        return count;
    }

    async function prevResult() {
        const files = await matchingFiles;
        currentMatchIdx = (currentMatchIdx - 1 + files.total) % files.total;
        await scrollToMatch();
    }

    async function nextResult() {
        const files = await matchingFiles;
        currentMatchIdx = (currentMatchIdx + 1) % files.total;
        await scrollToMatch();
    }

    async function scrollToMatch() {
        const files = await matchingFiles;
        if (currentMatchIdx >= 0 && currentMatchIdx < files.total) {
            viewer.scrollToFile(viewer.getIndex(files.getFile(currentMatchIdx)));
        }
    }
</script>

<div class="relative">
    <input
        type="text"
        placeholder="Search diff content..."
        bind:value={viewer.searchQuery}
        class="max-w-96 rounded-md border py-1 ps-8 pe-2 overflow-ellipsis focus:ring-2 focus:ring-blue-500 focus:outline-none"
        autocomplete="off"
    />
    <span aria-hidden="true" class="absolute top-1/2 left-2 iconify size-4 -translate-y-1/2 octicon--search-16"></span>
</div>
{#if viewer.debouncedSearchQuery}
    {#await matchingFiles}
        <Spinner size={4}></Spinner>
    {:then files}
        {`${currentMatchIdx + 1} / ${files.total}`}
        <button class="flex size-5 items-center justify-center rounded-sm bg-blue-500" onclick={() => prevResult()} aria-label="previous match">
            <span aria-hidden="true" class="iconify size-4 text-white octicon--chevron-left-16"></span>
        </button>
        <button class="flex size-5 items-center justify-center rounded-sm bg-blue-500" onclick={() => nextResult()} aria-label="next match">
            <span aria-hidden="true" class="iconify size-4 text-white octicon--chevron-right-16"></span>
        </button>
    {/await}
{/if}
