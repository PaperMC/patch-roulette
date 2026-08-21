<script lang="ts">
  import { Select } from "kumo-svelte";

  interface Props {
    versions: string[];
    loading: boolean;
    value: string;
    onValueChange: (version: string) => void;
  }

  let { versions, loading, value, onValueChange }: Props = $props();

  const items = $derived(Object.fromEntries([...versions].reverse().map((version) => [version, version])));
</script>

<Select
  class="w-40 max-w-full"
  aria-label="Minecraft version"
  placeholder="Select a version…"
  {items}
  {value}
  {loading}
  onValueChange={(next) => onValueChange(String(next))}
/>
