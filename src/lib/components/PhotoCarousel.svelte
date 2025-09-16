<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import { onMount } from 'svelte';
	import { CaretLeftIcon, CaretRightIcon } from './icons';

	export let photoArray: PhotoArray;
	export let imageDomain: string;
	export let galleryId: string;

	let currentIndex = 0;
	let imageElements: HTMLImageElement[] = [];
	let prefetchedImages: Set<string> = new Set();

	$: photoUris = photoArray.photoUris || [];
	$: hasMultiplePhotos = photoUris.length > 1;

	function getHdImageUrl(photoUri: string): string {
		return `${imageDomain}/${galleryId}/${photoArray.photoArrayId}/${photoUri}/hd`;
	}

	function goToPrevious() {
		if (hasMultiplePhotos && currentIndex > 0) {
			currentIndex = currentIndex - 1;
		}
	}

	function goToNext() {
		if (hasMultiplePhotos && currentIndex < photoUris.length - 1) {
			currentIndex = currentIndex + 1;
		}
	}

	function goToSlide(index: number) {
		currentIndex = index;
	}

	function prefetchImage(photoUri: string) {
		const url = getHdImageUrl(photoUri);
		if (!prefetchedImages.has(url)) {
			const img = new Image();
			img.src = url;
			prefetchedImages.add(url);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft' && currentIndex > 0) {
			goToPrevious();
		} else if (event.key === 'ArrowRight' && currentIndex < photoUris.length - 1) {
			goToNext();
		}
	}

	onMount(() => {
		// Prefetch all images in the carousel
		photoUris.forEach(prefetchImage);
	});

	$: {
		// Prefetch adjacent images when current index changes
		if (hasMultiplePhotos) {
			const prevIndex = (currentIndex - 1 + photoUris.length) % photoUris.length;
			const nextIndex = (currentIndex + 1) % photoUris.length;
			prefetchImage(photoUris[prevIndex]);
			prefetchImage(photoUris[nextIndex]);
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative block flex h-full w-full items-center justify-center bg-black">
	{#if photoUris.length > 0}
		<img
			src={getHdImageUrl(photoUris[currentIndex])}
			alt="Photo {currentIndex + 1} of {photoUris.length}"
			class="max-h-full max-w-full object-contain"
			bind:this={imageElements[currentIndex]}
		/>

		{#if hasMultiplePhotos}
			<!-- Left arrow -->
			{#if currentIndex > 0}
				<button
					class="absolute top-1/2 left-4 -translate-y-1/2 rounded-full p-3 text-white transition-all duration-200"
					style="background-color: rgba(0, 0, 0, 0.4);"
					on:mouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					on:mouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					on:click={goToPrevious}
					aria-label="Previous image"
				>
					<CaretLeftIcon size="24" />
				</button>
			{/if}

			<!-- Right arrow -->
			{#if currentIndex < photoUris.length - 1}
				<button
					class="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-3 text-white transition-all duration-200"
					style="background-color: rgba(0, 0, 0, 0.4);"
					on:mouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					on:mouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					on:click={goToNext}
					aria-label="Next image"
				>
					<CaretRightIcon size="24" />
				</button>
			{/if}

			<!-- Dot indicators -->
			<div class="absolute bottom-4 left-1/2 -translate-x-1/2">
				<div
					class="flex items-center rounded-full px-4"
					style="background-color: rgba(0, 0, 0, 0.4); height: 2.5rem;"
				>
					<div class="flex items-center space-x-2">
						{#each photoUris as _, index}
							<button
								class="rounded-full transition-all duration-200 {index === currentIndex
									? 'h-4 w-4 shadow-lg'
									: 'h-3 w-3'}"
								style="background-color: {index === currentIndex
									? 'rgba(255, 255, 255, 0.85)'
									: 'rgba(255, 255, 255, 0.6)'};"
								on:mouseover={(e) => {
									if (index !== currentIndex) {
										e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
									}
								}}
								on:mouseout={(e) => {
									if (index !== currentIndex) {
										e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
									}
								}}
								on:click={() => goToSlide(index)}
								aria-label="Go to image {index + 1}"
							></button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class="text-center text-white">
			<p>No photos available</p>
		</div>
	{/if}
</div>

