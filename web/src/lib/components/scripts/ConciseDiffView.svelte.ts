import diff from "fast-diff";

export type LineSegment = {
    text: string;
    classes?: string;
};

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
    content: LineSegment[];
    innerPatchLineType: InnerPatchLineType;
};

function getInnerType(text: string) {
    let innerType = InnerPatchLineType.NONE;
    if (text.startsWith("+")) {
        innerType = InnerPatchLineType.ADD;
    } else if (text.startsWith("-")) {
        innerType = InnerPatchLineType.REMOVE;
    }
    return innerType;
}

function processLineDiff(contentLines: string[], lines: PatchLine[]) {
    enum State {
        CONTEXT,
        ADD,
        REMOVE,
    }

    let addLinesText: string[] = [];
    let removeLinesText: string[] = [];
    let state = State.CONTEXT;
    for (let i = 0; i < contentLines.length; i++) {
        const lineText = contentLines[i];

        let newState: State = State.CONTEXT;
        if (lineText.startsWith("+")) {
            newState = State.ADD;
        } else if (lineText.startsWith("-")) {
            newState = State.REMOVE;
        }

        let stateChanged = false;
        if (newState !== state) {
            state = newState;
            stateChanged = true;
        }

        if (stateChanged && state === State.CONTEXT) {
            if (addLinesText.length != removeLinesText.length) {
                // The added and removed lines are not adjacent or are not symmetric
                removeLinesText.forEach((text) => {
                    lines.push({
                        content: [{ text }],
                        type: PatchLineType.REMOVE,
                        innerPatchLineType: getInnerType(text),
                    });
                });
                addLinesText.forEach((text) => {
                    lines.push({
                        content: [{ text }],
                        type: PatchLineType.ADD,
                        innerPatchLineType: getInnerType(text),
                    });
                });
            } else {
                const addLines: LineSegment[][] = [];
                const removeLines: LineSegment[][] = [];

                for (let j = 0; j < addLinesText.length; j++) {
                    const diffResult = diff(removeLinesText[j], addLinesText[j], undefined, true);

                    const addLine: LineSegment[] = [];
                    const removeLine: LineSegment[] = [];
                    diffResult.forEach(([type, text]) => {
                        if (type === 1) {
                            addLine.push({ text, classes: "rounded-sm bg-green-100 m-0.5" });
                        } else if (type === -1) {
                            removeLine.push({ text, classes: "rounded-sm bg-red-100 m-0.5" });
                        } else {
                            addLine.push({ text });
                            removeLine.push({ text });
                        }
                    });
                    if (addLine.length !== 0) {
                        addLines.push(addLine);
                    }
                    if (removeLine.length !== 0) {
                        removeLines.push(removeLine);
                    }
                }
                removeLines.forEach((line) => {
                    lines.push({
                        content: line,
                        type: PatchLineType.REMOVE,
                        innerPatchLineType: getInnerType(line[0].text),
                    });
                });
                addLines.forEach((line) => {
                    lines.push({
                        content: line,
                        type: PatchLineType.ADD,
                        innerPatchLineType: getInnerType(line[0].text),
                    });
                });
            }
            addLinesText = [];
            removeLinesText = [];
        }

        if (state === State.ADD) {
            addLinesText.push(lineText.substring(1));
        } else if (state === State.REMOVE) {
            removeLinesText.push(lineText.substring(1));
        } else {
            const trimmed = lineText.substring(1);
            lines.push({
                content: [{ text: trimmed }],
                innerPatchLineType: getInnerType(trimmed),
                type: PatchLineType.CONTEXT,
            });
        }
    }
}

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
            content: [{ text: match[0].split("\n")[0] }],
            innerPatchLineType: InnerPatchLineType.NONE,
        });

        processLineDiff(contentLines, lines);

        // Add a separator between hunks
        lines.push({ content: [{ text: "" }], type: PatchLineType.SPACER, innerPatchLineType: InnerPatchLineType.NONE });
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
