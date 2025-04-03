import {
    fetchGithubCommitDiff,
    fetchGithubComparison,
    fetchGithubFile,
    fetchGithubPRComparison,
    type FileStatus,
    getGithubToken,
    type GithubDiff,
} from "./github.svelte";
import { type ParsedDiff, parsePatch } from "diff";
import {
    ConciseDiffViewCachedState,
    DEFAULT_THEME_DARK,
    DEFAULT_THEME_LIGHT,
    hasNonHeaderChanges,
    parseSinglePatch,
} from "$lib/components/scripts/ConciseDiffView.svelte";
import type { BundledTheme } from "shiki";
import { browser } from "$app/environment";
import { getEffectiveGlobalTheme } from "$lib/theme.svelte";
import { debounce, type FileTreeNodeData, isImageFile, makeFileTree, type MemoizedPromise, memoizePromise, watchLocalStorage } from "$lib/util";
import { onDestroy } from "svelte";
import type { TreeNode } from "$lib/components/scripts/Tree.svelte";
import { VList } from "virtua/svelte";

const optionsKey = "diff-viewer-global-options";

export class GlobalOptions {
    syntaxHighlighting = $state(true);
    syntaxHighlightingThemeLight: BundledTheme = $state(DEFAULT_THEME_LIGHT);
    syntaxHighlightingThemeDark: BundledTheme = $state(DEFAULT_THEME_DARK);
    omitPatchHeaderOnlyHunks = $state(true);

    private constructor() {
        $effect(() => {
            this.save();
        });

        watchLocalStorage(optionsKey, (newValue) => {
            if (newValue) {
                this.deserialize(newValue);
            }
        });
    }

    getSyntaxHighlightingTheme() {
        switch (getEffectiveGlobalTheme()) {
            case "dark":
                return this.syntaxHighlightingThemeDark;
            case "light":
                return this.syntaxHighlightingThemeLight;
        }
    }

    static load() {
        const opts = new GlobalOptions();
        if (!browser) {
            return opts;
        }
        const serialized = localStorage.getItem(optionsKey);
        if (serialized !== null) {
            opts.deserialize(serialized);
        }
        return opts;
    }

    private save() {
        if (!browser) {
            return;
        }
        localStorage.setItem(optionsKey, this.serialize());
    }

    private serialize() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cereal: any = {
            syntaxHighlighting: this.syntaxHighlighting,
            omitPatchHeaderOnlyHunks: this.omitPatchHeaderOnlyHunks,
        };
        if (this.syntaxHighlightingThemeLight !== DEFAULT_THEME_LIGHT) {
            cereal.syntaxHighlightingThemeLight = this.syntaxHighlightingThemeLight;
        }
        if (this.syntaxHighlightingThemeDark !== DEFAULT_THEME_DARK) {
            cereal.syntaxHighlightingThemeDark = this.syntaxHighlightingThemeDark;
        }
        return JSON.stringify(cereal);
    }

    private deserialize(serialized: string) {
        const jsonObject = JSON.parse(serialized);
        if (jsonObject.syntaxHighlighting !== undefined) {
            this.syntaxHighlighting = jsonObject.syntaxHighlighting;
        }
        if (jsonObject.syntaxHighlightingThemeLight !== undefined) {
            this.syntaxHighlightingThemeLight = jsonObject.syntaxHighlightingThemeLight as BundledTheme;
        } else {
            this.syntaxHighlightingThemeLight = DEFAULT_THEME_LIGHT;
        }
        if (jsonObject.syntaxHighlightingThemeDark !== undefined) {
            this.syntaxHighlightingThemeDark = jsonObject.syntaxHighlightingThemeDark as BundledTheme;
        } else {
            this.syntaxHighlightingThemeDark = DEFAULT_THEME_DARK;
        }
        if (jsonObject.omitPatchHeaderOnlyHunks !== undefined) {
            this.omitPatchHeaderOnlyHunks = jsonObject.omitPatchHeaderOnlyHunks;
        }
    }
}

export type AddOrRemove = "add" | "remove";

export type FileDetails = {
    content: string;
    fromFile: string;
    toFile: string;
    status: FileStatus;
};

export type FileStatusProps = {
    iconClasses: string;
    title: string;
};

const addStatusProps: FileStatusProps = {
    iconClasses: "iconify octicon--file-added-16 text-green-600",
    title: "Added",
};
const removeStatusProps: FileStatusProps = {
    iconClasses: "iconify octicon--file-removed-16 text-red-600",
    title: "Removed",
};
const modifyStatusProps: FileStatusProps = {
    iconClasses: "iconify octicon--file-diff-16 text-yellow-600",
    title: "Modified",
};
const renamedStatusProps: FileStatusProps = {
    iconClasses: "iconify octicon--file-moved-16 text-gray-600",
    title: "Renamed",
};
const renamedModifiedStatusProps: FileStatusProps = {
    iconClasses: "iconify octicon--file-moved-16 text-yellow-600",
    title: "Renamed and Modified",
};

export function getFileStatusProps(status: FileStatus): FileStatusProps {
    switch (status) {
        case "added":
            return addStatusProps;
        case "removed":
            return removeStatusProps;
        case "renamed":
            return renamedStatusProps;
        case "renamed_modified":
            return renamedModifiedStatusProps;
        default:
            return modifyStatusProps;
    }
}

export function findHeaderChangeOnlyPatches(patchStrings: string[]) {
    const result: boolean[] = [];

    for (let i = 0; i < patchStrings.length; i++) {
        const patchString = patchStrings[i];
        if (patchString === undefined || patchString.length === 0) {
            result.push(false);
            continue;
        }
        // TODO: Parsing twice is wasteful
        const patches = parsePatch(patchString);
        if (patches.length !== 1) {
            result.push(false);
            continue;
        }
        const patch = patches[0];
        if (patch.hunks.length === 0) {
            result.push(false);
            continue;
        }
        let onlyHeaderChanges = true;
        for (let j = 0; j < patch.hunks.length; j++) {
            if (hasNonHeaderChanges(patch.hunks[j].lines)) {
                onlyHeaderChanges = false;
            }
        }
        result.push(onlyHeaderChanges);
    }

    return result;
}

