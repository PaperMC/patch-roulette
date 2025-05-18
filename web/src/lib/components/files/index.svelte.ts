export interface FileSystemEntry {
    fileName: string;
}

export interface DirectoryEntry extends FileSystemEntry {
    children: FileSystemEntry[];
}

export interface FileEntry extends FileSystemEntry {
    file: File;
}

export async function pickDirectory(): Promise<DirectoryEntry> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).showDirectoryPicker) {
        return pickDirectoryLegacy();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directoryHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(directoryHandle as any).entries) {
        return pickDirectoryLegacy();
    }

    return handleToDirectoryEntry(directoryHandle);
}

async function handleToDirectoryEntry(directoryHandle: FileSystemDirectoryHandle): Promise<DirectoryEntry> {
    const children: FileSystemEntry[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars
    for await (const [name, handle] of (directoryHandle as any).entries()) {
        if (handle.kind === "directory") {
            children.push(await handleToDirectoryEntry(handle));
        } else if (handle.kind === "file") {
            children.push(await handleToFileEntry(handle));
        }
    }
    return {
        fileName: directoryHandle.name,
        children,
    };
}

async function handleToFileEntry(fileHandle: FileSystemFileHandle): Promise<FileEntry> {
    const file = await fileHandle.getFile();
    return {
        fileName: fileHandle.name,
        file,
    };
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
                current = {
                    fileName: part,
                    children: [],
                };
                ret = current;
                continue;
            }

            if (i === parts.length - 1) {
                const fileEntry: FileEntry = {
                    fileName: part,
                    file: file,
                };
                current.children.push(fileEntry);
            } else {
                let dirEntry = current.children.find((entry) => entry.fileName === part) as DirectoryEntry;
                if (!dirEntry) {
                    dirEntry = {
                        fileName: part,
                        children: [],
                    };
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
