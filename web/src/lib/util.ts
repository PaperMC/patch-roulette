/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FileDetails } from "./diff-viewer-multi-file";
import type { FileStatus } from "./github.svelte";

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            fn(...args);
            timeout = null;
        }, delay);
    };
}

const fileRegex = /diff --git a\/(\S+) b\/(\S+)\r?\n(?:.+\r?\n)*?(?=diff --git|Z)/g;

export function splitMultiFilePatch(patchContent: string): FileDetails[] {
    const patches: FileDetails[] = [];
    // Process each file in the diff
    let fileMatch;
    while ((fileMatch = fileRegex.exec(patchContent)) !== null) {
        const [fullFileMatch, fromFile, toFile] = fileMatch;

        let status: FileStatus = "modified";

        const newlineIndex = fullFileMatch.indexOf("\n");
        if (newlineIndex !== -1) {
            const secondNewlineIndex = fullFileMatch.indexOf("\n", newlineIndex + 1);
            if (secondNewlineIndex !== -1) {
                const line2 = fullFileMatch.substring(newlineIndex + 1, secondNewlineIndex);

                if (line2.match(/^deleted file mode/)) {
                    status = "removed";
                } else if (line2.match(/^new file mode/)) {
                    status = "added";
                }
            }
        }

        patches.push({ content: fullFileMatch, fromFile: fromFile, toFile: toFile, status });
    }
    return patches;
}
