<script lang="ts">
  import { useQueryClient } from "@tanstack/svelte-query";
  import { ApiError, fetchApi } from "$lib/api";
  import { Banner, Button, Dialog, Input, Tabs, type TabsItem } from "kumo-svelte";

  type ClaimMethod = "encoded" | "credentials";

  const claimMethods: TabsItem[] = [
    { value: "credentials", label: "Username/password" },
    { value: "encoded", label: "Basic auth" },
  ];

  const queryClient = useQueryClient();

  let { open = $bindable(false) } = $props();

  let claimMethod = $state<ClaimMethod>("credentials");
  let encodedCredentials = $state("");
  let legacyUsername = $state("");
  let legacyPassword = $state("");
  let claimSubmitted = $state(false);
  let claimError = $state<string | null>(null);
  let claiming = $state(false);
  let wasOpen = false;

  $effect(() => {
    if (open && !wasOpen) {
      claimMethod = "credentials";
      encodedCredentials = "";
      legacyUsername = "";
      legacyPassword = "";
      claimSubmitted = false;
      claimError = null;
    }
    wasOpen = open;
  });

  function close(): void {
    if (!claiming) open = false;
  }

  function decodeCredentials(value: string): { username: string; password: string } | null {
    let token = value.trim();
    if (token.toLowerCase().startsWith("basic ")) token = token.slice(6).trim();

    try {
      const base64 = token
        .replaceAll("-", "+")
        .replaceAll("_", "/")
        .padEnd(Math.ceil(token.length / 4) * 4, "=");
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const separator = decoded.indexOf(":");
      if (separator <= 0 || separator === decoded.length - 1) return null;
      return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
    } catch {
      return null;
    }
  }

  let claimEncodedError = $derived.by(() => {
    if (!claimSubmitted || claimMethod !== "encoded") return undefined;
    return decodeCredentials(encodedCredentials) ? undefined : "Enter valid encoded Basic auth credentials.";
  });
  let claimUsernameError = $derived.by(() => {
    if (!claimSubmitted || claimMethod !== "credentials" || legacyUsername.trim()) return undefined;
    return "Enter your legacy username.";
  });
  let claimPasswordError = $derived.by(() => {
    if (!claimSubmitted || claimMethod !== "credentials" || legacyPassword) return undefined;
    return "Enter your legacy password.";
  });

  function claimInput(): { username: string; password: string } | null {
    claimSubmitted = true;
    if (claimMethod === "encoded") return decodeCredentials(encodedCredentials);

    const username = legacyUsername.trim();
    if (!username || !legacyPassword) return null;
    return { username, password: legacyPassword };
  }

  async function claim(): Promise<void> {
    if (claiming) return;
    claimError = null;
    const credentials = claimInput();
    if (!credentials) return;

    claiming = true;
    try {
      await fetchApi("/me/claim-legacy", { method: "POST", body: credentials });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patches"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
      open = false;
    } catch (error) {
      claimError = error instanceof ApiError ? error.message : "Could not claim the legacy account.";
    } finally {
      claiming = false;
    }
  }
</script>

<Dialog
  bind:open
  title="Claim legacy account"
  description="Link patch history from your old Patch Roulette account."
  class="p-6"
>
  <form
    novalidate
    class="grid gap-4"
    onsubmit={(event) => {
      event.preventDefault();
      void claim();
    }}
  >
    <Tabs
      tabs={claimMethods}
      value={claimMethod}
      variant="segmented"
      class="w-full"
      aria-label="Legacy credential format"
      onValueChange={(value) => {
        if (!claiming) {
          claimMethod = value as ClaimMethod;
          claimSubmitted = false;
          claimError = null;
        }
      }}
    />
    {#if claimMethod === "encoded"}
      <Input
        bind:value={encodedCredentials}
        id="encoded-credentials"
        label="Encoded Basic auth"
        error={claimEncodedError}
        type="text"
        autocomplete="off"
        disabled={claiming}
        oninput={() => (claimError = null)}
      />
    {:else}
      <Input
        bind:value={legacyUsername}
        id="legacy-username"
        label="Legacy username"
        error={claimUsernameError}
        autocomplete="username"
        disabled={claiming}
        oninput={() => (claimError = null)}
      />
      <Input
        bind:value={legacyPassword}
        id="legacy-password"
        label="Legacy password"
        error={claimPasswordError}
        type="password"
        autocomplete="current-password"
        disabled={claiming}
        oninput={() => (claimError = null)}
      />
    {/if}
    {#if claimError}
      <Banner variant="error" size="sm" text={claimError} role="alert" />
    {/if}
    <div class="flex justify-end gap-2">
      <Button type="button" variant="secondary" onclick={close} disabled={claiming}>Cancel</Button>
      <Button type="submit" variant="primary" loading={claiming}>Claim account</Button>
    </div>
  </form>
</Dialog>
