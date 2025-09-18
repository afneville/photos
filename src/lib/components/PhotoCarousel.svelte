<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import { onMount } from 'svelte';
	import { getPhotoContext } from '$lib/contexts/photo-context';
	import { getImageSrcSet } from '$lib/utils/image-utils';
	import { CaretLeftIcon, CaretRightIcon } from './icons';
	import {
		createButtonHoverHandlers,
		navigationButtonClass,
		createBackgroundStyle
	} from '$lib/utils/style-utils';
	import { ImagePreloader } from '$lib/utils/image-preloader';

	let {
		photoArray,
		currentIndex = $bindable(0),
		handleKeys = true
	}: {
		photoArray: PhotoArray;
		currentIndex?: number;
		handleKeys?: boolean;
	} = $props();

	const photoContext = getPhotoContext();
	const { galleryId, imageDomain } = photoContext;
	let imageElements: HTMLImageElement[] = $state([]);
	import { SvelteSet } from 'svelte/reactivity';
	const imagePreloader = new ImagePreloader();

	const photoUris = $derived(photoArray.photoUris || []);
	const hasMultiplePhotos = $derived(photoUris.length > 1);

	let isAnimating = $state(false);
	let loadedImages = new SvelteSet<number>();
	let disableTransition = $state(false);
	let previousArrayId = $state(photoArray?.photoArrayId);

	function getCarouselImageSrcSet(photoUri: string): string {
		return getImageSrcSet(imageDomain, galleryId, photoArray.photoArrayId, photoUri);
	}

	async function goToPrevious() {
		if (hasMultiplePhotos && currentIndex > 0 && !isAnimating) {
			isAnimating = true;
			const newIndex = currentIndex - 1;
			loadedImages.add(newIndex);
			await ensureImageReady(photoUris[newIndex]);
			currentIndex = newIndex;
			setTimeout(() => (isAnimating = false), 300);
		}
	}

	async function goToNext() {
		if (hasMultiplePhotos && currentIndex < photoUris.length - 1 && !isAnimating) {
			isAnimating = true;
			const newIndex = currentIndex + 1;
			loadedImages.add(newIndex);
			await ensureImageReady(photoUris[newIndex]);
			currentIndex = newIndex;
			setTimeout(() => (isAnimating = false), 300);
		}
	}

	async function goToSlide(index: number) {
		if (!isAnimating) {
			isAnimating = true;
			loadedImages.add(index);
			await ensureImageReady(photoUris[index]);
			currentIndex = index;
			setTimeout(() => (isAnimating = false), 300);
		}
	}

	function prefetchImage(photoUri: string) {
		const srcset = getCarouselImageSrcSet(photoUri);
		imagePreloader.prefetchImage(
			srcset,
			'(max-width: 480px) 80vw, (max-width: 768px) 80vw, (max-width: 1440px) 80vw, 72rem'
		);
	}

	async function ensureImageReady(photoUri: string): Promise<void> {
		const srcset = getCarouselImageSrcSet(photoUri);
		return imagePreloader.ensureImageReady(
			srcset,
			'(max-width: 480px) 80vw, (max-width: 768px) 80vw, (max-width: 1440px) 80vw, 72rem'
		);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!handleKeys) return;
		if (event.key === 'ArrowLeft' && currentIndex > 0) {
			goToPrevious();
		} else if (event.key === 'ArrowRight' && currentIndex < photoUris.length - 1) {
			goToNext();
		}
	}

	onMount(() => {
		photoUris.forEach(prefetchImage);
	});

	const buttonHoverHandlers = createButtonHoverHandlers();

	// Watch for photo array changes to disable animation when switching arrays
	$effect(() => {
		if (photoArray?.photoArrayId !== previousArrayId) {
			disableTransition = true;
			previousArrayId = photoArray?.photoArrayId;
			// Re-enable transition after a brief delay
			setTimeout(() => {
				disableTransition = false;
			}, 50);
		}
	});

	$effect(() => {
		if (hasMultiplePhotos) {
			const prevIndex = (currentIndex - 1 + photoUris.length) % photoUris.length;
			const nextIndex = (currentIndex + 1) % photoUris.length;
			prefetchImage(photoUris[prevIndex]);
			prefetchImage(photoUris[nextIndex]);
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
	{#if photoUris.length > 0}
		<div
			class="flex h-full {disableTransition ? '' : 'transition-transform duration-300 ease-out'}"
			style="width: {photoUris.length * 100}%; transform: translateX(-{currentIndex * 100}%);"
		>
			{#each photoUris as photoUri, index (photoUri)}
				<div class="h-full w-full flex-shrink-0 bg-gray-900">
					{#if Math.abs(index - currentIndex) <= 1 || loadedImages.has(index)}
						<img
							srcset={getCarouselImageSrcSet(photoUri)}
							sizes="(max-width: 480px) 80vw, (max-width: 768px) 80vw, (max-width: 1440px) 80vw, 72rem"
							alt="Photo {index + 1} of {photoUris.length}"
							class="h-full w-full object-cover"
							style="aspect-ratio: 4/3; will-change: transform;"
							bind:this={imageElements[index]}
							loading={index === currentIndex ? 'eager' : 'lazy'}
							fetchpriority={index === currentIndex ? 'high' : 'low'}
						/>
					{/if}
				</div>
			{/each}
		</div>

		{#if hasMultiplePhotos}
			{#if currentIndex > 0}
				<button
					class="{navigationButtonClass} left-4"
					style={createBackgroundStyle()}
					{...buttonHoverHandlers}
					onclick={goToPrevious}
					aria-label="Previous image"
				>
					<CaretLeftIcon size="24" />
				</button>
			{/if}

			{#if currentIndex < photoUris.length - 1}
				<button
					class="{navigationButtonClass} right-4"
					style={createBackgroundStyle()}
					{...buttonHoverHandlers}
					onclick={goToNext}
					aria-label="Next image"
				>
					<CaretRightIcon size="24" />
				</button>
			{/if}

			<div class="absolute bottom-4 left-1/2 -translate-x-1/2">
				<div
					class="flex items-center rounded-full px-4"
					style="background-color: rgba(0, 0, 0, 0.4); height: 2.5rem;"
				>
					<div class="flex items-center space-x-2">
						{#each photoUris as photoUri, index (photoUri)}
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
