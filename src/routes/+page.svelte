<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import FullScreenView from '$lib/components/FullScreenView.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import { setPhotoContext } from '$lib/contexts/photo-context';
	import { getImageUrl, ImageQuality } from '$lib/utils/image-utils';

	let { data }: { data: PageData } = $props();

	let isModalOpen = $state(false);
	let isFullScreenOpen = $state(false);
	let currentArrayIndex = $state(0);
	let currentPhotoIndex = $state(0);

	setPhotoContext(data.photoArrays, data.galleryId, data.imageDomain);

	function getThumbnailUrl(photoArray: PhotoArray) {
		if (photoArray.photoUris && photoArray.photoUris.length > 0) {
			return getImageUrl(
				data.imageDomain,
				data.galleryId,
				photoArray.photoArrayId,
				photoArray.photoUris[0],
				ImageQuality.THUMBNAIL
			);
		}
		return '';
	}

	function openModal(photoArray: PhotoArray) {
		const arrayIndex = data.photoArrays.findIndex(
			(pa) => pa.photoArrayId === photoArray.photoArrayId
		);
		currentArrayIndex = arrayIndex;
		isModalOpen = true;
	}

	function createFullScreenHandler(arrayIndex: number) {
		return (photoIndex: number) => {
			openFullScreen(arrayIndex, photoIndex);
		};
	}

	function closeModal() {
		currentPhotoIndex = 0;
		isModalOpen = false;
	}

	function openFullScreen(arrayIndex: number, photoIndex: number) {
		currentArrayIndex = arrayIndex;
		currentPhotoIndex = photoIndex;
		isFullScreenOpen = true;
	}

	function closeFullScreen() {
		isFullScreenOpen = false;
	}
</script>

<main class="min-h-screen py-8">
	<Heading />
	{#if data.photoArrays.length}
		<div id="photo-grid" class="grid w-full grid-cols-3 justify-center">
			{#each data.photoArrays as photo (photo.photoArrayId)}
				<div
					class="aspect-square cursor-pointer overflow-hidden border border-gray-400"
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
</main>

{#if isModalOpen}
	<PhotoModal
		bind:photoArrayIndex={currentArrayIndex}
		bind:currentPhotoIndex
		onClose={closeModal}
		onFullScreen={createFullScreenHandler(currentArrayIndex)}
		{isFullScreenOpen}
	/>
{/if}

{#if isFullScreenOpen}
	<FullScreenView bind:currentArrayIndex bind:currentPhotoIndex onClose={closeFullScreen} />
{/if}

<style>
	main {
		width: 100vw;
		max-width: calc(5 * 300px + 2vw + 4rem);
		margin-inline: auto;
		padding-inline: 1vw;
	}

	#photo-grid {
		margin-inline: auto;
		gap: 1vw;
		grid-template-columns: repeat(3, 1fr);
	}

	@media (min-width: calc(3*300px + 2vw + 2rem)) {
		#photo-grid {
			grid-template-columns: repeat(auto-fit, 300px);
			gap: 1rem;
		}
	}
</style>
