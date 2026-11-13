<script lang="ts">
  import Header from "#lib/layout/Header.svelte"
  import ProjectHeader from "#lib/projects/ProjectHeader.svelte"
  import Badge from "#lib/status/Badge.svelte"
  import Missing from "#lib/status/Missing.svelte"

  let { data } = $props()
</script>

<svelte:head>
  <title>What’s missing · {data.project.name} · Babblebird</title>
  <meta name="description" content="What’s left to translate in {data.project.name}, language by language." />
</svelte:head>

<Header />

<main id="main" class="page pt-10 pb-24">
  <ProjectHeader project={data.project} />
  <div class="mt-10 grid grid-cols-[minmax(0,1fr)] gap-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <Missing project={data.project} rows={data.missing} />
    <Badge project={data.project} />
  </div>
</main>
