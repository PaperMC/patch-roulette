<script lang="ts">
    import { AgGrid } from "ag-grid-svelte5-extended";
    import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
    import { themeQuartz } from "@ag-grid-community/theming";
    import { type GridOptions } from "@ag-grid-community/core";
    import type { PatchDetails } from "$lib/types";

    let { data = { value: [] }, gridClass = "ag-theme-quartz" } = $props<{
        data: { value: PatchDetails[] };
        gridClass?: string;
    }>();

    const gridOptions: GridOptions<PatchDetails> = {
        columnDefs: [
            {
                field: "path",
                flex: 2,
                filter: true,
                floatingFilter: true,
            },
            {
                field: "status",
                flex: 1,
                filter: true,
                floatingFilter: true,
                cellClass: (params) => {
                    switch (params.value) {
                        case "WIP":
                            return "text-orange-500";
                        case "AVAILABLE":
                            return "text-yellow-500";
                        case "DONE":
                            return "text-green-500";
                        default:
                            return "";
                    }
                },
            },
            { field: "responsibleUser", flex: 1, filter: true, floatingFilter: true },
        ],
        getRowId: (params) => params.data.path,
        theme: themeQuartz,
        loadThemeGoogleFonts: false,
    };

    const modules = [ClientSideRowModelModule];
</script>

<div class="flex w-full flex-1">
    <AgGrid {gridOptions} rowData={data.value} {modules} {gridClass} />
</div>

<style>
</style>
