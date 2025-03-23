<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import {
        fetchCurrentGithubUser,
        fetchGithubUserToken,
        GITHUB_TOKEN_EXPIRES_KEY,
        GITHUB_TOKEN_KEY,
        GITHUB_USERNAME_KEY,
        githubUsername,
        logoutGithub,
    } from "$lib/github.svelte";

    async function leave() {
        const authReferrer = localStorage.getItem("authReferrer");
        if (authReferrer) {
            localStorage.removeItem("authReferrer");
            await goto(authReferrer);
        } else {
            await goto("/");
        }
    }

    onMount(async () => {
        const params = page.url.searchParams;

        // Login, not installation
        if (!params.has("installation_id")) {
            const code = params.get("code");
            if (!code) {
                alert("No code found in URL");
                await leave();
                return;
            }
            try {
                const token = await fetchGithubUserToken(code);
                localStorage.setItem(GITHUB_TOKEN_KEY, token.access_token);
                if (token.expires_in) {
                    localStorage.setItem(GITHUB_TOKEN_EXPIRES_KEY, "" + (Date.now() + token.expires_in * 1000));
                }

                const user = await fetchCurrentGithubUser(token.access_token);
                localStorage.setItem(GITHUB_USERNAME_KEY, user.login);
                githubUsername.value = user.login;
            } catch (e) {
                logoutGithub();
                alert(`Failed to retrieve token: ${e}`);
            }
        }

        await leave();
    });
</script>

<div class="flex h-screen w-screen items-center justify-center">
    <h1 class="text-3xl text-white">Processing GitHub login...</h1>
</div>
