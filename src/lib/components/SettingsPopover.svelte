<script lang="ts">
  import { GearIcon } from "phosphor-svelte";
  import { Button, Label, Popover, Radio, Switch, Text } from "kumo-svelte";
  import { autoRefresh, setAutoRefresh } from "$lib/settings.svelte";
  import { setTheme, theme, type Theme } from "$lib/theme.svelte";
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" shape="square" aria-label="Settings">
        <GearIcon class="size-4" aria-hidden="true" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-56" align="end">
    <div class="grid gap-4">
      <div class="grid gap-1.5">
        <Text variant="secondary" size="sm">Theme</Text>
        <Radio.Group orientation="horizontal" value={theme.current} onValueChange={(next) => setTheme(next as Theme)}>
          <Radio.Item label="Light" value="light" />
          <Radio.Item label="Dark" value="dark" />
          <Radio.Item label="Auto" value="auto" />
        </Radio.Group>
      </div>
      <div class="grid gap-1.5">
        <Text variant="secondary" size="sm">Misc</Text>
        <div class="flex items-center justify-between gap-4">
          <Label for="auto-refresh" class="font-normal">Auto refresh</Label>
          <Switch
            id="auto-refresh"
            size="sm"
            checked={autoRefresh.current}
            onCheckedChange={setAutoRefresh}
            aria-label="Auto refresh"
          />
        </div>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>
