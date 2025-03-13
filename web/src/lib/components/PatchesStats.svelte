<script lang="ts">
    import type { PatchDetails } from "$lib/types";
    import { AgGrid } from "ag-grid-svelte5-extended";
    import type { GridOptions } from "@ag-grid-community/core";
    import { themeQuartz } from "@ag-grid-community/theming";
    import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";

    let { data = { value: [] }, gridClass = "ag-theme-quartz" } = $props<{
        data: { value: PatchDetails[] };
        gridClass?: string;
    }>();

    let counts = $derived.by(() => {
        const counts = {
            total: data.value.length,
            wip: 0,
            available: 0,
            done: 0,
        };

        data.value.forEach((patch: PatchDetails) => {
            switch (patch.status) {
                case "WIP":
                    counts.wip++;
                    break;
                case "AVAILABLE":
                    counts.available++;
                    break;
                case "DONE":
                    counts.done++;
                    break;
            }
        });

        return counts;
    });

    function getProgressPercentage(count: number, total: number): number {
        if (total === 0) return 0;
        const percentage = (count / total) * 100;
        // If the percentage is very small but not zero, show at least 1%
        return percentage > 0 && percentage < 1 ? 1 : Math.round(percentage);
    }

    type Counts = {
        user: string;
        done: number;
        wip: number;
    };

    let userCounts = $derived.by(() => {
        const counts = new Map<string, Counts>();
        data.value.forEach((patch: PatchDetails) => {
            if (patch.responsibleUser) {
                let userCounts: Counts;
                if (counts.has(patch.responsibleUser)) {
                    userCounts = counts.get(patch.responsibleUser)!;
                } else {
                    userCounts = { done: 0, wip: 0, user: patch.responsibleUser };
                    counts.set(patch.responsibleUser, userCounts);
                }
                switch (patch.status) {
                    case "WIP":
                        userCounts.wip++;
                        break;
                    case "DONE":
                        userCounts.done++;
                        break;
                }
            }
        });

        return Array.from(counts.values()).sort((a, b) => {
            const totalA = a.wip + a.done;
            const totalB = b.wip + b.done;
            return totalB - totalA;
        });
    });

    const gridOptions: GridOptions<Counts> = {
        columnDefs: [
            { field: "user", flex: 2, sortable: false },
            { field: "wip", flex: 1, sortable: false },
            { field: "done", flex: 1, sortable: false },
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
    {#if data.value.length === 0}
        <div class="flex h-full items-center justify-center">
            <p class="text-gray-500">No patch data available</p>
        </div>
    {:else}
        <div class="mb-4">
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div class="rounded bg-gray-100 p-4 text-center shadow">
                    <div class="text-2xl font-bold">{counts.total}</div>
                    <div class="text-sm text-gray-600">Total Patches</div>
                </div>
                <div class="rounded bg-green-50 p-4 text-center shadow">
                    <div class="text-2xl font-bold text-green-600">{counts.done}</div>
                    <div class="text-sm text-gray-600">Applied</div>
                </div>
                <div class="rounded bg-orange-50 p-4 text-center shadow">
                    <div class="text-2xl font-bold text-orange-600">{counts.wip}</div>
                    <div class="text-sm text-gray-600">WIP</div>
                </div>
                <div class="rounded bg-yellow-50 p-4 text-center shadow">
                    <div class="text-2xl font-bold text-yellow-600">{counts.available}</div>
                    <div class="text-sm text-gray-600">Todo</div>
                </div>
            </div>
        </div>

        <div class="mb-4">
            <div class="mb-1 flex">
                <span class="text-sm font-semibold">
                    {getProgressPercentage(counts.done, counts.total)}% Applied |
                    {getProgressPercentage(counts.wip, counts.total)}% WIP |
                    {getProgressPercentage(counts.available, counts.total)}% Todo
                </span>
            </div>
            <div class="h-4 w-full overflow-hidden rounded-full bg-gray-200 shadow">
                <div class="flex h-full w-full">
                    <div class="h-full bg-green-500" style="width: {getProgressPercentage(counts.done, counts.total)}%"></div>
                    <div class="h-full bg-orange-500" style="width: {getProgressPercentage(counts.wip, counts.total)}%"></div>
                    <div class="h-full bg-yellow-500" style="width: {getProgressPercentage(counts.available, counts.total)}%"></div>
                </div>
            </div>
        </div>

        <div class="flex w-full flex-1">
            <AgGrid {gridOptions} rowData={userCounts} {modules} {gridClass} />
        </div>
    {/if}
</div>
