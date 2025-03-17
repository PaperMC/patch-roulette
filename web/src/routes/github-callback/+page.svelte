<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchCurrentGithubUser, fetchGithubUserToken, githubUsername } from "$lib/github.svelte";

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
        const params = new URLSearchParams(window.location.search);

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
                localStorage.setItem("github_token", token.access_token);
                localStorage.setItem("github_token_expires", "" + (Date.now() + token.expires_in * 1000));
                fetchCurrentGithubUser(token.access_token).then((user) => {
                    localStorage.setItem("github_username", user.login);
                    githubUsername.value = user.login;
                    console.log(user);
                });
            } catch (e) {
                localStorage.removeItem("github_token");
                localStorage.removeItem("github_token_expires");
                localStorage.removeItem("github_username");
                alert(`Failed to retrieve token: ${e}`);
            }
        }

        await leave();
    });
</script>

<div class="flex h-screen w-screen items-center justify-center">
    <h1 class="text-3xl text-white">Processing GitHub login...</h1>
</div>
