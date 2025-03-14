export type PatchRowType = "header" | "context" | "add" | "remove" | "spacer";

export type PatchRowTypeProps = {
    classes: string;
    prefix?: string;
};

export const patchRowTypeProps: Record<PatchRowType, PatchRowTypeProps> = {
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

export type PatchRow = {
    type: PatchRowType;
    content: string;
    innerPatchContentClasses?: string;
};

export default function makeRows(patchContent: string): PatchRow[] {
    const hunkRegex = /@@ -\d+(?:,\d+)? \+\d+_?(?:,\d+)? @@(?:\s[^\n]*)?(?:\n|$)((?:[ +-][^\n]*(?:\n|$))*)/g;

    const rows: PatchRow[] = [];

    let match;
    while ((match = hunkRegex.exec(patchContent)) !== null) {
        // Check if this hunk only contains changes to headers
        const contentLines = match[1].split("\n");

        // Skip this hunk if it only contains header changes
        if (!hasNonHeaderChanges(contentLines)) {
            continue;
        }

        // Add the hunk header
        rows.push({
            type: "header",
            content: match[0].split("\n")[0],
        });

        // Process the content lines
        contentLines.forEach((contentLine) => {
            let type: PatchRowType;
            if (contentLine.startsWith("+")) {
                type = "add";
            } else if (contentLine.startsWith("-")) {
                type = "remove";
            } else {
                type = "context";
            }

            let innerClasses = "font-mono";

            const trimmed = contentLine.substring(1);
            if (trimmed.startsWith("+")) {
                innerClasses += " bg-green-300 text-green-800";
            } else if (trimmed.startsWith("-")) {
                innerClasses += " bg-red-300 text-red-800";
            }

            rows.push({
                content: trimmed,
                innerPatchContentClasses: innerClasses,
                type: type,
            });
        });

        // Add a separator between hunks
        rows.push({ content: "", type: "spacer" });
    }

    return rows;
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
