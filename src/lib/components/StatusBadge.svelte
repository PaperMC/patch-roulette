<script lang="ts">
  import { Badge } from "kumo-svelte";
  import { type PatchStatus } from "$lib/domain";

  let { status }: { status: PatchStatus } = $props();

  // Semantic kumo badge variants per patch status:
  // DONE = success (green), WIP = warning (orange), AVAILABLE = info (blue).
  const variant = $derived<"success" | "warning" | "info">(
    status === "DONE" ? "success" : status === "WIP" ? "warning" : "info",
  );
</script>

<Badge {variant}>{status}</Badge>
