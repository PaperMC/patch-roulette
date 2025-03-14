export enum PatchLineType {
    HEADER,
    CONTEXT,
    ADD,
    REMOVE,
    SPACER,
}

export type PatchLineTypeProps = {
    classes: string;
    prefix?: string;
};

export const patchLineTypeProps: Record<PatchLineType, PatchLineTypeProps> = {
    [PatchLineType.HEADER]: {
        classes: "bg-gray-200",
    },
    [PatchLineType.ADD]: {
        classes: "bg-green-200",
        prefix: "+",
    },
    [PatchLineType.REMOVE]: {
        classes: "bg-red-200",
        prefix: "-",
    },
    [PatchLineType.CONTEXT]: {
        classes: "",
        prefix: " ",
    },
    [PatchLineType.SPACER]: {
        classes: "h-2",
    },
};

export enum InnerPatchLineType {
    ADD,
    REMOVE,
    NONE,
}

export type InnerPatchLineTypeProps = {
    classes: string;
};

export const innerPatchLineTypeProps: Record<InnerPatchLineType, InnerPatchLineTypeProps> = {
    [InnerPatchLineType.ADD]: {
        classes: "bg-green-300 text-green-800",
    },
    [InnerPatchLineType.REMOVE]: {
        classes: "bg-red-300 text-red-800",
    },
    [InnerPatchLineType.NONE]: {
        classes: "",
    },
};

export type PatchLine = {
    type: PatchLineType;
    content: string;
    innerPatchLineType: InnerPatchLineType;
};

export default function makeLines(patchContent: string): PatchLine[] {
    const hunkRegex = /@@ -\d+(?:,\d+)? \+\d+_?(?:,\d+)? @@(?:\s[^\n]*)?(?:\n|$)((?:[ +-][^\n]*(?:\n|$))*)/g;

    const lines: PatchLine[] = [];

    let match;
    while ((match = hunkRegex.exec(patchContent)) !== null) {
        // Check if this hunk only contains changes to headers
        const contentLines = match[1].split("\n");

        // Skip this hunk if it only contains header changes
        if (!hasNonHeaderChanges(contentLines)) {
            continue;
        }

        // Add the hunk header
        lines.push({
            type: PatchLineType.HEADER,
            content: match[0].split("\n")[0],
            innerPatchLineType: InnerPatchLineType.NONE,
        });

        // Process the content lines
        contentLines.forEach((contentLine) => {
            let type: PatchLineType;
            if (contentLine.startsWith("+")) {
                type = PatchLineType.ADD;
            } else if (contentLine.startsWith("-")) {
                type = PatchLineType.REMOVE;
            } else {
                type = PatchLineType.CONTEXT;
            }

            let innerType: InnerPatchLineType = InnerPatchLineType.NONE;
            const trimmed = contentLine.substring(1);
            if (trimmed.startsWith("+")) {
                innerType = InnerPatchLineType.ADD;
            } else if (trimmed.startsWith("-")) {
                innerType = InnerPatchLineType.REMOVE;
            }

            lines.push({
                content: trimmed,
                innerPatchLineType: innerType,
                type: type,
            });
        });

        // Add a separator between hunks
        lines.push({ content: "", type: PatchLineType.SPACER, innerPatchLineType: InnerPatchLineType.NONE });
    }

    return lines;
}

function hasNonHeaderChanges(contentLines: string[]) {
    for (const line of contentLines) {
        if (lineHasNonHeaderChange(line)) {
            return true;
        }
    }
    return false;
}

function lineHasNonHeaderChange(line: string) {
    if (!(line.startsWith("+") || line.startsWith("-"))) {
        // context line
        return false;
    }

    // Added or removed content
    const content = line.substring(1);
    // Skip header lines and hunk headers in nested patches
    return !(content.startsWith("+++") || content.startsWith("---") || content.startsWith("@@ -") || content.startsWith("@@ +"));
}
