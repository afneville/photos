<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import PhotoCarousel from './PhotoCarousel.svelte';
	import { getPhotoContext } from '$lib/contexts/photo-context';
	import {
		XIcon,
		CaretLeftIcon,
		CaretRightIcon,
		MapPinIcon,
		CalendarDotsIcon,
		ArrowsOutSimpleIcon
	} from './icons';

	let {
		photoArrayIndex = $bindable(),
		currentPhotoIndex = $bindable(),
		onClose,
		onFullScreen,
		isFullScreenOpen = false
	}: {
		photoArrayIndex: number;
		currentPhotoIndex: number;
		onClose: () => void;
		onFullScreen: (photoIndex: number) => void;
		isFullScreenOpen?: boolean;
	} = $props();

	const photoContext = getPhotoContext();
	const { photoArrays } = photoContext;

	const photoArray = $derived(photoArrays[photoArrayIndex]);
	const hasPreviousArray = $derived(photoArrayIndex > 0);
	const hasNextArray = $derived(photoArrayIndex < photoArrays.length - 1);

	function openFullScreen() {
		// Request fullscreen from user interaction
		const elem = document.documentElement;
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		}
		onFullScreen(currentPhotoIndex);
	}

	function goToPreviousArray() {
		if (hasPreviousArray) {
			currentPhotoIndex = 0;
			photoArrayIndex = photoArrayIndex - 1;
		}
	}

	function goToNextArray() {
		if (hasNextArray) {
			currentPhotoIndex = 0;
			photoArrayIndex = photoArrayIndex + 1;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			// Let the PhotoCarousel handle these keys
			return;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-gray-400/30 backdrop-blur-md"
	role="dialog"
	aria-modal="true"
	in:fade={{ duration: 300 }}
	out:fade={{ duration: 300 }}
>
	<div
		class="relative flex flex-col overflow-hidden rounded-lg border-1 border-gray-400 bg-white shadow-2xl"
		style="
			width: min(min(90vw, 1152px), calc((90vh - 8rem) * 4 / 3));
			height: min(90vh, calc(min(min(90vw, 1152px), calc((90vh - 8rem) * 4 / 3)) * 3 / 4 + 8rem));
			margin: 2rem;
		"
		in:scale={{ duration: 300, start: 0.1 }}
		out:scale={{ duration: 300, start: 0.1 }}
	>
		<div class="flex h-16 flex-shrink-0 items-center justify-end border-b border-gray-400 px-4">
			<div class="flex items-center space-x-2">
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full {hasPreviousArray
						? 'hover:bg-gray-100'
						: 'cursor-not-allowed text-gray-400'}"
					onclick={goToPreviousArray}
					disabled={!hasPreviousArray}
					aria-label="Previous array"
				>
					<CaretLeftIcon size="20" />
				</button>
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full {hasNextArray
						? 'hover:bg-gray-100'
						: 'cursor-not-allowed text-gray-400'}"
					onclick={goToNextArray}
					disabled={!hasNextArray}
					aria-label="Next array"
				>
					<CaretRightIcon size="20" />
				</button>
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
					onclick={openFullScreen}
					aria-label="Full Screen"
				>
					<ArrowsOutSimpleIcon size="20" />
				</button>
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
					onclick={onClose}
					aria-label="Close modal"
				>
					<XIcon size="20" />
				</button>
			</div>
		</div>

		<div class="min-h-0 flex-1 overflow-hidden">
			<PhotoCarousel
				{photoArray}
				bind:currentIndex={currentPhotoIndex}
				handleKeys={!isFullScreenOpen}
			/>
		</div>

		<div class="relative z-10 flex-shrink-0 border-t border-gray-400 bg-white p-4">
			<div class="flex justify-end">
				<div class="flex items-center gap-6">
					<span class="flex items-center gap-2">
						<MapPinIcon size="20" />
						{photoArray.location || 'Unknown location'}
					</span>
					<span class="flex items-center gap-2">
						<CalendarDotsIcon size="20" />
						{new Date(photoArray.timestamp).toLocaleDateString('en-US', {
							month: 'long',
							year: 'numeric'
						})}
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
