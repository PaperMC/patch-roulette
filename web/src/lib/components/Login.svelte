<script lang="ts">
    import { fetchApi } from "$lib/api";

    let { onLogin = () => {} } = $props<{
        onLogin?: () => void;
    }>();

    async function submit(event: SubmitEvent) {
        event.preventDefault();

        const username = (document.getElementById("username") as HTMLInputElement).value;
        const password = (document.getElementById("password") as HTMLInputElement).value;
        const encoded = btoa(username + ":" + password);

        const response = await fetchApi("/test-login", {
            method: "POST",
            token: encoded,
        });

        if (response.ok) {
            localStorage.setItem("token", encoded);
            onLogin();
        } else {
            alert("Invalid login.");
        }
    }
</script>

<div id="login-container" class="flex h-screen items-center justify-center p-4">
    <form id="login-form" class="w-full max-w-md p-6" onsubmit={submit}>
        <h1 class="mb-6 w-full text-center text-2xl font-bold">Patch Roulette</h1>
        <div class="mb-4">
            <label for="username" class="mb-2 block text-sm font-bold">Username</label>
            <input
                type="text"
                id="username"
                name="username"
                class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
        <div class="mb-6">
            <label for="password" class="mb-2 block text-sm font-bold">Password</label>
            <input
                type="password"
                id="password"
                name="password"
                class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
        <button type="submit" class="focus:shadow-outline w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none">
            Login
        </button>
    </form>
</div>