export type ImageDiffDetails = {
    fileA: MemoizedPromise<string> | null;
    fileB: MemoizedPromise<string> | null;
    load: boolean;
};

export type ViewerStatistics = {
    addedLines: number;
    removedLines: number;
    fileAddedLines: number[];
    fileRemovedLines: number[];
};

export class MultiFileDiffViewerState {
    searchQuery: string = $state("");
    debouncedSearchQuery: string = $state("");
    collapsed: boolean[] = $state([]);
    checked: boolean[] = $state([]);
    fileDetails: FileDetails[] = $state([]);
    diffText: string[] = $state([]);
    diffs: Promise<ParsedDiff>[] = $state([]);
    diffViewCache: Map<FileDetails, ConciseDiffViewCachedState> = new Map();
    images: ImageDiffDetails[] = $state([]);
    vlist: VList<FileDetails> | undefined = $state();
    stats: Promise<ViewerStatistics> = $derived.by(async () => {
        let addedLines = 0;
        let removedLines = 0;
        const fileAddedLines: number[] = [];
        const fileRemovedLines: number[] = [];

        for (let i = 0; i < this.fileDetails.length; i++) {
            const diff = await this.diffs[i];
            if (!diff) {
                continue;
            }

            for (let j = 0; j < diff.hunks.length; j++) {
                const hunk = diff.hunks[j];

                for (let k = 0; k < hunk.lines.length; k++) {
                    const line = hunk.lines[k];

                    if (line.startsWith("+")) {
                        addedLines++;
                        fileAddedLines[i] = (fileAddedLines[i] || 0) + 1;
                    } else if (line.startsWith("-")) {
                        removedLines++;
                        fileRemovedLines[i] = (fileRemovedLines[i] || 0) + 1;
                    }
                }
            }
        }

        return { addedLines, removedLines, fileAddedLines, fileRemovedLines };
    });

    readonly fileTreeRoots: TreeNode<FileTreeNodeData>[] = $derived(makeFileTree(this.fileDetails));
    readonly filteredFileDetails: FileDetails[] = $derived(this.debouncedSearchQuery ? this.fileDetails.filter((f) => this.filterFile(f)) : this.fileDetails);
    readonly patchHeaderDiffOnly: boolean[] = $derived(findHeaderChangeOnlyPatches(this.diffText));

    constructor() {
        const updateDebouncedSearch = debounce((value: string) => (this.debouncedSearchQuery = value), 500);
        $effect(() => updateDebouncedSearch(this.searchQuery));

        // Auto-check all patch header diff only diffs
        $effect(() => {
            for (let i = 0; i < this.patchHeaderDiffOnly.length; i++) {
                if (this.patchHeaderDiffOnly[i] && this.checked[i] === undefined) {
                    this.checked[i] = true;
                }
            }
        });

        // Make sure to revoke object URLs when the component is destroyed
        onDestroy(() => this.clearImages());
    }

    getIndex(details: FileDetails): number {
        return this.fileDetails.findIndex((f) => f.fromFile === details.fromFile && f.toFile === details.toFile);
    }

    filterFile(file: FileDetails): boolean {
        const queryLower = this.debouncedSearchQuery.toLowerCase();
        return file.toFile.toLowerCase().includes(queryLower) || file.fromFile.toLowerCase().includes(queryLower);
    }

    clearSearch() {
        this.searchQuery = "";
        this.debouncedSearchQuery = "";
    }

    toggleCollapse(index: number) {
        this.collapsed[index] = !(this.collapsed[index] || false);
    }

    expandAll() {
        this.collapsed = [];
    }

    collapseAll() {
        this.collapsed = this.fileDetails.map(() => true);
    }

    toggleChecked(index: number) {
        this.checked[index] = !this.checked[index];
        if (this.checked[index]) {
            // Auto-collapse on check
            this.collapsed[index] = true;
        }
    }

    scrollToFile(index: number) {
        if (this.vlist) {
            if (!this.checked[index]) {
                // Auto-expand on jump when not checked
                this.collapsed[index] = false;
            }
            this.vlist.scrollToIndex(index, { align: "start" });
        }
    }

    clearImages() {
        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
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
        this.images = [];
    }

    loadPatches(patches: FileDetails[], githubDetails?: GithubDiff) {
        // Reset state
        this.collapsed = [];
        this.checked = [];
        this.fileDetails = [];
        this.diffText = [];
        this.diffs = [];
        this.clearImages();
        this.vlist?.scrollToIndex(0, { align: "start" });

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

                this.images[i] = { fileA, fileB, load: false };
                continue;
            }

            this.diffText[i] = patch.content;
            this.diffs[i] = (async () => {
                return parseSinglePatch(patch.content);
            })();
        }

        // Set this last since it's what the VList loads
        this.fileDetails.push(...patches);
    }

    // handle matched github url
    async loadFromGithubApi(match: Array<string>): Promise<boolean> {
        const [url, owner, repo, type, id] = match;
        const token = getGithubToken();

        try {
            if (type === "commit") {
                const { info, files } = await fetchGithubCommitDiff(token, owner, repo, id);
                this.loadPatches(files, info);
                return true;
            } else if (type === "pull") {
                const { info, files } = await fetchGithubPRComparison(token, owner, repo, id);
                this.loadPatches(files, info);
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
                this.loadPatches(files, info);
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
}
