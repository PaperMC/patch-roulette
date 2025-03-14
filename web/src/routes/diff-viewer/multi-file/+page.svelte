<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";

    type FileDetails = {
        content: string;
        name: string;
    };
    let data: { values: FileDetails[] } = $state({ values: [] });

    const fileRegex = /diff --git a\/(\S+) b\/(\S+)\r?\n(?:.+\r?\n)*?(?=diff --git|Z)/g;

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            const patchContent = await file.text();

            // Process each file in the diff
            let fileMatch;
            while ((fileMatch = fileRegex.exec(patchContent)) !== null) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const [fullFileMatch, _, toFile] = fileMatch;
                data.values.push({ content: fullFileMatch, name: toFile });
            }
        }
    }
</script>

<div class="flex min-h-screen flex-row justify-center px-2 py-2 lg:py-6">
    <div class="flex min-h-[500px] grow flex-col rounded-lg bg-white p-3 shadow-md md:p-6 lg:max-w-10/12">
        <div class="mb-2 flex">
            <label for="patchUpload" class="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                Upload Patch File
                <input id="patchUpload" type="file" class="hidden" onchange={handleFileUpload} />
            </label>
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto border border-gray-300">
            <div class="h-100">
                {#each data.values as value, index (index)}
                    <h1 class="text-2xl">{value.name}</h1>
                    <div class="mb-2 border-t border-b border-gray-300">
                        <ConciseDiffView data={{ value: value.content }}></ConciseDiffView>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
