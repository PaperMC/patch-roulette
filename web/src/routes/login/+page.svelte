<script lang="ts">
    import Login from "$lib/components/Login.svelte";
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

<div id="login">
    <Login {onLogin}></Login>
</div>
