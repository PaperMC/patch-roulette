export type PatchLineType = "header" | "context" | "add" | "remove" | "spacer";

export type PatchLineTypeProps = {
    classes: string;
    prefix?: string;
};

export const patchLineTypeProps: Record<PatchLineType, PatchLineTypeProps> = {
    header: {
        classes: "bg-gray-200",
    },
    add: {
        classes: "bg-green-200",
        prefix: "+",
    },
    remove: {
        classes: "bg-red-200",
        prefix: "-",
    },
    context: {
        classes: "",
        prefix: " ",
    },
    spacer: {
        classes: "h-2",
    },
};

export type InnerPatchLineType = "add" | "remove" | "none";

export type InnerPatchLineTypeProps = {
    classes: string;
};

export const innerPatchLineTypeProps: Record<InnerPatchLineType, InnerPatchLineTypeProps> = {
    add: {
        classes: "bg-green-300 text-green-800",
    },
    remove: {
        classes: "bg-red-300 text-red-800",
    },
    none: {
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
            type: "header",
            content: match[0].split("\n")[0],
            innerPatchLineType: "none",
        });

        // Process the content lines
        contentLines.forEach((contentLine) => {
            let type: PatchLineType;
            if (contentLine.startsWith("+")) {
                type = "add";
            } else if (contentLine.startsWith("-")) {
                type = "remove";
            } else {
                type = "context";
            }

            let innerType: InnerPatchLineType = "none";
            const trimmed = contentLine.substring(1);
            if (trimmed.startsWith("+")) {
                innerType = "add";
            } else if (trimmed.startsWith("-")) {
                innerType = "remove";
            }

            lines.push({
                content: trimmed,
                innerPatchLineType: innerType,
                type: type,
            });
        });

        // Add a separator between hunks
        lines.push({ content: "", type: "spacer", innerPatchLineType: "none" });
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
