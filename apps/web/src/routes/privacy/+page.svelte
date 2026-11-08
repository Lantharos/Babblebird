<script lang="ts">
  import Footer from "#lib/layout/Footer.svelte"
  import Header from "#lib/layout/Header.svelte"
</script>

<svelte:head><title>Privacy · Babblebird</title></svelte:head>

<Header />

<main class="page max-w-3xl space-y-5 pt-16 text-[17px] leading-relaxed text-ink-soft">
  <h1 class="text-[44px] font-semibold tracking-[-0.03em] text-ink">Privacy</h1>
  <p>Babblebird keeps what it needs to let you translate and to credit you for it, and nothing for advertising.</p>
  <p>
    When you sign in we keep your name, email address and, if you sign in with GitHub, your GitHub name and picture. Your email address is used to send
    sign-in codes and isn’t shown to anyone.
  </p>
  <p>
    Translations you make or suggest are kept with your name and shown to the project’s translators. When they’re sent to the project’s repository, your
    name and GitHub’s private address for your account are added to the commit, so the project credits you. Translations in a repository are public if the
    repository is.
  </p>
  <p>For repositories where the app is installed, Babblebird reads the translation files, the files that name apps and their icons, and screenshots sent by the project’s CI.</p>
  <p>Everything runs on Cloudflare. You can delete your account from your settings at any time. Questions go to kristof@lanth.me.</p>
</main>

<Footer />
