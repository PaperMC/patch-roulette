<script lang="ts">
    let { data } = $props<{ data: { value: string } }>();

    type PatchRow = {
        content: string;
        classes?: string;
    };

    type PatchRows = {
        values: PatchRow[];
    };

    let renderDiff: () => PatchRows = $state(() => {
        return { values: [] };
    });

    $effect(() => {
        setup(data.value);
    });

    async function setup(patchContent: string) {
        const hunkRegex = /@@ -\d+(?:,\d+)? \+\d+_?(?:,\d+)? @@(?:\s[^\n]*)?(?:\n|$)((?:[ +-][^\n]*(?:\n|$))*)/g;

        renderDiff = () => {
            const rows: PatchRow[] = [];

            // Process p.patch (patch of patches)
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
                    content: match[0].split("\n")[0],
                    classes: "bg-gray-200 font-mono",
                });

                // Process the content lines
                contentLines.forEach((line) => {
                    let lineClass = "font-mono";
                    if (line.startsWith("+")) {
                        lineClass += " bg-green-100 text-green-800";
                    } else if (line.startsWith("-")) {
                        lineClass += " bg-red-100 text-red-800";
                    }

                    rows.push({
                        content: line,
                        classes: lineClass,
                    });
                });

                // Add a separator between hunks
                rows.push({ content: "", classes: "h-2" });
            }

            return {
                values: rows,
            };
        };
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
</script>

{#each renderDiff().values as row (row)}
    <pre class="whitespace-pre-wrap {row.classes}">{row.content}</pre>
{/each}
