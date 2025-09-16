<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { PhotoArray } from '$lib/api-types';
	import PhotoCarousel from './PhotoCarousel.svelte';
	import {
		XIcon,
		CaretLeftIcon,
		CaretRightIcon,
		MapPinIcon,
		CalendarDotsIcon,
		ArrowsOutSimpleIcon
	} from './icons';

	export let isOpen: boolean = false;
	export let photoArray: PhotoArray | null = null;
	export let imageDomain: string;
	export let galleryId: string;
	export let onClose: () => void;

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && photoArray}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		in:fade={{ duration: 300 }}
		out:fade={{ duration: 300 }}
	>
		<div
			class="relative flex h-[90vh] max-h-[1000px] min-h-[60vh] w-4/5 max-w-6xl flex-col overflow-hidden rounded-lg border-1 border-gray-400 bg-white"
			in:scale={{ duration: 300, start: 0.1 }}
			out:scale={{ duration: 300, start: 0.1 }}
		>
			<div class="flex h-16 flex-shrink-0 items-center justify-end border-b border-gray-200 px-4">
				<div class="flex items-center space-x-2">
					<button
						class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
						on:click={onClose}
					>
						<CaretLeftIcon size="20" />
					</button>
					<button
						class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
						on:click={onClose}
					>
						<CaretRightIcon size="20" />
					</button>
					<button
						class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
						on:click={onClose}
						aria-label="Full Screen"
					>
						<ArrowsOutSimpleIcon size="20" />
					</button>
					<button
						class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
						on:click={onClose}
						aria-label="Close modal"
					>
						<XIcon size="20" />
					</button>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-hidden">
				<PhotoCarousel {photoArray} {imageDomain} {galleryId} />
			</div>

			<div class="relative z-10 flex-shrink-0 border-t border-gray-200 bg-white p-4">
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
{/if}
