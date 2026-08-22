<script lang="ts">
  import { useQueryClient } from "@tanstack/svelte-query";
  import { ApiError, fetchApi } from "$lib/api";
  import { getAuth } from "$lib/auth.svelte";
  import { type UserProfile } from "$lib/domain";
  import { queryKeys } from "$lib/queries";
  import { WarningCircleIcon } from "phosphor-svelte";
  import { Banner, Button, Dialog, Input } from "kumo-svelte";

  const auth = getAuth();
  const queryClient = useQueryClient();

  let { open = $bindable(false) } = $props();

  let draftUsername = $state("");
  let saveError = $state<string | null>(null);
  let saving = $state(false);
  let trimmedDraftUsername = $derived(draftUsername.trim());
  let usernameError = $derived.by(() => {
    if (trimmedDraftUsername.length > 64) return "Username must be 64 characters or fewer.";
    if (!trimmedDraftUsername) return "Enter a username.";
    return undefined;
  });
  let wasOpen = false;

  $effect(() => {
    if (open && !wasOpen) {
      draftUsername = auth.username ?? "";
      saveError = null;
    }
    wasOpen = open;
  });

  let unchanged = $derived(trimmedDraftUsername === (auth.username ?? ""));

  function close(): void {
    if (!saving) open = false;
  }

  async function save(): Promise<void> {
    saveError = null;
    if (unchanged) {
      open = false;
      return;
    }
    if (usernameError) return;

    saving = true;
    try {
      const user = await fetchApi<UserProfile>("/me", {
        method: "PATCH",
        body: { username: trimmedDraftUsername },
      });
      auth.setUser(user);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patches.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
      ]);
      open = false;
    } catch (error) {
      saveError = error instanceof ApiError ? error.message : "Could not update your username.";
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:open title="Change username" description="Choose the name shown for your patch activity." class="p-6">
  <form
    novalidate
    class="grid gap-6"
    onsubmit={(event) => {
      event.preventDefault();
      void save();
    }}
  >
    <Input
      bind:value={draftUsername}
      id="username"
      label="Username"
      description="Names can be up to 64 characters."
      error={usernameError}
      autocomplete="nickname"
      disabled={saving}
      oninput={() => (saveError = null)}
    />
    {#if saveError}
      <Banner
        variant="error"
        icon={WarningCircleIcon}
        title="Couldn't update username"
        description={saveError}
        role="alert"
      />
    {/if}
    <div class="flex justify-end gap-2">
      <Button type="button" variant="secondary" onclick={close} disabled={saving}>Cancel</Button>
      <Button type="submit" variant="primary" loading={saving}>Save</Button>
    </div>
  </form>
</Dialog>
