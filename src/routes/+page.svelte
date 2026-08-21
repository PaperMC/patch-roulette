<script lang="ts">
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";
  import { Banner, Button, Empty, Tabs } from "kumo-svelte";
  import { fetchApi } from "$lib/api";
  import AppBar from "$lib/components/header/AppBar.svelte";
  import RefreshButton from "$lib/components/header/RefreshButton.svelte";
  import VersionSelect from "$lib/components/header/VersionSelect.svelte";
  import PatchesTable from "$lib/components/patches/PatchesTable.svelte";
  import LeaderboardCard from "$lib/components/stats/LeaderboardCard.svelte";
  import StatsOverview from "$lib/components/stats/StatsOverview.svelte";
  import { baseQueryOptions, queryKeys } from "$lib/queries";

  const queryClient = useQueryClient();

  let pickedVersion = $state("");
  let activeView = $state("stats");
  const views = [
    { value: "stats", label: "Stats" },
    { value: "patches", label: "Patches" },
  ];

  // Single source of refresh state: set by the manual refresh handler,
  // cleared when the invalidation settles. Not derived from useIsFetching —
  // that also fires on initial load and auto-refresh.
  let manualRefresh = $state(false);

  const versionsQuery = createQuery(() => ({
    ...baseQueryOptions,
    queryKey: queryKeys.versions,
    queryFn: () => fetchApi<string[]>("/versions"),
  }));

  // The backend returns versions newest-last (ORDER BY MAX(updatedAt)),
  // so no client-side sorting is needed, mirroring master.
  const versions = $derived(versionsQuery.data ?? []);

  // The version actually in use: the user's pick while it is still in the
  // list, otherwise (versions not loaded yet, or the pick vanished from the
  // backend) the newest one, which the backend returns last. A refetch never
  // overrides a valid pick.
  const selectedVersion = $derived(
    versions.includes(pickedVersion) ? pickedVersion : (versions[versions.length - 1] ?? ""),
  );

  function handleRefresh(): void {
    if (!selectedVersion) return;
    manualRefresh = true;
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.patches.forVersion(selectedVersion),
        refetchType: "active",
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.forVersion(selectedVersion),
        refetchType: "active",
      }),
    ]).finally(() => {
      manualRefresh = false;
    });
  }
</script>

<svelte:head>
  <meta name="description" content="Management frontend for the Paper update process" />
</svelte:head>

{#snippet dashboard()}
  <div class="flex flex-wrap items-center gap-3">
    <!-- Keep the local wrapper: the upstream RefreshButton's animation class is missing from its shipped CSS. -->
    <RefreshButton refreshing={manualRefresh} disabled={!selectedVersion} onclick={handleRefresh} class="shrink-0" />
    <VersionSelect
      {versions}
      loading={versionsQuery.isPending}
      value={selectedVersion}
      onValueChange={(version) => (pickedVersion = version)}
    />
    <Tabs
      class="max-w-full min-w-max shrink-0"
      tabs={views}
      value={activeView}
      onValueChange={(view) => (activeView = view)}
    />
  </div>
  {#if activeView === "stats"}
    <div class="flex flex-col gap-3">
      <StatsOverview version={selectedVersion} />
      <LeaderboardCard version={selectedVersion} />
    </div>
  {:else}
    <PatchesTable version={selectedVersion} />
  {/if}
{/snippet}

<div class={["flex flex-col", activeView === "patches" ? "h-dvh" : "min-h-dvh"]}>
  <AppBar />

  <main class="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4">
    {#if versionsQuery.isPending}
      <!-- Skeleton pass: with version === "" the leaf queries are
                 disabled (pending), so each leaf renders its own skeleton —
                 progress card, leaderboard, and table rows. -->
      {@render dashboard()}
    {:else if versionsQuery.isError}
      <Banner variant="error" title="Couldn't load Minecraft versions" description={versionsQuery.error.message}>
        {#snippet action()}
          <Button size="sm" onclick={() => versionsQuery.refetch()}>Retry</Button>
        {/snippet}
      </Banner>
    {:else if (versionsQuery.data?.length ?? 0) === 0}
      <Empty title="No Minecraft versions" description="The backend didn't return any versions." />
    {:else}
      {@render dashboard()}
    {/if}
  </main>
</div>
