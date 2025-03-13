<script lang="ts">
    let { children } = $props();
    import "../app.css";
</script>

<div class="min-h-screen bg-blue-500">
    {@render children()}
</div>
