<script lang="ts">
    import { fetchApi } from "$lib/api";
    import Spinner from "$lib/components/Spinner.svelte";

    interface Props {
        onLogin: () => void;
    }

    let { onLogin }: Props = $props();

    let username = $state("");
    let password = $state("");
    let submitting = $state(false);

    async function submit(event: SubmitEvent) {
        event.preventDefault();

        const encoded = btoa(username + ":" + password);

        let response: Response;
        submitting = true;
        try {
            response = await fetchApi("/test-login", {
                method: "POST",
                token: encoded,
            });
        } finally {
            submitting = false;
        }

        if (response.ok) {
            localStorage.setItem("token", encoded);
            onLogin();
        } else {
            alert("Invalid login.");
        }
    }
</script>

<form id="login-form" class="w-full max-w-md p-6" onsubmit={submit}>
    <h1 class="mb-6 w-full text-center text-2xl font-bold">Patch Roulette</h1>
    <div class="mb-4">
        <label for="username" class="mb-2 block text-sm font-bold">Username</label>
        <input
            type="text"
            id="username"
            name="username"
            class="w-full rounded border px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            bind:value={username}
        />
    </div>
    <div class="mb-6">
        <label for="password" class="mb-2 block text-sm font-bold">Password</label>
        <input
            type="password"
            id="password"
            name="password"
            class="w-full rounded border px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            bind:value={password}
        />
    </div>
    <button type="submit" class="focus:shadow-outline flex w-full items-center justify-center gap-2 rounded btn-primary px-4 py-2 font-bold focus:outline-none">
        {#if submitting}Logging in... <Spinner size={4} class="border-white" />{:else}Login{/if}
    </button>
</form>
