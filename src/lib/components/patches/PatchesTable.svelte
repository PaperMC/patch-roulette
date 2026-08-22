<script lang="ts">
  import { ArrowDownIcon, ArrowsDownUpIcon, ArrowUpIcon, WarningCircleIcon, XIcon } from "phosphor-svelte";
  import { createQuery } from "@tanstack/svelte-query";
  import {
    columnFilteringFeature,
    createFilteredRowModel,
    createSortedRowModel,
    createTable,
    filterFn_equals,
    filterFn_includesString,
    FlexRender,
    renderComponent,
    renderSnippet,
    rowSortingFeature,
    sortFn_textCaseSensitive,
    tableFeatures,
  } from "@tanstack/svelte-table";
  import { type Column, type ColumnDef, type Header } from "@tanstack/svelte-table";
  import { Banner, Button, Empty, Input, LayerCard, Select, SkeletonLine, Table, Text } from "kumo-svelte";
  import { fetchApi } from "$lib/api";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { formatDateTime, formatDuration, relativeTime } from "$lib/format";
  import { baseQueryOptions, queryKeys, refreshInterval } from "$lib/queries";
  import { type Patch, type PatchStatus } from "$lib/domain";

  let { version }: { version: string } = $props();

  // Match the backend enum and the table's filter order: AVAILABLE -> WIP -> DONE.
  const STATUS_ORDER: Record<PatchStatus, number> = { AVAILABLE: 0, WIP: 1, DONE: 2 };

  const STATUS_FILTER_OPTIONS = [
    { label: "All", value: "" },
    { label: "Available", value: "AVAILABLE" },
    { label: "WIP", value: "WIP" },
    { label: "Done", value: "DONE" },
  ];

  // Placeholder/aria-label text for the free-text filter inputs.
  const FILTER_META: Record<string, { placeholder: string; label: string }> = {
    path: { placeholder: "Filter path", label: "path" },
    responsibleUser: { placeholder: "Filter owner", label: "owner" },
  };

  // Skeleton rows during the initial load. A concrete literal (not Array(8))
  // so every row has a real value and a unique key — sparse arrays yield
  // `undefined` rows and crash keyed each blocks.
  const SKELETON_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];

  /** Null durations sort last. */
  function durationMs(milliseconds: number | null): number | undefined {
    return milliseconds ?? undefined;
  }

  /** Finite timestamps sort normally. */
  function updatedAtMs(milliseconds: number): number | undefined {
    return Number.isFinite(milliseconds) ? milliseconds : undefined;
  }

  function compareNumbers(a: number | undefined, b: number | undefined): number {
    const av = a ?? Number.NEGATIVE_INFINITY;
    const bv = b ?? Number.NEGATIVE_INFINITY;
    return av === bv ? 0 : av > bv ? 1 : -1;
  }

  const patchesQuery = createQuery<Patch[]>(() => ({
    queryKey: queryKeys.patches.forVersion(version),
    queryFn: () => fetchApi<Patch[]>("/patches", { params: { minecraftVersion: version } }),
    enabled: version !== "",
    refetchInterval: refreshInterval(),
    ...baseQueryOptions,
  }));

  const patches = $derived(patchesQuery.data ?? []);

  const features = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    columnFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
  });

  const columns: Array<ColumnDef<typeof features, Patch>> = [
    {
      id: "path",
      accessorKey: "path",
      header: (header) => renderSnippet(sortHeader, { label: "Path", column: header.column }),
      cell: (info) => renderSnippet(pathCell, { path: info.getValue<string>() }),
      // Patch paths are case-sensitive source-file identifiers, so use
      // straightforward lexical ordering rather than display-label sorting.
      sortFn: sortFn_textCaseSensitive,
      filterFn: filterFn_includesString,
    },
    {
      id: "status",
      accessorKey: "status",
      header: (header) => renderSnippet(sortHeader, { label: "Status", column: header.column }),
      cell: (info) => renderComponent(StatusBadge, { status: info.getValue<PatchStatus>() }),
      sortFn: (rowA, rowB, columnId) =>
        STATUS_ORDER[rowA.getValue<PatchStatus>(columnId)] - STATUS_ORDER[rowB.getValue<PatchStatus>(columnId)],
      filterFn: filterFn_equals,
    },
    {
      id: "responsibleUser",
      accessorFn: (row) => row.responsibleUser ?? undefined,
      header: (header) => renderSnippet(sortHeader, { label: "Owner", column: header.column }),
      cell: (info) => renderSnippet(ownerCell, { owner: info.getValue<string | undefined>() }),
      sortUndefined: "last",
      filterFn: filterFn_includesString,
    },
    {
      id: "duration",
      accessorFn: (row) => durationMs(row.duration),
      header: (header) => renderSnippet(sortHeader, { label: "Duration", column: header.column }),
      cell: (info) => formatDuration(info.row.original.duration),
      sortFn: (rowA, rowB, columnId) =>
        compareNumbers(rowA.getValue<number | undefined>(columnId), rowB.getValue<number | undefined>(columnId)),
      sortUndefined: "last",
      sortDescFirst: true,
      enableColumnFilter: false,
    },
    {
      id: "updatedAt",
      accessorFn: (row) => updatedAtMs(row.updatedAt),
      header: (header) => renderSnippet(sortHeader, { label: "Last updated", column: header.column }),
      cell: (info) => renderSnippet(dateCell, { milliseconds: info.row.original.updatedAt }),
      sortFn: (rowA, rowB, columnId) =>
        compareNumbers(rowA.getValue<number | undefined>(columnId), rowB.getValue<number | undefined>(columnId)),
      sortUndefined: "last",
      sortDescFirst: true,
      enableColumnFilter: false,
    },
  ];

  const table = createTable({
    features,
    columns,
    get data() {
      return patches;
    },
    getRowId: (row) => row.path,
    initialState: {
      sorting: [{ id: "updatedAt", desc: true }],
    },
  });

  const visibleCount = $derived(table.getRowModel().rows.length);
