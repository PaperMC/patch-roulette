<script lang="ts">
    import Login from "./Login.svelte";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    onMount(() => {
        const token = localStorage.getItem("token");
        if (token) {
            onLogin();
        }
    });

    function onLogin() {
        goto("/");
    }
</script>

<div class="flex flex-col" id="login">
    <div id="login-container" class="relative flex h-screen flex-col items-center justify-center p-4">
        <Login {onLogin}></Login>

        <a href="https://diffs.dev" class="absolute bottom-4 flex items-center rounded-md btn-primary px-4 py-2 text-center">
            <span class="me-2 iconify octicon--file-diff-16"></span>Looking for the diff viewer?
        </a>
    </div>
</div>
