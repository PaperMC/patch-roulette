/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FileDetails } from "./diff-viewer-multi-file.svelte";
import type { FileStatus } from "./github.svelte";
import type { TreeNode } from "$lib/components/scripts/Tree.svelte";

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

export type FileTreeNodeData = {
    data: FileDetails | string;
    type: "file" | "directory";
};

export function makeFileTree(paths: FileDetails[]): TreeNode<FileTreeNodeData>[] {
    if (paths.length === 0) {
        return [];
    }

    const root: TreeNode<FileTreeNodeData> = {
        children: [],
        data: { type: "directory", data: "" },
    };

    for (const details of paths) {
        const parts = details.toFile.split("/");
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const existingChild = current.children.find((child) => child.data.data === part);
            if (existingChild) {
                current = existingChild;
            } else {
                const file = i === parts.length - 1;
                const data: FileDetails | string = file ? details : part;
                const type = file ? "file" : "directory";
                const newChild: TreeNode<FileTreeNodeData> = {
                    children: [],
                    data: { data, type },
                };
                current.children.push(newChild);
                current = newChild;
            }
        }
    }

    function mergeRedundantDirectories(node: TreeNode<FileTreeNodeData>) {
        for (const child of node.children) {
            mergeRedundantDirectories(child);
        }

        if (node.children.length === 1 && node.data.type === "directory" && node.children[0].data.type === "directory") {
            if (node.data.data !== "") {
                node.data.data = `${node.data.data}/${node.children[0].data.data}`;
            } else {
                node.data.data = node.children[0].data.data;
            }
            node.children = node.children[0].children;
        }
    }

    mergeRedundantDirectories(root);

    if (root.children.length > 1) {
        return root.children;
    }
    return [root];
}
