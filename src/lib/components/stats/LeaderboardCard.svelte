<script lang="ts">
  import Users from "phosphor-svelte/lib/Users";
  import { createQuery } from "@tanstack/svelte-query";
  import { Banner, Button, Empty, LayerCard, SkeletonLine, Table } from "kumo-svelte";
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
  // Match the initial table shape so loading and loaded leaderboards occupy
  // the same space when there are three users.
  const SKELETON_ROWS = [0, 1, 2];
  const SKELETON_CELLS = [0, 1, 2, 3, 4];
</script>

{#if statsQuery.isError}
  <Banner class="max-w-xl" variant="error" title="Couldn't load stats" description={statsQuery.error.message}>
    {#snippet action()}
      <Button size="sm" onclick={() => statsQuery.refetch()}>Retry</Button>
    {/snippet}
  </Banner>
{:else if statsQuery.isPending || stats}
  <LayerCard class="max-w-xl">
    <LayerCard.Secondary>Leaderboard</LayerCard.Secondary>
    {#if statsQuery.isPending || (stats && stats.leaderboard.length > 0)}
      <LayerCard.Primary class="p-0">
        <Table layout="fixed" class="text-sm [&_th]:text-sm">
          <colgroup>
            <col style:width="3rem" />
            <col />
            <col style:width="3rem" />
            <col style:width="3rem" />
            <col style:width="6.5rem" />
          </colgroup>
          <Table.Header>
            <Table.Row>
              <Table.Head>Rank</Table.Head>
              <Table.Head>User</Table.Head>
              <Table.Head>Done</Table.Head>
              <Table.Head>WIP</Table.Head>
              <Table.Head>Time spent</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if statsQuery.isPending}
              {#each SKELETON_ROWS as row (row)}
                <Table.Row>
                  {#each SKELETON_CELLS as cell (cell)}
                    <Table.Cell>
                      {#if cell === 0}
                        <span class="relative inline-block text-base" aria-hidden="true">
                          <span class="invisible">🥇</span>
                          <SkeletonLine class="absolute inset-0 h-full w-full" />
                        </span>
                      {:else if cell === 1}
                        <SkeletonLine class="h-5" minWidth={35} maxWidth={65} aria-hidden="true" />
                      {:else if cell === 4}
                        <SkeletonLine class="h-5" minWidth={65} maxWidth={85} aria-hidden="true" />
                      {:else}
                        <SkeletonLine class="h-5 w-full" aria-hidden="true" />
                      {/if}
                    </Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            {:else if stats}
              {#each stats.leaderboard as entry (entry.userId)}
                <Table.Row>
                  <Table.Cell>
                    {#if entry.rank === 1}
                      <span aria-label="1st place" class="text-base">🥇</span>
                    {:else if entry.rank === 2}
                      <span aria-label="2nd place" class="text-base">🥈</span>
                    {:else if entry.rank === 3}
                      <span aria-label="3rd place" class="text-base">🥉</span>
                    {:else}
                      <span class="text-kumo-subtle w-6 text-center">#{entry.rank}</span>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="max-w-0 font-medium">
                    <span class="block max-w-full truncate" title={entry.username}>{entry.username}</span>
                  </Table.Cell>
                  <Table.Cell class="tabular-nums">{entry.done}</Table.Cell>
                  <Table.Cell class="tabular-nums">{entry.wip}</Table.Cell>
                  <Table.Cell class="tabular-nums">{formatDuration(entry.timeSpent)}</Table.Cell>
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table>
      </LayerCard.Primary>
    {:else}
      <LayerCard.Primary class="p-0">
        <Empty
          size="sm"
          class="border-0 bg-transparent"
          title="No activity yet"
          description="User progress will show here once patches are picked up."
        >
          {#snippet icon()}
            <Users class="text-kumo-inactive size-8" aria-hidden="true" />
          {/snippet}
        </Empty>
      </LayerCard.Primary>
    {/if}
  </LayerCard>
{/if}
