<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PhotoArray } from '$lib/api-types';
	import { getPhotoContext } from '$lib/contexts/photo-context';
	import { getImageSrcSet } from '$lib/utils/image-utils';
	import { CaretLeftIcon, CaretRightIcon, XIcon, MapPinIcon, CalendarDotsIcon } from './icons';

	let {
		currentArrayIndex = $bindable(),
		currentPhotoIndex = $bindable(),
		onClose
	}: {
		currentArrayIndex: number;
		currentPhotoIndex: number;
		onClose: () => void;
	} = $props();

	const photoContext = getPhotoContext();
	const { photoArrays, galleryId, imageDomain } = photoContext;

	let currentGlobalIndex = $state(0);
	let controlsVisible = $state(true);
	let hideTimeout: NodeJS.Timeout;
	import { SvelteSet } from 'svelte/reactivity';
	let prefetchedImages = new SvelteSet<string>();

	// Flatten all photos into a single navigable list
	const flatImageList = $derived(() => {
		const list: {
			arrayIndex: number;
			photoIndex: number;
			photoArray: PhotoArray;
			photoUri: string;
		}[] = [];
		photoArrays.forEach((photoArray, arrayIndex) => {
			if (photoArray.photoUris) {
				photoArray.photoUris.forEach((photoUri, photoIndex) => {
					list.push({ arrayIndex, photoIndex, photoArray, photoUri });
				});
			}
		});
		return list;
	});

	$effect(() => {
		// Find current global index when dependencies change
		const newIndex = flatImageList().findIndex(
			(item) => item.arrayIndex === currentArrayIndex && item.photoIndex === currentPhotoIndex
		);
		currentGlobalIndex = newIndex === -1 ? 0 : newIndex;
	});

	const currentImage = $derived(flatImageList()[currentGlobalIndex]);

	function getFullScreenImageSrcSet(photoArray: PhotoArray, photoUri: string): string {
		return getImageSrcSet(imageDomain, galleryId, photoArray.photoArrayId, photoUri);
	}

	function prefetchImage(photoArray: PhotoArray, photoUri: string) {
		const srcset = getFullScreenImageSrcSet(photoArray, photoUri);
		if (!prefetchedImages.has(srcset)) {
			const img = new Image();
			img.srcset = srcset;
			img.sizes = '100vw';
			prefetchedImages.add(srcset);
		}
	}

	function prefetchAdjacentImages() {
		const list = flatImageList();
		if (list.length === 0) return;

		// Prefetch 2 images to each side of current image
		for (let offset = -2; offset <= 2; offset++) {
			if (offset === 0) continue; // Skip current image

			const index = currentGlobalIndex + offset;
			if (index >= 0 && index < list.length) {
				const item = list[index];
				prefetchImage(item.photoArray, item.photoUri);
			}
		}
	}

	function goToPrevious() {
		if (currentGlobalIndex > 0) {
			currentGlobalIndex--;
			const newImage = flatImageList()[currentGlobalIndex];
			currentArrayIndex = newImage.arrayIndex;
			currentPhotoIndex = newImage.photoIndex;
		}
	}

	function goToNext() {
		if (currentGlobalIndex < flatImageList().length - 1) {
			currentGlobalIndex++;
			const newImage = flatImageList()[currentGlobalIndex];
			currentArrayIndex = newImage.arrayIndex;
			currentPhotoIndex = newImage.photoIndex;
		}
	}

	// function goToPreviousArray() {
	// 	if (currentArrayIndex > 0) {
	// 		const newArrayIndex = currentArrayIndex - 1;
	// 		currentArrayIndex = newArrayIndex;
	// 		currentPhotoIndex = 0;
	// 		currentGlobalIndex = flatImageList().findIndex(
	// 			(item) => item.arrayIndex === newArrayIndex && item.photoIndex === 0
	// 		);
	// 	}
	// }

	// function goToNextArray() {
	// 	if (currentArrayIndex < photoArrays.length - 1) {
	// 		const newArrayIndex = currentArrayIndex + 1;
	// 		currentArrayIndex = newArrayIndex;
	// 		currentPhotoIndex = 0;
	// 		currentGlobalIndex = flatImageList().findIndex(
	// 			(item) => item.arrayIndex === newArrayIndex && item.photoIndex === 0
	// 		);
	// 	}
	// }

	function showControlsTemporarily() {
		controlsVisible = true;
		clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => {
			controlsVisible = false;
		}, 3000);
	}

	function handleMouseMove() {
		showControlsTemporarily();
	}

	function handleClick() {
		showControlsTemporarily();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		} else if (event.key === 'ArrowLeft') {
			goToPrevious();
			controlsVisible = false;
			clearTimeout(hideTimeout);
		} else if (event.key === 'ArrowRight') {
			goToNext();
			controlsVisible = false;
			clearTimeout(hideTimeout);
		}
	}

	function handleFullscreenChange() {
		if (!document.fullscreenElement) {
			onClose();
		}
	}

	// Enter/exit browser fullscreen
	function enterFullscreen() {
		const elem = document.documentElement;
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		}
	}

	function exitFullscreen() {
		if (document.fullscreenElement && document.exitFullscreen) {
			document.exitFullscreen();
		}
	}

	// Prefetch adjacent images when current index changes
	$effect(() => {
		prefetchAdjacentImages();
	});

	// Initialize auto-hide timer and enter fullscreen
	$effect(() => {
		showControlsTemporarily();
		enterFullscreen();

		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			clearTimeout(hideTimeout);
			exitFullscreen();
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if currentImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		in:fade={{ duration: 300 }}
		out:fade={{ duration: 300 }}
		onmousemove={handleMouseMove}
		onclick={handleClick}
	>
		<img
			srcset={getFullScreenImageSrcSet(currentImage.photoArray, currentImage.photoUri)}
			sizes="100vw"
			alt="Photo {currentGlobalIndex + 1} / {flatImageList().length}"
			class="max-h-full max-w-full object-contain"
		/>

		<!-- Top bar with gradient -->
		{#if controlsVisible}
			<div
				class="absolute top-0 right-0 left-0 z-10 p-6 text-white"
				style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 70%, transparent 100%);"
				in:fade={{ duration: 300 }}
				out:fade={{ duration: 300 }}
			>
				<div class="flex items-center justify-end">
					<div class="mr-4 flex items-center gap-6">
						<span class="flex items-center gap-2">
							<MapPinIcon size="20" />
							{currentImage.photoArray.location || 'Unknown location'}
						</span>
						<span class="flex items-center gap-2">
							<CalendarDotsIcon size="20" />
							{new Date(currentImage.photoArray.timestamp).toLocaleDateString('en-US', {
								month: 'long',
								year: 'numeric'
							})}
						</span>
					</div>
					<button
						class="rounded-full p-3 text-white transition-all duration-200"
						onclick={(e) => {
							e.stopPropagation();
							onClose();
						}}
						aria-label="Close full screen"
					>
						<XIcon size="20" />
					</button>
				</div>
			</div>
		{/if}

		<!-- Navigation arrows -->
		{#if controlsVisible}
			{#if currentGlobalIndex > 0}
				<button
					class="absolute top-1/2 left-4 -translate-y-1/2 rounded-full p-3 text-white transition-all duration-200"
					style="background-color: rgba(0, 0, 0, 0.4);"
					onmouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onmouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onfocus={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onblur={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onclick={(e) => {
						e.stopPropagation();
						goToPrevious();
					}}
					aria-label="Previous image"
					in:fade={{ duration: 300 }}
					out:fade={{ duration: 300 }}
				>
					<CaretLeftIcon size="24" />
				</button>
			{/if}

			{#if currentGlobalIndex < flatImageList().length - 1}
				<button
					class="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-3 text-white transition-all duration-200"
					style="background-color: rgba(0, 0, 0, 0.4);"
					onmouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onmouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onfocus={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
					onblur={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
					onclick={(e) => {
						e.stopPropagation();
						goToNext();
					}}
					aria-label="Next image"
					in:fade={{ duration: 300 }}
					out:fade={{ duration: 300 }}
				>
					<CaretRightIcon size="24" />
				</button>
			{/if}
		{/if}
	</div>
{/if}
