<script lang="ts">
  import ArrowClockwise from "phosphor-svelte/lib/ArrowClockwise";
  import { Button } from "kumo-svelte";

  interface Props {
    refreshing: boolean;
    disabled?: boolean;
    onclick: () => void;
    class?: string;
  }

  let { refreshing, disabled = false, onclick, class: className }: Props = $props();
</script>

<Button shape="square" disabled={disabled || refreshing} aria-label="Refresh patches" {onclick} class={className}>
  <ArrowClockwise size={18} class={refreshing ? "animate-spin" : undefined} aria-hidden="true" />
</Button>
