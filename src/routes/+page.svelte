<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import PhotoModal from '$lib/components/PhotoModal.svelte';
	import FullScreenView from '$lib/components/FullScreenView.svelte';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { setPhotoContext } from '$lib/contexts/photo-context';

	let { data }: { data: PageData } = $props();

	let isModalOpen = $state(false);
	let isFullScreenOpen = $state(false);
	let currentArrayIndex = $state(0);
	let currentPhotoIndex = $state(0);

	setPhotoContext(data.photoArrays, data.galleryId, data.imageDomain);

	function handleOpenModal(event: CustomEvent<{ photoArray: PhotoArray }>) {
		const { photoArray } = event.detail;
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

<PhotoGrid on:openModal={handleOpenModal} />

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
