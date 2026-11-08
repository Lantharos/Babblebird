<script lang="ts">
  import AreaIcon from "#lib/projects/AreaIcon.svelte"

  const areas = [
    { name: "Heft", path: "apps/store/heft/Sabine.toml" },
    { name: "Seasons", path: "extensions/seasons/extension.toml" },
    { name: "Desktop", path: "kestrel/ui/locales/*/desktop.ftl" },
    { name: "Settings", path: "apps/system/settings/Sabine.toml" },
  ]
</script>

<ul class="space-y-5" aria-hidden="true">
  {#each areas as area}
    <li class="flex items-center gap-4">
      <AreaIcon name={area.name} icon={null} class="size-11" />
      <div class="min-w-0">
        <p class="text-[17px] font-medium">{area.name}</p>
        <p class="truncate font-mono text-[13px] text-ink-muted">{area.path}</p>
      </div>
    </li>
  {/each}
</ul>
