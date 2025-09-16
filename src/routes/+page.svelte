<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import PhotoModal from '$lib/components/PhotoModal.svelte';

	export let data: PageData;

	let isModalOpen = false;
	let selectedPhotoArray: PhotoArray | null = null;

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

	function closeModal() {
		isModalOpen = false;
		selectedPhotoArray = null;
	}
</script>

<div class="mx-auto flex min-h-screen w-full items-start justify-center p-8">
	{#if data.photoArrays.length}
		<div
			class="auto-grid grid w-full max-w-[calc(5*300px+4*1rem)] grid-cols-3 justify-center gap-4"
		>
			{#each data.photoArrays as photo}
				<div
					class="aspect-square cursor-pointer overflow-hidden border-2 border-gray-400"
					on:click={() => openModal(photo)}
					on:keydown={(e) => e.key === 'Enter' && openModal(photo)}
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

<PhotoModal
	isOpen={isModalOpen}
	photoArray={selectedPhotoArray}
	imageDomain={data.imageDomain}
	galleryId={data.galleryId}
	onClose={closeModal}
/>

<style>
	@media (min-width: calc(3*300px + 2*1rem + 4*2rem)) {
		.auto-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 300px));
		}
	}
</style>
