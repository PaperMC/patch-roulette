<script lang="ts">
    import GitDiff from "phosphor-svelte/lib/GitDiff";
    import { Link } from "kumo-svelte";
    import Login from "./Login.svelte";
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
    <Login />

    <Link href="https://diffs.dev" variant="plain" class="flex items-center gap-1.5 text-center text-sm">
        <GitDiff size={16} aria-hidden="true" />
        Looking for the diff viewer?
    </Link>
</div>
