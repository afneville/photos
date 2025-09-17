<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import { onMount } from 'svelte';
	import { getPhotoContext } from '$lib/contexts/photo-context';
	import { getImageUrl, getImageSrcSet, ImageQuality } from '$lib/utils/image-utils';
	import { CaretLeftIcon, CaretRightIcon } from './icons';

	let {
		photoArray,
		currentIndex = $bindable(0)
	}: {
		photoArray: PhotoArray;
		currentIndex?: number;
	} = $props();

	const photoContext = getPhotoContext();
	const { galleryId, imageDomain } = photoContext;
	let imageElements: HTMLImageElement[] = $state([]);
	let prefetchedImages: Set<string> = new Set();

	const photoUris = $derived(photoArray.photoUris || []);
	const hasMultiplePhotos = $derived(photoUris.length > 1);

	function getCarouselImageSrcSet(photoUri: string): string {
		return getImageSrcSet(imageDomain, galleryId, photoArray.photoArrayId, photoUri);
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
		const srcset = getCarouselImageSrcSet(photoUri);
		if (!prefetchedImages.has(srcset)) {
			const img = new Image();
			img.srcset = srcset;
			img.sizes = "(max-width: 800px) 80vw, (max-width: 1440px) 80vw, 1152px";
			prefetchedImages.add(srcset);
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

	$effect(() => {
		// Prefetch adjacent images when current index changes
		if (hasMultiplePhotos) {
			const prevIndex = (currentIndex - 1 + photoUris.length) % photoUris.length;
			const nextIndex = (currentIndex + 1) % photoUris.length;
			prefetchImage(photoUris[prevIndex]);
			prefetchImage(photoUris[nextIndex]);
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative flex h-full w-full items-center justify-center bg-black">
	{#if photoUris.length > 0}
		<img
			srcset={getCarouselImageSrcSet(photoUris[currentIndex])}
			sizes="(max-width: 800px) 80vw, (max-width: 1440px) 80vw, 1152px"
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
					onmouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onmouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onfocus={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onblur={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onclick={goToPrevious}
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
					onmouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onmouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onfocus={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onblur={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onclick={goToNext}
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
								onmouseover={(e) => {
									if (index !== currentIndex) {
										e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
									}
								}}
								onmouseout={(e) => {
									if (index !== currentIndex) {
										e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
									}
								}}
								onfocus={(e) => {
									if (index !== currentIndex) {
										e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
									}
								}}
								onblur={(e) => {
									if (index !== currentIndex) {
										e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
									}
								}}
								onclick={() => goToSlide(index)}
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

