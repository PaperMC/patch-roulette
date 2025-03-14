<script lang="ts">
    let { data } = $props<{ data: { value: string } }>();

    type PatchRow = {
        content: string;
        backgroundClasses?: string;
        innerPatchContentClasses?: string;
    };

    const patchRows = $derived.by(() => makeRows(data.value));

    function makeRows(patchContent: string): PatchRow[] {
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
                content: match[0].split("\n")[0],
                backgroundClasses: "bg-gray-200 font-mono",
            });

            // Process the content lines
            contentLines.forEach((diff) => {
                let outerLine = "font-mono";

                if (diff.startsWith("+")) {
                    outerLine += " bg-green-200";
                } else if (diff.startsWith("-")) {
                    outerLine += " bg-red-200";
                }

                let innerClasses = "font-mono";

                let patch = diff.substring(1);
                if (patch.startsWith("+") && patch.charAt(1) !== "+") {
                    innerClasses += " bg-green-300";
                } else if (patch.startsWith("-") && patch.charAt(1) !== "-") {
                    innerClasses += " bg-red-300";
                }

                rows.push({
                    content: diff,
                    backgroundClasses: outerLine,
                    innerPatchContentClasses: innerClasses,
                });
            });

            // Add a separator between hunks
            rows.push({ content: "", backgroundClasses: "h-2" });
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
</script>

{#each patchRows as row (row)}
    <div class="h-auto py-1 ps-0.5 {row.backgroundClasses} flex w-full flex-row">
        <div class="w-max">
            <pre>{row.content.charAt(0)}</pre>
        </div>
        <div class="w-max max-w-full">
            <pre class=" break-words whitespace-pre-wrap {row.innerPatchContentClasses}">{row.content.substring(1)}</pre>
        </div>
    </div>
{/each}
