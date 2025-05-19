export interface FileSystemEntry {
    fileName: string;
}

export class DirectoryEntry implements FileSystemEntry {
    fileName: string;
    children: FileSystemEntry[];

    constructor(fileName: string, children: FileSystemEntry[]) {
        this.fileName = fileName;
        this.children = children;
    }
}

export class FileEntry implements FileSystemEntry {
    fileName: string;
    file: File;

    constructor(fileName: string, file: File) {
        this.fileName = fileName;
        this.file = file;
    }
}

export async function pickDirectory(): Promise<DirectoryEntry> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).showDirectoryPicker) {
        return await pickDirectoryLegacy();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directoryHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(directoryHandle as any).entries) {
        return await pickDirectoryLegacy();
    }

    return await handleToDirectoryEntry(directoryHandle);
}

async function handleToDirectoryEntry(directoryHandle: FileSystemDirectoryHandle): Promise<DirectoryEntry> {
    const root = new DirectoryEntry(directoryHandle.name, []);

    type StackEntry = [FileSystemDirectoryHandle, DirectoryEntry];
    const stack: StackEntry[] = [[directoryHandle, root]];

    while (stack.length > 0) {
        const [dirHandle, dirEntry] = stack.shift()!;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars
        for await (const [name, handle] of (dirHandle as any).entries()) {
            if (handle.kind === "directory") {
                const subDir = new DirectoryEntry(handle.name, []);
                dirEntry.children.push(subDir);
                stack.push([handle, subDir]);
            } else if (handle.kind === "file") {
                dirEntry.children.push(await handleToFileEntry(handle));
            }
        }
    }

    return root;
}

async function handleToFileEntry(fileHandle: FileSystemFileHandle): Promise<FileEntry> {
    const file = await fileHandle.getFile();
    return new FileEntry(fileHandle.name, file);
}

async function pickDirectoryLegacy(): Promise<DirectoryEntry> {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.multiple = true;

    return new Promise((resolve, reject) => {
        input.addEventListener("change", (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (!files) {
                reject(new Error("No files selected"));
                return;
            }

            resolve(filesToDirectory(files));
        });

        input.click();
    });
}

function filesToDirectory(files: FileList): DirectoryEntry {
    let ret: DirectoryEntry | null = null;

    for (let file of files) {
        const parts = file.webkitRelativePath.split("/");

        if (parts.length === 1) {
            throw Error("File has no path");
        }

        let current: DirectoryEntry | null = null;

        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];

            if (current === null) {
                current = ret;
                if (current === null) {
                    current = new DirectoryEntry(part, []);
                    ret = current;
                }
                continue;
            }

            if (i === parts.length - 1) {
                current.children.push(new FileEntry(part, file));
            } else {
                let dirEntry = current.children.find((entry) => entry.fileName === part) as DirectoryEntry;
                if (!dirEntry) {
                    dirEntry = new DirectoryEntry(part, []);
                    current.children.push(dirEntry);
                }
                current = dirEntry;
            }
        }
    }

    if (ret === null) {
        throw Error("Selected empty directory");
    }

    return ret;
}
