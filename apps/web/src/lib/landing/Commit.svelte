<script lang="ts">
  import Check from "@lucide/svelte/icons/check"
  import GitMerge from "@lucide/svelte/icons/git-merge"
</script>

<div class="font-mono text-[14px] leading-relaxed" aria-hidden="true">
  <p class="text-ink">Update German and French translations</p>
  <p class="mt-4 text-ink-muted">Co-authored-by: Lena Vogt</p>
  <p class="text-ink-muted">Co-authored-by: Camille Roux</p>
  <div class="mt-8 space-y-2.5 font-sans text-[15px]">
    <p class="flex items-center gap-2.5 text-ink-soft"><Check class="size-4 text-done" />Checks passed</p>
    <p class="flex items-center gap-2.5 text-ink-soft"><GitMerge class="size-4 text-accent" />Merged into main by babblebird</p>
  </div>
</div>
