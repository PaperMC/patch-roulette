import type { FileStatus } from "./github.svelte";
import { parsePatch } from "diff";
import { DEFAULT_THEME_DARK, DEFAULT_THEME_LIGHT, hasNonHeaderChanges } from "$lib/components/scripts/ConciseDiffView.svelte";
import type { BundledTheme } from "shiki";
import { browser } from "$app/environment";
import { MediaQuery } from "svelte/reactivity";

export type Theme = "dark" | "light" | "auto";

const prefersDark = new MediaQuery("prefers-color-scheme: dark");

export class GlobalOptions {
    syntaxHighlighting = $state(true);
    syntaxHighlightingThemeLight: BundledTheme = $state(DEFAULT_THEME_LIGHT);
    syntaxHighlightingThemeDark: BundledTheme = $state(DEFAULT_THEME_DARK);
    omitPatchHeaderOnlyHunks = $state(true);
    theme: Theme = $state("auto");

    private constructor() {
        $effect(() => {
            this.save();
        });
        $effect(() => {
            document.documentElement.setAttribute("data-theme", this.theme);
            return () => {
                document.documentElement.removeAttribute("data-theme");
            };
        });
    }

    getSyntaxHighlightingTheme() {
        switch (this.theme) {
            case "dark":
                return this.syntaxHighlightingThemeDark;
            case "light":
                return this.syntaxHighlightingThemeLight;
            case "auto":
                if (prefersDark.current) {
                    return this.syntaxHighlightingThemeDark;
                } else {
                    return this.syntaxHighlightingThemeLight;
                }
        }
    }

    static load() {
        if (!browser) {
            return new GlobalOptions();
        }
        const serialized = localStorage.getItem("diff-viewer-global-options");
        if (serialized === null) {
            return new GlobalOptions();
        }
        return GlobalOptions.deserialize(serialized);
    }

    private save() {
        if (!browser) {
            return;
        }
        localStorage.setItem("diff-viewer-global-options", this.serialize());
    }

    private serialize() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cereal: any = {
            syntaxHighlighting: this.syntaxHighlighting,
            omitPatchHeaderOnlyHunks: this.omitPatchHeaderOnlyHunks,
            theme: this.theme,
        };
        if (this.syntaxHighlightingThemeLight !== DEFAULT_THEME_LIGHT) {
            cereal.syntaxHighlightingThemeLight = this.syntaxHighlightingThemeLight;
        }
        if (this.syntaxHighlightingThemeDark !== DEFAULT_THEME_DARK) {
            cereal.syntaxHighlightingThemeDark = this.syntaxHighlightingThemeDark;
        }
        return JSON.stringify(cereal);
    }

    private static deserialize(serialized: string) {
        const jsonObject = JSON.parse(serialized);
        const instance = new GlobalOptions();
        if (jsonObject.syntaxHighlighting !== undefined) {
            instance.syntaxHighlighting = jsonObject.syntaxHighlighting;
        }
        if (jsonObject.syntaxHighlightingThemeLight !== undefined) {
            instance.syntaxHighlightingThemeLight = jsonObject.syntaxHighlightingThemeLight as BundledTheme;
        }
        if (jsonObject.syntaxHighlightingThemeDark !== undefined) {
            instance.syntaxHighlightingThemeDark = jsonObject.syntaxHighlightingThemeDark as BundledTheme;
        }
        if (jsonObject.omitPatchHeaderOnlyHunks !== undefined) {
            instance.omitPatchHeaderOnlyHunks = jsonObject.omitPatchHeaderOnlyHunks;
        }
        if (jsonObject.theme !== undefined) {
            instance.theme = jsonObject.theme;
        }
        return instance;
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
