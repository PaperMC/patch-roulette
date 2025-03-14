<script lang="ts">
    import ConciseDiffView from "$lib/components/ConciseDiffView.svelte";

    let data: { value: string } = $state({ value: "" });
    let fileName: string = $state("No File Selected");

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            data.value = await file.text();
            fileName = file.name;
        }
    }
</script>

<div class="flex min-h-screen flex-row justify-center px-2 py-2 lg:py-6">
    <div class="flex min-h-[500px] max-w-7xl grow flex-col rounded-lg bg-white p-3 shadow-md md:p-6">
        <div class="mb-2 flex">
            <label for="patchUpload" class="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                Load Patch File
                <input id="patchUpload" type="file" class="hidden" onchange={handleFileUpload} />
            </label>
        </div>
        <h1 class="text-2xl">{fileName}</h1>
        <div class="flex h-fit flex-1 flex-col border border-gray-300">
            <ConciseDiffView rawPatchContent={data.value}></ConciseDiffView>
        </div>
    </div>
</div>
