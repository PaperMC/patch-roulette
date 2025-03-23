import { diffArrays, parsePatch } from "diff";
import { type Component } from "svelte";
import NoEntry16 from "virtual:icons/octicon/no-entry-16";

export type LineSegment = {
    text?: string | null;
    icon?: Component | null;
    caption?: string | null;
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

const noTrailingNewlineMarker: string = "%%" + ["PATCH", "ROULETTE", "NO", "TRAILING", "NEWLINE", "MARKER"].join("%") + "%%";

enum LineProcessorState {
    CONTEXT,
    ADD,
    REMOVE,
}

class LineProcessor {
    private contentLines: string[] = [];
    private output: PatchLine[] = [];
    private state: LineProcessorState = LineProcessorState.CONTEXT;
    private addLinesText: string[] = [];
    private removeLinesText: string[] = [];
    private contextLinesText: string[] = [];

    process(contentLines: string[], output: PatchLine[]) {
        // Reset state
        this.contentLines = contentLines;
        this.output = output;
        this.state = LineProcessorState.CONTEXT;
        this.addLinesText = [];
        this.removeLinesText = [];
        this.contextLinesText = [];

        for (let i = 0; i < this.contentLines.length; i++) {
            const lineText = this.contentLines[i];

            const oldState = this.state;
            if (lineText.startsWith("+")) {
                this.state = LineProcessorState.ADD;
            } else if (lineText.startsWith("-")) {
                this.state = LineProcessorState.REMOVE;
            } else {
                if (lineText === "\\ No newline at end of file") {
                    // This is metadata for the previous line
                    switch (this.state) {
                        case LineProcessorState.ADD:
                            this.addLinesText[this.addLinesText.length - 1] += noTrailingNewlineMarker;
                            break;
                        case LineProcessorState.REMOVE:
                            this.removeLinesText[this.removeLinesText.length - 1] += noTrailingNewlineMarker;
                            break;
                        case LineProcessorState.CONTEXT:
                            this.contextLinesText[this.contextLinesText.length - 1] += noTrailingNewlineMarker;
                            break;
                    }
                    continue;
                } else {
                    this.state = LineProcessorState.CONTEXT;
                }
            }

            const stateChanged = oldState !== this.state;

            if (stateChanged && this.state === LineProcessorState.CONTEXT) {
                /*
                 * Transition to CONTEXT
                 */
                if (this.addLinesText.length == this.removeLinesText.length) {
                    this.processLineDiff();
                } else {
                    // The added and removed lines are not adjacent or are not symmetric
                    this.appendRemainingPlain();
                }
            } else if (stateChanged && oldState === LineProcessorState.CONTEXT) {
                /*
                 * Transition from CONTEXT
                 */
                this.appendRemainingPlain();
            }

            if (this.state === LineProcessorState.ADD) {
                this.addLinesText.push(lineText.substring(1));
            } else if (this.state === LineProcessorState.REMOVE) {
                this.removeLinesText.push(lineText.substring(1));
            } else {
                this.contextLinesText.push(lineText.substring(1));
            }
        }

        if (this.state === LineProcessorState.CONTEXT) {
            this.appendRemainingPlain();
        } else if (this.addLinesText.length == this.removeLinesText.length) {
            this.processLineDiff();
        } else {
            // The added and removed lines are not adjacent or are not symmetric
            this.appendRemainingPlain();
        }

        this.postprocess();
    }

    private appendRemainingPlain() {
        for (let i = 0; i < this.removeLinesText.length; i++) {
            const text = this.removeLinesText[i];
            this.output.push({
                content: [{ text }],
                type: PatchLineType.REMOVE,
                innerPatchLineType: getInnerType(text),
            });
        }
        for (let i = 0; i < this.addLinesText.length; i++) {
            const text = this.addLinesText[i];
            this.output.push({
                content: [{ text }],
                type: PatchLineType.ADD,
                innerPatchLineType: getInnerType(text),
            });
        }
        for (let i = 0; i < this.contextLinesText.length; i++) {
            const text = this.contextLinesText[i];
            this.output.push({
                content: [{ text }],
                type: PatchLineType.CONTEXT,
                innerPatchLineType: getInnerType(text),
            });
        }
        this.removeLinesText = [];
        this.addLinesText = [];
        this.contextLinesText = [];
    }

    private processLineDiff() {
        const addLines: LineSegment[][] = [];
        const removeLines: LineSegment[][] = [];

        for (let j = 0; j < this.addLinesText.length; j++) {
            const removeTokens = genericTokenize(this.removeLinesText[j]);
            const addTokens = genericTokenize(this.addLinesText[j]);
            const diffResult = diffArrays(removeTokens, addTokens);

            const addLine: LineSegment[] = [];
            const removeLine: LineSegment[] = [];
            diffResult.forEach((change) => {
                const text = change.value.join("");
                if (change.added) {
                    addLine.push({ text, classes: "rounded-sm bg-green-100 my-0.5" });
                } else if (change.removed) {
                    removeLine.push({ text, classes: "rounded-sm bg-red-100 my-0.5" });
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
            this.output.push({
                content: line,
                type: PatchLineType.REMOVE,
                innerPatchLineType: getInnerType(line[0].text!),
            });
        });
        addLines.forEach((line) => {
            this.output.push({
                content: line,
                type: PatchLineType.ADD,
                innerPatchLineType: getInnerType(line[0].text!),
            });
        });

        this.addLinesText = [];
        this.removeLinesText = [];
    }

    private postprocess() {
        for (const line of this.output) {
            if (line.content.length === 0) {
                continue;
            }
            const lastSegment = line.content[line.content.length - 1];
            if (!lastSegment.text) {
                continue;
            }
            if (lastSegment.text.endsWith(noTrailingNewlineMarker)) {
                lastSegment.text = lastSegment.text.substring(0, lastSegment.text.length - noTrailingNewlineMarker.length);
                if (lastSegment.text === "") {
                    line.content.pop();
                }
                line.content.push({
                    icon: NoEntry16,
                    caption: "No trailing newline",
                    classes: lastSegment.classes,
                });
            }
        }
    }
}

const lineProcessor = new LineProcessor();

function processLines(contentLines: string[], lines: PatchLine[]) {
    lineProcessor.process(contentLines, lines);
}

export default function makeLines(patchContent: string): PatchLine[] {
    const diffs = parsePatch(patchContent);
    if (diffs.length !== 1) {
        throw Error("Only one patch is supported");
    }

    const lines: PatchLine[] = [];

    for (const hunk of diffs[0].hunks) {
        // Skip this hunk if it only contains header changes
        if (!hasNonHeaderChanges(hunk.lines)) {
            continue;
        }

        // Add the hunk header
        const header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
        lines.push({
            type: PatchLineType.HEADER,
            content: [{ text: header }],
            innerPatchLineType: InnerPatchLineType.NONE,
        });

        processLines(hunk.lines, lines);

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

const indexHeaderRegex = /^index [0-9a-f]+\.\.[0-9a-f]+ \d+$/;

function lineHasNonHeaderChange(line: string) {
    if (!(line.startsWith("+") || line.startsWith("-"))) {
        // context line
        return false;
    }

    // Added or removed content
    const content = line.substring(1);
    // Skip header lines and hunk headers in nested patches
    return !(
        content.startsWith("+++") ||
        content.startsWith("---") ||
        content.startsWith("@@ -") ||
        content.startsWith("@@ +") ||
        content.match(indexHeaderRegex)
    );
}

const delimiters = [
    " ",
    "\t",
    "\n",
    ".",
    ",",
    ":",
    ";",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "'",
    '"',
    "`",
    "|",
    "&",
    "<",
    ">",
    "=",
    "+",
    "-",
    "*",
    "/",
    "%",
    "!",
    "?",
    "#",
    "@",
    "^",
    "~",
    "\\",
    "$",
];

function genericTokenize(content: string): string[] {
    const tokens: string[] = [];
    let currentToken = "";

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (delimiters.includes(char)) {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = "";
            }
            tokens.push(char);
        } else {
            currentToken += char;
        }
    }

    if (currentToken) {
        tokens.push(currentToken);
    }

    return tokens;
}
