<script lang="ts">
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { Banner, Button, Input, LayerCard, Text } from "kumo-svelte";
    import { ApiError } from "$lib/api";
    import { login } from "$lib/auth.svelte";

    let username = $state("");
    let password = $state("");
    let submitting = $state(false);
    let errorMessage = $state("");

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (submitting) return;

        errorMessage = "";
        submitting = true;
        try {
            await login(username, password);
            goto(resolve("/"));
        } catch (error) {
            errorMessage =
                error instanceof ApiError && error.status === 401
                    ? "Invalid username or password."
                    : error instanceof Error
                      ? error.message
                      : "Login failed. Please try again.";
        } finally {
            submitting = false;
        }
    }
</script>

<LayerCard class="w-full max-w-sm p-6">
    <form class="flex flex-col gap-6" onsubmit={submit}>
        <Text variant="heading2" as="h1" class="text-center">Patch Roulette</Text>

        <div class="flex flex-col gap-4">
            <Input label="Username" name="username" type="text" autocomplete="username" bind:value={username} />
            <Input label="Password" name="password" type="password" autocomplete="current-password" bind:value={password} />
        </div>

        {#if errorMessage}
            <Banner variant="error" size="sm" text={errorMessage} />
        {/if}

        <Button type="submit" variant="primary" loading={submitting} class="w-full justify-center">Login</Button>
    </form>
</LayerCard>
