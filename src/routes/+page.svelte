<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import FullScreenView from '$lib/components/FullScreenView.svelte';
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
		console.log(arrayIndex, photoIndex);
		currentArrayIndex = arrayIndex;
		currentPhotoIndex = photoIndex;
		isFullScreenOpen = true;
	}

	function closeFullScreen() {
		isFullScreenOpen = false;
	}
</script>

<div class="mx-auto flex min-h-screen w-full items-start justify-center p-8">
	{#if data.photoArrays.length}
		<div
			class="auto-grid grid w-full max-w-[calc(5*300px+4*1rem)] grid-cols-3 justify-center gap-4"
		>
			{#each data.photoArrays as photo (photo.photoArrayId)}
				<div
					class="aspect-square cursor-pointer overflow-hidden border-2 border-gray-400"
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
	{:else}
		<p class="mt-8 text-center text-xl text-gray-600">No photos found.</p>
	{/if}
</div>

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
	@media (min-width: calc(3*300px + 2*1rem + 4*2rem)) {
		.auto-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 300px));
		}
	}
</style>
