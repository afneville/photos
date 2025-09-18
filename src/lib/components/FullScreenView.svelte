<script lang="ts">
	import { fade, scale } from 'svelte/transition';
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
	let loadedImages = new SvelteSet<number>();
	let isAnimating = $state(false);
	let isInitialized = $state(false);
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
		const newIndex = flatImageList().findIndex(
			(item) => item.arrayIndex === currentArrayIndex && item.photoIndex === currentPhotoIndex
		);
		const oldIndex = currentGlobalIndex;
		currentGlobalIndex = newIndex === -1 ? 0 : newIndex;

		if (Math.abs(currentGlobalIndex - oldIndex) > 1) {
			const start = Math.min(oldIndex, currentGlobalIndex);
			const end = Math.max(oldIndex, currentGlobalIndex);
			for (let i = start; i <= end; i++) {
				loadedImages.add(i);
			}
		}
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

		for (let offset = -2; offset <= 2; offset++) {
			if (offset === 0) continue;
			const index = currentGlobalIndex + offset;
			if (index >= 0 && index < list.length) {
				const item = list[index];
				prefetchImage(item.photoArray, item.photoUri);
			}
		}
	}

	async function ensureImageReady(photoArray: PhotoArray, photoUri: string): Promise<void> {
		return new Promise((resolve) => {
			const srcset = getFullScreenImageSrcSet(photoArray, photoUri);
			const img = new Image();
			img.onload = async () => {
				try {
					await img.decode();
					resolve();
				} catch {
					resolve(); // Fallback if decode fails
				}
			};
			img.onerror = () => resolve(); // Fallback if load fails
			img.srcset = srcset;
			img.sizes = '100vw';
		});
	}

	async function goToPrevious() {
		if (currentGlobalIndex > 0 && !isAnimating) {
			isAnimating = true;
			const newGlobalIndex = currentGlobalIndex - 1;
			const newImage = flatImageList()[newGlobalIndex];
			loadedImages.add(newGlobalIndex);
			await ensureImageReady(newImage.photoArray, newImage.photoUri);
			currentGlobalIndex = newGlobalIndex;
			currentArrayIndex = newImage.arrayIndex;
			currentPhotoIndex = newImage.photoIndex;
			setTimeout(() => (isAnimating = false), 350);
		}
	}

	async function goToNext() {
		if (currentGlobalIndex < flatImageList().length - 1 && !isAnimating) {
			isAnimating = true;
			const newGlobalIndex = currentGlobalIndex + 1;
			const newImage = flatImageList()[newGlobalIndex];
			loadedImages.add(newGlobalIndex);
			await ensureImageReady(newImage.photoArray, newImage.photoUri);
			currentGlobalIndex = newGlobalIndex;
			currentArrayIndex = newImage.arrayIndex;
			currentPhotoIndex = newImage.photoIndex;
			setTimeout(() => (isAnimating = false), 350);
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
			event.stopPropagation();
			onClose();
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			event.stopPropagation();
			if (controlsVisible) {
				controlsVisible = false;
				clearTimeout(hideTimeout);
			}
			goToPrevious();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			event.stopPropagation();
			if (controlsVisible) {
				controlsVisible = false;
				clearTimeout(hideTimeout);
			}
			goToNext();
		}
	}

	function handleFullscreenChange() {
		if (!document.fullscreenElement) {
			onClose();
		}
	}
	$effect(() => {
		prefetchAdjacentImages();
	});

	$effect.root(() => {
		controlsVisible = true;
		hideTimeout = setTimeout(() => {
			controlsVisible = false;
		}, 3000);

		const initialIndex = currentGlobalIndex;
		loadedImages.add(initialIndex);
		if (initialIndex > 0) loadedImages.add(initialIndex - 1);
		if (initialIndex < flatImageList().length - 1) loadedImages.add(initialIndex + 1);

		setTimeout(() => (isInitialized = true), 100);
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			clearTimeout(hideTimeout);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if currentImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black {controlsVisible
			? 'cursor-default'
			: 'cursor-none'}"
		role="dialog"
		aria-modal="true"
		in:fade={{ duration: 400 }}
		out:fade={{ duration: 400 }}
		onmousemove={handleMouseMove}
		onclick={handleClick}
	>
		<div
			in:scale={{ duration: 400, start: 0.1 }}
			out:scale={{ duration: 400, start: 0.1 }}
			class="h-full w-full"
		>
			<div class="h-full w-full overflow-hidden">
				<div
					class="flex h-full {isInitialized ? 'transition-transform duration-300 ease-out' : ''}"
					style="width: {flatImageList().length *
						100}vw; transform: translateX(-{currentGlobalIndex * 100}vw);"
				>
					{#each flatImageList() as image, index (image.photoUri)}
						<div class="flex h-full w-screen flex-shrink-0 items-center justify-center bg-black">
							{#if Math.abs(index - currentGlobalIndex) <= 1 || loadedImages.has(index)}
								<img
									srcset={getFullScreenImageSrcSet(image.photoArray, image.photoUri)}
									sizes="100vw"
									alt="Photo {index + 1} / {flatImageList().length}"
									class="max-h-full max-w-full object-contain"
									loading={index === currentGlobalIndex ? 'eager' : 'lazy'}
									fetchpriority={index === currentGlobalIndex ? 'high' : 'low'}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

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
						showControlsTemporarily();
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
						showControlsTemporarily();
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