</script>

{#snippet sortHeader(params: { label: string; column: Column<typeof features, Patch, unknown> })}
  <button
    type="button"
    class="group/sort-button hover:bg-kumo-tint focus-visible:ring-kumo-focus/50 flex min-h-6 w-full items-center gap-1 rounded-sm px-1 text-left select-none focus-visible:ring-2 focus-visible:outline-none"
    disabled={!params.column.getCanSort()}
    onclick={params.column.getToggleSortingHandler()}
    title={`Sort by ${params.label}`}
  >
    {params.label}
    {#if params.column.getIsSorted() === "asc"}
      <ArrowUpIcon class="text-kumo-muted shrink-0" size={16} aria-hidden="true" />
    {:else if params.column.getIsSorted() === "desc"}
      <ArrowDownIcon class="text-kumo-muted shrink-0" size={16} aria-hidden="true" />
    {:else}
      <ArrowsDownUpIcon
        class="text-kumo-muted shrink-0 opacity-0 group-hover/sort-button:opacity-100"
        size={16}
        aria-hidden="true"
      />
    {/if}
  </button>
{/snippet}

{#snippet pathCell(params: { path: string })}
  <span class="block max-w-full truncate font-mono text-sm" title={params.path}>{params.path}</span>
{/snippet}

{#snippet ownerCell(params: { owner: string | undefined })}
  {#if params.owner}
    <span class="block max-w-full truncate" title={params.owner}>{params.owner}</span>
  {:else}
    —
  {/if}
{/snippet}

{#snippet dateCell(params: { milliseconds: number })}
  <span class="block truncate" title={relativeTime(params.milliseconds)}>{formatDateTime(params.milliseconds)}</span>
{/snippet}

{#snippet filterControl(header: Header<typeof features, Patch, unknown>)}
  {#if header.column.id === "status"}
    <Select
      size="sm"
      placeholder="All statuses"
      options={STATUS_FILTER_OPTIONS}
      value={header.column.getFilterValue() ?? ""}
      onValueChange={(value) => header.column.setFilterValue(value)}
      aria-label="Filter by status"
      class="w-full"
    />
  {:else}
    <Input
      size="sm"
      placeholder={FILTER_META[header.column.id].placeholder}
      value={(header.column.getFilterValue() as string) ?? ""}
      onValueChange={(value) => header.column.setFilterValue(value)}
      aria-label={"Filter by " + FILTER_META[header.column.id].label}
      class="font-normal"
    />
  {/if}
{/snippet}

{#snippet tableHeader()}
  <Table.Header sticky>
    {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
      <Table.Row>
        {#each headerGroup.headers as header (header.id)}
          <Table.Head class="align-top">
            {#if !header.isPlaceholder}
              <div class="grid gap-1.5">
                <FlexRender {header} />
                {#if header.column.getCanFilter()}
                  {@render filterControl(header)}
                {/if}
              </div>
            {/if}
          </Table.Head>
        {/each}
      </Table.Row>
    {/each}
  </Table.Header>
{/snippet}

{#snippet tableBody()}
  <Table.Body>
    {#if patchesQuery.isPending}
      {#each SKELETON_ROWS as i (i)}
        <Table.Row>
          {#each table.getAllLeafColumns() as column (column.id)}
            <Table.Cell>
              <SkeletonLine class="h-5" />
            </Table.Cell>
          {/each}
        </Table.Row>
      {/each}
    {:else if visibleCount === 0}
      <Table.Row>
        <Table.Cell colspan={columns.length} class="p-0!">
          {#if patches.length === 0}
            <Empty
              size="sm"
              class="rounded-none border-0 bg-transparent"
              title="No patches"
              description={"No patches exist for Minecraft " + version + " yet."}
            />
          {:else}
            <Empty
              size="sm"
              class="rounded-none border-0 bg-transparent"
              title="No matching patches"
              description="Try adjusting the filters."
            >
              <Button size="sm" onclick={() => table.resetColumnFilters()}>
                <XIcon size={16} aria-hidden="true" />
                Clear filters
              </Button>
            </Empty>
          {/if}
        </Table.Cell>
      </Table.Row>
    {:else}
      {#each table.getRowModel().rows as row (row.id)}
        <Table.Row class="hover:bg-kumo-tint">
          {#each row.getAllCells() as cell (cell.id)}
            <Table.Cell>
              <FlexRender {cell} />
            </Table.Cell>
          {/each}
        </Table.Row>
      {/each}
    {/if}
  </Table.Body>
{/snippet}

<div class="flex min-h-0 flex-1 flex-col">
  {#if patchesQuery.isError}
    <Banner
      variant="error"
      icon={WarningCircleIcon}
      title="Couldn't load patches"
      description={patchesQuery.error.message}
    >
      {#snippet action()}
        <Banner.Action onclick={() => patchesQuery.refetch()}>Retry</Banner.Action>
      {/snippet}
    </Banner>
  {:else}
    <div class="flex min-h-0 flex-1 flex-col gap-2">
      <div class="h-4">
        {#if patchesQuery.isPending}
          <SkeletonLine minWidth={10} maxWidth={16} class="h-full" />
        {:else}
          <Text variant="secondary" size="sm" class="leading-4 tabular-nums">
            {visibleCount} of {patches.length} patches
          </Text>
        {/if}
      </div>
      <LayerCard class="flex max-h-full min-h-0 flex-col">
        <!-- Keyboard focus lets users navigate the horizontally scrollable table. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="max-h-full min-h-0 overflow-auto" role="region" aria-label="Patches table" tabindex="0">
          <Table layout="fixed" class="min-w-[60rem] border-separate border-spacing-0 text-sm [&_th]:text-sm">
            <colgroup>
              <col />
              <col style:width="9rem" />
              <col style:width="11.25rem" />
              <col style:width="7.5rem" />
              <col style:width="11.875rem" />
            </colgroup>
            {@render tableHeader()}
            {@render tableBody()}
          </Table>
        </div>
      </LayerCard>
    </div>
  {/if}
</div>
