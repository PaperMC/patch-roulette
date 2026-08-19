<script lang="ts">
    import Gear from "phosphor-svelte/lib/Gear";
    import { Button, Label, Popover, Radio, Switch, Text } from "kumo-svelte";
    import { autoRefresh, brainrotLevel, setAutoRefresh, setBrainrotLevel, type BrainrotLevel } from "$lib/settings.svelte";
    import { setTheme, theme, type Theme } from "$lib/theme.svelte";
</script>

<Popover.Root>
    <Popover.Trigger>
        {#snippet child({ props })}
            <Button {...props} variant="ghost" shape="square" aria-label="Settings">
                <Gear class="size-4" aria-hidden="true" />
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-64" align="end">
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
                    <Switch id="auto-refresh" size="sm" checked={autoRefresh.current} onCheckedChange={setAutoRefresh} aria-label="Auto refresh" />
                </div>
                <Radio.Group orientation="horizontal" value={brainrotLevel.current} onValueChange={(next) => setBrainrotLevel(next as BrainrotLevel)}>
                    <Radio.Item label="Off" value="off" />
                    <Radio.Item label="On" value="on" />
                    <Radio.Item label="Weeb" value="weeb" />
                </Radio.Group>
            </div>
        </div>
    </Popover.Content>
</Popover.Root>
