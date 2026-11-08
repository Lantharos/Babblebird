<script lang="ts">
  let {
    nav,
    current = null,
  }: { nav: { name: string; pages: { slug: string; title: string }[] }[]; current?: string | null } = $props()
</script>

<nav aria-label="Docs" class="space-y-8 text-[15px]">
  {#each nav as section}
    <div>
      <p class="mb-2 font-semibold text-ink">{section.name}</p>
      <ul class="space-y-0.5">
        {#each section.pages as page}
          <li>
            <a
              href="/docs/{page.slug}"
              aria-current={page.slug === current ? "page" : undefined}
              class="-mx-3 block rounded-xl px-3 py-1.5 transition-colors {page.slug === current ? 'bg-well text-ink' : 'text-ink-soft hover:text-ink'}"
            >
              {page.title}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</nav>
