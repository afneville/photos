<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import FullScreenView from '$lib/components/FullScreenView.svelte';

	export let data: PageData;

	let isModalOpen = false;
	let selectedPhotoArray: PhotoArray | null = null;
	let isFullScreenOpen = false;
	let fullScreenArrayIndex = 0;
	let fullScreenPhotoIndex = 0;

	function getThumbnailUrl(photoArray: PhotoArray) {
		if (photoArray.photoUris && photoArray.photoUris.length > 0) {
			return `${data.imageDomain}/${data.galleryId}/${photoArray.photoArrayId}/${photoArray.photoUris[0]}/thumbnail`;
		}
		return '';
	}

	function openModal(photoArray: PhotoArray) {
		selectedPhotoArray = photoArray;
		isModalOpen = true;
	}

	function createFullScreenHandler(arrayIndex: number) {
		return (photoIndex: number) => {
			openFullScreen(arrayIndex, photoIndex);
		};
	}

	function closeModal() {
		isModalOpen = false;
		selectedPhotoArray = null;
	}

	function openFullScreen(arrayIndex: number, photoIndex: number) {
		console.log(arrayIndex, photoIndex)
		fullScreenArrayIndex = arrayIndex;
		fullScreenPhotoIndex = photoIndex;
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
			{#each data.photoArrays as photo, index}
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

{#if isModalOpen && selectedPhotoArray}
	<PhotoModal
		photoArray={selectedPhotoArray}
		imageDomain={data.imageDomain}
		galleryId={data.galleryId}
		onClose={closeModal}
		onFullScreen={createFullScreenHandler(data.photoArrays.findIndex(pa => pa.photoArrayId === selectedPhotoArray!.photoArrayId))}
	/>
{/if}

{#if isFullScreenOpen}
	<FullScreenView
		photoArrays={data.photoArrays}
		currentArrayIndex={fullScreenArrayIndex}
		currentPhotoIndex={fullScreenPhotoIndex}
		imageDomain={data.imageDomain}
		galleryId={data.galleryId}
		onClose={closeFullScreen}
	/>
{/if}

<style>
	@media (min-width: calc(3*300px + 2*1rem + 4*2rem)) {
		.auto-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 300px));
		}
	}
</style>
