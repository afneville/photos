<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { XIcon } from './icons';
	import ImageCropTool from './ImageCropTool.svelte';
	import { getPhotoContext } from '$lib/contexts/photo-context';
	import { trpc } from '$lib/trpc-client';
	import type { PhotoArrayCreationResponse } from '$lib/api-types';

	let {
		onClose,
		onSuccess
	}: {
		onClose: () => void;
		onSuccess?: () => void;
	} = $props();

	const photoContext = getPhotoContext();
	const { photoArrays } = photoContext;

	// Form state
	let location = $state('');
	let selectedMonth = $state(new Date().getMonth() + 1); // 1-based month
	let selectedYear = $state(new Date().getFullYear());
	let uploadedImages: Array<{
		id: string;
		file: File;
		url: string;
		cropCoords: { x: number; y: number; size: number };
		pixelCoords?: { x: number; y: number; w: number; h: number };
	}> = $state([]);
	let selectedImageId = $state<string | null>(null);
	let isSubmitting = $state(false);
	let imageCropToolRef: any;

	// Generate default timestamp (1st of the month at noon)
	function getTimestamp() {
		const date = new Date(selectedYear, selectedMonth - 1, 1, 12, 0, 0);
		return date.toISOString();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;

		for (const file of files) {
			if (file.type.startsWith('image/')) {
				const id = crypto.randomUUID();
				const url = URL.createObjectURL(file);
				const newImage = {
					id,
					file,
					url,
					cropCoords: { x: 25, y: 25, size: 50 } // Default centered crop
				};
				uploadedImages.push(newImage);

				// Auto-select first uploaded image
				if (uploadedImages.length === 1) {
					selectedImageId = id;
				}
			}
		}
	}

	function removeImage(id: string) {
		const index = uploadedImages.findIndex((img) => img.id === id);
		if (index !== -1) {
			URL.revokeObjectURL(uploadedImages[index].url);
			uploadedImages.splice(index, 1);

			// Update selection if the removed image was selected
			if (selectedImageId === id) {
				selectedImageId = uploadedImages.length > 0 ? uploadedImages[0].id : null;
			}
		}
	}

	function selectImage(id: string) {
		selectedImageId = id;
	}

	function updateCropCoords(id: string, coords: { x: number; y: number; size: number }) {
		const image = uploadedImages.find((img) => img.id === id);
		if (image) {
			image.cropCoords = coords;
			
			// Also store pixel coordinates if available
			if (imageCropToolRef) {
				const pixelCoords = imageCropToolRef.getPixelCoordinates();
				if (pixelCoords) {
					image.pixelCoords = pixelCoords;
					console.log(`Stored pixel coordinates for image ${id}:`, pixelCoords);
				}
			}
		}
	}

	// Get the currently selected image
	const selectedImage = $derived(uploadedImages.find((img) => img.id === selectedImageId));

	// Drag and drop state
	let draggedIndex = $state<number | null>(null);

	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		event.dataTransfer!.effectAllowed = 'move';
		event.dataTransfer!.setData('text/html', '');
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'move';
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) return;

		// Reorder the images array
		const draggedItem = uploadedImages[draggedIndex];
		uploadedImages.splice(draggedIndex, 1);
		uploadedImages.splice(dropIndex, 0, draggedItem);

		draggedIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
	}

	// Get the alphabetically first key from existing images
	function getFirstExistingKey(): string | undefined {
		if (photoArrays.length === 0) {
			return undefined;
		}

		// Get the alphabetically first key from existing images
		const sortedKeys = photoArrays
			.map((array) => array.photoArrayId)
			.sort();

		return sortedKeys[0];
	}

	// Get pixel coordinates for an image
	function getPixelCoordsForImage(imageId: string) {
		const image = uploadedImages.find(img => img.id === imageId);
		if (!image) return null;

		// First priority: use stored pixel coordinates if available
		if (image.pixelCoords) {
			console.log(`Image ${imageId} using stored pixel coordinates:`, image.pixelCoords);
			return image.pixelCoords;
		}

		// Second priority: if this is the currently selected image, get live pixel coordinates
		if (imageId === selectedImageId && imageCropToolRef) {
			const pixelCoords = imageCropToolRef.getPixelCoordinates();
			if (pixelCoords) {
				console.log(`Image ${imageId} using live pixel coordinates:`, pixelCoords);
				return pixelCoords;
			}
		}

		// Fallback: convert percentage to normalized coordinates (0-1) 
		console.log(`Image ${imageId} using fallback percentage coordinates`);
		return {
			x: image.cropCoords.x / 100,
			y: image.cropCoords.y / 100,
			w: image.cropCoords.size / 100,
			h: image.cropCoords.size / 100
		};
	}

	async function handleSubmit() {
		if (isSubmitting || !location.trim() || uploadedImages.length === 0) return;

		isSubmitting = true;

		try {
			// Convert crop coordinates to the format expected by the API
			const thumbnailCoordinates = uploadedImages.map((image) =>
				getPixelCoordsForImage(image.id)
			).filter(coords => coords !== null);

			// Get the alphabetically first key from existing arrays to place new array before it
			const beforeRangeKey = getFirstExistingKey();

			const result: PhotoArrayCreationResponse = await trpc.createItem.mutate({
				item: {
					thumbnailCoordinates,
					timestamp: getTimestamp(),
					location: location.trim()
				},
				beforeRangeKey,
				afterRangeKey: undefined
			});

			console.log('Created photo array:', result);

			// Upload images to the presigned URLs
			if (result.presignedUrls.length === uploadedImages.length) {
				const uploadPromises = uploadedImages.map(async (image, index) => {
					const response = await fetch(result.presignedUrls[index], {
						method: 'PUT',
						body: image.file,
						headers: {
							'Content-Type': image.file.type
						}
					});

					if (!response.ok) {
						throw new Error(`Failed to upload image ${index + 1}`);
					}
				});

				await Promise.all(uploadPromises);
				console.log('All images uploaded successfully');
			}

			onSuccess?.();
			onClose();
		} catch (error) {
			console.error('Error creating photo array:', error);
			alert('Failed to create photo array. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	// Cleanup object URLs when component is destroyed
	$effect(() => {
		return () => {
			uploadedImages.forEach((image) => {
				URL.revokeObjectURL(image.url);
			});
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	in:fade={{ duration: 300 }}
	out:fade={{ duration: 300 }}
>
	<div
		class="relative flex h-[90vh] max-h-[800px] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
		in:scale={{ duration: 300, start: 0.95 }}
		out:scale={{ duration: 300, start: 0.95 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-xl font-semibold text-gray-900">Create New Photo Array</h2>
			<button
				class="rounded-full p-2 transition-colors hover:bg-gray-100"
				onclick={onClose}
				aria-label="Close modal"
			>
				<XIcon size="20" />
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-6">
			<div class="space-y-6">
				<!-- Location Input -->
				<div>
					<label for="location" class="mb-2 block text-sm font-medium text-gray-700">
						Location
					</label>
					<input
						id="location"
						type="text"
						bind:value={location}
						placeholder="Enter location..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<!-- Date Selection -->
				<div>
					<label class="mb-2 block text-sm font-medium text-gray-700">Date</label>
					<div class="flex gap-4">
						<div>
							<label for="month" class="mb-1 block text-xs text-gray-500">Month</label>
							<select
								id="month"
								bind:value={selectedMonth}
								class="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							>
								{#each Array.from({ length: 12 }, (_, i) => i + 1) as month (month)}
									<option value={month}>
										{new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
									</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="year" class="mb-1 block text-xs text-gray-500">Year</label>
							<input
								id="year"
								type="number"
								bind:value={selectedYear}
								min="1900"
								max="2100"
								class="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Timestamp will be: {getTimestamp()}
					</p>
				</div>

				<!-- Image Upload -->
				<div>
					<label for="images" class="mb-2 block text-sm font-medium text-gray-700">
						Upload Images
					</label>
					<input
						id="images"
						type="file"
						accept="image/*"
						multiple
						onchange={handleFileUpload}
						class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
					/>
				</div>

				<!-- Uploaded Images -->
				{#if uploadedImages.length > 0}
					<div>
						<h3 class="mb-3 text-sm font-medium text-gray-700">
							Uploaded Images ({uploadedImages.length})
						</h3>
						<div class="flex gap-3 overflow-x-auto pb-2">
							{#each uploadedImages as image, index (image.id)}
								<div
									class="group relative flex-shrink-0 cursor-move transition-transform {draggedIndex ===
									index
										? 'scale-105 opacity-50'
										: ''}"
									draggable="true"
									ondragstart={(e) => handleDragStart(e, index)}
									ondragover={handleDragOver}
									ondrop={(e) => handleDrop(e, index)}
									ondragend={handleDragEnd}
									role="button"
									tabindex="0"
								>
									<button onclick={() => selectImage(image.id)} class="block">
										<img
											src={image.url}
											alt="Upload preview"
											class="h-20 w-20 rounded border-2 object-cover transition-colors {selectedImageId ===
											image.id
												? 'border-blue-500'
												: 'border-gray-200'}"
										/>
									</button>
									<button
										onclick={() => removeImage(image.id)}
										class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										×
									</button>
									<!-- Drag handle indicator -->
									<div
										class="pointer-events-none absolute right-0 bottom-0 flex h-3 w-3 items-center justify-center bg-gray-400 text-xs text-white opacity-50"
									>
										⋮⋮
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Image Crop Tool -->
				{#if selectedImage}
					<div>
						<h3 class="mb-3 text-sm font-medium text-gray-700">
							Crop Image: {selectedImage.file.name}
						</h3>
						<div class="rounded-lg bg-gray-50 p-4">
							<ImageCropTool
								bind:this={imageCropToolRef}
								imageUrl={selectedImage.url}
								bind:cropCoords={selectedImage.cropCoords}
								onCropChange={(coords) => updateCropCoords(selectedImage.id, coords)}
							/>
						</div>
						<p class="mt-2 text-xs text-gray-500">
							Crop coordinates: x={selectedImage.cropCoords.x.toFixed(1)}%, y={selectedImage.cropCoords.y.toFixed(
								1
							)}%, size={selectedImage.cropCoords.size.toFixed(1)}%
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
			<button
				class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
				onclick={onClose}
			>
				Cancel
			</button>
			<button
				class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={handleSubmit}
				disabled={!location.trim() || uploadedImages.length === 0 || isSubmitting}
			>
				{#if isSubmitting}
					<svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						></path>
					</svg>
					Creating...
				{:else}
					Create Array
				{/if}
			</button>
		</div>
	</div>
</div>
