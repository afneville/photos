<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PhotoArray } from '$lib/api-types';
	import { CaretLeftIcon, CaretRightIcon, XIcon, MapPinIcon, CalendarDotsIcon } from './icons';

	let {
		photoArrays,
		currentArrayIndex,
		currentPhotoIndex,
		imageDomain,
		galleryId,
		onClose
	}: {
		photoArrays: PhotoArray[];
		currentArrayIndex: number;
		currentPhotoIndex: number;
		imageDomain: string;
		galleryId: string;
		onClose: () => void;
	} = $props();

	let currentGlobalIndex = $state(0);
	let controlsVisible = $state(true);
	let hideTimeout: NodeJS.Timeout;

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

	function getHdImageUrl(photoArray: PhotoArray, photoUri: string): string {
		return `${imageDomain}/${galleryId}/${photoArray.photoArrayId}/${photoUri}/hd`;
	}

	function goToPrevious() {
		if (currentGlobalIndex > 0) {
			currentGlobalIndex--;
		}
	}

	function goToNext() {
		if (currentGlobalIndex < flatImageList().length - 1) {
			currentGlobalIndex++;
		}
	}

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

	// Initialize auto-hide timer and enter fullscreen
	$effect(() => {
		showControlsTemporarily();
		enterFullscreen();
		
		return () => {
			clearTimeout(hideTimeout);
			exitFullscreen();
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
			src={getHdImageUrl(currentImage.photoArray, currentImage.photoUri)}
			alt="Photo {currentGlobalIndex + 1} / {flatImageList().length}"
			class="max-h-full max-w-full object-contain"
		/>

		<!-- Top bar with gradient -->
		{#if controlsVisible}
			<div
				class="absolute top-0 left-0 right-0 z-10 p-6 text-white transition-opacity duration-300"
				style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 70%, transparent 100%);"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-6">
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
						class="rounded-full p-3 transition-all duration-200"
						style="background-color: rgba(0, 0, 0, 0.4);"
						onmouseover={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
						onmouseout={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
						onfocus={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)')}
						onblur={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)')}
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
				>
					<CaretRightIcon size="24" />
				</button>
			{/if}
		{/if}
	</div>
{/if}
