<script lang="ts">
  import { ArrowClockwiseIcon } from "phosphor-svelte";
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
  <ArrowClockwiseIcon size={18} class={refreshing ? "animate-spin" : undefined} aria-hidden="true" />
</Button>
