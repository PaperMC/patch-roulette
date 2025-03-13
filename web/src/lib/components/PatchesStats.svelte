<script lang="ts">
    import type { Stats } from "$lib/types";
    import { AgGrid } from "ag-grid-svelte5-extended";
    import type { GridOptions } from "@ag-grid-community/core";
    import { themeQuartz } from "@ag-grid-community/theming";
    import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
    import { Duration } from "luxon";

    let { data = { value: null as Stats | null }, gridClass = "ag-theme-quartz" } = $props<{
        data: { value: Stats | null };
        gridClass?: string;
    }>();

    function getProgressPercentage(count: number, total: number): number {
        if (total === 0) return 0;
        const percentage = (count / total) * 100;
        // If the percentage is very small but not zero, show at least 1%
        return percentage > 0 && percentage < 1 ? 1 : Math.round(percentage);
    }

    const gridOptions: GridOptions<Stats["users"][0]> = {
        columnDefs: [
            { field: "user", flex: 2, sortable: false },
            { field: "wip", flex: 1, sortable: false },
            { field: "done", flex: 1, sortable: false },
            {
                field: "timeSpent",
                flex: 1,
                sortable: false,
                valueFormatter: (params) => (params.data?.timeSpent ? Duration.fromISO(params.data.timeSpent).toFormat("hh:mm:ss.SSS") : ""),
            },
        ],
        getRowId: (params) => params.data.user,
        getRowClass: (params) => {
            if (params.rowIndex === 0) {
                return "bg-[#EFBF04]! font-semibold";
            } else if (params.rowIndex === 1) {
                return "bg-[#C0C0C0]! font-semibold";
            } else if (params.rowIndex === 2) {
                return "bg-[#CE8946]! font-semibold";
            }
            return "";
        },
        theme: themeQuartz,
        loadThemeGoogleFonts: false,
    };
    const modules = [ClientSideRowModelModule];
</script>

<div class="flex w-full flex-1 flex-col">
    {#if !data.value?.total}
        <div class="flex h-full items-center justify-center">
            <p class="text-gray-500">No stats data available</p>
        </div>
    {:else}
        <div class="mb-4">
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div class="rounded bg-gray-100 p-4 text-center shadow">
                    <div class="text-2xl font-bold">{data.value.total}</div>
                    <div class="text-sm text-gray-600">Total Patches</div>
                </div>
                <div class="rounded bg-green-50 p-4 text-center shadow">
                    <div class="text-2xl font-bold text-green-600">{data.value.done}</div>
                    <div class="text-sm text-gray-600">Applied</div>
                </div>
                <div class="rounded bg-orange-50 p-4 text-center shadow">
                    <div class="text-2xl font-bold text-orange-600">{data.value.wip}</div>
                    <div class="text-sm text-gray-600">WIP</div>
                </div>
                <div class="rounded bg-yellow-50 p-4 text-center shadow">
                    <div class="text-2xl font-bold text-yellow-600">{data.value.available}</div>
                    <div class="text-sm text-gray-600">Todo</div>
                </div>
            </div>
        </div>

        <div class="mb-4">
            <div class="mb-1 flex justify-between">
                <span class="text-sm font-semibold">
                    {getProgressPercentage(data.value.done, data.value.total)}% Applied |
                    {getProgressPercentage(data.value.wip, data.value.total)}% WIP |
                    {getProgressPercentage(data.value.available, data.value.total)}% Todo
                </span>
                <span class="text-sm font-semibold">
                    Time Spent: {Duration.fromISO(data.value.timeSpent).toHuman()}
                </span>
            </div>
            <div class="h-4 w-full overflow-hidden rounded-full bg-gray-200 shadow">
                <div class="flex h-full w-full">
                    <div class="h-full bg-green-500" style="width: {getProgressPercentage(data.value.done, data.value.total)}%"></div>
                    <div class="h-full bg-orange-500" style="width: {getProgressPercentage(data.value.wip, data.value.total)}%"></div>
                    <div class="h-full bg-yellow-500" style="width: {getProgressPercentage(data.value.available, data.value.total)}%"></div>
                </div>
            </div>
        </div>

        <div class="flex w-full flex-1">
            <AgGrid {gridOptions} rowData={data.value.users} {modules} {gridClass} />
        </div>
    {/if}
</div>
