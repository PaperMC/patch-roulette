<script lang="ts">
  import User from "phosphor-svelte/lib/User";
  import { Button, DropdownMenu } from "kumo-svelte";
  import { getAuth } from "$lib/auth.svelte";
  import ClaimLegacyDialog from "$lib/components/ClaimLegacyDialog.svelte";
  import ChangeUsernameDialog from "$lib/components/ChangeUsernameDialog.svelte";

  const auth = getAuth();

  let changeUsernameOpen = $state(false);
  let claimLegacyOpen = $state(false);
</script>

<DropdownMenu>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" shape="square" aria-label="User menu">
        <User class="size-4" aria-hidden="true" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="min-w-44" align="end">
    <DropdownMenu.Group>
      <DropdownMenu.Label class="text-kumo-subtle text-sm font-normal"
        >{auth.username ?? "Loading user…"}</DropdownMenu.Label
      >
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      <DropdownMenu.Item onSelect={() => (changeUsernameOpen = true)}>Change username</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => (claimLegacyOpen = true)}>Claim legacy account</DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Item variant="danger" onSelect={() => auth.logout()}>Log out</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>

<ChangeUsernameDialog bind:open={changeUsernameOpen} />
<ClaimLegacyDialog bind:open={claimLegacyOpen} />
