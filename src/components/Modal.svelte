<script lang="ts">
  export let id: string;
  export let close = () => {};
  export let isOpen: boolean = false;
</script>

{#if isOpen}
  <div
    {id}
    on:click={close}
    on:keyup={close}
    role="button"
    tabindex="0"
    class="fixed right-0 top-0 z-[100] flex h-[100vh] w-[calc(100vw-126px)] cursor-default items-center justify-center overflow-y-auto bg-overlay"
  >
    <div
      class="content-block flex w-modal cursor-default flex-col gap-7"
      on:click|stopPropagation={() => {}}
      on:keyup|stopPropagation={() => {}}
      tabindex="0"
      role="button"
    >
      <h2 class="section-title-underlined"><slot name="title" /></h2>
      <slot name="body" />
    </div>
  </div>
{/if}
