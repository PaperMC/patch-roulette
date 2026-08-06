<script lang="ts">
    import User from "phosphor-svelte/lib/User";
    import { Button, DropdownMenu, useKumoToastManager } from "kumo-svelte";
    import { auth, logout } from "$lib/auth.svelte";

    const toastManager = useKumoToastManager();

    async function copyToken(): Promise<void> {
        if (!auth.token) return;

        try {
            await navigator.clipboard.writeText(auth.token);
            toastManager.add({
                title: "Token copied",
                description: "Ready to use with paperweight.",
                variant: "success",
            });
        } catch {
            toastManager.add({
                title: "Couldn't copy token",
                description: "Clipboard access was blocked.",
                variant: "error",
            });
        }
    }
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
        <!-- kumo's Label maps to bits-ui GroupHeading, which throws without a Menu.Group ancestor -->
        <DropdownMenu.Group>
            <DropdownMenu.Label class="text-kumo-subtle text-sm font-normal">{auth.username ?? ""}</DropdownMenu.Label>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={copyToken}>Copy token</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item variant="danger" onSelect={logout}>Log out</DropdownMenu.Item>
    </DropdownMenu.Content>
</DropdownMenu>
