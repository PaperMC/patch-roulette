<script lang="ts">
    import ConciseDiffView from "$lib/components/diff/ConciseDiffView.svelte";
    import FileInput from "$lib/components/files/FileInput.svelte";

    let data: { value: string } = $state({ value: "" });
    let fileName: string = $state("No File Selected");

    async function handleFileUpload(file?: File) {
        if (file) {
            data.value = await file.text();
            fileName = file.name;
        }
    }
</script>

<div class="flex min-h-screen flex-row justify-center bg-primary px-2 py-2 lg:py-6">
    <div class="flex min-h-[500px] max-w-7xl grow flex-col rounded-lg bg-white p-3 shadow-md md:p-6">
        <div class="mb-2 flex">
            <FileInput onChange={handleFileUpload} class="cursor-pointer rounded-lg btn-primary px-4 py-2">Load Patch File</FileInput>
        </div>
        <h1 class="text-2xl">{fileName}</h1>
        <div class="flex h-fit flex-1 flex-col border">
            <ConciseDiffView rawPatchContent={data.value}></ConciseDiffView>
        </div>
    </div>
</div>
