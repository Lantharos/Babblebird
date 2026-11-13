<script lang="ts">
  const THANKS = [
    { lang: "sq", text: "Faleminderit" },
    { lang: "de", text: "Danke" },
    { lang: "hr", text: "Hvala" },
    { lang: "fr", text: "Merci" },
    { lang: "it", text: "Grazie" },
    { lang: "pl", text: "Dziękuję" },
    { lang: "el", text: "Ευχαριστώ" },
    { lang: "tr", text: "Teşekkürler" },
    { lang: "uk", text: "Дякую" },
  ]
</script>

<ul class="flex max-w-md flex-wrap justify-end gap-2.5" aria-hidden="true">
  {#each THANKS as thanks, index}
    <li
      class="thanks rounded-[20px] px-4 py-2.5 text-[18px] font-medium {index % 4 === 1 ? 'rounded-bl-[6px] bg-ink text-canvas' : 'rounded-br-[6px] bg-raised ring-1 ring-hairline'}"
      style:--order={index}
      lang={thanks.lang}
    >
      {thanks.text}
    </li>
  {/each}
</ul>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .thanks {
      animation: float 5s ease-in-out infinite;
      animation-delay: calc(var(--order) * -0.7s);
    }
  }

  @keyframes float {
    50% {
      translate: 0 -4px;
    }
  }
</style>
