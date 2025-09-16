<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';

	export let data: PageData;

	function getThumbnailUrl(photoArray: PhotoArray) {
		if (photoArray.photoUris && photoArray.photoUris.length > 0) {
			return `${data.imageDomain}/${data.galleryId}/${photoArray.photoArrayId}/${photoArray.photoUris[0]}/thumbnail`;
		}
		return '';
	}
</script>

<h1>Photo IDs</h1>

{#if data.photoArrays.length}
	{#each data.photoArrays as photo}
		<div>
			<p>Photo Array ID: {photo.photoArrayId}</p>
			{#if getThumbnailUrl(photo)}
				<img src={getThumbnailUrl(photo)} alt="Thumbnail for {photo.photoArrayId}" />
			{/if}
		</div>
	{/each}
{:else}
	<p>No photos found.</p>
{/if}
