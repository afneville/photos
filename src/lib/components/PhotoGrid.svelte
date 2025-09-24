<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import { getPhotoContext } from '$lib/contexts/photo-context';
	import { getImageUrl, ImageQuality } from '$lib/utils/image-utils';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		openModal: { photoArray: PhotoArray };
	}>();

	const photoContext = getPhotoContext();
	const { photoArrays, galleryId, imageDomain } = photoContext;

	function getThumbnailUrl(photoArray: PhotoArray) {
		if (photoArray.photoUris && photoArray.photoUris.length > 0) {
			return getImageUrl(
				imageDomain,
				galleryId,
				photoArray.photoArrayId,
				photoArray.photoUris[0],
				ImageQuality.THUMBNAIL
			);
		}
		return '';
	}

	function openModal(photoArray: PhotoArray) {
		dispatch('openModal', { photoArray });
	}
</script>

{#if photoArrays.length}
	<div id="photo-grid" class="mx-auto grid grid-cols-3 justify-center">
		{#each photoArrays as photo (photo.photoArrayId)}
			<div
				class="aspect-square cursor-pointer overflow-hidden border border-[var(--border-normal)] bg-[var(--bg-image)] transition-colors hover:border-[var(--border-strong)]"
				onclick={() => openModal(photo)}
				onkeydown={(e) => e.key === 'Enter' && openModal(photo)}
				role="button"
				tabindex="0"
			>
				{#if getThumbnailUrl(photo)}
					<img
						src={getThumbnailUrl(photo)}
						alt="Thumbnail for {photo.photoArrayId}"
						class="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
					/>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	#photo-grid {
		gap: 1vw;
		grid-template-columns: repeat(3, 1fr);
		max-width: 1600px;
	}

	@media (min-width: calc(3 * 300px + 2vw + 2rem)) {
		#photo-grid {
			grid-template-columns: repeat(auto-fit, 300px);
			gap: 1rem;
		}
	}
</style>
