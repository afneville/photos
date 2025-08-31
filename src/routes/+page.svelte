<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<h1>Photo IDs</h1>

{#if data.photoArrays.length}
  {#each data.photoArrays as photo}
    <p>{photo.photoArrayId}</p>
  {/each}
{:else}
  <p>No photos found.</p>
{/if}