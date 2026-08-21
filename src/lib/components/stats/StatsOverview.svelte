<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import { Banner, Button, LayerCard, SkeletonLine, Text } from "kumo-svelte";
  import { fetchApi } from "$lib/api";
  import { formatDuration } from "$lib/format";
  import { baseQueryOptions, queryKeys, refreshInterval } from "$lib/queries";
  import { type Stats } from "$lib/domain";

  let { version }: { version: string } = $props();

  // Colocated query: TanStack dedupes by query key, so the sibling stats
  // components' identical queries share this single network request.
  const statsQuery = createQuery(() => ({
    ...baseQueryOptions,
    queryKey: queryKeys.stats(version),
    enabled: version !== "",
    queryFn: () => fetchApi<Stats>("/stats", { params: { minecraftVersion: version } }),
    refetchInterval: refreshInterval(),
  }));

  const stats = $derived(statsQuery.data);
  function percent(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  function formatPercent(value: number): string {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }

  const progressStatuses = [
    {
      label: "Done",
      barClass: "bg-kumo-success",
      valueClass: "text-kumo-success",
      getCount: (value: Stats) => value.done,
    },
    {
      label: "WIP",
      barClass: "bg-kumo-warning",
      valueClass: "text-kumo-warning",
      getCount: (value: Stats) => value.wip,
    },
    {
      label: "Available",
      barClass: "bg-kumo-info",
      valueClass: "text-kumo-info",
      getCount: (value: Stats) => value.available,
    },
  ];

  const barSegments = $derived.by(() => {
    if (!stats) return [];
    return progressStatuses.map(({ getCount, ...status }) => {
      const count = getCount(stats);
      return { ...status, count, percent: percent(count, stats.total) };
    });
  });

  const barAriaLabel = $derived.by(() => {
    if (!stats || stats.total === 0) return "No patches yet";
    const parts = barSegments
      .filter((segment) => segment.count > 0)
      .map((segment) => `${segment.label}: ${segment.count} (${formatPercent(segment.percent)}%)`);
    return `Patch progress — ${parts.join(", ")}`;
  });
</script>

{#if statsQuery.isError}
  <Banner class="max-w-xl" variant="error" title="Couldn't load stats" description={statsQuery.error.message}>
    {#snippet action()}
      <Button size="sm" onclick={() => statsQuery.refetch()}>Retry</Button>
    {/snippet}
  </Banner>
{:else}
  <LayerCard class="min-h-48 max-w-xl">
    <LayerCard.Secondary>Progress</LayerCard.Secondary>
    <LayerCard.Primary>
      {#if statsQuery.isPending}
        <div class="flex items-center justify-between gap-4">
          <SkeletonLine class="h-4 w-28" />
          <SkeletonLine class="h-4 w-36" />
        </div>
      {:else if stats && stats.total > 0}
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Text size="sm" class="min-w-0 leading-4 font-medium tabular-nums">{stats.total} patches total</Text>
          <Text variant="secondary" size="sm" class="min-w-0 text-right leading-4 tabular-nums"
            >{formatDuration(stats.timeSpent)} total time spent</Text
          >
        </div>
      {/if}

      {#if statsQuery.isPending}
        <SkeletonLine class="mt-4 h-2 w-full shrink-0" aria-label="Loading progress" role="img" />
      {:else if stats && stats.total > 0}
        <div
          class="bg-kumo-fill mt-4 flex h-2 shrink-0 overflow-hidden rounded-full"
          role="img"
          aria-label={barAriaLabel}
        >
          {#each barSegments as segment (segment.label)}
            {#if segment.count > 0}
              <div
                class={`h-full ${segment.barClass}`}
                style:flex-grow={segment.count}
                style:flex-basis="0"
                title={`${segment.label}: ${segment.count} (${formatPercent(segment.percent)}%)`}
              ></div>
            {/if}
          {/each}
        </div>
      {/if}

      {#if statsQuery.isPending || (stats && stats.total > 0)}
        <!-- Give every stat the same content width, then add the separators and
                     their spacing independently. This keeps the visible stat blocks equal
                     instead of making the separator padding part of some blocks' widths. -->
        <div class="mt-4 flex w-fit items-stretch gap-4" aria-label="Patch progress breakdown" role="list">
          {#each progressStatuses as status, index (status.label)}
            {#if index > 0}
              <div class="bg-kumo-line w-px shrink-0" aria-hidden="true"></div>
            {/if}
            <div class="flex w-[4.5rem] shrink-0 flex-col gap-1" role="listitem">
              <div class="flex items-center gap-2">
                <span class={`size-2 shrink-0 rounded-full ${status.barClass}`} aria-hidden="true"></span>
                <Text variant="secondary" size="sm" class="leading-4 whitespace-nowrap">{status.label}</Text>
              </div>
              {#if statsQuery.isPending}
                <SkeletonLine class="h-6 w-7" aria-hidden="true" />
                <SkeletonLine class="h-4 w-10" aria-hidden="true" />
              {:else if stats}
                <Text variant="heading2" as="span" class={`leading-none tabular-nums ${status.valueClass}`}
                  >{status.getCount(stats)}</Text
                >
                <Text variant="secondary" size="sm" class="leading-4 tabular-nums"
                  >{formatPercent(percent(status.getCount(stats), stats.total))}%</Text
                >
              {/if}
            </div>
          {/each}
        </div>
      {:else if stats}
        <Text variant="secondary" size="sm">No patches yet</Text>
      {/if}
    </LayerCard.Primary>
  </LayerCard>
{/if}
